# Conduit

Conduit 是 Grimoire 的**媒体提供者管理器**，负责加载、校验、注册和执行媒体提供者（Media Provider）。

媒体提供者是一个声明式的 JSON 配置文件，描述如何从网站抓取、浏览和获取媒体内容。Conduit 将提供者配置交由 `@grimoire/rune` 规则引擎执行，并注入 `@grimoire/talisman` 提供的工具函数（编解码、加密、DOM/HTML 解析等），最终产出结构化的媒体数据。

## 核心概念

### MediaProvider（媒体提供者）

一个媒体提供者包含两部分：

- **元数据**（`MediaProviderMetadata`）：`namespace`、`name`、`author`、`url`、`version`、`versionCode`
- **特性列表**（`features: RuleDefinition[]`）：一组由 `@grimoire/rune` 规则定义描述的功能

### Feature（特性）

特性是提供者暴露的具体能力，目前支持：

| Feature         | 参数                  | 返回值           | 说明                 |
| --------------- | --------------------- | ---------------- | -------------------- |
| `media-explore` | `null`                | `MediaSection[]` | 获取首页内容分区列表 |
| `media-detail`  | `{ mediaId: string }` | `MediaDetail`    | 获取媒体详情         |

### 执行流程

```
JSON 配置 → loadProviderFromJson() → 校验通过 → registerProvider() → 创建 RuleEngine
                                                                          ↓
                                        结构化数据 ← executeFeature() ← 注入 talisman 函数
```

1. `loadProviderFromJson()` 解析 JSON 字符串，通过 JSON Schema 校验，并通过业务规则检查（至少一个 `media-explore` 特性）
2. `registerProvider()` 将提供者及其专属 `RuleEngine` 存入注册表，预先注入 `@grimoire/talisman` 的所有工具函数
3. `executeFeature()` 查找指定特性，合并调用参数到规则变量中，交由规则引擎执行，返回类型安全的结果

## 安装

```bash
yarn add @grimoire/conduit
```

## 快速开始

```typescript
import { MediaProviderManager } from "@grimoire/conduit";

const manager = new MediaProviderManager();

// 加载并注册一个媒体提供者
const json = `
{
  "namespace": "example",
  "name": "示例提供者",
  "author": "author",
  "url": "https://example.com",
  "version": "1.0.0",
  "versionCode": 1,
  "features": [
    {
      "name": "media-explore",
      "variables": {},
      "nodes": [
        {
          "nodeType": "set",
          "variable": "result",
          "value": []
        },
        {
          "nodeType": "return",
          "value": "result"
        }
      ]
    }
  ]
}
`;

const provider = manager.loadProviderFromJson(json);
manager.registerProvider(provider);

// 执行特性
const sections = await manager.executeFeature("example", "media-explore", null);
console.log(sections);
```

## API 参考

### `MediaProviderManager`

#### `loadProviderFromJson(dataStr: string): MediaProvider`

解析 JSON 字符串为 `MediaProvider`。会依次进行：

- JSON 语法解析
- JSON Schema 结构校验（缺字段、类型错误、features 为空等）
- 业务规则检查（必须包含至少一个名为 `media-explore` 的特性）

校验失败时抛出 `Error`。

#### `registerProvider(provider: MediaProvider): void`

将提供者注册到内部注册表，并为其创建一个专属的 `RuleEngine`，预注入 `@grimoire/talisman` 的全部工具函数。

#### `unregisterProvider(namespace: string): void`

从注册表中移除指定命名空间的提供者及其引擎。

#### `getProvider(namespace: string): MediaProvider | undefined`

按命名空间查找已注册的提供者。

#### `listProviderMetadata(): MediaProviderMetadata[]`

列出所有已注册提供者的元数据（**不含** `features` 数组）。

#### `executeFeature<Feat>(namespace, feature, params): Promise<Result[Feat]>`

执行指定提供者的指定特性。返回类型根据特性名自动推断：

- `executeFeature("example", "media-explore", null)` → `Promise<MediaSection[]>`
- `executeFeature("example", "media-detail", { mediaId: "123" })` → `Promise<MediaDetail>`

执行失败（规则引擎返回非 success 状态或 data 为空）时抛出 `Error`。

## 类型定义

```typescript
// 媒体领域类型
type MediaItem = {
  id: string;
  title: string;
  cover: string;
  subtitle?: string;
};

type MediaSection = {
  title: string;
  items: MediaItem[];
  aspectRatio: number;
};

type EpisodeGroup = {
  sourceName: string;
  list: { id: string; name: string }[];
};

type MediaDetail = MediaItem & {
  description?: string;
  episodes: EpisodeGroup[];
};
```

## JSON Schema

提供者配置需符合 `schema/media-provider.schema.json` 中定义的 JSON Schema（draft-07）。核心约束：

| 字段          | 约束                                                    |
| ------------- | ------------------------------------------------------- |
| `namespace`   | 必填，字符串                                            |
| `name`        | 必填，字符串                                            |
| `version`     | 必填，语义化版本号（支持 pre-release 后缀）             |
| `versionCode` | 必填，整数 >= 0                                         |
| `features`    | 必填，数组，长度 >= 1，必须包含至少一个 `media-explore` |

## 开发

```bash
# 构建
yarn build

# 类型检查
yarn typecheck

# 运行测试
yarn test

# 监听模式
yarn test:watch

# 覆盖率
yarn test:coverage
```

### 测试说明

- **单元测试**（`tests/media-provider-manager.test.ts`）：覆盖提供者加载、注册/注销、元数据列表等核心逻辑
- **集成测试**（`tests/feature-execute.test.ts`）：端到端验证完整的 加载 → 注册 → 执行 流程，连接真实网站验证 `media-explore` 和 `media-detail` 特性

## 架构依赖

```
@grimoire/conduit
├── @grimoire/rune       → 规则引擎，执行提供者特性定义
├── @grimoire/talisman   → 工具函数库（编解码、加密、DOM/HTML 解析）
├── ajv                  → JSON Schema 校验
├── @xmldom/xmldom       → XML/DOM 解析
├── css-select           → CSS 选择器
├── htmlparser2          → HTML 解析
├── xpath                → XPath 查询
├── he                   → HTML 实体编解码
├── @noble/ciphers       → 加密算法
└── @noble/hashes        → 哈希算法
```
