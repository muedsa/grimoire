// packages/talisman/tests/dom/element.test.ts
import { describe, it, expect } from "vitest";
import { html_parse } from "../../src/dom/parse";
import { css_select1 } from "../../src/dom/css";
import {
  el_inner_text,
  el_inner_html,
  el_outer_html,
  el_attr,
  el_has_attr,
} from "../../src/dom/element";

// 准备测试用 Element
const doc = html_parse(
  '<div class="main"><h1>标题</h1><p>正文<b>加粗</b>内容</p><span data-id="1" hidden></span></div>',
);
const div = css_select1(doc, "div") as any;
const h1 = css_select1(doc, "h1") as any;
const p = css_select1(doc, "p") as any;
const span = css_select1(doc, "span") as any;

describe("el_inner_text", () => {
  it("提取简单元素的内部文本", () => {
    expect(el_inner_text(h1)).toBe("标题");
  });

  it("提取嵌套元素的内部文本（递归拼接所有文本节点）", () => {
    expect(el_inner_text(p)).toBe("正文加粗内容");
  });

  it("空元素返回空字符串", () => {
    expect(el_inner_text(span)).toBe("");
  });

  it("非 Element 输入返回 null", () => {
    expect(el_inner_text(null as any)).toBeNull();
    expect(el_inner_text(undefined as any)).toBeNull();
    expect(el_inner_text(123 as any)).toBeNull();
    expect(el_inner_text("str" as any)).toBeNull();
  });
});

describe("el_inner_html", () => {
  it("提取内部 HTML 字符串（中文会被编码为 HTML 实体）", () => {
    const result = el_inner_html(p) as string;
    // domutils 默认将非 ASCII 字符编码为 HTML 数字字符引用
    expect(result).toContain("<b>");
    expect(result).toContain("</b>");
  });

  it("空元素返回空字符串", () => {
    expect(el_inner_html(span)).toBe("");
  });

  it("非 Element 输入返回 null", () => {
    expect(el_inner_html(null as any)).toBeNull();
  });
});

describe("el_outer_html", () => {
  it("提取包含自身标签的 HTML 字符串", () => {
    const result = el_outer_html(h1) as string;
    // domutils 默认将非 ASCII 字符编码为 HTML 数字字符引用
    expect(result).toContain("<h1>");
    expect(result).toContain("</h1>");
  });

  it("非 Element 输入返回 null", () => {
    expect(el_outer_html(null as any)).toBeNull();
  });
});

describe("el_attr", () => {
  it("获取存在的属性值", () => {
    // div 有 class="main"，span 有 data-id="1"
    expect(el_attr(div, "class")).toBe("main");
    expect(el_attr(span, "data-id")).toBe("1");
  });

  it("属性不存在返回 null", () => {
    expect(el_attr(div, "href")).toBeNull();
  });

  it("非 Element 输入返回 null", () => {
    expect(el_attr(null as any, "href")).toBeNull();
    expect(el_attr(123 as any, "href")).toBeNull();
  });

  it("非字符串属性名返回 null", () => {
    expect(el_attr(h1, 123 as any)).toBeNull();
  });
});

describe("el_has_attr", () => {
  it("存在属性返回 true", () => {
    // div 有 class="main"，span 有 data-id="1" 和 hidden
    expect(el_has_attr(div, "class")).toBe(true);
    expect(el_has_attr(span, "data-id")).toBe(true);
    expect(el_has_attr(span, "hidden")).toBe(true);
  });

  it("不存在属性返回 false", () => {
    expect(el_has_attr(div, "href")).toBe(false);
  });

  it("非 Element 输入返回 null", () => {
    expect(el_has_attr(null as any, "class")).toBeNull();
  });

  it("非字符串属性名返回 null", () => {
    expect(el_has_attr(h1, 123 as any)).toBeNull();
  });
});
