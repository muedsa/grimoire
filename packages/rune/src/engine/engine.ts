import { ExecutionContext } from "../context/context";
import { CustomNodeRegistry } from "./registry";
import { evaluateExpression, CustomFunction } from "../expression/evaluator";
import { evaluateAssign } from "./assign";
import { compileRule } from "./compiler";
import { RuleNode } from "../types/rule";
import { AllowedValue } from "../types/node";
import { RuleDefinition } from "../types/schema";
import { ExecuteResult, EngineError, ErrorCode } from "../types";
import { DebugStepController, LoopFrame, StepContext } from "./debugger";
import { Logger, NoopLogger } from "../logger";

/**
 * 控制信号 - 用于在调用栈中传播控制流
 */
export enum ControlSignal {
  NONE = "none",
  BREAK = "break", // 跳出最近的一层循环
  CONTINUE = "continue", // 跳过当前迭代，继续下一轮
  RETURN = "return", // 终止整个规则执行
}

export interface ExecuteOptions {
  stepController?: DebugStepController;
}

/** RuleEngine 构造选项 */
export interface RuleEngineOptions {
  registry?: CustomNodeRegistry;
  /** 日志记录器，默认 NoopLogger（不输出任何日志） */
  logger?: Logger;
  /** 自定义函数映射 — 可在表达式中调用，内置函数同名时内置优先 */
  functions?: Record<string, CustomFunction>;
}

/**
 * RuleEngine - 决策树规则引擎核心
 * 解析并执行 JSON 规则定义，支持条件分支、循环、变量操作和自定义节点
 */
export class RuleEngine {
  private registry: CustomNodeRegistry;
  private loopStack: LoopFrame[] = [];
  private logger: Logger;
  private customFunctions: Record<string, CustomFunction> | undefined;

  constructor(options?: RuleEngineOptions) {
    this.registry = options?.registry ?? new CustomNodeRegistry();
    this.logger = options?.logger ?? new NoopLogger();
    this.customFunctions = options?.functions;
  }

  /**
   * 执行规则定义
   * 内部自动编译：预解析所有表达式并验证结构，然后执行
   * @param rule JSON 规则定义
   * @returns 执行结果
   */
  async execute(
    rule: RuleDefinition,
    options?: ExecuteOptions,
  ): Promise<ExecuteResult> {
    try {
      // 每次执行前重置循环栈，防止上次 abort 残留
      this.loopStack = [];

      // 预编译阶段：解析所有表达式并验证结构
      compileRule(rule, this.logger);

      const entry = rule.entry ?? "main";
      this.logger.info("[execute] 开始执行", {
        entry,
        nodeGroups: Object.keys(rule.nodes),
        variableKeys: rule.variables ? Object.keys(rule.variables) : [],
      });

      const ctx = new ExecutionContext(rule.variables);
      const nodes = rule.nodes[entry]!;

      const result = await this.executeNodes(nodes, ctx, options, "(execute)");

      // 如果是 return 信号，从上下文中取结果
      if (result.signal === ControlSignal.RETURN) {
        this.logger.info("[execute] 执行完成（return）", {
          status: result.result.status,
        });
        return result.result;
      }

      // 如果节点执行失败，返回失败结果
      if (result.result.status === "failed") {
        this.logger.warn("[execute] 执行完成（失败）", {
          error: result.result.error?.message,
        });
        return result.result;
      }

      // 正常结束，返回上下文中的所有变量
      this.logger.info("[execute] 执行完成（成功）");
      return {
        status: "success",
        data: ctx.toJSON() as AllowedValue,
      };
    } catch (err) {
      const error =
        err instanceof EngineError
          ? err
          : new EngineError(
              ErrorCode.EXECUTE_ERROR,
              `Rule execution failed: ${err instanceof Error ? err.message : String(err)}`,
              err,
            );

      this.logger.error("[execute] 执行异常", {
        message: error.message,
        code: error.code,
      });

      return {
        status: "failed",
        error,
      };
    }
  }

  /**
   * 执行一组节点
   * @returns 包含控制信号和执行结果
   */
  private async executeNodes(
    nodes: RuleNode[],
    ctx: ExecutionContext,
    options?: ExecuteOptions,
    groupName?: string,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) {
        this.logger.error("[executeNodes] 发现空节点", {
          group: groupName,
          index: i,
          total: nodes.length,
        });
        throw new EngineError(
          ErrorCode.NODE_TYPE_ERROR,
          `null/undefined node at index ${i} in group "${groupName ?? "?"}"`,
        );
      }
      this.logger.debug("[executeNodes] 执行节点", {
        type: node.type,
        label: (node as any).label,
      });
      const outcome = await this.executeNode(node, ctx, options);

