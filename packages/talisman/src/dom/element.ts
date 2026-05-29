// packages/talisman/src/dom/element.ts
import {
  getText,
  getInnerHTML,
  getOuterHTML,
  getAttributeValue,
  hasAttrib,
} from "domutils";
import type { AllowedValue } from "@grimoire/rune";
import type { Element } from "domhandler";

/**
 * 检查值是否为 domhandler Element 节点
 * 使用 duck-type 检查：domhandler Element 必须有 type、name、attribs 属性
 */
function isDomHandlerElement(val: unknown): val is Element {
  return (
    val != null &&
    typeof val === "object" &&
    "type" in (val as Record<string, unknown>) &&
    "name" in (val as Record<string, unknown>) &&
    "attribs" in (val as Record<string, unknown>)
  );
}

/**
 * 提取 domhandler Element 的内部文本（递归提取所有文本节点）
 * 底层使用 domutils 的 getText()
 *
 * @param args - args[0] 为 domhandler Element
 * @returns 内部文本字符串，输入非法时返回 null
 */
export function el_inner_text(...args: AllowedValue[]): AllowedValue {
  const el = args[0];
  if (!isDomHandlerElement(el)) return null;
  try {
    return getText(el);
  } catch {
    return null;
  }
}

/**
 * 提取 domhandler Element 的 innerHTML 字符串
 * 底层使用 domutils 的 getInnerHTML()
 *
 * @param args - args[0] 为 domhandler Element
 * @returns innerHTML 字符串，输入非法时返回 null
 */
export function el_inner_html(...args: AllowedValue[]): AllowedValue {
  const el = args[0];
  if (!isDomHandlerElement(el)) return null;
  try {
    return getInnerHTML(el);
  } catch {
    return null;
  }
}

/**
 * 提取 domhandler Element 的 outerHTML 字符串（包含自身标签）
 * 底层使用 domutils 的 getOuterHTML()
 *
 * @param args - args[0] 为 domhandler Element
 * @returns outerHTML 字符串，输入非法时返回 null
 */
export function el_outer_html(...args: AllowedValue[]): AllowedValue {
  const el = args[0];
  if (!isDomHandlerElement(el)) return null;
  try {
    return getOuterHTML(el);
  } catch {
    return null;
  }
}

/**
 * 获取 domhandler Element 的指定属性值
 * 底层使用 domutils 的 getAttributeValue()
 *
 * @param args - args[0] 为 domhandler Element，args[1] 为属性名
 * @returns 属性值字符串，属性不存在或输入非法时返回 null
 */
export function el_attr(...args: AllowedValue[]): AllowedValue {
  const el = args[0];
  const name = args[1];
  if (!isDomHandlerElement(el)) return null;
  if (typeof name !== "string") return null;
  try {
    const val = getAttributeValue(el, name);
    return val ?? null;
  } catch {
    return null;
  }
}

/**
 * 检查 domhandler Element 是否存在指定属性
 * 底层使用 domutils 的 hasAttrib()
 *
 * @param args - args[0] 为 domhandler Element，args[1] 为属性名
 * @returns 存在返回 true，不存在返回 false，输入非法返回 null
 */
export function el_has_attr(...args: AllowedValue[]): AllowedValue {
  const el = args[0];
  const name = args[1];
  if (!isDomHandlerElement(el)) return null;
  if (typeof name !== "string") return null;
  try {
    return hasAttrib(el, name);
  } catch {
    return null;
  }
}
