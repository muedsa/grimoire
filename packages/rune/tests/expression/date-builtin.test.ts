import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { evaluateExpression, ExecutionContext } from "../../src/index";

// 固定时间戳：2026-05-15T08:30:45.123Z → 1715761845123
const FIXED_TS = new Date("2026-05-15T08:30:45.123Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_TS);
});

afterEach(() => {
  vi.useRealTimers();
});

// ========== date_now ==========

describe("date_now", () => {
  it("返回当前 Unix 时间戳（毫秒）", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression("date_now()", ctx);
    expect(result).toBe(FIXED_TS);
  });
});

// ========== date_format ==========

describe("date_format", () => {
  it("默认 pattern 格式化完整时间", async () => {
    const ctx = new ExecutionContext({ ts: FIXED_TS });
    const fmt = "YYYY-MM-DD HH:mm:ss";
    // 用本地时区格式化，与 Date 构造函数行为一致
    const d = new Date(FIXED_TS);
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const expected = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    expect(
      await evaluateExpression(`date_format(${FIXED_TS}, '${fmt}')`, ctx),
    ).toBe(expected);
  });

  it("毫秒格式 SSS", async () => {
    const ctx = new ExecutionContext({});
    const result = (await evaluateExpression(
      `date_format(${FIXED_TS}, 'ss.SSS')`,
      ctx,
    )) as string;
    // 秒和毫秒不受时区影响
    expect(result).toMatch(/^\d{2}\.123$/);
  });

  it("非法时间戳返回 null", async () => {
    const ctx = new ExecutionContext({
      nan: Number.NaN,
      inf: Number.POSITIVE_INFINITY,
    });
    expect(
      await evaluateExpression("date_format(null, 'YYYY')", ctx),
    ).toBeNull();
    expect(
      await evaluateExpression("date_format(nan, 'YYYY')", ctx),
    ).toBeNull();
  });

  it("非字符串 pattern 返回 null", async () => {
    const ctx = new ExecutionContext({});
    expect(
      await evaluateExpression(`date_format(${FIXED_TS}, 123)`, ctx),
    ).toBeNull();
  });
});

// ========== date_parse ==========

describe("date_parse", () => {
  it("解析格式化字符串返回时间戳", async () => {
    const ctx = new ExecutionContext({});
    const result = (await evaluateExpression(
      "date_parse('2026-05-15', 'YYYY-MM-DD')",
      ctx,
    )) as number;
    const d = new Date(result);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // 0-based
    expect(d.getDate()).toBe(15);
  });

  it("解析带时分秒的字符串", async () => {
    const ctx = new ExecutionContext({});
    const result = (await evaluateExpression(
      "date_parse('2026-05-15 08:30:45', 'YYYY-MM-DD HH:mm:ss')",
      ctx,
    )) as number;
    const d = new Date(result);
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(45);
  });

  it("非字符串参数返回 null", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("date_parse(123, 'YYYY')", ctx)).toBeNull();
    expect(await evaluateExpression("date_parse('2026', 123)", ctx)).toBeNull();
  });

  it("格式不匹配返回 null", async () => {
    const ctx = new ExecutionContext({});
    expect(
      await evaluateExpression("date_parse('not a date', 'YYYY-MM-DD')", ctx),
    ).toBeNull();
  });
});

// ========== date_add ==========

