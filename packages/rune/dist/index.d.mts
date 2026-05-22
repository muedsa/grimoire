declare enum ErrorCode {
    NODE_TYPE_ERROR = "NODE_TYPE_ERROR",
    EXPRESSION_ERROR = "EXPRESSION_ERROR",
    CUSTOM_NODE_NOT_FOUND = "CUSTOM_NODE_NOT_FOUND",
    EXECUTE_ERROR = "EXECUTE_ERROR"
}
declare class EngineError extends Error {
    code: ErrorCode;
    cause?: unknown;
    constructor(code: ErrorCode, message: string, cause?: unknown);
}

type NodeType = "if" | "foreach" | "while" | "break" | "continue" | "return" | "custom" | "set" | "exec";
type ExecuteStatus = "success" | "failed";
/**
 * 规则引擎允许的变量值类型
 * - 基本类型: string, number, boolean, null, undefined
 * - 对象: 键为字符串，值为 AllowedValue 或 AllowedValue[]
 * - 数组: 元素为 AllowedValue
 * 不支持: Map, Set, Date, RegExp, Function, Promise, Symbol, BigInt 等
 */
type AllowedValue = string | number | boolean | null | undefined | AllowedObject | AllowedValue[];
/** 允许的对象类型 - 键值对结构，值可以是基本类型或数组 */
interface AllowedObject {
    [key: string]: AllowedValue;
}
type BaseNode = {
    type: NodeType;
    label?: string;
};
type ExecuteResult = {
    status: ExecuteStatus;
    data?: AllowedValue;
    error?: EngineError;
};

/**
 * 执行上下文 - 规则执行期间的变量存储
 * 支持点路径访问、子作用域（循环用）、变量合并导出
 * 变量值仅支持基本类型、对象和数组
 */

declare class ExecutionContext {
    private store;
    private parent?;
    constructor(initial?: Record<string, AllowedValue>, parent?: ExecutionContext);
    /**
     * 通过点路径获取值（如 "data.user.name"）
     * 如果当前作用域找不到，向上查找父作用域
     */
    get(path: string): AllowedValue;
    /**
     * 通过点路径设置值（如 "result.items.0.name"）
     * 如果变量的根键已在父级存在，则写入父级；否则在当前作用域创建
     * 这符合现代编程语言的块级作用域直觉
     */
    set(path: string, value: AllowedValue): void;
    /**
     * 沿 parent 链查找包含指定根键的作用域
     */
    private findTargetContext;
    /**
     * 创建子作用域（用于循环迭代）
     * 子作用域可以访问父作用域的变量，但新变量不会泄漏到父作用域
     */
    fork(overrides?: Record<string, AllowedValue>): ExecutionContext;
    /**
     * 将上下文中的所有变量合并为一个扁平对象（用于返回值）
     */
    toJSON(): AllowedObject;
    /** 解析路径片段在值对象中的嵌套访问 */
    private resolvePath;
    /** 递归设置嵌套值（支持数组索引） */
    private setNestedValue;
}

/**
 * 自定义节点处理器 - 由外部注册的业务逻辑
 */
type CustomNodeHandler = (params: AllowedValue, // 已求值的参数（与 set.value 使用同一套模板系统）
context: ExecutionContext) => ExecuteResult | Promise<ExecuteResult>;
/**
 * 自定义节点注册表 - 用于管理和查找自定义节点处理器
 */
declare class CustomNodeRegistry {
    private handlers;
    /**
     * 注册自定义节点处理器
     * @param name 处理器名称，如 "http.get", "data.parse"
     * @param handler 处理函数
     */
    register(name: string, handler: CustomNodeHandler): void;
    /**
     * 获取已注册的处理器
     */
    get(name: string): CustomNodeHandler | undefined;
    /**
     * 检查是否已注册
     */
    has(name: string): boolean;
    /**
     * 获取所有已注册的处理器名称
     */
    names(): string[];
}

