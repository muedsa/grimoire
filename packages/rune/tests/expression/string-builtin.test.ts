import { describe, it, expect } from "vitest";
import { ExecutionContext, evaluateExpression } from "../../src/index";

describe("evaluate — string builtins", () => {
  it("str_starts_with returns true/false", async () => {
    const ctx = new ExecutionContext({ url: "https://example.com" });
    expect(await evaluateExpression("str_starts_with(url, 'https')", ctx)).toBe(true);
    expect(await evaluateExpression("str_starts_with(url, 'http')", ctx)).toBe(true);
    expect(await evaluateExpression("str_starts_with(url, 'ftp')", ctx)).toBe(false);
  });

  it("str_ends_with returns true/false", async () => {
    const ctx = new ExecutionContext({ file: "report.pdf" });
    expect(await evaluateExpression("str_ends_with(file, '.pdf')", ctx)).toBe(true);
    expect(await evaluateExpression("str_ends_with(file, '.doc')", ctx)).toBe(false);
  });

  it("str_contains works for strings and arrays", async () => {
    const ctx = new ExecutionContext({ text: "hello world", arr: [1, 2, 3] });
    expect(await evaluateExpression("str_contains(text, 'world')", ctx)).toBe(true);
    expect(await evaluateExpression("str_contains(text, 'xyz')", ctx)).toBe(false);
    expect(await evaluateExpression("str_contains(arr, 2)", ctx)).toBe(true);
    expect(await evaluateExpression("str_contains(arr, 5)", ctx)).toBe(false);
  });

  it("str_index_of returns position or -1", async () => {
    const ctx = new ExecutionContext({ text: "abcabc", arr: ["a", "b", "c"] });
    expect(await evaluateExpression("str_index_of(text, 'bc')", ctx)).toBe(1);
    expect(await evaluateExpression("str_index_of(text, 'xyz')", ctx)).toBe(-1);
    expect(await evaluateExpression("str_index_of(arr, 'b')", ctx)).toBe(1);
  });

  it("str_slice works for strings and arrays", async () => {
    const ctx = new ExecutionContext({ text: "hello", arr: [1, 2, 3, 4, 5] });
    expect(await evaluateExpression("str_slice(text, 1, 4)", ctx)).toBe("ell");
    expect(await evaluateExpression("str_slice(text, 2)", ctx)).toBe("llo");
    expect(await evaluateExpression("str_slice(arr, 1, 3)", ctx)).toEqual([2, 3]);
  });

  it("str_to_upper_case and str_to_lower_case", async () => {
    const ctx = new ExecutionContext({ text: "Hello World" });
    expect(await evaluateExpression("str_to_upper_case(text)", ctx)).toBe("HELLO WORLD");
    expect(await evaluateExpression("str_to_lower_case(text)", ctx)).toBe("hello world");
  });

  it("str_replace 只替换第一个匹配项（JS String.replace 行为）", async () => {
    const ctx = new ExecutionContext({ text: "a-b-c" });
    expect(
      await evaluateExpression("str_replace(text, '-', '_')", ctx),
    ).toBe("a_b-c");
  });

  it("str_split divides string into array", async () => {
    const ctx = new ExecutionContext({ csv: "a,b,c" });
    expect(await evaluateExpression("str_split(csv, ',')", ctx)).toEqual(["a", "b", "c"]);
  });

  it("str_trim removes whitespace", async () => {
    const ctx = new ExecutionContext({ text: "  hello  " });
    expect(await evaluateExpression("str_trim(text)", ctx)).toBe("hello");
  });

  it("字符串函数对非字符串参数抛出 TypeError", async () => {
    const ctx = new ExecutionContext({ num: 42 });
    await expect(
      evaluateExpression("str_to_upper_case(num)", ctx),
    ).rejects.toThrow(TypeError);
    await expect(
      evaluateExpression("str_to_lower_case(num)", ctx),
    ).rejects.toThrow(TypeError);
    await expect(
      evaluateExpression("str_trim(num)", ctx),
    ).rejects.toThrow(TypeError);
    await expect(
      evaluateExpression("str_replace(num, '4', '5')", ctx),
    ).rejects.toThrow(TypeError);
  });

  it("str_starts_with 和 str_split 对非字符串保持原有安全降级", async () => {
    const ctx = new ExecutionContext({ num: 42 });
    expect(await evaluateExpression("str_starts_with(num, '4')", ctx)).toBe(false);
    expect(await evaluateExpression("str_split(num, ',')", ctx)).toEqual([]);
  });

  it("str_contains returns false for non-string/non-array values", async () => {
    const ctx = new ExecutionContext({ num: 42, nil: null, flag: true });
    expect(await evaluateExpression("str_contains(num, 'x')", ctx)).toBe(false);
    expect(await evaluateExpression("str_contains(nil, 'x')", ctx)).toBe(false);
    expect(await evaluateExpression("str_contains(flag, 'x')", ctx)).toBe(false);
  });

  it("str_index_of returns -1 for non-string/non-array values", async () => {
    const ctx = new ExecutionContext({ num: 42, nil: null });
    expect(await evaluateExpression("str_index_of(num, 'x')", ctx)).toBe(-1);
    expect(await evaluateExpression("str_index_of(nil, 'x')", ctx)).toBe(-1);
  });

  it("str_slice 对非字符串/非数组参数抛出 TypeError", async () => {
    const ctx = new ExecutionContext({ num: 42, nil: null });
    await expect(
      evaluateExpression("str_slice(num, 0, 1)", ctx),
    ).rejects.toThrow(TypeError);
    await expect(
      evaluateExpression("str_slice(nil, 0, 1)", ctx),
    ).rejects.toThrow(TypeError);
  });

  it("str_to_lower_case 对非字符串抛出 TypeError", async () => {
    const ctx = new ExecutionContext({ num: 42 });
    await expect(
      evaluateExpression("str_to_lower_case(num)", ctx),
    ).rejects.toThrow(TypeError);
  });
});

