// packages/talisman/src/dom/shortcut.ts
import { selectAll, selectOne } from "css-select";
import type { AllowedValue } from "@grimoire/rune";
import type { AnyNode, Element } from "domhandler";
import { isDomHandlerNode } from "./css";
import {
  el_inner_text,
  el_inner_html,
  el_outer_html,
  el_attr,
} from "./element";

/**
 * css_select + el_inner_text — 选择所有匹配元素并提取内部文本
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器
 * @returns 文本字符串数组，输入非法或选择器错误返回 null
 */
export function css_select_text(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const els = selectAll(selector, doc as unknown as AnyNode) as Element[];
    return els.map(
      (el) => el_inner_text(el as unknown as AllowedValue) as string,
    ) as unknown as AllowedValue;
  } catch {
    return null;
  }
}

/**
 * css_select + el_inner_html — 选择所有匹配元素并提取 innerHTML
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器
 * @returns innerHTML 字符串数组，输入非法或选择器错误返回 null
 */
export function css_select_html(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const els = selectAll(selector, doc as unknown as AnyNode) as Element[];
    return els.map(
      (el) => el_inner_html(el as unknown as AllowedValue) as string,
    ) as unknown as AllowedValue;
  } catch {
    return null;
  }
}

/**
 * css_select + el_outer_html — 选择所有匹配元素并提取 outerHTML
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器
 * @returns outerHTML 字符串数组，输入非法或选择器错误返回 null
 */
export function css_select_outer_html(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const els = selectAll(selector, doc as unknown as AnyNode) as Element[];
    return els.map(
      (el) => el_outer_html(el as unknown as AllowedValue) as string,
    ) as unknown as AllowedValue;
  } catch {
    return null;
  }
}

/**
 * css_select + el_attr — 选择所有匹配元素并提取指定属性值
 * 属性不存在的元素用 null 填充
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器，args[2] 为属性名
 * @returns 属性值数组（含 null），输入非法或选择器错误返回 null
 */
export function css_select_attr(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  const attrName = args[2];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  if (typeof attrName !== "string") return null;
  try {
    const els = selectAll(selector, doc as unknown as AnyNode) as Element[];
    return els.map((el) =>
      el_attr(el as unknown as AllowedValue, attrName),
    ) as unknown as AllowedValue;
  } catch {
    return null;
  }
}

/**
 * css_select1 + el_inner_text — 选择第一个匹配元素并提取内部文本
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器
 * @returns 文本字符串，无匹配或输入非法返回 null
 */
export function css_select1_text(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const el = selectOne(selector, doc as unknown as AnyNode);
    if (!el) return null;
    return el_inner_text(el as unknown as AllowedValue);
  } catch {
    return null;
  }
}

/**
 * css_select1 + el_inner_html — 选择第一个匹配元素并提取 innerHTML
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器
 * @returns innerHTML 字符串，无匹配或输入非法返回 null
 */
export function css_select1_html(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const el = selectOne(selector, doc as unknown as AnyNode);
    if (!el) return null;
    return el_inner_html(el as unknown as AllowedValue);
  } catch {
    return null;
  }
}

/**
 * css_select1 + el_outer_html — 选择第一个匹配元素并提取 outerHTML
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器
 * @returns outerHTML 字符串，无匹配或输入非法返回 null
 */
export function css_select1_outer_html(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  try {
    const el = selectOne(selector, doc as unknown as AnyNode);
    if (!el) return null;
    return el_outer_html(el as unknown as AllowedValue);
  } catch {
    return null;
  }
}

/**
 * css_select1 + el_attr — 选择第一个匹配元素并提取指定属性值
 *
 * @param args - args[0] 为 domhandler Document，args[1] 为 CSS 选择器，args[2] 为属性名
 * @returns 属性值字符串，属性不存在、无匹配或输入非法返回 null
 */
export function css_select1_attr(...args: AllowedValue[]): AllowedValue {
  const doc = args[0];
  const selector = args[1];
  const attrName = args[2];
  if (!isDomHandlerNode(doc)) return null;
  if (typeof selector !== "string") return null;
  if (typeof attrName !== "string") return null;
  try {
    const el = selectOne(selector, doc as unknown as AnyNode);
    if (!el) return null;
    return el_attr(el as unknown as AllowedValue, attrName);
  } catch {
    return null;
  }
}