/** 表达式 AST 节点类型 */
type LiteralKind = "string" | "number" | "boolean" | "null";
interface LiteralNode {
    kind: "literal";
    type: LiteralKind;
    value: string | number | boolean | null;
}
interface PathNode {
    kind: "path";
    segments: PathSegment[];
}
/** 方括号索引段 — 存储括号内的表达式 */
interface BracketSegment {
    kind: "bracket";
    expr: ASTNode;
}
/** 路径段的类型 — 字符串属性名或方括号索引 */
type PathSegment = string | BracketSegment;
interface BinaryOpNode {
    kind: "binary";
    operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "&&" | "||" | "+" | "-" | "*" | "/" | "%";
    left: ASTNode;
    right: ASTNode;
}
interface UnaryOpNode {
    kind: "unary";
    operator: "!" | "-";
    argument: ASTNode;
}
interface CallNode {
    kind: "call";
    target: PathNode;
    args: ASTNode[];
}
interface ParenNode {
    kind: "paren";
    expression: ASTNode;
}
/** 数组字面量 */
interface ArrayNode {
    kind: "array";
    elements: ASTNode[];
}
/** 对象字面量 */
interface ObjectNode {
    kind: "object";
    properties: {
        key: string;
        value: ASTNode;
    }[];
}
/** AST 节点联合类型 */
type ASTNode = LiteralNode | PathNode | BinaryOpNode | UnaryOpNode | CallNode | ParenNode | BracketSegment | ArrayNode | ObjectNode;

/**
 * 标准四级日志接口
 * 引擎内部通过此接口输出日志，调用方自行实现（如适配 winston、pino 等）
 */
interface Logger {
    /** 调试信息 — 详细的内部状态，仅开发/排查时关注 */
    debug(message: string, data?: unknown): void;
    /** 常规信息 — 执行流程的关键节点 */
    info(message: string, data?: unknown): void;
    /** 警告 — 非致命异常，如降级处理 */
    warn(message: string, data?: unknown): void;
    /** 错误 — 执行失败、异常 */
    error(message: string, data?: unknown): void;
}
/**
 * 默认空日志实现 — 所有方法为空操作，零开销
 * 调用方不传 logger 时使用此实现
 */
declare class NoopLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
    error(): void;
}

/** 自定义函数类型 — 由用户注册，在表达式中可调用，支持同步和异步 */
type CustomFunction = (...args: AllowedValue[]) => AllowedValue | Promise<AllowedValue>;
/**
 * 求值单个 AST 节点
 */
declare function evaluate(node: ASTNode, ctx: ExecutionContext, logger?: Logger, customFunctions?: Record<string, CustomFunction>): Promise<AllowedValue>;
/**
 * 求值表达式字符串（解析 + 求值）
 */
declare function evaluateExpression(expr: string, ctx: ExecutionContext, logger?: Logger, customFunctions?: Record<string, CustomFunction>): Promise<AllowedValue>;

/**
 * 表达式类型 - 使用字符串形式的表达式语言
 * 语法示例: "data.items.len() > 0 && data.user.level >= 3"
 */
type Expression = string;
/** IF 节点 - 条件分支 */
interface IfNode extends BaseNode {
    type: "if";
    condition: Expression;
    then: RuleNode[];
    else?: RuleNode[];
}
/** FOREACH 节点 - 遍历集合 */
interface ForeachNode extends BaseNode {
    type: "foreach";
    collection: Expression;
    item: string;
    index?: string;
    body: RuleNode[];
}
/** WHILE 节点 — 条件循环 */
interface WhileNode extends BaseNode {
    type: "while";
    condition: Expression;
    body: RuleNode[];
}
/** BREAK 节点 - 跳出循环 */
interface BreakNode extends BaseNode {
    type: "break";
}
/** CONTINUE 节点 - 跳过当前迭代，继续下一轮 */
interface ContinueNode extends BaseNode {
    type: "continue";
}
/** RETURN 节点 - 终止规则执行 */
interface ReturnNode extends BaseNode {
    type: "return";
    value?: Expression;
}
/** CUSTOM 节点 - 自定义业务节点 */
interface CustomNode extends BaseNode {
    type: "custom";
    name: string;
    params?: AssignTemplate;
}
/** SET 节点 - 设置变量值，支持嵌套模板 */
interface SetNode extends BaseNode {
    type: "set";
    variable: string;
    value: AssignTemplate;
}
/** EXEC 节点 - 执行纯表达式并丢弃返回值（用于副作用函数如日志、HTTP 调用等） */
interface ExecNode extends BaseNode {
    type: "exec";
    expression: Expression;
}
/** 赋值模板 — 递归结构，支持嵌套对象/数组和 ${expr} 模板字符串 */
type AssignTemplate = string | number | boolean | null | AssignTemplate[] | {
    [key: string]: AssignTemplate;
};
/** 所有具体节点类型的联合类型（discriminated union） */
type RuleNode = IfNode | ForeachNode | WhileNode | BreakNode | ContinueNode | ReturnNode | CustomNode | SetNode | ExecNode;

