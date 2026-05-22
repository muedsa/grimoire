import { describe, it, expect } from "vitest";
import { parseExpression, compileExpression, clearExpressionCache } from "../../src/index";

describe("parseExpression — literals", () => {
  it("parses true/false/null as literal nodes", () => {
    const t = parseExpression("true");
    expect(t.kind).toBe("literal");
    expect((t as any).value).toBe(true);

    const f = parseExpression("false");
    expect(f.kind).toBe("literal");
    expect((f as any).value).toBe(false);

    const n = parseExpression("null");
    expect(n.kind).toBe("literal");
    expect((n as any).value).toBe(null);
  });

  it("parses string literals with escape sequences", () => {
    const s1 = parseExpression('"hello\\nworld"');
    expect((s1 as any).value).toBe("hello\nworld");

    const s2 = parseExpression("'tab\\there'");
    expect((s2 as any).value).toBe("tab\there");

    const s3 = parseExpression('"quote\\"here"');
    expect((s3 as any).value).toBe('quote"here');

    const s4 = parseExpression("'backslash\\\\end'");
    expect((s4 as any).value).toBe("backslash\\end");
  });

  it("parses number literals with decimals", () => {
    const n1 = parseExpression("3.14");
    expect((n1 as any).value).toBe(3.14);

    const n2 = parseExpression(".5");
    expect((n2 as any).value).toBe(0.5);
  });
});

describe("parseExpression — function calls", () => {
  it("parses function call with multiple arguments", () => {
    const ast = parseExpression("len(a, b, c)");
    expect(ast.kind).toBe("call");
    expect((ast as any).args.length).toBe(3);
  });

  it("parses nested function calls as arguments", () => {
    const ast = parseExpression("len(a, len(b))");
    expect(ast.kind).toBe("call");
    expect((ast as any).args.length).toBe(2);
    expect((ast as any).args[1].kind).toBe("call");
  });
});

describe("parseExpression — bracket notation", () => {
  it("parses arr[idx] as path with bracket segment", () => {
    const ast = parseExpression("arr[idx]");
    expect(ast.kind).toBe("path");
    const segs = (ast as any).segments;
    expect(segs[0]).toBe("arr");
    expect(segs[1].kind).toBe("bracket");
    expect(segs[1].expr.kind).toBe("path");
    expect(segs[1].expr.segments).toEqual(["idx"]);
  });

  it("parses arr[0] with numeric literal", () => {
    const ast = parseExpression("arr[0]");
    expect(ast.kind).toBe("path");
    const segs = (ast as any).segments;
    expect(segs[0]).toBe("arr");
    expect(segs[1].kind).toBe("bracket");
    expect(segs[1].expr.kind).toBe("literal");
    expect(segs[1].expr.value).toBe(0);
  });

  it("parses data.items[i] mixed dot and bracket", () => {
    const ast = parseExpression("data.items[i]");
    expect(ast.kind).toBe("path");
    const segs = (ast as any).segments;
    expect(segs).toHaveLength(3);
    expect(segs[0]).toBe("data");
    expect(segs[1]).toBe("items");
    expect(segs[2].kind).toBe("bracket");
  });

  it("parses arr[i + 1] with expression in brackets", () => {
    const ast = parseExpression("arr[i + 1]");
    expect(ast.kind).toBe("path");
    const segs = (ast as any).segments;
    expect(segs[1].kind).toBe("bracket");
    expect(segs[1].expr.kind).toBe("binary");
    expect(segs[1].expr.operator).toBe("+");
  });

  it("parses arr[i][j] chained bracket access", () => {
    const ast = parseExpression("arr[i][j]");
    expect(ast.kind).toBe("path");
    const segs = (ast as any).segments;
    expect(segs).toHaveLength(3);
    expect(segs[0]).toBe("arr");
    expect(segs[1].kind).toBe("bracket");
    expect(segs[1].expr.segments).toEqual(["i"]);
    expect(segs[2].kind).toBe("bracket");
    expect(segs[2].expr.segments).toEqual(["j"]);
  });

  it("parses data.rows[i].name mixed access pattern", () => {
    const ast = parseExpression("data.rows[i].name");
    expect(ast.kind).toBe("path");
    const segs = (ast as any).segments;
    expect(segs).toHaveLength(4);
    expect(segs[0]).toBe("data");
    expect(segs[1]).toBe("rows");
    expect(segs[2].kind).toBe("bracket");
    expect(segs[3]).toBe("name");
  });

  it("throws on missing closing bracket", () => {
    expect(() => parseExpression("arr[idx")).toThrow("Expected rbracket");
  });
});

