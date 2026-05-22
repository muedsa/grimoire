import { describe, it, expect } from "vitest";
import { parseExpression } from "../../src/index";
import { EngineError } from "../../src/index";

describe("parseExpression — string escape edge cases", () => {
  it("handles unknown escape sequences literally", () => {
    const ast = parseExpression("'hello\\xworld'");
    expect((ast as any).value).toBe("helloxworld");
  });

  it("handles \\r as literal r", () => {
    const ast = parseExpression("'return\\r'");
    expect((ast as any).value).toBe("returnr");
  });

  it("handles multiple mixed escapes", () => {
    const ast = parseExpression("'a\\nb\\tc\\'d'");
    expect((ast as any).value).toBe("a\nb\tc'd");
  });
});

describe("parseExpression — edge cases", () => {
  it("parses single identifier", () => {
    const ast = parseExpression("x");
    expect(ast.kind).toBe("path");
    expect((ast as any).segments).toEqual(["x"]);
  });

  it("parses deeply nested path", () => {
    const ast = parseExpression("a.b.c.d.e.f");
    expect(ast.kind).toBe("path");
    expect((ast as any).segments).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("parses chained function calls", () => {
    const ast = parseExpression("fn1(fn2(x))");
    expect(ast.kind).toBe("call");
    expect((ast as any).target.segments).toEqual(["fn1"]);
    expect((ast as any).args[0].kind).toBe("call");
  });

  it("parses function with no arguments", () => {
    const ast = parseExpression("fn()");
    expect(ast.kind).toBe("call");
    expect((ast as any).target.segments).toEqual(["fn"]);
    expect((ast as any).args).toEqual([]);
  });

  it("parses function call with path target", () => {
    const ast = parseExpression("data.helpers.len(items)");
    expect(ast.kind).toBe("call");
    expect((ast as any).target.segments).toEqual(["data", "helpers", "len"]);
    expect((ast as any).args.length).toBe(1);
  });
});

describe("parseExpression — unexpected token at parsePrimary", () => {
  it("throws on leading unary operator", () => {
    expect(() => parseExpression("!x")).not.toThrow(); // ! is valid unary
  });

  it("throws on leading arithmetic operator", () => {
    const err = expect(() => parseExpression("+ 5"));
    err.toThrow("Unexpected token operator");
  });

  it("throws on leading multiplication", () => {
    expect(() => parseExpression("* a")).toThrow("Unexpected token operator");
  });

  it("throws on standalone operator", () => {
    expect(() => parseExpression("&& a")).toThrow("Unexpected token operator");
  });
});