/**
 * 规则定义 - JSON规则的顶层结构
 *
 * 示例:
 * {
 *   "name": "media-search-rule",
 *   "entry": "main",
 *   "variables": { "data": { "keyword": "test" } },
 *   "nodes": {
 *     "main": [
 *       { "type": "if", "condition": "exists(data.keyword)", "then": [...], "else": [...] }
 *     ]
 *   }
 * }
 */
interface RuleDefinition {
    /** 规则名称（可选，用于调试和日志） */
    name?: string;
    /** 入口节点组名称，默认为 "main" */
    entry?: string;
    /** 初始变量值 - 仅支持基本类型、对象和数组 */
    variables?: Record<string, AllowedValue>;
    /** 命名节点组 - 每个 key 是一个路径/标签，value 是节点数组 */
    nodes: Record<string, RuleNode[]>;
}

/** 单层循环帧 — 描述当前所在的一层循环 */
interface LoopFrame {
    type: "foreach" | "while";
    index: number;
    itemKey?: string;
    total?: number;
}
/** 步进上下文 — 替换原来单独传 node 的方式 */
interface StepContext {
    node: RuleNode;
    loopStack: LoopFrame[];
}
/** 条件检查信息 — 在 while/if/foreach 的条件判断时传递 */
interface ConditionCheckInfo {
    type: "while" | "if" | "foreach";
    condition: string;
    result: boolean;
    loopStack: LoopFrame[];
    iterationIndex?: number;
    phase: "before" | "after";
    /** 所在节点的 label（用于调试态高亮对应节点） */
    nodeId?: string;
}
/**
 * 调试步进控制器 — 用于在节点执行前暂停引擎，等待外部指令继续。
 *
 * 工作模式：
 * - stepping: 每执行一个节点前暂停，等待 resume()
 * - running: 不暂停，连续执行
 */
declare class DebugStepController {
    private mode;
    private resolveWait;
    private rejectWait;
    private lastResult;
    /** 暂停时的回调，通知外部"引擎已暂停在某个节点前"。 */
    onPause?: (context: StepContext) => void;
    /** 节点执行完成后的回调，用于记录日志。 */
    onAfterStep?: (context: StepContext, ctx: ExecutionContext, prevResult: ExecuteResult | null) => void;
    /** 条件检查事件回调 — before 阶段暂停UI，after 阶段记录日志。 */
    onConditionCheck?: (info: ConditionCheckInfo) => void;
    /**
     * 在节点执行前调用。
     * 如果处于 stepping 模式，返回一个 Promise，直到 step() / runToCompletion() / abort() 才 resolve。
     * 如果处于 running 模式，立即返回 true。
     *
     * @returns true 表示可以继续执行，false 表示被中止
     */
    beforeStep(context: StepContext): Promise<boolean>;
    /** 节点执行完成后调用，触发 onAfterStep 回调。 */
    afterStep(context: StepContext, ctx: ExecutionContext, result: ExecuteResult): void;
    /** 获取上一次执行的结果。 */
    getLastResult(): ExecuteResult | null;
    /**
     * 条件判断前暂停 — 与 beforeStep 共享 pause 机制。
     * 在 while 循环每次条件求值前调用，允许用户单步观察条件判断过程。
     */
    beforeConditionCheck(info: ConditionCheckInfo): Promise<boolean>;
    /** 执行下一步（暂停 → 恢复执行一个节点） */
    step(): void;
    /** 继续运行直到结束（恢复执行，不再暂停） */
    runToCompletion(): void;
    /** 中止调试会话 */
    abort(): void;
}

