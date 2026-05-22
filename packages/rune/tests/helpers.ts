import { RuleEngine } from "../src/index";

/** 将 result.data 断言为 Record，方便链式访问 */
export function d(result: Awaited<ReturnType<typeof RuleEngine.prototype.execute>>): Record<string, unknown> {
  return result.data as Record<string, unknown>;
}