describe("evaluate — URL 编解码", () => {
  it("url_encode 编码字符串", async () => {
    const ctx = new ExecutionContext({ s: "hello world" });
    expect(await evaluateExpression("url_encode(s)", ctx)).toBe("hello%20world");
  });

  it("url_encode 编码特殊字符 / 中文", async () => {
    const ctx = new ExecutionContext({ s: "你好&x=1" });
    expect(await evaluateExpression("url_encode(s)", ctx)).toBe(
      "%E4%BD%A0%E5%A5%BD%26x%3D1",
    );
  });

  it("url_encode 非字符串返回空字符串", async () => {
    const ctx = new ExecutionContext({ n: 123, nil: null });
    expect(await evaluateExpression("url_encode(n)", ctx)).toBe("");
    expect(await evaluateExpression("url_encode(nil)", ctx)).toBe("");
  });

  it("url_decode 解码字符串", async () => {
    const ctx = new ExecutionContext({ s: "hello%20world" });
    expect(await evaluateExpression("url_decode(s)", ctx)).toBe("hello world");
  });

  it("url_decode 解码中文", async () => {
    const ctx = new ExecutionContext({
      s: "%E4%BD%A0%E5%A5%BD%26x%3D1",
    });
    expect(await evaluateExpression("url_decode(s)", ctx)).toBe("你好&x=1");
  });

  it("url_decode 非字符串返回空字符串", async () => {
    const ctx = new ExecutionContext({ n: 456, nil: null });
    expect(await evaluateExpression("url_decode(n)", ctx)).toBe("");
    expect(await evaluateExpression("url_decode(nil)", ctx)).toBe("");
  });

  it("url_decode 非法编码返回空字符串", async () => {
    // decodeURIComponent 会对无效 UTF-8 序列抛异常
    const ctx = new ExecutionContext({ s: "%E0%A4%B" });
    expect(await evaluateExpression("url_decode(s)", ctx)).toBe("");
  });
});