/**
 * 控制信号 - 用于在调用栈中传播控制流
 */
declare enum ControlSignal {
    NONE = "none",
    BREAK = "break",// 跳出最近的一层循环
    CONTINUE = "continue",// 跳过当前迭代，继续下一轮
    RETURN = "return"
}
interface ExecuteOptions {
    stepController?: DebugStepController;
}
/** RuleEngine 构造选项 */
interface RuleEngineOptions {
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
declare class RuleEngine {
    private registry;
    private loopStack;
    private logger;
    private customFunctions;
    constructor(options?: RuleEngineOptions);
    /**
     * 执行规则定义
     * 内部自动编译：预解析所有表达式并验证结构，然后执行
     * @param rule JSON 规则定义
     * @returns 执行结果
     */
    execute(rule: RuleDefinition, options?: ExecuteOptions): Promise<ExecuteResult>;
    /**
     * 执行一组节点
     * @returns 包含控制信号和执行结果
     */
    private executeNodes;
    /**
     * 执行单个节点
     */
    private executeNode;
    /**
     * IF 节点 - 条件分支（fork 子作用域，set 自动向上查找父级）
     */
    private executeIf;
    /**
     * FOREACH 节点 - 遍历集合（fork 子作用域，set 自动向上查找父级）
     */
    private executeForeach;
    /**
     * WHILE 节点 — 条件循环
     * 每次条件判断前暂停（stepping 模式），求值后记录条件结果到日志
     */
    private executeWhile;
    /**
     * BREAK 节点 - 跳出循环
     */
    private executeBreak;
    /**
     * CONTINUE 节点 - 跳过当前迭代
     */
    private executeContinue;
    /**
     * RETURN 节点 - 终止规则执行
     */
    private executeReturn;
    /**
     * CUSTOM 节点 - 执行自定义处理器
     */
    private executeCustom;
    /**
     * SET 节点 - 设置变量值
     */
    private executeSet;
    /**
     * EXEC 节点 - 执行表达式并丢弃返回值（用于副作用函数）
     */
    private executeExec;
}

/**
 * 编译规则定义 — 预解析所有表达式并验证结构完整性
 *
 * 作用：
 * 1. 预编译所有表达式（IfNode.condition、LoopNode.collection、ReturnNode.value、
 *    SetNode.value、CustomNode.params），将 AST 存入全局缓存
 * 2. 验证规则结构：入口节点存在、节点组非空
 * 3. 在规则加载时就发现错误，避免执行到一半才报错
 *
 * @param rule 规则定义
 * @throws EngineError 如果规则结构无效或表达式解析失败
 */
declare function compileRule(rule: RuleDefinition, logger?: Logger): void;

declare function compileExpression(input: string): ASTNode;
declare function parseExpression(input: string): ASTNode;
/**
 * 清除表达式缓存（主要用于测试）
 */
declare function clearExpressionCache(): void;

export { type ASTNode, type AllowedObject, type AllowedValue, type AssignTemplate, type BaseNode, type BinaryOpNode, type BreakNode, type CallNode, type ConditionCheckInfo, type ContinueNode, ControlSignal, type CustomFunction, type CustomNode, type CustomNodeHandler, CustomNodeRegistry, DebugStepController, EngineError, ErrorCode, type ExecNode, type ExecuteOptions, type ExecuteResult, type ExecuteStatus, ExecutionContext, type Expression, type ForeachNode, type IfNode, type LiteralNode, type Logger, type LoopFrame, type NodeType, NoopLogger, type ParenNode, type PathNode, type ReturnNode, type RuleDefinition, RuleEngine, type RuleNode, type SetNode, type StepContext, type UnaryOpNode, type WhileNode, clearExpressionCache, compileExpression, compileRule, evaluate, evaluateExpression, parseExpression };
