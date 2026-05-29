import type { CustomFunction } from "@grimoire/rune";
import { xml_parse, html_parse } from "./parse";
import { xpath_select, xpath_select1 } from "./xpath";
import { css_select, css_select1 } from "./css";

/**
 * DOM 解析/查询模块自定义函数集合
 * 注入 rune 引擎使用：
 *   new RuleEngine(rule, { functions: domFunctions })
 */
export const domFunctions: Record<string, CustomFunction> = {
  xml_parse,
  html_parse,
  xpath_select,
  xpath_select1,
  css_select,
  css_select1,
};

export {
  xml_parse,
  html_parse,
  xpath_select,
  xpath_select1,
  css_select,
  css_select1,
};
