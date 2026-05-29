import {
  ASTNode,
  LiteralNode,
  PathNode,
  BinaryOpNode,
  UnaryOpNode,
  CallNode,
  ParenNode,
  BracketSegment,
} from "./types";
import { parseExpression } from "./parser";
import { ExecutionContext } from "../context/context";
import { AllowedValue } from "../types/node";
import { Logger } from "../logger";
import { builtins } from "./builtins";

/** 自定义函数类型 — 由用户注册，在表达式中可调用，支持同步和异步 */
export type CustomFunction = (
  ...args: AllowedValue[]
) => AllowedValue | Promise<AllowedValue>;

/**
 * 求值单个 AST 节点
 */
export async function evaluate(
  node: ASTNode,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  switch (node.kind) {
    case "literal":
      return evaluateLiteral(node);
    case "path":
      return await evaluatePath(node, ctx, logger, customFunctions);
    case "binary":
      return await evaluateBinary(node, ctx, logger, customFunctions);
    case "unary":
      return await evaluateUnary(node, ctx, logger, customFunctions);
    case "call":
      return await evaluateCall(node, ctx, logger, customFunctions);
    case "paren":
      return await evaluate(node.expression, ctx, logger, customFunctions);
    case "bracket":
      return await evaluate(node.expr, ctx, logger, customFunctions);
    case "array":
      return await Promise.all(
        node.elements.map((el) => evaluate(el, ctx, logger, customFunctions)),
      );
    case "object": {
      const obj: Record<string, AllowedValue> = {};
      for (const prop of node.properties) {
        obj[prop.key] = await evaluate(
          prop.value,
          ctx,
          logger,
          customFunctions,
        );
      }
      return obj;
    }
    default: {
      const _never: never = node;
      throw new Error(`Unknown AST node kind: ${(_never as ASTNode).kind}`);
    }
  }
}

/**
 * 求值表达式字符串（解析 + 求值）
 */
export async function evaluateExpression(
  expr: string,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  logger?.debug("[evaluateExpression] 求值", { expr });
  const ast = parseExpression(expr);
  return await evaluate(ast, ctx, logger, customFunctions);
}

function evaluateLiteral(node: LiteralNode): AllowedValue {
  return node.value;
}

async function evaluatePath(
  node: PathNode,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  // 首段可以是变量名（string）或表达式（BracketSegment，如 fn().prop 语法）
  const first = node.segments[0];
  let value: AllowedValue;
  if (typeof first === "string") {
    value = ctx.get(first);
  } else {
    value = await evaluate(first.expr, ctx, logger, customFunctions);
  }

  for (let i = 1; i < node.segments.length; i++) {
    const seg = node.segments[i];
    if (typeof seg === "string") {
      if (value == null || typeof value !== "object") {
        logger?.warn("[evaluatePath] 路径访问返回 undefined", {
          segment: seg,
          index: i,
          valueType: value === null ? "null" : typeof value,
        });
        return undefined;
      }
      value = (value as Record<string, AllowedValue>)[seg];
    } else {
      const index = await evaluate(seg.expr, ctx, logger, customFunctions);
      if (Array.isArray(value)) {
        const idx = typeof index === "number" ? index : Number(index);
        value = value[idx];
      } else if (value != null && typeof value === "object") {
        const key = String(index);
        value = (value as Record<string, AllowedValue>)[key];
      } else {
        return undefined;
      }
    }
  }

  return value;
}

