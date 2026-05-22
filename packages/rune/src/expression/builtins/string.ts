import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

/**
 * 字符串操作函数（str_* 前缀）
 */
export const stringBuiltins: Record<string, CustomFunction> = {
  str_starts_with: (str: AllowedValue, prefix: AllowedValue) => {
    if (typeof str !== "string" || typeof prefix !== "string") return false;
    return str.startsWith(prefix);
  },
  str_ends_with: (str: AllowedValue, suffix: AllowedValue) => {
    if (typeof str !== "string" || typeof suffix !== "string") return false;
    return str.endsWith(suffix);
  },
  str_contains: (val: AllowedValue, item: AllowedValue) => {
    if (typeof val === "string" && typeof item === "string")
      return val.includes(item);
    if (Array.isArray(val)) return val.includes(item);
    return false;
  },
  str_index_of: (val: AllowedValue, item: AllowedValue) => {
    if (typeof val === "string" && typeof item === "string")
      return val.indexOf(item);
    if (Array.isArray(val)) return val.indexOf(item);
    return -1;
  },
  str_slice: (val: AllowedValue, start: AllowedValue, end: AllowedValue) => {
    if (typeof val !== "string" && !Array.isArray(val))
      throw new TypeError("str_slice: 第一个参数必须是字符串或数组");
    const s = typeof start === "number" ? start : 0;
    const e = typeof end === "number" ? end : undefined;
    return val.slice(s, e);
  },
  str_to_upper_case: (val: AllowedValue) => {
    if (typeof val !== "string")
      throw new TypeError("str_to_upper_case: 参数必须是字符串");
    return val.toUpperCase();
  },
  str_to_lower_case: (val: AllowedValue) => {
    if (typeof val !== "string")
      throw new TypeError("str_to_lower_case: 参数必须是字符串");
    return val.toLowerCase();
  },
  str_replace: (
    str: AllowedValue,
    pattern: AllowedValue,
    replacement: AllowedValue,
  ) => {
    if (typeof str !== "string")
      throw new TypeError("str_replace: 第一个参数必须是字符串");
    if (typeof pattern !== "string")
      throw new TypeError("str_replace: 第二个参数必须是字符串");
    if (typeof replacement !== "string")
      throw new TypeError("str_replace: 第三个参数必须是字符串");
    // 使用 JS 原生 String.replace，只替换第一个匹配项
    return str.replace(pattern, replacement);
  },
  str_split: (str: AllowedValue, delimiter: AllowedValue) => {
    if (typeof str !== "string" || typeof delimiter !== "string") return [];
    return str.split(delimiter);
  },
  str_trim: (val: AllowedValue) => {
    if (typeof val !== "string")
      throw new TypeError("str_trim: 参数必须是字符串");
    return val.trim();
  },

  // URL 编解码（全平台原生支持）
  url_encode: (val: AllowedValue) => {
    if (typeof val !== "string") return "";
    try {
      return encodeURIComponent(val);
    } catch {
      return "";
    }
  },
  url_decode: (val: AllowedValue) => {
    if (typeof val !== "string") return "";
    try {
      return decodeURIComponent(val);
    } catch {
      return "";
    }
  },
};
