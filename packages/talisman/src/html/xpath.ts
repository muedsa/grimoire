import xpath from "xpath";
import type { AllowedValue } from "@grimoire/rune";

/** 检查值是否为有效的 DOM Document — 使用 duck-type 检查以兼容跨 realm 场景 */
function isDocument(val: unknown): val is Document {
  return (
    val != null &&
    typeof val === "object" &&
    typeof (val as Record<string, unknown>).documentElement !== "undefined"
  );
}

/**
 * 使用 XPath 表达式查询 Document，返回结果类型由表达式动态决定
 *
 * 返回值类型映射：
 * - 节点集表达式（如 //div, //h1/text()） → Node[]
 * - 字符串表达式（如 string(//@title)） → string
 * - 数字表达式（如 count(//a)） → number
 * - 布尔表达式（如 count(//a) > 0） → boolean
 *
 * @param args - 可变参数，args[0] 为 Document 对象，args[1] 为 XPath 表达式字符串
 * @returns 查询结果，输入非法或表达式有误时返回 null
 */
export function xpath_select(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const expr = args[1];
  if (!isDocument(doc)) return null;
  if (typeof expr !== "string") return null;
  try {
    // Document 已在 html_parse 中完成命名空间清理，可直接用于 xpath 查询
    // xpath.select 返回值类型由 XPath 表达式动态决定，直接透传
    return xpath.select(expr, doc) as unknown as AllowedValue;
  } catch {
    return null;
  }
}

/**
 * 使用 XPath 表达式查询 Document，只返回第一个匹配节点
 *
 * 与 xpath_select 的区别：
 * - 有匹配时返回单个节点（Node | Attr | string | number | boolean）
 * - 无匹配时返回 undefined（区别于 xpath_select 返回空数组）
 *
 * @param args - 可变参数，args[0] 为 Document 对象，args[1] 为 XPath 表达式字符串
 * @returns 第一个匹配节点，输入非法或表达式有误时返回 null，无匹配返回 undefined
 */
export function xpath_select1(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const expr = args[1];
  if (!isDocument(doc)) return null;
  if (typeof expr !== "string") return null;
  try {
    // Document 已在 html_parse 中完成命名空间清理，可直接用于 xpath 查询
    // xpath.select1 返回单个节点或 undefined（无匹配）
    return xpath.select1(expr, doc) as unknown as AllowedValue;
  } catch {
    return null;
  }
}