describe("parseExpression — expression caching", () => {
  it("same expression returns cached AST", () => {
    clearExpressionCache();

    const expr = "data.a + data.b";
    const ast1 = compileExpression(expr);
    const ast2 = compileExpression(expr);
    expect(ast1).toBe(ast2);

    const ast3 = compileExpression("data.a - data.b");
    expect(ast1).not.toBe(ast3);
  });
});

describe("parseExpression — array and object literals", () => {
  it("parses empty array", () => {
    const ast = parseExpression("[]");
    expect(ast.kind).toBe("array");
    expect((ast as any).elements).toHaveLength(0);
  });

  it("parses array with elements", () => {
    const ast = parseExpression("[1, 2, 3]");
    expect(ast.kind).toBe("array");
    const els = (ast as any).elements;
    expect(els).toHaveLength(3);
    expect(els[0].value).toBe(1);
    expect(els[1].value).toBe(2);
    expect(els[2].value).toBe(3);
  });

  it("parses array with trailing comma", () => {
    const ast = parseExpression("[1, ]");
    expect(ast.kind).toBe("array");
    expect((ast as any).elements).toHaveLength(1);
  });

  it("parses array with expressions", () => {
    const ast = parseExpression("[a, b + 1]");
    expect(ast.kind).toBe("array");
    const els = (ast as any).elements;
    expect(els).toHaveLength(2);
    expect(els[0].kind).toBe("path");
    expect(els[1].kind).toBe("binary");
  });

  it("parses empty object", () => {
    const ast = parseExpression("{}");
    expect(ast.kind).toBe("object");
    expect((ast as any).properties).toHaveLength(0);
  });

  it("parses object with identifier keys", () => {
    const ast = parseExpression("{name: 'Alice', age: 30}");
    expect(ast.kind).toBe("object");
    const props = (ast as any).properties;
    expect(props).toHaveLength(2);
    expect(props[0].key).toBe("name");
    expect(props[1].key).toBe("age");
  });

  it("parses object with quoted string keys", () => {
    const ast = parseExpression('{"first-name": "John", "last-name": "Doe"}');
    expect(ast.kind).toBe("object");
    const props = (ast as any).properties;
    expect(props).toHaveLength(2);
    expect(props[0].key).toBe("first-name");
    expect(props[1].key).toBe("last-name");
  });

  it("parses object with expression values", () => {
    const ast = parseExpression("{x: a + b}");
    expect(ast.kind).toBe("object");
    const props = (ast as any).properties;
    expect(props[0].value.kind).toBe("binary");
  });

  it("parses object with trailing comma", () => {
    const ast = parseExpression("{a: 1, }");
    expect(ast.kind).toBe("object");
    expect((ast as any).properties).toHaveLength(1);
  });

  it("throws on invalid object property key", () => {
    expect(() => parseExpression("{123: val}")).toThrow("Expected property key");
  });
});

