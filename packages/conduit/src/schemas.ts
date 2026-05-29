import Ajv, { type ValidateFunction } from "ajv";

/**
 * @grimoire/rune 规则定义 JSON Schema（内联自 packages/rune/schema/rule-definition.schema.json）
 * 作为 const 内联以避免运行时文件路径依赖，同时保证 schema 与 rune 包版本一致
 */
export const RULE_DEFINITION_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/rune/schema/rule-definition.schema.json",
  title: "RuleDefinition",
  description:
    "@grimoire/rune 规则引擎的 JSON Schema，用于校验规则定义文件的结构正确性",
  definitions: {
    AssignTemplate: {
      description:
        "赋值模板 — 递归结构，支持字面量、嵌套对象/数组和 ${expr} 模板字符串",
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array", items: { $ref: "#/definitions/AssignTemplate" } },
        {
          type: "object",
          additionalProperties: { $ref: "#/definitions/AssignTemplate" },
        },
      ],
    },
    AllowedValue: {
      description: "规则引擎允许的变量值类型 — 基本类型、对象和数组",
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        {
          type: "object",
          additionalProperties: { $ref: "#/definitions/AllowedValue" },
        },
        { type: "array", items: { $ref: "#/definitions/AllowedValue" } },
      ],
    },
    SetNode: {
      description: "SET 节点 — 设置变量值，value 支持嵌套模板",
      type: "object",
      properties: {
        type: { const: "set" },
        label: {
          type: "string",
          description: "节点标识，用于可视化、调试和追踪",
        },
        variable: {
          type: "string",
          description: "目标变量路径，如 data.result.title",
        },
        value: { $ref: "#/definitions/AssignTemplate" },
      },
      required: ["type", "variable", "value"],
      additionalProperties: false,
    },
    ExecNode: {
      description:
        "EXEC 节点 — 执行表达式并丢弃返回值（用于副作用函数如日志、HTTP 调用等）",
      type: "object",
      properties: {
        type: { const: "exec" },
        label: { type: "string", description: "节点标识" },
        expression: {
          type: "string",
          description: "纯表达式字符串，如 log(data.result)",
        },
      },
      required: ["type", "expression"],
      additionalProperties: false,
    },
    IfNode: {
      description: "IF 节点 — 条件分支",
      type: "object",
      properties: {
        type: { const: "if" },
        label: { type: "string", description: "节点标识" },
        condition: {
          type: "string",
          description: "求值为 boolean 的表达式，如 exists(data.keyword)",
        },
        then: {
          type: "array",
          description: "条件为真时执行的节点列表",
          items: { $ref: "#/definitions/RuleNode" },
        },
        else: {
          type: "array",
          description: "条件为假时执行的节点列表",
          items: { $ref: "#/definitions/RuleNode" },
        },
      },
      required: ["type", "condition", "then"],
      additionalProperties: false,
    },
    ForeachNode: {
      description: "FOREACH 节点 — 遍历集合",
      type: "object",
      properties: {
        type: { const: "foreach" },
        label: { type: "string", description: "节点标识" },
        collection: { type: "string", description: "求值为数组的表达式" },
        item: { type: "string", description: "当前项的变量名，如 item" },
        index: { type: "string", description: "索引的变量名，如 idx" },
        body: {
          type: "array",
          description: "每次迭代执行的节点列表",
          items: { $ref: "#/definitions/RuleNode" },
        },
      },
      required: ["type", "collection", "item", "body"],
      additionalProperties: false,
    },
    WhileNode: {
      description: "WHILE 节点 — 条件循环",
      type: "object",
      properties: {
        type: { const: "while" },
        label: { type: "string", description: "节点标识" },
        condition: { type: "string", description: "求值为 boolean 的表达式" },
        body: {
          type: "array",
          description: "循环体节点列表",
          items: { $ref: "#/definitions/RuleNode" },
        },
      },
      required: ["type", "condition", "body"],
      additionalProperties: false,
    },
    BreakNode: {
      description: "BREAK 节点 — 跳出当前循环",
      type: "object",
      properties: {
        type: { const: "break" },
        label: { type: "string", description: "节点标识" },
      },
      required: ["type"],
      additionalProperties: false,
    },
    ContinueNode: {
      description: "CONTINUE 节点 — 跳过当前迭代，继续下一轮",
      type: "object",
      properties: {
        type: { const: "continue" },
        label: { type: "string", description: "节点标识" },
      },
      required: ["type"],
      additionalProperties: false,
    },
    ReturnNode: {
      description: "RETURN 节点 — 终止规则执行并返回结果",
      type: "object",
      properties: {
        type: { const: "return" },
        label: { type: "string", description: "节点标识" },
        value: { type: "string", description: "可选的返回值表达式" },
      },
      required: ["type"],
      additionalProperties: false,
    },
    CustomNode: {
      description: "CUSTOM 节点 — 自定义业务节点",
      type: "object",
      properties: {
        type: { const: "custom" },
        label: { type: "string", description: "节点标识" },
        name: {
          type: "string",
          description: "注册的处理函数名称，如 http.get",
        },
        params: { $ref: "#/definitions/AssignTemplate" },
      },
      required: ["type", "name"],
      additionalProperties: false,
    },
    RuleNode: {
      description:
        "规则节点 — 按 type 字段区分的 discriminated union，共 9 种节点类型",
      oneOf: [
        { $ref: "#/definitions/SetNode" },
        { $ref: "#/definitions/ExecNode" },
        { $ref: "#/definitions/IfNode" },
        { $ref: "#/definitions/ForeachNode" },
        { $ref: "#/definitions/WhileNode" },
        { $ref: "#/definitions/BreakNode" },
        { $ref: "#/definitions/ContinueNode" },
        { $ref: "#/definitions/ReturnNode" },
        { $ref: "#/definitions/CustomNode" },
      ],
    },
  },
  type: "object",
  properties: {
    name: { type: "string", description: "规则名称，用于调试和日志" },
    entry: {
      type: "string",
      description: "入口节点组名称，默认为 main",
      default: "main",
    },
    variables: {
      type: "object",
      description: "初始变量值 — 仅支持基本类型、对象和数组",
      additionalProperties: { $ref: "#/definitions/AllowedValue" },
    },
    nodes: {
      type: "object",
      description: "命名节点组 — 每个 key 是一个节点组名称，value 是其节点列表",
      additionalProperties: {
        type: "array",
        items: { $ref: "#/definitions/RuleNode" },
      },
    },
  },
  required: ["nodes"],
  additionalProperties: false,
} as const;

