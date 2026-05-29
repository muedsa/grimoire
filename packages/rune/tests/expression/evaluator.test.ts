import { describe, it, expect } from "vitest";
import {
  ExecutionContext,
  evaluateExpression,
  evaluate,
} from "../../src/index";

describe("evaluate — binary operators", () => {
  it("arithmetic: +, -, *, /, %", async () => {
    const ctx = new ExecutionContext({ a: 10, b: 3 });
    expect(await evaluateExpression("a + b", ctx)).toBe(13);
    expect(await evaluateExpression("a - b", ctx)).toBe(7);
    expect(await evaluateExpression("a * b", ctx)).toBe(30);
    expect(await evaluateExpression("a / b", ctx)).toBeCloseTo(3.333, 2);
    expect(await evaluateExpression("a % b", ctx)).toBe(1);
    expect(await evaluateExpression("7 % 3", ctx)).toBe(1);
    expect(await evaluateExpression("10 % 2", ctx)).toBe(0);
  });

  it("comparison: >, <, >=, <=", async () => {
    const ctx = new ExecutionContext({ a: 5, b: 5, c: 10 });
    expect(await evaluateExpression("a > b", ctx)).toBe(false);
    expect(await evaluateExpression("a < c", ctx)).toBe(true);
    expect(await evaluateExpression("a >= b", ctx)).toBe(true);
    expect(await evaluateExpression("a <= c", ctx)).toBe(true);
  });

  it("equality: ==, !=", async () => {
    const ctx = new ExecutionContext({ a: 5, b: "5" });
    expect(await evaluateExpression("a == b", ctx)).toBe(true);
    expect(await evaluateExpression("a != b", ctx)).toBe(false);
  });

  it("logical: &&, ||", async () => {
    const ctx = new ExecutionContext({ t: true, f: false });
    expect(await evaluateExpression("t && t", ctx)).toBe(true);
    expect(await evaluateExpression("t && f", ctx)).toBe(false);
    expect(await evaluateExpression("t || f", ctx)).toBe(true);
    expect(await evaluateExpression("f || f", ctx)).toBe(false);
  });

  it("operator precedence: * before +", async () => {
    const ctx = new ExecutionContext({ a: 2, b: 3, c: 4 });
    expect(await evaluateExpression("a + b * c", ctx)).toBe(14);
    expect(await evaluateExpression("a + b % c", ctx)).toBe(5); // 2 + (3 % 4) = 5
  });

  it("operator precedence: comparison before logical", async () => {
    const ctx = new ExecutionContext({ a: 1, b: 2, c: 1 });
    expect(await evaluateExpression("a == c && b > a", ctx)).toBe(true);
  });

  it("parenthesized expressions override precedence", async () => {
    const ctx = new ExecutionContext({ a: 2, b: 3, c: 4 });
    expect(await evaluateExpression("(a + b) * c", ctx)).toBe(20);
  });
});

describe("evaluate — unary operator", () => {
  it("! negates truthy values", async () => {
    const ctx = new ExecutionContext({ t: true, f: false });
    expect(await evaluateExpression("!t", ctx)).toBe(false);
    expect(await evaluateExpression("!f", ctx)).toBe(true);
    expect(await evaluateExpression("!data.missing", ctx)).toBe(true);
  });
});

describe("evaluate — path resolution", () => {
  it("resolves nested object property", async () => {
    const ctx = new ExecutionContext({
      data: { user: { profile: { email: "test@example.com" } } },
    });
    expect(await evaluateExpression("data.user.profile.email", ctx)).toBe(
      "test@example.com",
    );
  });

  it("returns undefined for missing property", async () => {
    const ctx = new ExecutionContext({ data: {} });
    expect(await evaluateExpression("data.missing", ctx)).toBe(undefined);
  });

  it("resolves array element via dot-number syntax", async () => {
    const ctx = new ExecutionContext({ data: { items: ["a", "b", "c"] } });
    expect(await evaluateExpression("data.items.0", ctx)).toBe("a");
    expect(await evaluateExpression("data.items.1", ctx)).toBe("b");
    expect(await evaluateExpression("data.items.2", ctx)).toBe("c");
  });

  it("resolves nested array elements", async () => {
    const ctx = new ExecutionContext({
      data: {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      },
    });
    expect(await evaluateExpression("data.matrix.0.0", ctx)).toBe(1);
    expect(await evaluateExpression("data.matrix.1.1", ctx)).toBe(4);
  });

  it("returns undefined for out-of-bounds index", async () => {
    const ctx = new ExecutionContext({ data: { arr: [42] } });
    expect(await evaluateExpression("data.arr.5", ctx)).toBe(undefined);
  });

  it("resolves array element in expression", async () => {
    const ctx = new ExecutionContext({ data: { nums: [10, 20, 30] } });
    expect(await evaluateExpression("data.nums.0 + data.nums.2", ctx)).toBe(40);
    expect(await evaluateExpression("data.nums.0 * data.nums.1", ctx)).toBe(
      200,
    );
  });
});

