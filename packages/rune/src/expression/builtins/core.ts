import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";
import { EngineError, ErrorCode } from "../../types/error";

/**
 * 核心工具函数
 */
export const coreBuiltins: Record<string, CustomFunction> = {
  len: (val: AllowedValue) => {
    if (val == null) return 0;
    if (Array.isArray(val) || typeof val === "string") return val.length;
    if (typeof val === "object") return Object.keys(val).length;
    return 0;
  },
  exists: (val: AllowedValue) => val !== undefined && val !== null,
  empty: (val: AllowedValue) => {
    if (val == null) return true;
    if (Array.isArray(val) || typeof val === "string") return val.length === 0;
    if (typeof val === "object") return Object.keys(val).length === 0;
    return false;
  },
  str: (val: AllowedValue) => String(val ?? ""),
  num: (val: AllowedValue) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  },
  json_stringify: (val: AllowedValue) => JSON.stringify(val),
  json_parse: (val: AllowedValue) => {
    if (typeof val !== "string")
      throw new TypeError("json_parse: 参数必须是字符串");
    return JSON.parse(val); // 非法 JSON 自然抛出 SyntaxError
  },
  throw_err: (code: AllowedValue, message: AllowedValue) => {
    const c = typeof code === "string" ? code : ErrorCode.EXECUTE_ERROR;
    const m = typeof message === "string" ? message : "";
    throw new EngineError(c as ErrorCode, m);
  },
  sleep: (async (ms: AllowedValue) => {
    const n = typeof ms === "number" ? ms : Number(ms);
    if (!Number.isFinite(n) || n < 0) return null;
    await new Promise((resolve) => setTimeout(resolve, n));
    return n;
  }) as unknown as CustomFunction,
};