/**
 * @grimoire/conduit media provider JSON Schema（内联自 packages/conduit/schema/media-provider.schema.json）
 */
export const MEDIA_PROVIDER_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/conduit/schema/media-provider.schema.json",
  title: "Grimoire Media Provider",
  description: "Grimoire media provider configuration schema",
  type: "object",
  definitions: {
    FeatureRule: {
      $ref: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/rune/schema/rule-definition.schema.json",
    },
  },
  properties: {
    namespace: {
      type: "string",
      description: "The namespace of the media provider",
    },
    name: { type: "string", description: "The name of the media provider" },
    author: { type: "string", description: "The author of the media provider" },
    url: { type: "string", description: "The URL of the media provider" },
    version: {
      type: "string",
      description: "The version of the media provider",
      pattern:
        "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
    },
    versionCode: {
      type: "integer",
      description: "The version code of the media provider",
      minimum: 0,
    },
    features: {
      type: "array",
      description:
        "The features supported by the media provider, use @grimoire/rune",
      items: { $ref: "#/definitions/FeatureRule" },
      contains: {
        type: "object",
        properties: { name: { const: "media-explore" } },
      },
      minItems: 1,
    },
  },
  required: ["namespace", "name", "version", "versionCode", "features"],
} as const;

/** 加载并编译 JSON Schema，返回 ajv 校验函数 */
export function createSchemaValidator(): ValidateFunction {
  const ajv = new Ajv({ allErrors: true });
  // 注册 rune schema，key 使用其 $id（与 conduit schema 中的 $ref 一致）
  ajv.addSchema(RULE_DEFINITION_SCHEMA, RULE_DEFINITION_SCHEMA.$id);
  // 编译 conduit schema
  return ajv.compile(MEDIA_PROVIDER_SCHEMA);
}