describe("evaluate — builtin functions", () => {
  it("len returns length of array, string, object", async () => {
    const ctx = new ExecutionContext({
      arr: [1, 2, 3],
      str: "hello",
      obj: { a: 1, b: 2 },
    });
    expect(await evaluateExpression("len(arr)", ctx)).toBe(3);
    expect(await evaluateExpression("len(str)", ctx)).toBe(5);
    expect(await evaluateExpression("len(obj)", ctx)).toBe(2);
    expect(await evaluateExpression("len(data.missing)", ctx)).toBe(0);
  });

  it("exists returns true for defined values", async () => {
    const ctx = new ExecutionContext({ val: 0 });
    expect(await evaluateExpression("exists(val)", ctx)).toBe(true);
    expect(await evaluateExpression("exists(missing)", ctx)).toBe(false);
  });

  it("empty returns true for empty collections", async () => {
    const ctx = new ExecutionContext({
      emptyArr: [],
      emptyStr: "",
      emptyObj: {},
      nonEmpty: [1],
    });
    expect(await evaluateExpression("empty(emptyArr)", ctx)).toBe(true);
    expect(await evaluateExpression("empty(emptyStr)", ctx)).toBe(true);
    expect(await evaluateExpression("empty(emptyObj)", ctx)).toBe(true);
    expect(await evaluateExpression("empty(nonEmpty)", ctx)).toBe(false);
  });

  it("str converts values to string", async () => {
    const ctx = new ExecutionContext({ num: 42, nil: null });
    expect(await evaluateExpression("str(num)", ctx)).toBe("42");
    expect(await evaluateExpression("str(nil)", ctx)).toBe("");
  });

  it("num converts values to number", async () => {
    const ctx = new ExecutionContext({ s: "123", bad: "abc" });
    expect(await evaluateExpression("num(s)", ctx)).toBe(123);
    expect(await evaluateExpression("num(bad)", ctx)).toBe(0);
  });

  it("json_stringify serializes values", async () => {
    const ctx = new ExecutionContext({
      obj: { name: "Alice", age: 30 },
      arr: [1, 2, 3],
      str: "hello",
      num: 42,
      nil: null,
    });
    expect(await evaluateExpression("json_stringify(obj)", ctx)).toBe(
      '{"name":"Alice","age":30}',
    );
    expect(await evaluateExpression("json_stringify(arr)", ctx)).toBe(
      "[1,2,3]",
    );
    expect(await evaluateExpression("json_stringify(str)", ctx)).toBe(
      '"hello"',
    );
    expect(await evaluateExpression("json_stringify(num)", ctx)).toBe("42");
    expect(await evaluateExpression("json_stringify(nil)", ctx)).toBe("null");
  });

  it("json_parse deserializes JSON strings", async () => {
    const ctx = new ExecutionContext({
      objStr: '{"name":"Alice","age":30}',
      arrStr: "[1,2,3]",
      strStr: '"hello"',
      numStr: "42",
      nilStr: "null",
    });
    expect(await evaluateExpression("json_parse(objStr)", ctx)).toEqual({
      name: "Alice",
      age: 30,
    });
    expect(await evaluateExpression("json_parse(arrStr)", ctx)).toEqual([
      1, 2, 3,
    ]);
    expect(await evaluateExpression("json_parse(strStr)", ctx)).toBe("hello");
    expect(await evaluateExpression("json_parse(numStr)", ctx)).toBe(42);
    expect(await evaluateExpression("json_parse(nilStr)", ctx)).toBe(null);
  });

  it("json_parse 对非法 JSON 抛出错误", async () => {
    const ctx = new ExecutionContext({ bad: "not json", notStr: 123 });
    await expect(evaluateExpression("json_parse(bad)", ctx)).rejects.toThrow(
      SyntaxError,
    );
    await expect(evaluateExpression("json_parse(notStr)", ctx)).rejects.toThrow(
      TypeError,
    );
  });

  it("builtin functions accept nested expressions as arguments", async () => {
    const ctx = new ExecutionContext({ data: { items: [1, 2] } });
    expect(await evaluateExpression("len(data.items)", ctx)).toBe(2);
  });
});

