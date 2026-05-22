import type { CustomFunction } from "@grimoire/rune";
import { html_parse } from "./parse";
import { xpath_select, xpath_select1 } from "./xpath";

/**
 * HTML/XPath 模块自定义函数集合
 * 注入 rune 引擎使用：
 *   new RuleEngine(rule, { functions: htmlFunctions })
 */
export const htmlFunctions: Record<string, CustomFunction> = {
  html_parse,
  xpath_select,
  xpath_select1,
};

export { html_parse, xpath_select, xpath_select1 };
