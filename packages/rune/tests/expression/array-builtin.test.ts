import { describe, it, expect } from "vitest";
import { ExecutionContext, evaluateExpression } from "../../src/index";

describe("evaluate — array builtins", () => {
  describe("arr_push", () => {
    it("追加元素到数组末尾，返回新长度", async () => {
      const ctx = new ExecutionContext({ items: ["a", "b"] });
      const result = await evaluateExpression("arr_push(items, 'c')", ctx);
      expect(result).toBe(3);
      expect(ctx.get("items")).toEqual(["a", "b", "c"]);
    });

    it("支持一次推入多个元素", async () => {
      const ctx = new ExecutionContext({ items: [1] });
      const result = await evaluateExpression("arr_push(items, 2, 3, 4)", ctx);
      expect(result).toBe(4);
      expect(ctx.get("items")).toEqual([1, 2, 3, 4]);
    });

    it("空数组 push 返回正确长度", async () => {
      const ctx = new ExecutionContext({ items: [] });
      const result = await evaluateExpression("arr_push(items, 'x')", ctx);
      expect(result).toBe(1);
      expect(ctx.get("items")).toEqual(["x"]);
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: 42 });
      await expect(
        evaluateExpression("arr_push(val, 'x')", ctx),
      ).rejects.toThrow(TypeError);
    });
  });

  describe("arr_pop", () => {
    it("移除最后一个元素并返回它", async () => {
      const ctx = new ExecutionContext({ items: ["a", "b", "c"] });
      const result = await evaluateExpression("arr_pop(items)", ctx);
      expect(result).toBe("c");
      expect(ctx.get("items")).toEqual(["a", "b"]);
    });

    it("空数组返回 undefined", async () => {
      const ctx = new ExecutionContext({ items: [] });
      const result = await evaluateExpression("arr_pop(items)", ctx);
      expect(result).toBeUndefined();
    });

    it("单元素数组返回该元素", async () => {
      const ctx = new ExecutionContext({ items: ["only"] });
      const result = await evaluateExpression("arr_pop(items)", ctx);
      expect(result).toBe("only");
      expect(ctx.get("items")).toEqual([]);
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: "hello" });
      await expect(evaluateExpression("arr_pop(val)", ctx)).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe("arr_unshift", () => {
    it("在数组头部插入元素，返回新长度", async () => {
      const ctx = new ExecutionContext({ items: ["b", "c"] });
      const result = await evaluateExpression("arr_unshift(items, 'a')", ctx);
      expect(result).toBe(3);
      expect(ctx.get("items")).toEqual(["a", "b", "c"]);
    });

    it("支持一次插入多个元素", async () => {
      const ctx = new ExecutionContext({ items: ["c"] });
      const result = await evaluateExpression(
        "arr_unshift(items, 'a', 'b')",
        ctx,
      );
      expect(result).toBe(3);
      expect(ctx.get("items")).toEqual(["a", "b", "c"]);
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: 99 });
      await expect(
        evaluateExpression("arr_unshift(val, 1)", ctx),
      ).rejects.toThrow(TypeError);
    });
  });

  describe("arr_shift", () => {
    it("移除第一个元素并返回它", async () => {
      const ctx = new ExecutionContext({ items: ["a", "b", "c"] });
      const result = await evaluateExpression("arr_shift(items)", ctx);
      expect(result).toBe("a");
      expect(ctx.get("items")).toEqual(["b", "c"]);
    });

    it("空数组返回 undefined", async () => {
      const ctx = new ExecutionContext({ items: [] });
      const result = await evaluateExpression("arr_shift(items)", ctx);
      expect(result).toBeUndefined();
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: 123 });
      await expect(evaluateExpression("arr_shift(val)", ctx)).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe("arr_concat", () => {
    it("合并多个数组，返回新数组，原数组不变", async () => {
      const ctx = new ExecutionContext({ a: [1, 2], b: [3, 4], c: [5] });
      const result = await evaluateExpression("arr_concat(a, b, c)", ctx);
      expect(result).toEqual([1, 2, 3, 4, 5]);
      expect(ctx.get("a")).toEqual([1, 2]); // 原数组不变
    });

    it("非数组参数直接拼接到结果中（JS 行为）", async () => {
      const ctx = new ExecutionContext({ a: [1, 2] });
      const result = await evaluateExpression("arr_concat(a, 3, 4)", ctx);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it("非数组第一参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ a: "str", b: [1, 2] });
      await expect(evaluateExpression("arr_concat(a, b)", ctx)).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe("arr_join", () => {
    it("用分隔符连接数组元素", async () => {
      const ctx = new ExecutionContext({ items: ["a", "b", "c"] });
      expect(await evaluateExpression("arr_join(items, ', ')", ctx)).toBe(
        "a, b, c",
      );
    });

    it("空分隔符连接", async () => {
      const ctx = new ExecutionContext({ chars: ["h", "e", "l", "l", "o"] });
      expect(await evaluateExpression("arr_join(chars, '')", ctx)).toBe(
        "hello",
      );
    });

    it("空数组返回空字符串", async () => {
      const ctx = new ExecutionContext({ items: [] });
      expect(await evaluateExpression("arr_join(items, '-')", ctx)).toBe("");
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: 42 });
      await expect(
        evaluateExpression("arr_join(val, ',')", ctx),
      ).rejects.toThrow(TypeError);
    });
  });

  describe("arr_reverse", () => {
    it("原地反转数组，返回原数组引用", async () => {
      const ctx = new ExecutionContext({ items: [1, 2, 3] });
      const result = await evaluateExpression("arr_reverse(items)", ctx);
      expect(result).toEqual([3, 2, 1]);
      expect(ctx.get("items")).toEqual([3, 2, 1]); // 原数组被修改
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: "abc" });
      await expect(evaluateExpression("arr_reverse(val)", ctx)).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe("arr_sort", () => {
    it("数字数组默认升序，原地排序", async () => {
      const ctx = new ExecutionContext({ nums: [3, 1, 10, 2] });
      const result = await evaluateExpression("arr_sort(nums)", ctx);
      expect(result).toEqual([1, 2, 3, 10]);
      expect(ctx.get("nums")).toEqual([1, 2, 3, 10]); // 原数组被修改
    });

    it("数字数组降序", async () => {
      const ctx = new ExecutionContext({ nums: [3, 1, 10, 2] });
      const result = await evaluateExpression("arr_sort(nums, 'desc')", ctx);
      expect(result).toEqual([10, 3, 2, 1]);
    });

    it("字符串数组默认升序", async () => {
      const ctx = new ExecutionContext({
        words: ["banana", "apple", "cherry"],
      });
      const result = await evaluateExpression("arr_sort(words)", ctx);
      expect(result).toEqual(["apple", "banana", "cherry"]);
    });

    it("空数组直接返回", async () => {
      const ctx = new ExecutionContext({ items: [] });
      const result = await evaluateExpression("arr_sort(items)", ctx);
      expect(result).toEqual([]);
    });

    it("非数组参数抛出 TypeError", async () => {
      const ctx = new ExecutionContext({ val: "hello" });
      await expect(evaluateExpression("arr_sort(val)", ctx)).rejects.toThrow(
        TypeError,
      );
    });
  });
});
