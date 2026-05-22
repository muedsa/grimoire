import { CustomFunction } from "../evaluator";
import { coreBuiltins } from "./core";
import { typeofBuiltins } from "./typeof";
import { stringBuiltins } from "./string";
import { mathBuiltins } from "./math";
import { arrayBuiltins } from "./array";
import { regexBuiltins } from "./regex";
import { dateBuiltins } from "./date";
import { httpBuiltins } from "./http";

/**
 * 聚合的内置函数表 — 在表达式求值时使用
 */
export const builtins: Record<string, CustomFunction> = {
  ...coreBuiltins,
  ...typeofBuiltins,
  ...stringBuiltins,
  ...mathBuiltins,
  ...arrayBuiltins,
  ...regexBuiltins,
  ...dateBuiltins,
  ...httpBuiltins,
};
