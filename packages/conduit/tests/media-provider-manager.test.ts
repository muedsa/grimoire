import { describe, it, expect, beforeEach } from "vitest";
import { MediaProviderManager } from "../src/media-provider-manager";
import type { MediaProvider } from "../src/types/provider";

/** 构造一个合法的 MediaProvider 测试数据 */
function createValidProvider(
  overrides?: Partial<MediaProvider>,
): MediaProvider {
  return {
    namespace: "com.test.provider",
    name: "Test Provider",
    author: "tester",
    url: "https://example.com/provider.json",
    version: "1.0.0",
    versionCode: 1,
    features: [
      {
        name: "media-explore",
        entry: "main",
        variables: {},
        nodes: {
          main: [
            {
              type: "return",
              label: "return-node",
              value: "[]",
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

/** 有效的 provider JSON 字符串 */
const validProviderJson = JSON.stringify(createValidProvider());

describe("MediaProviderManager", () => {
  let manager: MediaProviderManager;

  beforeEach(() => {
    manager = new MediaProviderManager();
  });

  describe("loadProviderFromJson", () => {
    it("应成功加载合法的 provider JSON", () => {
      const provider = manager.loadProviderFromJson(validProviderJson);
      expect(provider.namespace).toBe("com.test.provider");
      expect(provider.name).toBe("Test Provider");
      expect(provider.features).toHaveLength(1);
    });

    it("缺失必填字段 namespace 时应抛出 schema 校验错误", () => {
      const invalid = JSON.stringify({
        name: "No Namespace",
        version: "1.0.0",
        versionCode: 1,
        features: [],
      });
      expect(() => manager.loadProviderFromJson(invalid)).toThrow();
    });

    it("features 为空数组时应抛出 schema 校验错误", () => {
      const invalid = JSON.stringify(createValidProvider({ features: [] }));
      expect(() => manager.loadProviderFromJson(invalid)).toThrow();
    });

    it("非法的 JSON 字符串应抛出解析错误", () => {
      expect(() => manager.loadProviderFromJson("{invalid json")).toThrow();
    });
  });

  describe("registerProvider / getProvider / unregisterProvider", () => {
    it("注册后应能通过 namespace 获取到 provider", () => {
      const provider = createValidProvider();
      manager.registerProvider(provider);
      expect(manager.getProvider("com.test.provider")).toEqual(provider);
    });

    it("注销后 getProvider 应返回 undefined", () => {
      const provider = createValidProvider();
      manager.registerProvider(provider);
      manager.unregisterProvider("com.test.provider");
      expect(manager.getProvider("com.test.provider")).toBeUndefined();
    });

    it("获取不存在的 provider 应返回 undefined", () => {
      expect(manager.getProvider("nonexistent")).toBeUndefined();
    });
  });

  describe("listProviderMetadata", () => {
    it("应返回所有已注册提供者的元数据（不含 features）", () => {
      manager.registerProvider(createValidProvider());
      const list = manager.listProviderMetadata();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        namespace: "com.test.provider",
        name: "Test Provider",
        author: "tester",
        url: "https://example.com/provider.json",
        version: "1.0.0",
        versionCode: 1,
      });
      // 确保不包含 features
      expect((list[0] as any).features).toBeUndefined();
    });
  });
});
