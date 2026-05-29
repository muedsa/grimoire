// packages/talisman/tests/dom/css.test.ts
import { describe, it, expect } from "vitest";
import { html_parse } from "../../src/dom/parse";
import { css_select, css_select1 } from "../../src/dom/css";

// 测试用 HTML 片段
const sampleHtml = `
<html>
  <body>
    <div class="main">
      <h1 class="title">第一章</h1>
      <p>内容 A</p>
      <a href="/page1">链接1</a>
      <a href="/page2">链接2</a>
      <ul>
        <li data-id="1">项目1</li>
        <li data-id="2">项目2</li>
      </ul>
    </div>
    <div class="footer">
      <p>版权信息</p>
    </div>
  </body>
</html>`;

// 所有测试复用同一个 Document
const doc = html_parse(sampleHtml);

describe("css_select", () => {
  it("按标签名选择元素 — 返回元素数组", () => {
    const result = css_select(doc, "h1");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(1);
  });

  it("按 class 选择元素", () => {
    const result = css_select(doc, ".main");
    expect((result as unknown[]).length).toBe(1);
  });

  it("按属性选择元素", () => {
    const result = css_select(doc, '[data-id="1"]');
    expect((result as unknown[]).length).toBe(1);
  });

  it("嵌套选择器 — 子元素选择", () => {
    const result = css_select(doc, "div.main a");
    expect((result as unknown[]).length).toBe(2);
  });

  it("嵌套选择器 — 直接子元素", () => {
    const result = css_select(doc, ".main > p");
    expect((result as unknown[]).length).toBe(1);
  });

  it("多标签选择", () => {
    const result = css_select(doc, "a");
    expect((result as unknown[]).length).toBe(2);
  });

  it("无匹配时返回空数组", () => {
    const result = css_select(doc, "section");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(0);
  });

  it("非 Document 输入返回 null", () => {
    expect(css_select(null as any, "div")).toBeNull();
    expect(css_select(undefined as any, "div")).toBeNull();
    expect(css_select(123 as any, "div")).toBeNull();
  });

  it("非字符串选择器返回 null", () => {
    expect(css_select(doc, 123 as any)).toBeNull();
    expect(css_select(doc, null as any)).toBeNull();
  });

  it("非法 CSS 选择器返回 null", () => {
    const result = css_select(doc, "[[[");
    expect(result).toBeNull();
  });
});

describe("css_select1", () => {
  it("返回单个元素", () => {
    const result = css_select1(doc, "h1");
    expect(result).not.toBeNull();
    // domhandler Element 有 name 属性表示标签名
    expect((result as any).name).toBe("h1");
  });

  it("按 class 返回单个元素", () => {
    const result = css_select1(doc, ".title");
    expect((result as any).name).toBe("h1");
  });

  it("无匹配时返回 null", () => {
    const result = css_select1(doc, "section");
    expect(result).toBeNull();
  });

  it("非 Document 输入返回 null", () => {
    expect(css_select1(null as any, "div")).toBeNull();
    expect(css_select1(undefined as any, "div")).toBeNull();
    expect(css_select1(123 as any, "div")).toBeNull();
  });

  it("非字符串选择器返回 null", () => {
    expect(css_select1(doc, 123 as any)).toBeNull();
  });

  it("非法 CSS 选择器返回 null", () => {
    expect(css_select1(doc, "[[[")).toBeNull();
  });
});
