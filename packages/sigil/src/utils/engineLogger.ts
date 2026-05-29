import type { Logger } from "@grimoire/rune";

/** 引擎日志的前缀样式 — 深紫背景 + 亮青色文字，在控制台中一眼可辨 */
const TAG_STYLE =
  "background:#2d1b4e;color:#0ff;padding:1px 4px;border-radius:2px;font-weight:bold";
const TAG = "%c[RuneEngine]%c";

/** 各日志级别对应的 console 方法和样式 */
type LevelConfig = {
  method: "log" | "warn" | "error";
  /** 第二个 %c 的样式（消息体样式） */
  msgStyle: string;
};

const LEVEL_CONFIG: Record<keyof Logger, LevelConfig> = {
  debug: { method: "log", msgStyle: "color:#888" },
  info: { method: "log", msgStyle: "color:#0cf" },
  warn: { method: "warn", msgStyle: "color:#fa0;font-weight:bold" },
  error: { method: "error", msgStyle: "color:#f44;font-weight:bold" },
};

/**
 * 基于 console 的 Logger 实现
 * 输出带深紫背景标签的日志，便于在浏览器/终端控制台中将引擎日志与应用日志区分开
 */
export class ConsoleLogger implements Logger {
  debug(message: string, data?: unknown): void {
    this.emit("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    this.emit("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.emit("warn", message, data);
  }

  error(message: string, data?: unknown): void {
    this.emit("error", message, data);
  }

  private emit(level: keyof Logger, message: string, data?: unknown): void {
    const cfg = LEVEL_CONFIG[level];
    if (data !== undefined) {
      console[cfg.method](`${TAG} ${message}`, TAG_STYLE, cfg.msgStyle, data);
    } else {
      console[cfg.method](`${TAG} ${message}`, TAG_STYLE, cfg.msgStyle);
    }
  }
}
