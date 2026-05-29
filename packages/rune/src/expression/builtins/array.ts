import { AllowedValue } from "../../types/node";
import { CustomFunction } from "../evaluator";

/**
 * 数组操作函数（arr_* 前缀）
 * 行为对齐 JavaScript Array.prototype 方法：
 * - 会修改原数组的函数：push, pop, unshift, shift, reverse, sort
 * - 不修改原数组的函数：concat, join
 * - 传入非数组时抛出 TypeError
 */
export const arrayBuiltins: Record<string, CustomFunction> = {
  /** 在数组末尾追加一个或多个元素，修改原数组，返回新长度 */
  arr_push: (arr: AllowedValue, ...items: AllowedValue[]) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_push: 第一个参数必须是数组");
    return arr.push(...items);
  },

  /** 移除数组最后一个元素，修改原数组，返回被移除的元素（空数组返回 undefined） */
  arr_pop: (arr: AllowedValue) => {
    if (!Array.isArray(arr)) throw new TypeError("arr_pop: 参数必须是数组");
    return arr.pop();
  },

  /** 在数组头部插入一个或多个元素，修改原数组，返回新长度 */
  arr_unshift: (arr: AllowedValue, ...items: AllowedValue[]) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_unshift: 第一个参数必须是数组");
    return arr.unshift(...items);
  },

  /** 移除数组第一个元素，修改原数组，返回被移除的元素（空数组返回 undefined） */
  arr_shift: (arr: AllowedValue) => {
    if (!Array.isArray(arr)) throw new TypeError("arr_shift: 参数必须是数组");
    return arr.shift();
  },

  /** 合并数组，返回新数组，原数组不变 */
  arr_concat: (arr: AllowedValue, ...others: AllowedValue[]) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_concat: 第一个参数必须是数组");
    return arr.concat(...others);
  },

  /** 用分隔符连接数组元素为字符串，不修改原数组 */
  arr_join: (arr: AllowedValue, sep: AllowedValue) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_join: 第一个参数必须是数组");
    return arr
      .map((v) => String(v ?? ""))
      .join(typeof sep === "string" ? sep : ",");
  },

  /** 原地反转数组，返回原数组引用 */
  arr_reverse: (arr: AllowedValue) => {
    if (!Array.isArray(arr)) throw new TypeError("arr_reverse: 参数必须是数组");
    return arr.reverse();
  },

  /** 原地排序数组，返回原数组引用 */
  arr_sort: (...args: AllowedValue[]) => {
    const arr = args[0];
    const order = args[1];
    if (!Array.isArray(arr))
      throw new TypeError("arr_sort: 第一个参数必须是数组");
    if (arr.length === 0) return arr;
    const desc = order === "desc";
    if (arr.every((v) => typeof v === "number")) {
      arr.sort((a, b) =>
        desc ? (b as number) - (a as number) : (a as number) - (b as number),
      );
    } else {
      arr.sort();
      if (desc) arr.reverse();
    }
    return arr;
  },
};
