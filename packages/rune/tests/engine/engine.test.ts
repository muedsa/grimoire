import { describe, it, expect } from "vitest";
import { RuleEngine, RuleDefinition } from "../../src/index";
import { d } from "../helpers";

describe("RuleEngine — set", () => {
  it("basic set with template", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { name: "test" } },
      nodes: {
        main: [
          { type: "set", variable: "result.greeting", value: "Hello, ${data.name}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect((d(result).result as any)?.greeting).toBe("Hello, test");
  });

  it("set object", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { firstName: "John", lastName: "Doe", age: 30 } },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.user",
            value: {
              name: "${data.firstName} ${data.lastName}",
              age: "${data.age}",
              status: "active",
            },
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.user?.name).toBe("John Doe");
    expect((d(result).result as any)?.user?.age).toBe(30);
    expect((d(result).result as any)?.user?.status).toBe("active");
  });

  it("set array", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { x: 1, y: 2, z: 3 } },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.point",
            value: ["${data.x}", "${data.y}", "${data.z}"],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    const point = (d(result).result as any)?.point as unknown[];
    expect(point).toBeInstanceOf(Array);
    expect(point[0]).toBe(1);
    expect(point[1]).toBe(2);
    expect(point[2]).toBe(3);
  });

  it("set nested", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: {
        data: {
          orderId: "ORD-001",
          items: ["apple", "banana"],
          price1: 10,
          price2: 20,
        },
      },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.order",
            value: {
              id: "${data.orderId}",
              items: "${data.items}",
              total: "${data.price1 + data.price2}",
              meta: {
                count: "${len(data.items)}",
                tag: "order",
              },
            },
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    const order = (d(result).result as any)?.order as Record<string, unknown>;
    expect(order?.id).toBe("ORD-001");
    expect(Array.isArray(order?.items)).toBe(true);
    expect(order?.total).toBe(30);
    expect((order?.meta as any)?.count).toBe(2);
  });

  it("set literal", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: {} },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.config",
            value: {
              url: "https://api.example.com",
              timeout: "5000",
              enabled: "true",
            },
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    const config = (d(result).result as any)?.config as Record<string, unknown>;
    expect(config?.url).toBe("https://api.example.com");
    expect(config?.timeout).toBe("5000");
  });
});

describe("RuleEngine — if", () => {
  it("condition true", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { level: 5 } },
      nodes: {
        main: [
          { type: "set", variable: "result.tier", value: null },
          {
            type: "if",
            condition: "data.level > 3",
            then: [{ type: "set", variable: "result.tier", value: "premium" }],
            else: [{ type: "set", variable: "result.tier", value: "basic" }],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.tier).toBe("premium");
  });

  it("condition false", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { level: 1 } },
      nodes: {
        main: [
          { type: "set", variable: "result.tier", value: null },
          {
            type: "if",
            condition: "data.level > 3",
            then: [{ type: "set", variable: "result.tier", value: "premium" }],
            else: [{ type: "set", variable: "result.tier", value: "basic" }],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.tier).toBe("basic");
  });

  it("empty then branch returns success", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { flag: true } },
      nodes: {
        main: [
          { type: "if", condition: "data.flag", then: [] },
          { type: "set", variable: "result.reached", value: true },
        ],
      },
    });
    expect(result.status).toBe("success");
    expect((d(result).result as any)?.reached).toBe(true);
  });

  it("missing else branch treated as empty", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { flag: false } },
      nodes: {
        main: [
          { type: "if", condition: "data.flag", then: [{ type: "set", variable: "result.then", value: true }] },
          { type: "set", variable: "result.reached", value: true },
        ],
      },
    });
    expect(result.status).toBe("success");
    expect((d(result).result as any)?.reached).toBe(true);
    expect((d(result).result as any)?.then).toBe(undefined);
  });
});

describe("RuleEngine — foreach", () => {
  it("iteration sums array", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          { type: "set", variable: "result.total", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              { type: "set", variable: "result.total", value: "${result.total + item}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.total).toBe(6);
  });

  it("local variables don't leak", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          { type: "set", variable: "result.total", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              { type: "set", variable: "result.total", value: "${result.total + item}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.total).toBe(6);
    expect((d(result).result as any)?.item).toBe(undefined);
  });

  it("non-array collection returns success", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { notAnArray: "hello" } },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "data.notAnArray",
            item: "item",
            body: [{ type: "set", variable: "result.x", value: 1 }],
          },
        ],
      },
    });
    expect(result.status).toBe("success");
  });

  it("provides loop index variable", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { items: ["a", "b", "c"] } },
      nodes: {
        main: [
          { type: "set", variable: "result.count", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            index: "idx",
            body: [
              { type: "set", variable: "result.count", value: "${result.count + idx}" },
            ],
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    const data = result.data as Record<string, unknown>;
    expect((data.result as any)?.count).toBe(3);
  });

  it("index defaults to undefined when not specified", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { items: [1, 2] } },
      nodes: {
        main: [
          { type: "set", variable: "result.total", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              { type: "set", variable: "result.total", value: "${result.total + item}" },
            ],
          },
        ],
      },
    });
    expect((d(result).result as any)?.total).toBe(3);
  });
});