describe("evaluate — array and object literals", () => {
  it("evaluates empty array", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("[]", ctx)).toEqual([]);
  });

  it("evaluates array with elements", async () => {
    const ctx = new ExecutionContext({ a: 1, b: 2 });
    expect(await evaluateExpression("[1, 2, 3]", ctx)).toEqual([1, 2, 3]);
    expect(await evaluateExpression("[a, b, a + b]", ctx)).toEqual([1, 2, 3]);
  });

  it("evaluates empty object", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("{}", ctx)).toEqual({});
  });

  it("evaluates object with identifier keys", async () => {
    const ctx = new ExecutionContext({ name: "Alice", age: 30 });
    expect(await evaluateExpression("{name: name, age: age}", ctx)).toEqual({
      name: "Alice",
      age: 30,
    });
  });

  it("evaluates object with expression values", async () => {
    const ctx = new ExecutionContext({ x: 10 });
    expect(await evaluateExpression("{value: x * 2}", ctx)).toEqual({
      value: 20,
    });
  });

  it("evaluates nested object and array", async () => {
    const ctx = new ExecutionContext({ items: [1, 2] });
    expect(
      await evaluateExpression("{data: items, count: len(items)}", ctx),
    ).toEqual({ data: [1, 2], count: 2 });
  });
});

describe("evaluate — error scenarios", () => {
  it("throws on unknown function call", async () => {
    const ctx = new ExecutionContext({});
    await expect(evaluateExpression("unknownFunc()", ctx)).rejects.toThrow(
      "Unknown function: unknownFunc",
    );
  });

  it("throws on unknown AST node kind", async () => {
    await expect(
      evaluate({ kind: "unknown" } as any, new ExecutionContext({})),
    ).rejects.toThrow("Unknown AST node kind");
  });
});

describe("evaluate — bracket notation", () => {
  it("accesses array element by variable index", async () => {
    const ctx = new ExecutionContext({
      arr: ["a", "b", "c"],
      idx: 1,
    });
    expect(await evaluateExpression("arr[idx]", ctx)).toBe("b");
    expect(await evaluateExpression("arr[0]", ctx)).toBe("a");
  });

  it("accesses nested array with bracket notation", async () => {
    const ctx = new ExecutionContext({
      matrix: [
        [1, 2],
        [3, 4],
      ],
      i: 1,
      j: 0,
    });
    expect(await evaluateExpression("matrix[i][j]", ctx)).toBe(3);
  });

  it("mixed dot and bracket access", async () => {
    const ctx = new ExecutionContext({
      data: { rows: [{ name: "Alice" }, { name: "Bob" }] },
      i: 0,
    });
    expect(await evaluateExpression("data.rows[i].name", ctx)).toBe("Alice");
  });

  it("bracket with arithmetic expression", async () => {
    const ctx = new ExecutionContext({
      arr: [10, 20, 30, 40],
      i: 1,
    });
    expect(await evaluateExpression("arr[i + 1]", ctx)).toBe(30);
  });

  it("bracket on object with string key", async () => {
    const ctx = new ExecutionContext({
      obj: { key1: "val1", key2: "val2" },
      k: "key2",
    });
    expect(await evaluateExpression("obj[k]", ctx)).toBe("val2");
  });

  it("bracket with len in expression", async () => {
    const ctx = new ExecutionContext({
      arr: [1, 2, 3],
    });
    expect(await evaluateExpression("arr[len(arr) - 1]", ctx)).toBe(3);
  });

  it("bracket in comparison", async () => {
    const ctx = new ExecutionContext({
      items: [10, 20, 30],
      idx: 1,
      threshold: 15,
    });
    expect(await evaluateExpression("items[idx] > threshold", ctx)).toBe(true);
  });

  it("returns undefined for out-of-bounds bracket access", async () => {
    const ctx = new ExecutionContext({
      arr: [42],
      idx: 99,
    });
    expect(await evaluateExpression("arr[idx]", ctx)).toBe(undefined);
  });

  it("bracket on null/undefined returns undefined", async () => {
    const ctx = new ExecutionContext({
      idx: 0,
    });
    expect(await evaluateExpression("missing[idx]", ctx)).toBe(undefined);
  });
});