      if (
        outcome.signal !== ControlSignal.NONE ||
        outcome.result.status === "failed"
      ) {
        return outcome;
      }
    }

    return { signal: ControlSignal.NONE, result: { status: "success" } };
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    node: RuleNode,
    ctx: ExecutionContext,
    options?: ExecuteOptions,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    // 构建步进上下文（复制 loopStack 快照，防止外部引用被后续 push/pop 修改）
    const stepCtx: StepContext = { node, loopStack: [...this.loopStack] };
    this.logger.debug("[executeNode] StepContext", { stepCtx });

    // 执行前暂停（如果 stepController 处于 stepping 模式）
    // if/while 节点在 executeIf/executeWhile 中有自己的条件判断暂停机制，此处跳过
    if (
      options?.stepController &&
      node.type !== "if" &&
      node.type !== "while"
    ) {
      this.logger.debug("[executeNode] beforeStep", {
        type: node.type,
        label: node.label,
      });
      const shouldContinue = await options.stepController.beforeStep(stepCtx);
      if (!shouldContinue) {
        this.logger.debug("[executeNode] beforeStep 返回 false，跳过");
        return { signal: ControlSignal.NONE, result: { status: "success" } };
      }
    }

    let outcome: { signal: ControlSignal; result: ExecuteResult };

    switch (node.type) {
      case "if":
        outcome = await this.executeIf(node, ctx, options);
        break;
      case "foreach":
        outcome = await this.executeForeach(node, ctx, options);
        break;
      case "while":
        outcome = await this.executeWhile(node, ctx, options);
        break;
      case "break":
        outcome = this.executeBreak();
        break;
      case "continue":
        outcome = this.executeContinue();
        break;
      case "return":
        outcome = await this.executeReturn(node, ctx);
        break;
      case "custom":
        outcome = await this.executeCustom(node, ctx);
        break;
      case "set":
        outcome = await this.executeSet(node, ctx);
        break;
      case "exec":
        outcome = await this.executeExec(node, ctx);
        break;
      default: {
        const _never: never = node;
        throw new EngineError(
          ErrorCode.NODE_TYPE_ERROR,
          `Unknown node type: ${(_never as { type: string }).type}`,
        );
      }
    }

    // 执行完后触发 stepController 的 afterStep
    options?.stepController?.afterStep(stepCtx, ctx, outcome.result);

    return outcome;
  }

  /**
   * IF 节点 - 条件分支（fork 子作用域，set 自动向上查找父级）
   */
  private async executeIf(
    node: Extract<RuleNode, { type: "if" }>,
    ctx: ExecutionContext,
    options?: ExecuteOptions,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    const stepController = options?.stepController;

    // ★ 条件判断前暂停（stepping 模式下，允许用户单步观察条件判断）
    if (stepController) {
      const shouldContinue = await stepController.beforeConditionCheck({
        type: "if",
        condition: node.condition,
        result: true, // 占位值，此时尚未求值
        loopStack: [...this.loopStack],
        nodeId: node.label,
        phase: "before",
      });
      if (!shouldContinue) {
        return { signal: ControlSignal.NONE, result: { status: "success" } };
      }
    }

    const condition = await evaluateExpression(
      node.condition,
      ctx,
      this.logger,
      this.customFunctions,
    );
    const branch = condition ? node.then : (node.else ?? []);

    this.logger.debug("[executeIf] 条件分支", {
      condition: node.condition,
      result: !!condition,
      branch: condition ? "then" : "else",
      thenLen: node.then.length,
      elseLen: (node.else ?? []).length,
    });

    // ★ 通知条件求值结果（用于日志描述增强）
    stepController?.onConditionCheck?.({
      type: "if",
      condition: node.condition,
      result: !!condition,
      loopStack: [...this.loopStack],
      nodeId: node.label,
      phase: "after",
    });

    if (branch.length === 0) {
      return { signal: ControlSignal.NONE, result: { status: "success" } };
    }

    const branchCtx = ctx.fork();
    return this.executeNodes(branch, branchCtx, options, "(if分支)");
  }

  /**
   * FOREACH 节点 - 遍历集合（fork 子作用域，set 自动向上查找父级）
   */
  private async executeForeach(
    node: Extract<RuleNode, { type: "foreach" }>,
    ctx: ExecutionContext,
    options?: ExecuteOptions,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    const collection = await evaluateExpression(
      node.collection,
      ctx,
      this.logger,
      this.customFunctions,
    );

    if (!Array.isArray(collection)) {
      return {
        signal: ControlSignal.NONE,
        result: {
          status: "success",
          data: null,
        },
      };
    }

    for (let i = 0; i < collection.length; i++) {
      this.logger.debug("[executeForeach] 迭代", {
        collection: node.collection,
        index: i,
        total: collection.length,
      });

      // ★ 通知迭代信息（用于日志描述增强）
      options?.stepController?.onConditionCheck?.({
        type: "foreach",
        condition: node.collection,
        result: true,
        loopStack: [...this.loopStack],
        iterationIndex: i,
        phase: "after",
      });

      // 为每次迭代创建子作用域
      const itemVar: Record<string, AllowedValue> = {
        [node.item]: collection[i] as AllowedValue,
      };
      if (node.index) {
        itemVar[node.index] = i;
      }
      const loopCtx = ctx.fork(itemVar);

      // 压入当前循环帧
      this.loopStack.push({
        type: "foreach",
        index: i,
        itemKey: node.item,
        total: collection.length,
      });

      const outcome = await this.executeNodes(
        node.body,
        loopCtx,
        options,
        "(foreach body)",
      );

      // 弹出当前循环帧
      this.loopStack.pop();

      // 处理 break 信号 - 跳出循环
      if (outcome.signal === ControlSignal.BREAK) {
        return { signal: ControlSignal.NONE, result: { status: "success" } };
      }

      // 处理 continue 信号 - 跳过当前迭代，继续下一轮
      if (outcome.signal === ControlSignal.CONTINUE) {
        continue;
      }

      // 处理 return 信号 - 传播到外层
      if (outcome.signal === ControlSignal.RETURN) {
        return outcome;
      }
    }

    return { signal: ControlSignal.NONE, result: { status: "success" } };
  }

  /**
   * WHILE 节点 — 条件循环
   * 每次条件判断前暂停（stepping 模式），求值后记录条件结果到日志
   */
  private async executeWhile(
    node: Extract<RuleNode, { type: "while" }>,
    ctx: ExecutionContext,
    options?: ExecuteOptions,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    let iterationIndex = 0;
    const stepController = options?.stepController;

    while (true) {
      // ★ 条件判断前暂停（stepping 模式下，允许用户单步观察条件判断）
      if (stepController) {
        const shouldContinue = await stepController.beforeConditionCheck({
          type: "while",
          condition: node.condition,
          result: true, // 占位值，此时尚未求值
          loopStack: [...this.loopStack],
          iterationIndex,
          nodeId: node.label,
          phase: "before",
        });
        if (!shouldContinue) {
          return { signal: ControlSignal.NONE, result: { status: "success" } };
        }
      }

      // 求值条件表达式
      const conditionResult =
        (await evaluateExpression(
          node.condition,
          ctx,
          this.logger,
          this.customFunctions,
        )) === true;

      // ★ 记录条件求值结果到日志
      stepController?.onConditionCheck?.({
        type: "while",
        condition: node.condition,
        result: conditionResult, // 真实结果
        loopStack: [...this.loopStack],
        iterationIndex,
        phase: "after",
      });

      // 条件为 false，退出循环
      if (!conditionResult) break;

      this.logger.debug("[executeWhile] 迭代", { index: iterationIndex });

      this.loopStack.push({
        type: "while",
        index: iterationIndex,
      });

      const outcome = await this.executeNodes(
        node.body,
        ctx,
        options,
        "(while body)",
      );

      this.loopStack.pop();

      if (outcome.signal === ControlSignal.BREAK) {
        return { signal: ControlSignal.NONE, result: { status: "success" } };
      }
      if (outcome.signal === ControlSignal.CONTINUE) {
        iterationIndex++;
        continue;
      }
      if (outcome.signal === ControlSignal.RETURN) {
        return outcome;
      }

      iterationIndex++;
    }
    return { signal: ControlSignal.NONE, result: { status: "success" } };
  }

  /**
   * BREAK 节点 - 跳出循环
   */
  private executeBreak(): { signal: ControlSignal; result: ExecuteResult } {
    if (this.loopStack.length === 0) {
      this.logger.warn("[executeBreak] 不在循环内，忽略");
      return {
        signal: ControlSignal.NONE,
        result: {
          status: "failed",
          error: new EngineError(
            ErrorCode.NODE_TYPE_ERROR,
            "'break' can only be used inside a foreach/while",
          ),
        },
      };
    }
    this.logger.debug("[executeBreak] 跳出循环");
    return { signal: ControlSignal.BREAK, result: { status: "success" } };
  }

  /**
   * CONTINUE 节点 - 跳过当前迭代
   */
  private executeContinue(): { signal: ControlSignal; result: ExecuteResult } {
    if (this.loopStack.length === 0) {
      this.logger.warn("[executeContinue] 不在循环内，忽略");
      return {
        signal: ControlSignal.NONE,
        result: {
          status: "failed",
          error: new EngineError(
            ErrorCode.NODE_TYPE_ERROR,
            "'continue' can only be used inside a foreach/while",
          ),
        },
      };
    }
    this.logger.debug("[executeContinue] 跳过迭代");
    return { signal: ControlSignal.CONTINUE, result: { status: "success" } };
  }

  /**
   * RETURN 节点 - 终止规则执行
   */
  private async executeReturn(
    node: Extract<RuleNode, { type: "return" }>,
    ctx: ExecutionContext,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    let value: AllowedValue = undefined;

    if (node.value !== undefined) {
      value = (await evaluateExpression(
        node.value,
        ctx,
        this.logger,
        this.customFunctions,
      )) as AllowedValue;
    }

    this.logger.debug("[executeReturn] 终止执行", {
      hasValue: value !== undefined,
    });

    return {
      signal: ControlSignal.RETURN,
      result: {
        status: "success",
        data: value,
      },
    };
  }

  /**
   * CUSTOM 节点 - 执行自定义处理器
   */
  private async executeCustom(
    node: Extract<RuleNode, { type: "custom" }>,
    ctx: ExecutionContext,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    const handler = this.registry.get(node.name);

    if (!handler) {
      this.logger.warn("[executeCustom] 处理器未找到", {
        handlerName: node.name,
      });
      return {
        signal: ControlSignal.NONE,
        result: {
          status: "failed",
          error: new EngineError(
            ErrorCode.CUSTOM_NODE_NOT_FOUND,
            `Custom node handler '${node.name}' not found`,
          ),
        },
      };
    }

    this.logger.debug("[executeCustom] 执行处理器", { name: node.name });

    // 求值参数（params 是 AssignTemplate，求值后传给 handler）
    const params = node.params
      ? await evaluateAssign(
          node.params,
          ctx,
          this.logger,
          this.customFunctions,
        )
      : undefined;

    // 执行自定义处理器
    const result = await handler(params, ctx);

    return {
      signal: ControlSignal.NONE,
      result,
    };
  }

  /**
   * SET 节点 - 设置变量值
   */
  private async executeSet(
    node: Extract<RuleNode, { type: "set" }>,
    ctx: ExecutionContext,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    // 执行期守卫：variable 不能为空（编译期已校验，此处防御性检查）
    if (!node.variable || node.variable.trim() === "") {
      throw new EngineError(
        ErrorCode.NODE_TYPE_ERROR,
        "Set node must have a non-empty variable",
      );
    }

    const value = await evaluateAssign(
      node.value,
      ctx,
      this.logger,
      this.customFunctions,
    );
    ctx.set(node.variable, value);
    this.logger.debug("[executeSet] 变量变更", {
      variable: node.variable,
      valueType: typeof value,
      value: value,
    });
    return {
      signal: ControlSignal.NONE,
      result: { status: "success", data: value },
    };
  }

  /**
   * EXEC 节点 - 执行表达式并丢弃返回值（用于副作用函数）
   */
  private async executeExec(
    node: Extract<RuleNode, { type: "exec" }>,
    ctx: ExecutionContext,
  ): Promise<{ signal: ControlSignal; result: ExecuteResult }> {
    // 执行期守卫：expression 不能为空（编译期已校验，此处防御性检查）
    if (!node.expression || node.expression.trim() === "") {
      throw new EngineError(
        ErrorCode.NODE_TYPE_ERROR,
        "Exec node must have a non-empty expression",
      );
    }

    await evaluateExpression(
      node.expression,
      ctx,
      this.logger,
      this.customFunctions,
    );
    return {
      signal: ControlSignal.NONE,
      result: { status: "success", data: null },
    };
  }
}
