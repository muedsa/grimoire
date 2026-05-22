import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

/**
 * 数学函数（math_* 前缀）
 */
export const mathBuiltins: Record<string, CustomFunction> = {
  math_min: (...args: AllowedValue[]) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return Math.min(...nums);
  },
  math_max: (...args: AllowedValue[]) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return Math.max(...nums);
  },
  math_abs: (val: AllowedValue) =>
    Math.abs(typeof val === "number" ? val : Number(val)),
  math_round: (val: AllowedValue) =>
    Math.round(typeof val === "number" ? val : Number(val)),
  math_floor: (val: AllowedValue) =>
    Math.floor(typeof val === "number" ? val : Number(val)),
  math_ceil: (val: AllowedValue) =>
    Math.ceil(typeof val === "number" ? val : Number(val)),
  math_pow: (base: AllowedValue, exp: AllowedValue) => {
    const b = typeof base === "number" ? base : Number(base);
    const e = typeof exp === "number" ? exp : Number(exp);
    return Math.pow(b, e);
  },
  math_sqrt: (val: AllowedValue) => {
    const n = typeof val === "number" ? val : Number(val);
    return Math.sqrt(n);
  },
  math_sum: (...args: AllowedValue[]) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  },
  math_avg: (...args: AllowedValue[]) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return nums.length === 0
      ? 0
      : nums.reduce((a, b) => a + b, 0) / nums.length;
  },
};
