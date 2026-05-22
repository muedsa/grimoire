import { describe, it, expect } from "vitest";
import { html_parse } from "../../src/html/parse";
import { asDocument } from "./helper";

describe("html_parse", () => {
  it("将有效 HTML 字符串解析为 Document", () => {
    const doc = asDocument(
      html_parse("<html><body><h1>Hello</h1></body></html>"),
    );
    expect(doc).not.toBeNull();
    // Document 类型有 documentElement 属性
    expect(doc.documentElement).toBeDefined();
    // 验证解析后的文本内容
    const h1 = doc.getElementsByTagName("h1")[0];
    expect(h1.textContent).toBe("Hello");
  });

  it("解析简单片段为完整 Document（DOMParser 自动补全结构）", () => {
    const doc = asDocument(html_parse("<p>text</p>"));
    expect(doc).not.toBeNull();
    const el = doc.documentElement;
    expect(el).toBeDefined();
  });

  it("非法输入 — 非字符串返回 null", () => {
    expect(html_parse(123 as any)).toBeNull();
    expect(html_parse(null as any)).toBeNull();
    expect(html_parse(undefined as any)).toBeNull();
  });

  it("非法输入 — 无参数返回 null", () => {
    expect(html_parse()).toBeNull();
  });

  it("解析结果可用 getElementsByTagName 查询", () => {
    const doc = asDocument(
      html_parse("<html><body><h1>A</h1><h1>B</h1></body></html>"),
    );
    const h1s = doc.getElementsByTagName("h1");
    expect(h1s.length).toBe(2);
    // 验证解析后的文本内容
    expect(h1s[0].textContent).toBe("A");
    expect(h1s[1].textContent).toBe("B");
  });
});