describe("parseExpression — function call chaining", () => {
  it("fn().prop", () => {
    const ast = parseExpression("f().x");
    expect(ast.kind).toBe("path");
    // 首段为 bracket（包装了 call），第二段为 "x"
    const path = ast as any;
    expect(path.segments.length).toBe(2);
    expect(path.segments[0].kind).toBe("bracket");
    expect(path.segments[0].expr.kind).toBe("call");
    expect(path.segments[1]).toBe("x");
  });

  it("fn().prop.sub", () => {
    const ast = parseExpression("g().a.b");
    expect(ast.kind).toBe("path");
    const path = ast as any;
    expect(path.segments.length).toBe(3);
    expect(path.segments[0].kind).toBe("bracket");
    expect(path.segments[0].expr.kind).toBe("call");
    expect(path.segments[1]).toBe("a");
    expect(path.segments[2]).toBe("b");
  });

  it("fn(args).prop", () => {
    const ast = parseExpression("h(1, 2).result");
    expect(ast.kind).toBe("path");
    const path = ast as any;
    expect(path.segments[0].kind).toBe("bracket");
    expect(path.segments[0].expr.kind).toBe("call");
    expect(path.segments[0].expr.args.length).toBe(2);
    expect(path.segments[1]).toBe("result");
  });

  it("nested: fn().prop()", () => {
    // fn().x() — 先得到 fn() 的 .x，然后 x 是函数被调用
    const ast = parseExpression("f().x()");
    expect(ast.kind).toBe("call");
    const call = ast as any;
    expect(call.target.kind).toBe("path");
    expect(call.target.segments[0].kind).toBe("bracket");
    expect(call.target.segments[0].expr.kind).toBe("call");
    expect(call.target.segments[1]).toBe("x");
  });
});

describe("parseExpression — error scenarios", () => {
  it("throws on unexpected character", () => {
    expect(() => parseExpression("a @ b")).toThrow("Unexpected character '@'");
  });

  it("throws on unterminated string", () => {
    expect(() => parseExpression('"hello')).toThrow("Unterminated string");
  });

  it("throws on missing identifier after dot", () => {
    expect(() => parseExpression("data.")).toThrow("Expected identifier or number after '.'");
  });

  it("throws on missing closing parenthesis", () => {
    expect(() => parseExpression("(a + b")).toThrow("Expected rparen");
  });
});

describe("parseExpression — unary minus", () => {
  it("parses negative number literal", () => {
    const ast = parseExpression("-3");
    expect(ast.kind).toBe("unary");
    expect((ast as any).operator).toBe("-");
    expect((ast as any).argument).toEqual({ kind: "literal", type: "number", value: 3 });
  });

  it("parses negative variable", () => {
    const ast = parseExpression("-x");
    expect(ast.kind).toBe("unary");
    expect((ast as any).operator).toBe("-");
    expect((ast as any).argument.kind).toBe("path");
  });

  it("parses double negative", () => {
    const ast = parseExpression("--5");
    expect(ast.kind).toBe("unary");
    expect((ast as any).operator).toBe("-");
    expect((ast as any).argument.kind).toBe("unary");
    expect((ast as any).argument.operator).toBe("-");
  });

  it("parses not-negative", () => {
    const ast = parseExpression("!-x");
    expect(ast.kind).toBe("unary");
    expect((ast as any).operator).toBe("!");
    expect((ast as any).argument.kind).toBe("unary");
    expect((ast as any).argument.operator).toBe("-");
  });

  it("parses negative-not", () => {
    const ast = parseExpression("-!x");
    expect(ast.kind).toBe("unary");
    expect((ast as any).operator).toBe("-");
    expect((ast as any).argument.kind).toBe("unary");
    expect((ast as any).argument.operator).toBe("!");
  });

  it("parses binary minus with unary right operand", () => {
    const ast = parseExpression("a - -b");
    expect(ast.kind).toBe("binary");
    expect((ast as any).operator).toBe("-");
    expect((ast as any).right.kind).toBe("unary");
    expect((ast as any).right.operator).toBe("-");
  });

  it("parses negative in function arguments", () => {
    const ast = parseExpression("double(-3)");
    expect(ast.kind).toBe("call");
    expect((ast as any).args[0].kind).toBe("unary");
    expect((ast as any).args[0].operator).toBe("-");
  });

  it("parses negative inside parentheses", () => {
    const ast = parseExpression("(-3)");
    expect(ast.kind).toBe("paren");
    expect((ast as any).expression.kind).toBe("unary");
    expect((ast as any).expression.operator).toBe("-");
  });
});
