import type { CustomFunction } from "@grimoire/rune";
import { xml_parse, html_parse } from "./parse";
import { xpath_select, xpath_select1 } from "./xpath";
import { css_select, css_select1 } from "./css";
import {
  el_inner_text,
  el_inner_html,
  el_outer_html,
  el_attr,
  el_has_attr,
} from "./element";
import {
  css_select_text,
  css_select_html,
  css_select_outer_html,
  css_select_attr,
  css_select1_text,
  css_select1_html,
  css_select1_outer_html,
  css_select1_attr,
} from "./shortcut";

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
  el_inner_text,
  el_inner_html,
  el_outer_html,
  el_attr,
  el_has_attr,
  css_select_text,
  css_select_html,
  css_select_outer_html,
  css_select_attr,
  css_select1_text,
  css_select1_html,
  css_select1_outer_html,
  css_select1_attr,
};

export {
  xml_parse,
  html_parse,
  xpath_select,
  xpath_select1,
  css_select,
  css_select1,
  el_inner_text,
  el_inner_html,
  el_outer_html,
  el_attr,
  el_has_attr,
  css_select_text,
  css_select_html,
  css_select_outer_html,
  css_select_attr,
  css_select1_text,
  css_select1_html,
  css_select1_outer_html,
  css_select1_attr,
};