describe("evaluateExpression — unary minus", () => {
  it("negates a positive number", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("-3", ctx)).toBe(-3);
  });

  it("negates zero", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("-0", ctx)).toBe(-0);
  });

  it("double negative returns positive", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("--5", ctx)).toBe(5);
  });

  it("negates a variable", async () => {
    const ctx = new ExecutionContext({ x: 10 });
    expect(await evaluateExpression("-x", ctx)).toBe(-10);
  });

  it("negates a parenthesized expression", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("-(2 + 3)", ctx)).toBe(-5);
  });

  it("negates expression with multiplication", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("-2 * 3", ctx)).toBe(-6);
  });

  it("not-negate", async () => {
    const ctx = new ExecutionContext({ x: 0 });
    expect(await evaluateExpression("!-x", ctx)).toBe(true); // -0 is falsy
  });

  it("negative in function argument", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("math_abs(-5)", ctx)).toBe(5);
  });

  it("negates a false boolean coerced to number", async () => {
    // false → 0, -0 → -0
    const ctx = new ExecutionContext({ flag: false });
    expect(await evaluateExpression("-flag", ctx)).toBe(-0);
  });
});

describe("evaluate — 函数调用链式属性访问", () => {
  it("json_parse 的结果上访问 .prop", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression("json_parse('{\"x\":1}').x", ctx);
    expect(result).toBe(1);
  });

  it("json_parse 的结果上访问多层属性", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression(
      'json_parse(\'{"a":{"b":2}}\').a.b',
      ctx,
    );
    expect(result).toBe(2);
  });

  it("函数调用后链式访问 .prop（模拟 http_get.body）", async () => {
    // 使用 json_stringify({body: '{}'}) 模拟返回 HttpResponse 形态
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression(
      'json_parse(json_parse(\'{"body":"[1,2,3]"}\').body)',
      ctx,
    );
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("evaluate — 对象方法调用 obj.method()", () => {
  it("调用对象上的方法", async () => {
    const obj = {
      greet: (name: string) => `Hello, ${name}`,
    };
    const ctx = new ExecutionContext({ obj });
    expect(await evaluateExpression("obj.greet('World')", ctx)).toBe(
      "Hello, World",
    );
  });

  it("方法中的 this 指向接收者对象", async () => {
    const obj = {
      name: "rune",
      getName() {
        return (this as any).name;
      },
    };
    const ctx = new ExecutionContext({ obj });
    expect(await evaluateExpression("obj.getName()", ctx)).toBe("rune");
  });

  it("嵌套路径上的方法调用", async () => {
    const data = {
      items: {
        sum: function (a: number, b: number) {
          return a + b;
        },
      },
    };
    const ctx = new ExecutionContext({ data });
    expect(await evaluateExpression("data.items.sum(3, 4)", ctx)).toBe(7);
  });

  it("方法不存在抛出异常（不回退到内置函数）", async () => {
    const ctx = new ExecutionContext({ items: [1, 2, 3, 4] });
    await expect(evaluateExpression("items.len()", ctx)).rejects.toThrow(
      "Method 'len' not found",
    );
  });

  it("方法不存在同样抛出异常", async () => {
    const obj = { x: 1 };
    const ctx = new ExecutionContext({ obj });
    await expect(evaluateExpression("obj.nonExistent()", ctx)).rejects.toThrow(
      "Method 'nonExistent' not found",
    );
  });
});
