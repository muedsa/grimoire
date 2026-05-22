import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

/**
 * 正则函数（regex_* 前缀）
 */
export const regexBuiltins: Record<string, CustomFunction> = {
  regex_test: (str: AllowedValue, pattern: AllowedValue) => {
    if (typeof str !== "string" || typeof pattern !== "string") return false;
    try {
      return new RegExp(pattern).test(str);
    } catch {
      return false;
    }
  },
  regex_match: (str: AllowedValue, pattern: AllowedValue) => {
    if (typeof str !== "string" || typeof pattern !== "string") return null;
    try {
      const m = new RegExp(pattern).exec(str);
      if (!m) return null;
      return {
        match: m[0],
        groups: m.length > 1 ? Array.from(m).slice(1) : [],
        index: m.index,
      };
    } catch {
      return null;
    }
  },
  regex_match_all: (str: AllowedValue, pattern: AllowedValue) => {
    if (typeof str !== "string" || typeof pattern !== "string") return [];
    try {
      const results: Array<{
        match: string;
        groups: string[];
        index: number;
      }> = [];
      const re = new RegExp(pattern, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(str)) !== null) {
        results.push({
          match: m[0],
          groups: m.length > 1 ? Array.from(m).slice(1) : [],
          index: m.index,
        });
      }
      return results;
    } catch {
      return [];
    }
  },
};
