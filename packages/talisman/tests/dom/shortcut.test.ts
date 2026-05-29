// packages/talisman/tests/dom/shortcut.test.ts
import { describe, it, expect } from "vitest";
import { html_parse } from "../../src/dom/parse";
import {
  css_select_text,
  css_select_html,
  css_select_outer_html,
  css_select_attr,
  css_select1_text,
  css_select1_html,
  css_select1_outer_html,
  css_select1_attr,
} from "../../src/dom/shortcut";

// 测试用 HTML
const sampleHtml = `
<html>
  <body>
    <div class="main">
      <h1 class="title">第一章</h1>
      <p>内容A</p>
      <p>内容B</p>
      <a href="/p1" class="link">链接1</a>
      <a href="/p2">链接2</a>
      <a>链接3</a>
    </div>
  </body>
</html>`;

const doc = html_parse(sampleHtml);

describe("css_select_text", () => {
  it("提取所有匹配元素的文本", () => {
    const result = css_select_text(doc, "p");
    expect(result).toEqual(["内容A", "内容B"]);
  });

  it("无匹配返回空数组", () => {
    const result = css_select_text(doc, "section");
    expect(result).toEqual([]);
  });

  it("非 Document 输入返回 null", () => {
    expect(css_select_text(null as any, "p")).toBeNull();
  });
});

describe("css_select_html", () => {
  it("提取所有匹配元素的 innerHTML", () => {
    const result = css_select_html(doc, "h1") as string[];
    expect(result.length).toBe(1);
    // domutils 会将中文编码为 HTML 实体
    expect(result[0]).toBeTruthy();
  });

  it("无匹配返回空数组", () => {
    const result = css_select_html(doc, "section");
    expect(result).toEqual([]);
  });
});

describe("css_select_outer_html", () => {
  it("提取所有匹配元素的 outerHTML", () => {
    const result = css_select_outer_html(doc, "h1") as string[];
    expect(result.length).toBe(1);
    expect(result[0]).toContain("<h1");
    expect(result[0]).toContain("</h1>");
  });
});

describe("css_select_attr", () => {
  it("提取所有匹配元素的指定属性", () => {
    const result = css_select_attr(doc, "a", "href");
    // 三个 a 标签：第一个有 href，第二个有 href，第三个没有
    expect(result).toEqual(["/p1", "/p2", null]);
  });

  it("无匹配返回空数组", () => {
    const result = css_select_attr(doc, "section", "href");
    expect(result).toEqual([]);
  });

  it("非字符串属性名返回 null", () => {
    expect(css_select_attr(doc, "a", 123 as any)).toBeNull();
  });
});

describe("css_select1_text", () => {
  it("提取第一个匹配元素的文本", () => {
    expect(css_select1_text(doc, "p")).toBe("内容A");
  });

  it("无匹配返回 null", () => {
    expect(css_select1_text(doc, "section")).toBeNull();
  });

  it("非法选择器返回 null", () => {
    expect(css_select1_text(doc, "[[[")).toBeNull();
  });
});

describe("css_select1_html", () => {
  it("提取第一个匹配元素的 innerHTML", () => {
    const result = css_select1_html(doc, "h1") as string;
    expect(result).toBeTruthy();
  });

  it("无匹配返回 null", () => {
    expect(css_select1_html(doc, "section")).toBeNull();
  });
});

describe("css_select1_outer_html", () => {
  it("提取第一个匹配元素的 outerHTML", () => {
    const result = css_select1_outer_html(doc, "h1") as string;
    expect(result).toContain("<h1");
    expect(result).toContain("</h1>");
  });
});

describe("css_select1_attr", () => {
  it("提取第一个匹配元素的指定属性", () => {
    expect(css_select1_attr(doc, "a", "href")).toBe("/p1");
  });

  it("属性不存在返回 null", () => {
    expect(css_select1_attr(doc, "a:last-child", "href")).toBeNull();
  });

  it("无匹配返回 null", () => {
    expect(css_select1_attr(doc, "section", "href")).toBeNull();
  });
});
