import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

// ========== 内部 helpers ==========

type DateUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

const MS_PER_UNIT: Record<DateUnit, number> = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 0, // 月/年天数不定，通过 setMonth/setFullYear 处理
  year: 0,
};

/** 将 AllowedValue 安全转为 number 时间戳，非法返回 null */
function toTs(val: AllowedValue): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/** 将 AllowedValue 安全转为非负 number 时间戳，非法返回 null */
function toTsPositive(val: AllowedValue): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * 格式化模板替换
 * YYYY / MM / DD / HH / mm / ss / SSS
 */
function formatDate(d: Date, pattern: string): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const pad3 = (n: number) => String(n).padStart(3, "0");

  return pattern
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, pad2(d.getMonth() + 1))
    .replace(/DD/g, pad2(d.getDate()))
    .replace(/HH/g, pad2(d.getHours()))
    .replace(/mm/g, pad2(d.getMinutes()))
    .replace(/ss/g, pad2(d.getSeconds()))
    .replace(/SSS/g, pad3(d.getMilliseconds()));
}

/** pattern 反解析 → Date */
function parseDatePattern(str: string, pattern: string): Date | null {
  const regexParts: string[] = [];
  const fieldOrder: string[] = [];

  // 将 pattern 转换为 regex，记录字段顺序
  const fieldMap: Record<string, string> = {
    YYYY: "(\\d{4})",
    MM: "(\\d{2})",
    DD: "(\\d{2})",
    HH: "(\\d{2})",
    mm: "(\\d{2})",
    ss: "(\\d{2})",
    SSS: "(\\d{3})",
  };

  let remaining = pattern;
  while (remaining.length > 0) {
    let matched = false;
    for (const [token, regex] of Object.entries(fieldMap)) {
      if (remaining.startsWith(token)) {
        regexParts.push(regex);
        fieldOrder.push(token);
        remaining = remaining.slice(token.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // 字面字符，需要转义后逐字跳过
      const ch = remaining[0];
      regexParts.push(ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      remaining = remaining.slice(1);
    }
  }

  const re = new RegExp("^" + regexParts.join("") + "$");
  const match = str.match(re);
  if (!match) return null;

  let year = 0,
    month = 0,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0;

  for (let i = 0; i < fieldOrder.length; i++) {
    const val = parseInt(match[i + 1], 10);
    switch (fieldOrder[i]) {
      case "YYYY":
        year = val;
        break;
      case "MM":
        month = val - 1;
        break;
      case "DD":
        day = val;
        break;
      case "HH":
        hour = val;
        break;
      case "mm":
        minute = val;
        break;
      case "ss":
        second = val;
        break;
      case "SSS":
        millisecond = val;
        break;
    }
  }

  return new Date(year, month, day, hour, minute, second, millisecond);
}

/** 返回 Date（用时间戳构造，非法 ts 返回 null） */
function toDate(ts: AllowedValue): Date | null {
  const n = toTs(ts);
  if (n === null) return null;
  const d = new Date(n);
  return isNaN(d.getTime()) ? null : d;
}

/** 判断 value 是否为有效的 DateUnit 字符串 */
function isUnit(val: AllowedValue): val is DateUnit {
  return (
    typeof val === "string" &&
    [
      "second",
      "minute",
      "hour",
      "day",
      "week",
      "month",
      "year",
    ].includes(val)
  );
}

// ========== 内置函数 ==========

export const dateBuiltins: Record<string, CustomFunction> = {
  /**
   * 当前 Unix 时间戳（毫秒）
   */
  date_now: () => Date.now(),

  /**
   * 时间戳 → 格式化字符串
   *   date_format(ts, 'YYYY-MM-DD HH:mm:ss')
   */
  date_format: (ts: AllowedValue, pattern: AllowedValue) => {
    const d = toDate(ts);
    if (!d) return null;
    if (typeof pattern !== "string") return null;
    return formatDate(d, pattern);
  },

  /**
   * 格式化字符串 → 时间戳
   *   date_parse('2026-05-15', 'YYYY-MM-DD')
   */
  date_parse: (str: AllowedValue, pattern: AllowedValue) => {
    if (typeof str !== "string" || typeof pattern !== "string") return null;
    const d = parseDatePattern(str, pattern);
    if (!d || isNaN(d.getTime())) return null;
    return d.getTime();
  },

  /**
   * 时间加减
   *   date_add(ts, 1, 'day')     → 明天此时
   *   date_add(ts, -1, 'hour')   → 一小时前
   *   date_add(ts, 2, 'month')   → 两个月后
   */
  date_add: (ts: AllowedValue, value: AllowedValue, unit: AllowedValue) => {
    const n = toTs(ts);
    const v = toTs(value);
    if (n === null || v === null || !isUnit(unit)) return null;
    const d = new Date(n);

    switch (unit) {
      case "month":
        d.setMonth(d.getMonth() + v);
        break;
      case "year":
        d.setFullYear(d.getFullYear() + v);
        break;
      default:
        return d.getTime() + v * MS_PER_UNIT[unit];
    }
    return d.getTime();
  },

  /**
   * 时间差
   *   date_diff(end, start, 'hour')  → 2.5
   *   date_diff(ts2, ts1, 'day')     → 3
   */
  date_diff: (
    ts1: AllowedValue,
    ts2: AllowedValue,
    unit: AllowedValue,
  ) => {
    const a = toTs(ts1);
    const b = toTs(ts2);
    if (a === null || b === null || !isUnit(unit)) return null;
    const diffMs = a - b;

    switch (unit) {
      case "month":
        return (
          (new Date(a).getFullYear() - new Date(b).getFullYear()) * 12 +
          (new Date(a).getMonth() - new Date(b).getMonth())
        );
      case "year":
        return new Date(a).getFullYear() - new Date(b).getFullYear();
      default:
        return diffMs / MS_PER_UNIT[unit];
    }
  },

  /**
   * 提取日期字段
   *   date_get(ts, 'year')    → 2026
   *   date_get(ts, 'weekday') → 5  (0=周日)
   */
  date_get: (ts: AllowedValue, field: AllowedValue) => {
    const d = toDate(ts);
    if (!d || typeof field !== "string") return null;
    switch (field) {
      case "year":
        return d.getFullYear();
      case "month":
        return d.getMonth() + 1;
      case "day":
        return d.getDate();
      case "hour":
        return d.getHours();
      case "minute":
        return d.getMinutes();
      case "second":
        return d.getSeconds();
      case "millisecond":
        return d.getMilliseconds();
      case "weekday":
        return d.getDay();
      default:
        return null;
    }
  },
};
