"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MediaProviderManager: () => MediaProviderManager
});
module.exports = __toCommonJS(index_exports);

// src/media-provider-manager.ts
var import_rune = require("@grimoire/rune");
var import_talisman = require("@grimoire/talisman");

// src/schemas.ts
var import_ajv = __toESM(require("ajv"));
var RULE_DEFINITION_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/rune/schema/rule-definition.schema.json",
  title: "RuleDefinition",
  description: "@grimoire/rune \u89C4\u5219\u5F15\u64CE\u7684 JSON Schema\uFF0C\u7528\u4E8E\u6821\u9A8C\u89C4\u5219\u5B9A\u4E49\u6587\u4EF6\u7684\u7ED3\u6784\u6B63\u786E\u6027",
  definitions: {
    AssignTemplate: {
      description: "\u8D4B\u503C\u6A21\u677F \u2014 \u9012\u5F52\u7ED3\u6784\uFF0C\u652F\u6301\u5B57\u9762\u91CF\u3001\u5D4C\u5957\u5BF9\u8C61/\u6570\u7EC4\u548C ${expr} \u6A21\u677F\u5B57\u7B26\u4E32",
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array", items: { $ref: "#/definitions/AssignTemplate" } },
        {
          type: "object",
          additionalProperties: { $ref: "#/definitions/AssignTemplate" }
        }
      ]
    },
    AllowedValue: {
      description: "\u89C4\u5219\u5F15\u64CE\u5141\u8BB8\u7684\u53D8\u91CF\u503C\u7C7B\u578B \u2014 \u57FA\u672C\u7C7B\u578B\u3001\u5BF9\u8C61\u548C\u6570\u7EC4",
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        {
          type: "object",
          additionalProperties: { $ref: "#/definitions/AllowedValue" }
        },
        { type: "array", items: { $ref: "#/definitions/AllowedValue" } }
      ]
    },
    SetNode: {
      description: "SET \u8282\u70B9 \u2014 \u8BBE\u7F6E\u53D8\u91CF\u503C\uFF0Cvalue \u652F\u6301\u5D4C\u5957\u6A21\u677F",
      type: "object",
      properties: {
        type: { const: "set" },
        label: {
          type: "string",
          description: "\u8282\u70B9\u6807\u8BC6\uFF0C\u7528\u4E8E\u53EF\u89C6\u5316\u3001\u8C03\u8BD5\u548C\u8FFD\u8E2A"
        },
        variable: {
          type: "string",
          description: "\u76EE\u6807\u53D8\u91CF\u8DEF\u5F84\uFF0C\u5982 data.result.title"
        },
        value: { $ref: "#/definitions/AssignTemplate" }
      },
      required: ["type", "variable", "value"],
      additionalProperties: false
    },
    ExecNode: {
      description: "EXEC \u8282\u70B9 \u2014 \u6267\u884C\u8868\u8FBE\u5F0F\u5E76\u4E22\u5F03\u8FD4\u56DE\u503C\uFF08\u7528\u4E8E\u526F\u4F5C\u7528\u51FD\u6570\u5982\u65E5\u5FD7\u3001HTTP \u8C03\u7528\u7B49\uFF09",
      type: "object",
      properties: {
        type: { const: "exec" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" },
        expression: {
          type: "string",
          description: "\u7EAF\u8868\u8FBE\u5F0F\u5B57\u7B26\u4E32\uFF0C\u5982 log(data.result)"
        }
      },
      required: ["type", "expression"],
      additionalProperties: false
    },
    IfNode: {
      description: "IF \u8282\u70B9 \u2014 \u6761\u4EF6\u5206\u652F",
      type: "object",
      properties: {
        type: { const: "if" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" },
        condition: {
          type: "string",
          description: "\u6C42\u503C\u4E3A boolean \u7684\u8868\u8FBE\u5F0F\uFF0C\u5982 exists(data.keyword)"
        },
        then: {
          type: "array",
          description: "\u6761\u4EF6\u4E3A\u771F\u65F6\u6267\u884C\u7684\u8282\u70B9\u5217\u8868",
          items: { $ref: "#/definitions/RuleNode" }
        },
        else: {
          type: "array",
          description: "\u6761\u4EF6\u4E3A\u5047\u65F6\u6267\u884C\u7684\u8282\u70B9\u5217\u8868",
          items: { $ref: "#/definitions/RuleNode" }
        }
      },
      required: ["type", "condition", "then"],
      additionalProperties: false
    },
    ForeachNode: {
      description: "FOREACH \u8282\u70B9 \u2014 \u904D\u5386\u96C6\u5408",
      type: "object",
      properties: {
        type: { const: "foreach" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" },
        collection: { type: "string", description: "\u6C42\u503C\u4E3A\u6570\u7EC4\u7684\u8868\u8FBE\u5F0F" },
        item: { type: "string", description: "\u5F53\u524D\u9879\u7684\u53D8\u91CF\u540D\uFF0C\u5982 item" },
        index: { type: "string", description: "\u7D22\u5F15\u7684\u53D8\u91CF\u540D\uFF0C\u5982 idx" },
        body: {
          type: "array",
          description: "\u6BCF\u6B21\u8FED\u4EE3\u6267\u884C\u7684\u8282\u70B9\u5217\u8868",
          items: { $ref: "#/definitions/RuleNode" }
        }
      },
      required: ["type", "collection", "item", "body"],
      additionalProperties: false
    },
    WhileNode: {
      description: "WHILE \u8282\u70B9 \u2014 \u6761\u4EF6\u5FAA\u73AF",
      type: "object",
      properties: {
        type: { const: "while" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" },
        condition: { type: "string", description: "\u6C42\u503C\u4E3A boolean \u7684\u8868\u8FBE\u5F0F" },
        body: {
          type: "array",
          description: "\u5FAA\u73AF\u4F53\u8282\u70B9\u5217\u8868",
          items: { $ref: "#/definitions/RuleNode" }
        }
      },
      required: ["type", "condition", "body"],
      additionalProperties: false
    },
    BreakNode: {
      description: "BREAK \u8282\u70B9 \u2014 \u8DF3\u51FA\u5F53\u524D\u5FAA\u73AF",
      type: "object",
      properties: {
        type: { const: "break" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" }
      },
      required: ["type"],
      additionalProperties: false
    },
    ContinueNode: {
      description: "CONTINUE \u8282\u70B9 \u2014 \u8DF3\u8FC7\u5F53\u524D\u8FED\u4EE3\uFF0C\u7EE7\u7EED\u4E0B\u4E00\u8F6E",
      type: "object",
      properties: {
        type: { const: "continue" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" }
      },
      required: ["type"],
      additionalProperties: false
    },
    ReturnNode: {
      description: "RETURN \u8282\u70B9 \u2014 \u7EC8\u6B62\u89C4\u5219\u6267\u884C\u5E76\u8FD4\u56DE\u7ED3\u679C",
      type: "object",
      properties: {
        type: { const: "return" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" },
        value: { type: "string", description: "\u53EF\u9009\u7684\u8FD4\u56DE\u503C\u8868\u8FBE\u5F0F" }
      },
      required: ["type"],
      additionalProperties: false
    },
    CustomNode: {
      description: "CUSTOM \u8282\u70B9 \u2014 \u81EA\u5B9A\u4E49\u4E1A\u52A1\u8282\u70B9",
      type: "object",
      properties: {
        type: { const: "custom" },
        label: { type: "string", description: "\u8282\u70B9\u6807\u8BC6" },
        name: {
          type: "string",
          description: "\u6CE8\u518C\u7684\u5904\u7406\u51FD\u6570\u540D\u79F0\uFF0C\u5982 http.get"
        },
        params: { $ref: "#/definitions/AssignTemplate" }
      },
      required: ["type", "name"],
      additionalProperties: false
    },
    RuleNode: {
      description: "\u89C4\u5219\u8282\u70B9 \u2014 \u6309 type \u5B57\u6BB5\u533A\u5206\u7684 discriminated union\uFF0C\u5171 9 \u79CD\u8282\u70B9\u7C7B\u578B",
      oneOf: [
        { $ref: "#/definitions/SetNode" },
        { $ref: "#/definitions/ExecNode" },
        { $ref: "#/definitions/IfNode" },
        { $ref: "#/definitions/ForeachNode" },
        { $ref: "#/definitions/WhileNode" },
        { $ref: "#/definitions/BreakNode" },
        { $ref: "#/definitions/ContinueNode" },
        { $ref: "#/definitions/ReturnNode" },
        { $ref: "#/definitions/CustomNode" }
      ]
    }
  },
  type: "object",
  properties: {
    name: { type: "string", description: "\u89C4\u5219\u540D\u79F0\uFF0C\u7528\u4E8E\u8C03\u8BD5\u548C\u65E5\u5FD7" },
    entry: {
      type: "string",
      description: "\u5165\u53E3\u8282\u70B9\u7EC4\u540D\u79F0\uFF0C\u9ED8\u8BA4\u4E3A main",
      default: "main"
    },
    variables: {
      type: "object",
      description: "\u521D\u59CB\u53D8\u91CF\u503C \u2014 \u4EC5\u652F\u6301\u57FA\u672C\u7C7B\u578B\u3001\u5BF9\u8C61\u548C\u6570\u7EC4",
      additionalProperties: { $ref: "#/definitions/AllowedValue" }
    },
    nodes: {
      type: "object",
      description: "\u547D\u540D\u8282\u70B9\u7EC4 \u2014 \u6BCF\u4E2A key \u662F\u4E00\u4E2A\u8282\u70B9\u7EC4\u540D\u79F0\uFF0Cvalue \u662F\u5176\u8282\u70B9\u5217\u8868",
      additionalProperties: {
        type: "array",
        items: { $ref: "#/definitions/RuleNode" }
      }
    }
  },
  required: ["nodes"],
  additionalProperties: false
};
var MEDIA_PROVIDER_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/conduit/schema/media-provider.schema.json",
  title: "Grimoire Media Provider",
  description: "Grimoire media provider configuration schema",
  type: "object",
  definitions: {
    FeatureRule: {
      $ref: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/rune/schema/rule-definition.schema.json"
    }
  },
  properties: {
    namespace: {
      type: "string",
      description: "The namespace of the media provider"
    },
    name: { type: "string", description: "The name of the media provider" },
    author: { type: "string", description: "The author of the media provider" },
    url: { type: "string", description: "The URL of the media provider" },
    version: {
      type: "string",
      description: "The version of the media provider",
      pattern: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$"
    },
    versionCode: {
      type: "integer",
      description: "The version code of the media provider",
      minimum: 0
    },
    features: {
      type: "array",
      description: "The features supported by the media provider, use @grimoire/rune",
      items: { $ref: "#/definitions/FeatureRule" },
      contains: {
        type: "object",
        properties: { name: { const: "media-explore" } }
      },
      minItems: 1
    }
  },
  required: ["namespace", "name", "version", "versionCode", "features"]
};
function createSchemaValidator() {
  const ajv = new import_ajv.default({ allErrors: true });
  ajv.addSchema(RULE_DEFINITION_SCHEMA, RULE_DEFINITION_SCHEMA.$id);
  return ajv.compile(MEDIA_PROVIDER_SCHEMA);
}

// src/media-provider-manager.ts
var MediaProviderManager = class {
  providers = /* @__PURE__ */ new Map();
  engines = /* @__PURE__ */ new Map();
  /** 懒加载的 schema 校验器 */
  validator = null;
  /** 从 JSON 字符串加载并校验 media provider */
  loadProviderFromJson(dataStr) {
    const provider = JSON.parse(dataStr);
    if (!this.validator) {
      this.validator = createSchemaValidator();
    }
    const valid = this.validator(provider);
    if (!valid) {
      const errors = this.validator.errors?.map((e) => `${e.instancePath} ${e.message}`).join("; ");
      throw new Error(`Invalid media provider schema: ${errors}`);
    }
    const exploreFeatures = provider.features.filter(
      (f) => f.name === "media-explore"
    );
    if (exploreFeatures.length !== 1) {
      throw new Error(
        `Provider must contain exactly one "media-explore" feature, got ${exploreFeatures.length}`
      );
    }
    return provider;
  }
  /** 注册媒体提供者，并为其创建规则引擎实例 */
  registerProvider(provider) {
    this.providers.set(provider.namespace, provider);
    if (!this.engines.has(provider.namespace)) {
      this.engines.set(
        provider.namespace,
        new import_rune.RuleEngine({
          functions: {
            ...import_talisman.encodingFunctions,
            ...import_talisman.cryptoFunctions,
            ...import_talisman.domFunctions
          }
        })
      );
    }
  }
  /** 注销媒体提供者 */
  unregisterProvider(namespace) {
    this.providers.delete(namespace);
    this.engines.delete(namespace);
  }
  /** 根据 namespace 获取媒体提供者 */
  getProvider(id) {
    return this.providers.get(id);
  }
  /** 列出所有已注册提供者的元数据（不含 features） */
  listProviderMetadata() {
    return Array.from(this.providers.values()).map(
      ({ namespace, name, author, url, version, versionCode }) => ({
        namespace,
        name,
        author,
        url,
        version,
        versionCode
      })
    );
  }
  /** 执行指定提供者的某个功能 */
  async executeFeature(namespace, feature, params) {
    const provider = this.getProvider(namespace);
    if (!provider) {
      throw new Error(`No provider found for provider: ${namespace}`);
    }
    const engine = this.engines.get(namespace);
    if (!engine) {
      throw new Error(
        `No provider rule engine found for provider: ${namespace}`
      );
    }
    const featureDef = provider.features.find((f) => f.name === feature);
    if (!featureDef) {
      throw new Error(
        `Feature not found for provider: ${namespace}, feature: ${feature}`
      );
    }
    const execFeature = {
      ...featureDef,
      variables: {
        ...featureDef.variables,
        ...params
      }
    };
    const executeResult = await engine.execute(execFeature);
    if (executeResult.status !== "success") {
      throw new Error(
        executeResult.error?.message || "Unknown error during feature execution"
      );
    }
    if (!executeResult.data) {
      throw new Error("No data returned from feature execution");
    }
    return executeResult.data;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MediaProviderManager
});
//# sourceMappingURL=index.cjs.map