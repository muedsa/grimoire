// AsyncStorage 持久化层 — 存储媒体提供者的 JSON 配置字符串
// 存储结构：
//   conduit-provider:<namespace> → JSON 配置字符串
//   conduit-namespaces → JSON 字符串数组 ["ns1", "ns2", ...]

import AsyncStorage from "@react-native-async-storage/async-storage";

const NAMESPACES_KEY = "conduit-namespaces";
const PROVIDER_PREFIX = "conduit-provider:";

/** 获取所有 namespace 列表 */
async function getNamespaces(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(NAMESPACES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

/** 持久化 namespace 列表 */
async function saveNamespaces(namespaces: string[]): Promise<void> {
  await AsyncStorage.setItem(NAMESPACES_KEY, JSON.stringify(namespaces));
}

/** 保存单个提供者的 JSON 配置到 AsyncStorage */
export async function saveConfig(
  namespace: string,
  jsonStr: string,
): Promise<void> {
  // 存储配置内容
  await AsyncStorage.setItem(PROVIDER_PREFIX + namespace, jsonStr);
  // 维护 namespace 列表
  const namespaces = await getNamespaces();
  if (!namespaces.includes(namespace)) {
    namespaces.push(namespace);
    await saveNamespaces(namespaces);
  }
}

/** 从 AsyncStorage 删除指定 namespace 的配置 */
export async function removeConfig(namespace: string): Promise<void> {
  await AsyncStorage.removeItem(PROVIDER_PREFIX + namespace);
  const namespaces = await getNamespaces();
  const filtered = namespaces.filter((ns) => ns !== namespace);
  await saveNamespaces(filtered);
}

/** 获取所有已存储的 JSON 配置，返回 [namespace, jsonStr] 数组 */
export async function getAllConfigs(): Promise<Array<[string, string]>> {
  const namespaces = await getNamespaces();
  const result: Array<[string, string]> = [];
  for (const ns of namespaces) {
    const jsonStr = await AsyncStorage.getItem(PROVIDER_PREFIX + ns);
    if (jsonStr !== null) {
      result.push([ns, jsonStr]);
    }
  }
  return result;
}
