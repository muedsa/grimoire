// ConduitContext — 持有 MediaProviderManager 实例
// 提供 installProvider / uninstallProvider / executeFeature / getProvider
// 启动时自动从 AsyncStorage 恢复已安装的提供者

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";
import {
  MediaProviderManager,
  type MediaProviderMetadata,
  type MediaProviderFeature,
  type MediaProviderParms,
  type MediaProviderFeatureResult,
} from "@grimoire/conduit";
import {
  getAllConfigs,
  saveConfig,
  removeConfig,
} from "@/services/conduit-storage";
import { Platform } from "react-native";
import { proxiedRuneHttpFunctions } from "@/utils/http-proxy";

// Context 类型定义
type ConduitContextType = {
  /** 所有已注册提供者的元数据列表（用于首页展示） */
  providers: MediaProviderMetadata[];
  /** 初始化是否完成 */
  isReady: boolean;
  /** 最新一次操作的错误信息，成功时为 null */
  error: string | null;
  /** 安装提供者：校验 JSON → 注册 → 持久化 */
  installProvider: (jsonStr: string) => Promise<MediaProviderMetadata>;
  /** 卸载提供者：注销 + 删除持久化配置 */
  uninstallProvider: (namespace: string) => Promise<void>;
  /** 获取指定 namespace 的提供者元数据 */
  getProvider: (namespace: string) => MediaProviderMetadata | undefined;
  /** 执行指定 namespace 的某个特性 */
  executeFeature: <F extends MediaProviderFeature>(
    namespace: string,
    feature: F,
    params: MediaProviderParms[F],
  ) => Promise<MediaProviderFeatureResult[F]>;
};

const ConduitContext = createContext<ConduitContextType | null>(null);

/** 访问 ConduitContext 的 hook */
export function useConduit(): ConduitContextType {
  const value = useContext(ConduitContext);
  if (!value) {
    throw new Error(
      "useConduitContext must be wrapped in a <ConduitProvider/>",
    );
  }
  return value;
}

/** ConduitProvider — 初始化 MediaProviderManager 并从 AsyncStorage 恢复 */
export function ConduitProvider({ children }: PropsWithChildren) {
  const [manager] = useState(() => new MediaProviderManager());
  const [providers, setProviders] = useState<MediaProviderMetadata[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 同步 providers 状态
  const refreshProviders = useCallback(() => {
    setProviders(manager.listProviderMetadata());
  }, [manager]);

  // 启动时从 AsyncStorage 恢复所有提供者
  useEffect(() => {
    const restore = async () => {
      try {
        const configs = await getAllConfigs();
        for (const [namespaceStr, jsonStr] of configs) {
          try {
            const provider = manager.loadProviderFromJson(jsonStr);
            if (Platform.OS === "web") {
              manager.registerProvider(provider, {
                ...proxiedRuneHttpFunctions,
              });
            } else {
              manager.registerProvider(provider);
            }
          } catch {
            // 单条配置损坏，跳过并继续恢复其他
            console.warn(
              `[ConduitProvider] 恢复提供者 "${namespaceStr}" 失败，已跳过`,
            );
          }
        }
        refreshProviders();
      } catch (e) {
        setError(e instanceof Error ? e.message : "恢复数据失败");
      } finally {
        setIsReady(true);
      }
    };
    restore();
  }, [manager, refreshProviders]);

  // 安装提供者
  const installProvider = useCallback(
    async (jsonStr: string): Promise<MediaProviderMetadata> => {
      setError(null);
      try {
        const provider = manager.loadProviderFromJson(jsonStr);
        // 同 namespace 重复安装：先卸载旧的
        if (manager.getProvider(provider.namespace)) {
          manager.unregisterProvider(provider.namespace);
        }
        if (Platform.OS === "web") {
          manager.registerProvider(provider, {
            ...proxiedRuneHttpFunctions,
          });
        } else {
          manager.registerProvider(provider);
        }
        await saveConfig(provider.namespace, jsonStr);
        refreshProviders();
        const {
          namespace: ns,
          name,
          author,
          url,
          version,
          versionCode,
        } = provider;
        return { namespace: ns, name, author, url, version, versionCode };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "安装失败";
        setError(msg);
        throw e; // 重新抛出让调用方也能捕获
      }
    },
    [manager, refreshProviders],
  );

  // 卸载提供者
  const uninstallProvider = useCallback(
    async (namespace: string) => {
      setError(null);
      try {
        manager.unregisterProvider(namespace);
        await removeConfig(namespace);
        refreshProviders();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "卸载失败";
        setError(msg);
      }
    },
    [manager, refreshProviders],
  );

  // 获取提供者元数据
  const getProvider = useCallback(
    (namespace: string): MediaProviderMetadata | undefined => {
      const p = manager.getProvider(namespace);
      if (!p) return undefined;
      const { namespace: ns, name, author, url, version, versionCode } = p;
      return { namespace: ns, name, author, url, version, versionCode };
    },
    [manager],
  );

  // 执行特性
  const executeFeature = useCallback(
    async <F extends MediaProviderFeature>(
      namespace: string,
      feature: F,
      params: MediaProviderParms[F],
    ): Promise<MediaProviderFeatureResult[F]> => {
      return manager.executeFeature(namespace, feature, params);
    },
    [manager],
  );

  return (
    <ConduitContext.Provider
      value={{
        providers,
        isReady,
        error,
        installProvider,
        uninstallProvider,
        getProvider,
        executeFeature,
      }}
    >
      {children}
    </ConduitContext.Provider>
  );
}
