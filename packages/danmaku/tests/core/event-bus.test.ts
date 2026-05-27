import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../../src/core/event-bus";
import type { DanmakuEvent } from "../../src/core/types";

describe("EventBus", () => {
  it("把事件分发到对应类型的 handler", () => {
    const bus = new EventBus<DanmakuEvent>();
    const tickHandler = vi.fn();
    const layoutHandler = vi.fn();

    bus.on("tick", tickHandler);
    bus.on("layout", layoutHandler);

    bus.emit({ type: "tick", timeMs: 100 });

    expect(tickHandler).toHaveBeenCalledTimes(1);
    expect(tickHandler).toHaveBeenCalledWith({ type: "tick", timeMs: 100 });
    expect(layoutHandler).not.toHaveBeenCalled();
  });

  it("on 返回的 unsubscribe 函数可移除监听", () => {
    const bus = new EventBus<DanmakuEvent>();
    const handler = vi.fn();
    const off = bus.on("tick", handler);

    bus.emit({ type: "tick", timeMs: 1 });
    off();
    bus.emit({ type: "tick", timeMs: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("同一事件类型多个 handler 都被触发", () => {
    const bus = new EventBus<DanmakuEvent>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("tick", a);
    bus.on("tick", b);

    bus.emit({ type: "tick", timeMs: 5 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("某个 handler 抛错不阻断其他 handler", () => {
    const bus = new EventBus<DanmakuEvent>();
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    bus.on("tick", () => {
      throw new Error("boom");
    });
    const fine = vi.fn();
    bus.on("tick", fine);

    bus.emit({ type: "tick", timeMs: 1 });

    expect(fine).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("clear 清空所有监听", () => {
    const bus = new EventBus<DanmakuEvent>();
    const handler = vi.fn();
    bus.on("tick", handler);

    bus.clear();
    bus.emit({ type: "tick", timeMs: 1 });

    expect(handler).not.toHaveBeenCalled();
  });
});
