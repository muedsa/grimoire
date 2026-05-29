/**
 * 执行上下文 - 规则执行期间的变量存储
 * 支持点路径访问、子作用域（循环用）、变量合并导出
 * 变量值仅支持基本类型、对象和数组
 */
import { AllowedValue, AllowedObject } from "../types/node";

export class ExecutionContext {
  private store: Map<string, AllowedValue>;
  private parent?: ExecutionContext;

  constructor(
    initial?: Record<string, AllowedValue>,
    parent?: ExecutionContext,
  ) {
    this.store = new Map(
      Object.entries(initial ?? {}) as [string, AllowedValue][],
    );
    this.parent = parent;
  }

  /**
   * 通过点路径获取值（如 "data.user.name"）
   * 如果当前作用域找不到，向上查找父作用域
   */
  get(path: string): AllowedValue {
    // 先在当前作用域查找顶层 key
    const parts = path.split(".");
    const rootKey = parts[0];

    if (this.store.has(rootKey)) {
      const value = this.store.get(rootKey);
      return this.resolvePath(value, parts.slice(1));
    }

    // 向上查找父作用域
    if (this.parent) {
      return this.parent.get(path);
    }

    return undefined;
  }

  /**
   * 通过点路径设置值（如 "result.items.0.name"）
   * 如果变量的根键已在父级存在，则写入父级；否则在当前作用域创建
   * 这符合现代编程语言的块级作用域直觉
   */
  set(path: string, value: AllowedValue): void {
    const parts = path.split(".");
    const rootKey = parts[0];

    // 沿 parent 链查找根键已存在的作用域
    const target = this.findTargetContext(rootKey);

    if (parts.length === 1) {
      // 直接设置顶层值
      target.store.set(rootKey, value);
      return;
    }

    // 获取或创建根对象
    let root = target.store.get(rootKey);
    if (root === undefined) {
      root = {};
      target.store.set(rootKey, root);
    }

    // 递归设置嵌套值
    target.setNestedValue(root, parts.slice(1), value);
  }

  /**
   * 沿 parent 链查找包含指定根键的作用域
   */
  private findTargetContext(rootKey: string): ExecutionContext {
    let current: ExecutionContext | undefined = this;
    while (current) {
      if (current.store.has(rootKey)) {
        return current;
      }
      current = current.parent;
    }
    // 父级都不存在，在当前作用域创建
    return this;
  }

  /**
   * 创建子作用域（用于循环迭代）
   * 子作用域可以访问父作用域的变量，但新变量不会泄漏到父作用域
   */
  fork(overrides?: Record<string, AllowedValue>): ExecutionContext {
    const child = new ExecutionContext(overrides, this);
    return child;
  }

  /**
   * 将上下文中的所有变量合并为一个扁平对象（用于返回值）
   */
  toJSON(): AllowedObject {
    const result: AllowedObject = {};

    // 先合并父作用域的变量
    if (this.parent) {
      Object.assign(result, this.parent.toJSON());
    }

    // 再覆盖当前作用域的变量
    for (const [key, value] of this.store) {
      result[key] = value;
    }

    return result;
  }

  /** 解析路径片段在值对象中的嵌套访问 */
  private resolvePath(value: AllowedValue, parts: string[]): AllowedValue {
    if (parts.length === 0 || value === null || value === undefined) {
      return value;
    }

    const [head, ...rest] = parts;

    // 处理数组索引
    if (Array.isArray(value)) {
      const index = Number(head);
      if (!isNaN(index) && index >= 0 && index < value.length) {
        return this.resolvePath(value[index], rest);
      }
      return undefined;
    }

    // 处理对象属性
    if (typeof value === "object") {
      return this.resolvePath((value as AllowedObject)[head], rest);
    }

    return undefined;
  }

  /** 递归设置嵌套值（支持数组索引） */
  private setNestedValue(
    obj: AllowedValue,
    parts: string[],
    value: AllowedValue,
  ): void {
    if (parts.length === 0) return;

    const [head, ...rest] = parts;

    if (Array.isArray(obj)) {
      const index = Number(head);
      if (!isNaN(index) && index >= 0) {
        if (rest.length === 0) {
          obj[index] = value;
        } else {
          if (obj[index] === undefined || obj[index] === null) {
            obj[index] = isNaN(Number(rest[0])) ? {} : [];
          }
          this.setNestedValue(obj[index], rest, value);
        }
      }
      return;
    }

    if (typeof obj === "object" && obj !== null) {
      const target = obj as AllowedObject;
      if (rest.length === 0) {
        target[head] = value;
      } else {
        if (target[head] === undefined || target[head] === null) {
          target[head] = isNaN(Number(rest[0])) ? {} : [];
        }
        this.setNestedValue(target[head], rest, value);
      }
    }
  }
}
