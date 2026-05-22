import { DOMParser } from "@xmldom/xmldom";
import type { AllowedValue } from "@grimoire/rune";

/**
 * 递归移除 DOM 树中所有元素和属性节点上的 namespaceURI
 *
 * @xmldom/xmldom 的 text/html 解析器会为所有元素设置 XHTML 命名空间
 * （http://www.w3.org/1999/xhtml），导致 xpath 库无法匹配无命名空间前缀的元素名。
 * 移除命名空间后，xpath 查询即可正常工作。
 */
function stripNamespaces(node: object): void {
  // 遍历当前节点
  if ("namespaceURI" in node && (node as any).namespaceURI) {
    (node as any).namespaceURI = null;
  }

  // 移除属性上的命名空间
  if ("attributes" in node && (node as any).attributes?.length) {
    const attrs = (node as any).attributes;
    for (let i = 0; i < attrs.length; i++) {
      if (attrs[i]?.namespaceURI) {
        attrs[i].namespaceURI = null;
      }
    }
  }

  // 递归处理子节点
  if ("childNodes" in node && (node as any).childNodes?.length) {
    const children = (node as any).childNodes;
    for (let i = 0; i < children.length; i++) {
      if (children[i] && typeof children[i] === "object") {
        stripNamespaces(children[i]);
      }
    }
  }
}

/**
 * 将 HTML 字符串解析为 Document 对象
 * 作为 rune 表达式自定义函数，签名符合 CustomFunction 类型
 *
 * @param args - 可变参数，第一个参数应为 HTML 字符串
 * @returns 解析后的 Document 对象，解析失败或输入非法时返回 null
 */
export function html_parse(...args: AllowedValue[]): AllowedValue {
  const html = args[0];
  if (typeof html !== "string") return null;
  try {
    // DOMParser 的 HTML 解析器是容错的，不会因格式问题抛异常；try-catch 仅防护构造函数级别的严重异常
    // Document 类型不在 AllowedValue 编译期联合类型中，但运行时 rune 引擎可接受
    const doc = new DOMParser().parseFromString(html, "text/html");
    // 解析后立即移除 XHTML 命名空间，使 Document 在后续 xpath 查询中可直接使用
    stripNamespaces(doc);
    return doc as unknown as AllowedValue;
  } catch {
    return null;
  }
}
