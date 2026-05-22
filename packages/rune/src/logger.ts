/**
 * 标准四级日志接口
 * 引擎内部通过此接口输出日志，调用方自行实现（如适配 winston、pino 等）
 */
export interface Logger {
  /** 调试信息 — 详细的内部状态，仅开发/排查时关注 */
  debug(message: string, data?: unknown): void;
  /** 常规信息 — 执行流程的关键节点 */
  info(message: string, data?: unknown): void;
  /** 警告 — 非致命异常，如降级处理 */
  warn(message: string, data?: unknown): void;
  /** 错误 — 执行失败、异常 */
  error(message: string, data?: unknown): void;
}

/**
 * 默认空日志实现 — 所有方法为空操作，零开销
 * 调用方不传 logger 时使用此实现
 */
export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
