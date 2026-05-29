import { type ValidateFunction } from "ajv";
import { RuleDefinition, RuleEngine } from "@grimoire/rune";
import {
  encodingFunctions,
  cryptoFunctions,
  domFunctions,
} from "@grimoire/talisman";
import type {
  MediaProvider,
  MediaProviderMetadata,
  MediaProviderFeatureResult,
  MediaProviderParms,
  MediaProviderFeature,
} from "./types/provider";
import { createSchemaValidator } from "./schemas";

export class MediaProviderManager {
  private providers: Map<string, MediaProvider> = new Map();
  private engines: Map<string, RuleEngine> = new Map();
  /** 懒加载的 schema 校验器 */
  private validator: ValidateFunction | null = null;

  /** 从 JSON 字符串加载并校验 media provider */
  loadProviderFromJson(dataStr: string): MediaProvider {
    const provider = JSON.parse(dataStr) as MediaProvider;

    // 懒初始化 schema 校验器
    if (!this.validator) {
      this.validator = createSchemaValidator();
    }

    // 使用 JSON Schema 校验 provider 结构
    const valid = this.validator(provider);
    if (!valid) {
      const errors = this.validator.errors
        ?.map((e) => `${e.instancePath} ${e.message}`)
        .join("; ");
      throw new Error(`Invalid media provider schema: ${errors}`);
    }

    // 业务校验：必须恰好包含一个 media-explore feature
    const exploreFeatures = provider.features.filter(
      (f) => f.name === "media-explore",
    );
    if (exploreFeatures.length !== 1) {
      throw new Error(
        `Provider must contain exactly one "media-explore" feature, got ${exploreFeatures.length}`,
      );
    }

    return provider;
  }

  /** 注册媒体提供者，并为其创建规则引擎实例 */
  registerProvider(provider: MediaProvider) {
    this.providers.set(provider.namespace, provider);
    if (!this.engines.has(provider.namespace)) {
      this.engines.set(
        provider.namespace,
        new RuleEngine({
          functions: {
            ...encodingFunctions,
            ...cryptoFunctions,
            ...domFunctions,
          },
        }),
      );
    }
  }

  /** 注销媒体提供者 */
  unregisterProvider(namespace: string) {
    this.providers.delete(namespace);
    this.engines.delete(namespace);
  }

  /** 根据 namespace 获取媒体提供者 */
  getProvider(id: string): MediaProvider | undefined {
    return this.providers.get(id);
  }

  /** 列出所有已注册提供者的元数据（不含 features） */
  listProviderMetadata(): MediaProviderMetadata[] {
    return Array.from(this.providers.values()).map(
      ({ namespace, name, author, url, version, versionCode }) => ({
        namespace,
        name,
        author,
        url,
        version,
        versionCode,
      }),
    );
  }

  /** 执行指定提供者的某个功能 */
  async executeFeature<Feat extends MediaProviderFeature>(
    namespace: string,
    feature: Feat,
    params: MediaProviderParms[Feat],
  ): Promise<MediaProviderFeatureResult[Feat]> {
    const provider = this.getProvider(namespace);
    if (!provider) {
      throw new Error(`No provider found for provider: ${namespace}`);
    }
    const engine = this.engines.get(namespace);
    if (!engine) {
      throw new Error(
        `No provider rule engine found for provider: ${namespace}`,
      );
    }
    const featureDef = provider.features.find((f) => f.name === feature);
    if (!featureDef) {
      throw new Error(
        `Feature not found for provider: ${namespace}, feature: ${feature}`,
      );
    }
    const execFeature: RuleDefinition = {
      ...featureDef,
      variables: {
        ...featureDef.variables,
        ...params,
      },
    };
    const executeResult = await engine.execute(execFeature);
    if (executeResult.status !== "success") {
      throw new Error(
        executeResult.error?.message ||
          "Unknown error during feature execution",
      );
    }
    if (!executeResult.data) {
      throw new Error("No data returned from feature execution");
    }
    return executeResult.data as MediaProviderFeatureResult[Feat];
  }
}