describe("date_add", () => {
  // 使用简单固定时间戳（零时区方便计算期望值）
  const ts = new Date("2026-01-15T12:00:00.000Z").getTime();

  it("加 1 天", async () => {
    const ctx = new ExecutionContext({ ts });
    const result = (await evaluateExpression(
      "date_add(ts, 1, 'day')",
      ctx,
    )) as number;
    expect(result - ts).toBe(86_400_000);
  });

  it("减 2 小时", async () => {
    const ctx = new ExecutionContext({ ts });
    const result = (await evaluateExpression(
      "date_add(ts, -2, 'hour')",
      ctx,
    )) as number;
    expect(result - ts).toBe(-7_200_000);
  });

  it("加 1 个月", async () => {
    const ctx = new ExecutionContext({ ts });
    const result = (await evaluateExpression(
      "date_add(ts, 1, 'month')",
      ctx,
    )) as number;
    const d = new Date(result);
    expect(d.getMonth()).toBe(1); // February
    expect(d.getDate()).toBe(15);
  });

  it("减 1 年", async () => {
    const ctx = new ExecutionContext({ ts });
    const result = (await evaluateExpression(
      "date_add(ts, -1, 'year')",
      ctx,
    )) as number;
    expect(new Date(result).getFullYear()).toBe(2025);
  });

  it("非法参数返回 null", async () => {
    const ctx = new ExecutionContext({ ts });
    expect(
      await evaluateExpression("date_add(null, 1, 'day')", ctx),
    ).toBeNull();
    expect(
      await evaluateExpression("date_add(ts, 1, 'invalid')", ctx),
    ).toBeNull();
  });
});

// ========== date_diff ==========

describe("date_diff", () => {
  it("计算天数差", async () => {
    const ctx = new ExecutionContext({});
    const ts1 = new Date("2026-05-20T00:00:00Z").getTime();
    const ts2 = new Date("2026-05-15T00:00:00Z").getTime();
    expect(
      await evaluateExpression(`date_diff(${ts1}, ${ts2}, 'day')`, ctx),
    ).toBe(5);
  });

  it("计算小数时差", async () => {
    const ctx = new ExecutionContext({});
    const ts1 = new Date("2026-01-15T13:30:00Z").getTime();
    const ts2 = new Date("2026-01-15T12:00:00Z").getTime();
    expect(
      await evaluateExpression(`date_diff(${ts1}, ${ts2}, 'hour')`, ctx),
    ).toBe(1.5);
  });

  it("计算月差", async () => {
    const ctx = new ExecutionContext({});
    expect(
      await evaluateExpression(
        "date_diff(date_parse('2026-06-01', 'YYYY-MM-DD'), date_parse('2026-01-01', 'YYYY-MM-DD'), 'month')",
        ctx,
      ),
    ).toBe(5);
  });

  it("非法参数返回 null", async () => {
    const ctx = new ExecutionContext({});
    expect(
      await evaluateExpression(`date_diff(0, null, 'day')`, ctx),
    ).toBeNull();
    expect(await evaluateExpression(`date_diff(0, 0, 'bad')`, ctx)).toBeNull();
  });
});

// ========== date_get ==========

describe("date_get", () => {
  const ts = new Date("2026-05-15T08:30:45.123Z").getTime();

  it("提取年份", async () => {
    const ctx = new ExecutionContext({ ts });
    expect(await evaluateExpression("date_get(ts, 'year')", ctx)).toBe(2026);
  });

  it("提取月份 (1-based)", async () => {
    const ctx = new ExecutionContext({ ts });
    expect(await evaluateExpression("date_get(ts, 'month')", ctx)).toBe(5);
  });

  it("提取日期", async () => {
    const ctx = new ExecutionContext({ ts });
    expect(await evaluateExpression("date_get(ts, 'day')", ctx)).toBe(15);
  });

  it("提取星期几 (0=周日)", async () => {
    const ctx = new ExecutionContext({ ts });
    // 2026-05-15 是周五 → 5
    expect(await evaluateExpression("date_get(ts, 'weekday')", ctx)).toBe(5);
  });

  it("提取毫秒", async () => {
    const ctx = new ExecutionContext({ ts });
    expect(await evaluateExpression("date_get(ts, 'millisecond')", ctx)).toBe(
      123,
    );
  });

  it("非法时间戳返回 null", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("date_get(null, 'year')", ctx)).toBeNull();
    expect(await evaluateExpression("date_get('abc', 'year')", ctx)).toBeNull();
  });

  it("非法字段返回 null", async () => {
    const ctx = new ExecutionContext({ ts });
    expect(await evaluateExpression("date_get(ts, 'century')", ctx)).toBeNull();
  });
});
