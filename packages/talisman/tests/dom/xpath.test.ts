import { describe, it, expect } from "vitest";
import { xml_parse } from "../../src/dom/parse";
import { xpath_select, xpath_select1 } from "../../src/dom/xpath";

const sampleHtml = `
<html>
  <body>
    <div class="main">
      <h1 class="title">第一章</h1>
      <p>内容 A</p>
      <a href="/page1">链接1</a>
      <a href="/page2">链接2</a>
    </div>
    <div class="footer">
      <p>版权信息</p>
    </div>
  </body>
</html>`;

// 所有测试复用同一个 Document
const doc = xml_parse(sampleHtml);

describe("xpath_select", () => {
  it("按标签名选择元素 — 返回节点数组", () => {
    const result = xpath_select(doc, "//h1");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown as Node[]).length).toBe(1);
  });

  it("按 class 选择元素", () => {
    const result = xpath_select(doc, '//div[@class="main"]');
    expect((result as unknown as Node[]).length).toBe(1);
  });

  it("选择文本节点 — 返回文本节点数组", () => {
    const result = xpath_select(doc, '//h1[@class="title"]/text()');
    expect(Array.isArray(result)).toBe(true);
  });

  it("选择属性值 — 返回属性节点数组", () => {
    const result = xpath_select(doc, "//a/@href");
    // 属性节点数组，每个 .value 是 href 值
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown as Node[]).length).toBe(2);
  });

  it("count() 表达式 — 返回数字", () => {
    const result = xpath_select(doc, "count(//a)");
    expect(result).toBe(2);
  });

  it("count() 比较 — 返回布尔", () => {
    const result = xpath_select(doc, "count(//a) > 0");
    expect(result).toBe(true);
  });

  it("没有任何匹配时返回空数组", () => {
    const result = xpath_select(doc, "//section");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown as Node[]).length).toBe(0);
  });

  it("非 Document 输入返回 null", () => {
    expect(xpath_select(null as any, "//div")).toBeNull();
    expect(xpath_select(undefined as any, "//div")).toBeNull();
    expect(xpath_select(123 as any, "//div")).toBeNull();
  });

  it("非字符串 XPath 表达式返回 null", () => {
    expect(xpath_select(doc, 123 as any)).toBeNull();
    expect(xpath_select(doc, null as any)).toBeNull();
  });

  it("非法 XPath 表达式返回 null", () => {
    const result = xpath_select(doc, "///[[[invalid");
    expect(result).toBeNull();
  });
});

describe("xpath_select1", () => {
  it("返回单个节点", () => {
    const result = xpath_select1(doc, "//h1");
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect((result as unknown as Element).tagName).toBe("h1");
  });

  it("无匹配时返回 undefined", () => {
    const result = xpath_select1(doc, "//section");
    expect(result).toBeUndefined();
  });

  it("非 Document 输入返回 null", () => {
    expect(xpath_select1(null as any, "//div")).toBeNull();
    expect(xpath_select1(undefined as any, "//div")).toBeNull();
    expect(xpath_select1(123 as any, "//div")).toBeNull();
  });

  it("非字符串 XPath 表达式返回 null", () => {
    expect(xpath_select1(doc, 123 as any)).toBeNull();
  });

  it("非法 XPath 返回 null", () => {
    expect(xpath_select1(doc, "///[[[invalid")).toBeNull();
  });
});