describe("RuleEngine — while", () => {
  it("executes while condition is true", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { count: 0 } },
      nodes: {
        main: [
          {
            type: "while",
            condition: "data.count < 3",
            body: [
              { type: "set", variable: "data.count", value: "${data.count + 1}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect((result.data as Record<string, unknown>).data).toEqual({ count: 3 });
  });

  it("break exits while loop", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { count: 0 } },
      nodes: {
        main: [
          {
            type: "while",
            condition: "true",
            body: [
              { type: "set", variable: "data.count", value: "${data.count + 1}" },
              { type: "if", condition: "data.count >= 5", then: [{ type: "break" }] },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect((result.data as Record<string, unknown>).data).toEqual({ count: 5 });
  });

  it("continue skips to next iteration", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { i: 0, sum: 0 } },
      nodes: {
        main: [
          {
            type: "while",
            condition: "data.i < 5",
            body: [
              { type: "set", variable: "data.i", value: "${data.i + 1}" },
              { type: "if", condition: "data.i % 2 == 0", then: [{ type: "continue" }] },
              { type: "set", variable: "data.sum", value: "${data.sum + data.i}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    // i=1,3,5(但5不满足condition), 跳过i=2,4, sum=1+3+5=9
    expect((result.data as Record<string, unknown>).data).toEqual({ i: 5, sum: 9 });
  });

  it("false condition skips body", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { x: 0 } },
      nodes: {
        main: [
          {
            type: "while",
            condition: "false",
            body: [{ type: "set", variable: "data.x", value: 99 }],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect((result.data as Record<string, unknown>).data).toEqual({ x: 0 });
  });

  it("return exits while loop and stops execution", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { i: 0 } },
      nodes: {
        main: [
          {
            type: "while",
            condition: "data.i < 3",
            body: [
              { type: "set", variable: "data.i", value: "${data.i + 1}" },
              {
                type: "if",
                condition: "data.i >= 3",
                then: [{ type: "return", value: "data.i * 10" }],
              },
            ],
          },
          { type: "set", variable: "result.unreachable", value: "nope" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect(result.data).toBe(30);
  });
});

describe("RuleEngine — break", () => {
  it("breaks out of loop", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3, 4, 5] } },
      nodes: {
        main: [
          { type: "set", variable: "result.count", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item > 3",
                then: [{ type: "break" }],
              },
              { type: "set", variable: "result.count", value: "${result.count + 1}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.count).toBe(3);
  });

  it("preserves already_written variables", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3, 4, 5] } },
      nodes: {
        main: [
          { type: "set", variable: "result.count", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item > 2",
                then: [{ type: "break" }],
              },
              { type: "set", variable: "result.count", value: "${result.count + 1}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.count).toBe(2);
  });
});

describe("RuleEngine — return", () => {
  it("returns value and stops execution", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { value: 42 } },
      nodes: {
        main: [
          { type: "return", value: "data.value * 2" },
          { type: "set", variable: "result.unreachable", value: "should not reach here" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.data).toBe(84);
  });

  it("return inside loop terminates entire execution", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item == 2",
                then: [{ type: "return", value: "item * 10" }],
              },
            ],
          },
          { type: "set", variable: "result.unreachable", value: "nope" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.data).toBe(20);
  });
});

describe("RuleEngine — entry point", () => {
  it("custom entry point", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      entry: "start",
      nodes: {
        start: [{ type: "set", variable: "result.entry", value: "custom" }],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.entry).toBe("custom");
  });
});

describe("RuleEngine — array element access", () => {
  it("read array element via dot-number syntax", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: ["apple", "banana", "cherry"] } },
      nodes: {
        main: [
          { type: "set", variable: "result.first", value: "${data.items.0}" },
          { type: "set", variable: "result.second", value: "${data.items.1}" },
          { type: "set", variable: "result.third", value: "${data.items.2}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.first).toBe("apple");
    expect((d(result).result as any)?.second).toBe("banana");
    expect((d(result).result as any)?.third).toBe("cherry");
  });

  it("array index in condition", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { tags: ["admin", "user"] } },
      nodes: {
        main: [
          { type: "set", variable: "result.isAdmin", value: false },
          {
            type: "if",
            condition: "data.tags.0 == 'admin'",
            then: [{ type: "set", variable: "result.isAdmin", value: true }],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.isAdmin).toBe(true);
  });

  it("nested array element access", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { matrix: [[1, 2], [3, 4]] } },
      nodes: {
        main: [
          { type: "set", variable: "result.topLeft", value: "${data.matrix.0.0}" },
          { type: "set", variable: "result.bottomRight", value: "${data.matrix.1.1}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.topLeft).toBe(1);
    expect((d(result).result as any)?.bottomRight).toBe(4);
  });

  it("array element with expression arithmetic", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { nums: [10, 20, 30] } },
      nodes: {
        main: [
          { type: "set", variable: "result.sum", value: "${data.nums.0 + data.nums.2}" },
          { type: "set", variable: "result.product", value: "${data.nums.0 * data.nums.1}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.sum).toBe(40);
    expect((d(result).result as any)?.product).toBe(200);
  });

  it("out-of-bounds array element returns undefined", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { arr: [1] } },
      nodes: {
        main: [
          { type: "set", variable: "result.missing", value: "${data.arr.5}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.missing).toBe(undefined);
  });

  it("array element in loop body", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { rows: [["a", "b"], ["c", "d"]] } },
      nodes: {
        main: [
          { type: "set", variable: "result.concatenated", value: "" },
          {
            type: "foreach",
            collection: "data.rows",
            item: "row",
            body: [
              { type: "set", variable: "result.concatenated", value: "${result.concatenated + row.0 + row.1}" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.concatenated).toBe("abcd");
  });

  it("array element in builtin function", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: ["hello", "world"], nums: [1, 2, 3] } },
      nodes: {
        main: [
          { type: "set", variable: "result.len", value: "${len(data.items.0)}" },
          { type: "set", variable: "result.exists", value: "${exists(data.nums.0)}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.len).toBe(5);
    expect((d(result).result as any)?.exists).toBe(true);
  });
});

describe("RuleEngine — set node validation", () => {
  // 执行期：set 节点 variable 为空时，编译阶段抛异常被引擎捕获为 failed 结果
  it("returns failed result for set node with empty variable", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "set", variable: "", value: "val" }] },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("failed");
    expect(result.error?.message).toBe("Set node must have a non-empty variable");
  });
});

describe("RuleEngine — exec", () => {
  it("executes expression and returns success", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          { type: "exec", expression: "len(data.items)" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    // 引擎正常结束返回 ctx.toJSON()，exec 不新增变量，初始变量原样保留
    expect((result.data as any)?.data?.items).toEqual([1, 2, 3]);
  });

  it("does not modify context variables", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { x: 42 },
      nodes: {
        main: [
          { type: "exec", expression: "x + 1" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    // exec 不产生赋值，上下文变量不变，x 保持 42
    expect((result.data as any)?.x).toBe(42);
  });

  it("exec inside if branch", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { flag: true },
      nodes: {
        main: [
          {
            type: "if",
            condition: "flag",
            then: [
              { type: "exec", expression: "len([1, 2])" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
  });

  it("exec inside foreach loop", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { sum: 0 },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[1, 2, 3]",
            item: "item",
            body: [
              { type: "set", variable: "sum", value: "${sum + item}" },
              { type: "exec", expression: "str(sum)" },
            ],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect((result.data as any)?.sum).toBe(6);
  });

  it("exec mixed with set nodes", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { items: ["a", "b"] },
      nodes: {
        main: [
          { type: "exec", expression: "len(items)" },
          { type: "set", variable: "result.count", value: "${len(items)}" },
          { type: "exec", expression: "str(result.count)" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    expect((result.data as any)?.result?.count).toBe(2);
  });

  it("returns failed result for exec node with empty expression", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "exec", expression: "" }] },
    };
    const result = await engine.execute(rule);
    // 编译期先拦截，返回 failed
    expect(result.status).toBe("failed");
    expect(result.error?.message).toBe("Exec node must have a non-empty expression");
  });
});

describe("RuleEngine — array builtins integration", () => {
  it("arr_push 修改原数组（使用 exec 节点执行副作用）", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { items: ["a", "b"] },
      nodes: {
        main: [
          { type: "exec", expression: "arr_push(items, 'c')" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((result.data as any)?.items).toEqual(["a", "b", "c"]);
  });

  it("arr_pop 修改原数组", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { items: ["a", "b", "c"] },
      nodes: {
        main: [
          { type: "exec", expression: "arr_pop(items)" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((result.data as any)?.items).toEqual(["a", "b"]);
  });

  it("arr_sort 原地排序", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { nums: [5, 2, 8, 1] },
      nodes: {
        main: [
          { type: "exec", expression: "arr_sort(nums)" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((result.data as any)?.nums).toEqual([1, 2, 5, 8]);
  });

  it("链式数组操作（副作用 + 表达式）", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      variables: { items: ["b", "c"] },
      nodes: {
        main: [
          { type: "exec", expression: "arr_unshift(items, 'a')" },
          { type: "exec", expression: "arr_push(items, 'd')" },
          { type: "set", variable: "result", value: "${arr_join(items, '-')}" },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((result.data as any)?.items).toEqual(["a", "b", "c", "d"]);
    expect((result.data as any)?.result).toBe("a-b-c-d");
  });
});
