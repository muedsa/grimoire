import { describe, it, expect } from "vitest";
import { ExecutionContext, evaluateExpression } from "../../src/index";

describe("evaluate — regex builtins", () => {
  describe("regex_test", () => {
    it("returns true when pattern matches", async () => {
      const ctx = new ExecutionContext({ s: "hello123" });
      expect(await evaluateExpression("regex_test(s, '\\\\d+')", ctx)).toBe(true);
    });

    it("returns false when pattern does not match", async () => {
      const ctx = new ExecutionContext({ s: "hello" });
      expect(await evaluateExpression("regex_test(s, '\\\\d+')", ctx)).toBe(false);
    });

    it("returns false for non-string input", async () => {
      const ctx = new ExecutionContext({ n: 123 });
      expect(await evaluateExpression("regex_test(n, '\\\\d+')", ctx)).toBe(false);
    });

    it("returns false for invalid regex pattern", async () => {
      const ctx = new ExecutionContext({ s: "hello" });
      expect(await evaluateExpression("regex_test(s, '[')", ctx)).toBe(false);
    });
  });

  describe("regex_match", () => {
    it("returns match object with groups when pattern matches", async () => {
      const ctx = new ExecutionContext({ s: "foo=123" });
      const result = await evaluateExpression("regex_match(s, '(\\\\w+)=(\\\\d+)')", ctx);
      expect(result).toEqual({
        match: "foo=123",
        groups: ["foo", "123"],
        index: 0,
      });
    });

    it("returns match with empty groups when no capturing groups", async () => {
      const ctx = new ExecutionContext({ s: "hello 123 world" });
      const result = await evaluateExpression("regex_match(s, '\\\\d+')", ctx);
      expect(result).toEqual({
        match: "123",
        groups: [],
        index: 6,
      });
    });

    it("returns null when no match", async () => {
      const ctx = new ExecutionContext({ s: "abc" });
      expect(await evaluateExpression("regex_match(s, '\\\\d+')", ctx)).toBe(null);
    });

    it("returns null for invalid regex pattern", async () => {
      const ctx = new ExecutionContext({ s: "hello" });
      expect(await evaluateExpression("regex_match(s, '[')", ctx)).toBe(null);
    });

    it("returns null for non-string input", async () => {
      const ctx = new ExecutionContext({ n: 42 });
      expect(await evaluateExpression("regex_match(n, '\\\\d+')", ctx)).toBe(null);
    });
  });

  describe("regex_match_all", () => {
    it("returns all matches as array", async () => {
      const ctx = new ExecutionContext({ s: "a1 b2 c3" });
      const result = await evaluateExpression("regex_match_all(s, '\\\\w\\\\d')", ctx);
      expect(result).toEqual([
        { match: "a1", groups: [], index: 0 },
        { match: "b2", groups: [], index: 3 },
        { match: "c3", groups: [], index: 6 },
      ]);
    });

    it("returns matches with capture groups", async () => {
      const ctx = new ExecutionContext({ s: "x=1, y=2" });
      const result = await evaluateExpression("regex_match_all(s, '(\\\\w)=(\\\\d)')", ctx);
      expect(result).toEqual([
        { match: "x=1", groups: ["x", "1"], index: 0 },
        { match: "y=2", groups: ["y", "2"], index: 5 },
      ]);
    });

    it("returns empty array when no match", async () => {
      const ctx = new ExecutionContext({ s: "abc" });
      expect(await evaluateExpression("regex_match_all(s, '\\\\d+')", ctx)).toEqual([]);
    });

    it("returns empty array for invalid regex pattern", async () => {
      const ctx = new ExecutionContext({ s: "hello" });
      expect(await evaluateExpression("regex_match_all(s, '[')", ctx)).toEqual([]);
    });
  });
});
