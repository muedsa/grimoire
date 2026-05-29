import { selectAll, selectOne } from "css-select";
import type { AllowedValue } from "@grimoire/rune";
import type { AnyNode } from "domhandler";

/**
 * 检查值是否为 domhandler 节点树（Document 或任意父节点）
 * 使用 duck-type 检查：domhandler 的根节点和父节点都有 type 属性和 children 数组
 */
function isDomHandlerNode(val: unknown): boolean {
  return (
    val != null &&
    typeof val === "object" &&
    "type" in (val as Record<string, unknown>) &&
    "children" in (val as Record<string, unknown>) &&
    Array.isArray((val as Record<string, unknown>).children)
  );
}

/**
 * 使用 CSS 选择器查询 domhandler Document，返回所有匹配的元素数组
 *
 * 对应 xpath_select，但接受 htmlparser2 解析产物而非 xmldom Document
 *
 * @param args - 可变参数，args[0] 为 htmlparser2 解析的 Document，args[1] 为 CSS 选择器字符串
 * @returns 匹配的 Element 数组，输入非法或选择器有误时返回 null
 */
export function css_select(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    // selectAll 返回 Element 数组，与 xpath_select 的节点数组行为一致
    return selectAll(
      selector,
      doc as unknown as AnyNode,
    ) as unknown as AllowedValue;
  } catch {
    return null;
  }
}

/**
 * 使用 CSS 选择器查询 domhandler Document，只返回第一个匹配元素
 *
 * 对应 xpath_select1，但接受 htmlparser2 解析产物而非 xmldom Document
 *
 * @param args - 可变参数，args[0] 为 htmlparser2 解析的 Document，args[1] 为 CSS 选择器字符串
 * @returns 第一个匹配的 Element，无匹配时返回 null，输入非法返回 null
 */
export function css_select1(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    // selectOne 返回 Element | null，无匹配时返回 null
    const result = selectOne(selector, doc as unknown as AnyNode);
    return (result ?? null) as unknown as AllowedValue;
  } catch {
    return null;
  }
}