async function evaluateBinary(
  node: BinaryOpNode,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  const left = await evaluate(node.left, ctx, logger, customFunctions);
  const right = await evaluate(node.right, ctx, logger, customFunctions);

  let result: AllowedValue;

  switch (node.operator) {
    case "&&":
      result = left && right;
      break;
    case "||":
      result = left || right;
      break;
    case "==":
      result = left == right;
      break; // 宽松相等，适合JSON场景
    case "!=":
      result = left != right;
      break;
    case ">":
      result = (left as number) > (right as number);
      break;
    case "<":
      result = (left as number) < (right as number);
      break;
    case ">=":
      result = (left as number) >= (right as number);
      break;
    case "<=":
      result = (left as number) <= (right as number);
      break;
    case "+":
      result = (left as number) + (right as number);
      break;
    case "-":
      result = (left as number) - (right as number);
      break;
    case "*":
      result = (left as number) * (right as number);
      break;
    case "/":
      result = (left as number) / (right as number);
      break;
    case "%":
      result = (left as number) % (right as number);
      break;
    default:
      throw new Error(`Unknown binary operator: ${node.operator}`);
  }

  logger?.debug("[evaluateBinary] 运算", {
    operator: node.operator,
    left,
    right,
    result,
  });

  return result;
}

async function evaluateUnary(
  node: UnaryOpNode,
  ctx: ExecutionContext,
  _logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  const value = await evaluate(node.argument, ctx, _logger, customFunctions);
  switch (node.operator) {
    case "!":
      return !value;
    case "-":
      return -(value as number);
    default:
      throw new Error(`Unknown unary operator: ${node.operator}`);
  }
}

/** 求值路径前缀（前 n-1 段），返回接收者对象 */
async function evaluateReceiver(
  segments: (string | BracketSegment)[],
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  const first = segments[0];
  let value: AllowedValue;
  if (typeof first === "string") {
    value = ctx.get(first);
  } else {
    value = await evaluate(first.expr, ctx, logger, customFunctions);
  }
  for (let i = 1; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (value == null || typeof value !== "object") return undefined;
    if (typeof seg === "string") {
      value = (value as Record<string, AllowedValue>)[seg];
    } else {
      const idx = await evaluate(seg.expr, ctx, logger, customFunctions);
      const key = typeof idx === "number" ? idx : String(idx);
      if (Array.isArray(value)) {
        const arrIdx = typeof idx === "number" ? idx : Number(idx);
        if (!Number.isFinite(arrIdx)) return undefined;
        value = value[arrIdx];
      } else {
        value = (value as Record<string, AllowedValue>)[key];
      }
    }
  }
  return value;
}

async function evaluateCall(
  node: CallNode,
  ctx: ExecutionContext,
  logger?: Logger,
  customFunctions?: Record<string, CustomFunction>,
): Promise<AllowedValue> {
  const segments = node.target.segments;
  const lastSeg = segments[segments.length - 1];
  if (!lastSeg || typeof lastSeg !== "string") {
    throw new Error("Invalid function name in call expression");
  }
  const methodName = lastSeg;

  logger?.debug("[evaluateCall] 函数调用", {
    methodName,
    argCount: node.args.length,
    segments: segments.length,
  });

  // 路径包含多段 / 首段为表达式 → obj.method() 方法调度
  const firstSeg = segments[0];
  if (segments.length > 1 || typeof firstSeg !== "string") {
    const receiver = await evaluateReceiver(
      segments,
      ctx,
      logger,
      customFunctions,
    );
    if (receiver != null && typeof receiver === "object") {
      const method = (receiver as Record<string, unknown>)[methodName];
      if (typeof method === "function") {
        const args = await Promise.all(
          node.args.map((arg) => evaluate(arg, ctx, logger, customFunctions)),
        );
        return (await (
          method as (
            ...a: AllowedValue[]
          ) => AllowedValue | Promise<AllowedValue>
        ).apply(receiver, args)) as AllowedValue;
      }
    }
    throw new Error(
      `Method '${methodName}' not found on ${
        receiver === null ? "null" : typeof receiver
      }`,
    );
  }

  // 单段函数名 → 内置函数 / 自定义函数查找
  let fn: CustomFunction | undefined = builtins[methodName];
  if (!fn && customFunctions) {
    fn = customFunctions[methodName];
  }
  if (fn) {
    const args = await Promise.all(
      node.args.map((arg) => evaluate(arg, ctx, logger, customFunctions)),
    );
    return (await fn(...args)) as AllowedValue;
  }

  throw new Error(`Unknown function: ${methodName}`);
}
