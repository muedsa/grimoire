import { ExecutionContext } from "../context/context";
import { ExecuteResult } from "../types/node";
import { AllowedValue } from "../types/node";

/**
 * 自定义节点处理器 - 由外部注册的业务逻辑
 */
export type CustomNodeHandler = (
  params: AllowedValue,       // 已求值的参数（与 set.value 使用同一套模板系统）
  context: ExecutionContext
) => ExecuteResult | Promise<ExecuteResult>;

/**
 * 自定义节点注册表 - 用于管理和查找自定义节点处理器
 */
export class CustomNodeRegistry {
  private handlers: Map<string, CustomNodeHandler> = new Map();

  /**
   * 注册自定义节点处理器
   * @param name 处理器名称，如 "http.get", "data.parse"
   * @param handler 处理函数
   */
  register(name: string, handler: CustomNodeHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * 获取已注册的处理器
   */
  get(name: string): CustomNodeHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * 检查是否已注册
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * 获取所有已注册的处理器名称
   */
  names(): string[] {
    return Array.from(this.handlers.keys());
  }
}
