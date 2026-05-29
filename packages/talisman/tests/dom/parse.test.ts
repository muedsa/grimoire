// packages/talisman/tests/dom/parse.test.ts
import { describe, it, expect } from "vitest";
import { xml_parse, html_parse } from "../../src/dom/parse";
import { asDocument } from "./helper";

describe("xml_parse（@xmldom/xmldom — 配合 xpath 使用）", () => {
  it("将有效 XML/HTML 字符串解析为 W3C Document", () => {
    const doc = asDocument(
      xml_parse("<html><body><h1>Hello</h1></body></html>"),
    );
    expect(doc).not.toBeNull();
    expect(doc.documentElement).toBeDefined();
    const h1 = doc.getElementsByTagName("h1")[0];
    expect(h1.textContent).toBe("Hello");
  });

  it("解析简单片段为完整 Document（DOMParser 自动补全结构）", () => {
    const doc = asDocument(xml_parse("<p>text</p>"));
    expect(doc).not.toBeNull();
    const el = doc.documentElement;
    expect(el).toBeDefined();
  });

  it("非法输入 — 非字符串返回 null", () => {
    expect(xml_parse(123 as any)).toBeNull();
    expect(xml_parse(null as any)).toBeNull();
    expect(xml_parse(undefined as any)).toBeNull();
  });

  it("非法输入 — 无参数返回 null", () => {
    expect(xml_parse()).toBeNull();
  });

  it("解析结果可用 getElementsByTagName 查询", () => {
    const doc = asDocument(
      xml_parse("<html><body><h1>A</h1><h1>B</h1></body></html>"),
    );
    const h1s = doc.getElementsByTagName("h1");
    expect(h1s.length).toBe(2);
    expect(h1s[0].textContent).toBe("A");
    expect(h1s[1].textContent).toBe("B");
  });
});

describe("html_parse（htmlparser2 — 配合 css-select 使用）", () => {
  it("将有效 HTML 字符串解析为 domhandler Document", () => {
    const doc = html_parse("<html><body><h1>Hello</h1></body></html>");
    expect(doc).not.toBeNull();
    // domhandler Document 有 children 和 type 属性
    const d = doc as any;
    expect(d.type).toBe("root");
    expect(Array.isArray(d.children)).toBe(true);
  });

  it("解析简单片段 — htmlparser2 容错处理", () => {
    const doc = html_parse("<p>text</p>");
    expect(doc).not.toBeNull();
    const d = doc as any;
    expect(d.type).toBe("root");
    expect(d.children.length).toBeGreaterThan(0);
  });

  it("解析不规则 HTML — 未闭合标签", () => {
    const doc = html_parse("<p>text<br>more");
    expect(doc).not.toBeNull();
    const d = doc as any;
    expect(d.type).toBe("root");
  });

  it("非法输入 — 非字符串返回 null", () => {
    expect(html_parse(123 as any)).toBeNull();
    expect(html_parse(null as any)).toBeNull();
    expect(html_parse(undefined as any)).toBeNull();
  });

  it("非法输入 — 无参数返回 null", () => {
    expect(html_parse()).toBeNull();
  });

  it("解析结果可通过遍历 children 访问 DOM 结构", () => {
    const doc = html_parse("<html><body><h1>A</h1><h1>B</h1></body></html>");
    const d = doc as any;
    // html → body → h1 遍历
    const html = d.children.find((c: any) => c.name === "html");
    expect(html).toBeDefined();
    const body = html.children.find((c: any) => c.name === "body");
    expect(body).toBeDefined();
    const h1s = body.children.filter((c: any) => c.name === "h1");
    expect(h1s.length).toBe(2);
  });
});
