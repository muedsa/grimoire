import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

/**
 * 类型判断函数
 */
export const typeofBuiltins: Record<string, CustomFunction> = {
  typeof: (val: AllowedValue) => {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (Array.isArray(val)) return "array";
    return typeof val;
  },
  type: (val: AllowedValue) => {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (Array.isArray(val)) return "array";
    return typeof val;
  },
};
