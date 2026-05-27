// 极简类型安全 EventBus；handler 异常被吞掉以防一个监听器拖垮整条链。
// 内部用 Map<type, Set<handler>>，emit 时遍历 set 调用。

type AnyEvent = { type: string };

export class EventBus<TEvent extends AnyEvent> {
  // 用 Set 而不是 Array：自然去重、移除 O(1)。
  // value 类型故意宽松成 (event: any) => void，调用 on 时由方法签名保障类型。
  private readonly handlers = new Map<
    TEvent["type"],
    Set<(event: TEvent) => void>
  >();

  on<TType extends TEvent["type"]>(
    type: TType,
    handler: (event: Extract<TEvent, { type: TType }>) => void,
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    // 因为类型变量的协变限制，需要 cast 一次。
    const wrapped = handler as (event: TEvent) => void;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  emit(event: TEvent): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    // 复制一份避免 handler 内部 on/off 影响当前遍历。
    const snapshot = Array.from(set);
    for (const handler of snapshot) {
      try {
        handler(event);
      } catch (error) {
        // 不让单个监听器抛错炸掉整条链；写到 console，方便排查。
        // eslint-disable-next-line no-console
        console.error("[EventBus] handler threw", error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
