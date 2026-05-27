import type { TimelineSource } from "@grimoire/danmaku";

export interface MockPlayer {
  // 当前播放时间，毫秒。
  currentTimeMs: number;
  isPlaying: boolean;
  // 注册 seek 监听，返回 unsubscribe。
  onSeek: (handler: (timeMs: number) => void) => () => void;
  // 直接触发一次 seek（业务侧拖进度时调）。
  emitSeek: (timeMs: number) => void;
}

// 把任意符合上面接口的播放器适配成 TimelineSource。
export function createTimelineSource(player: MockPlayer): TimelineSource {
  return {
    getCurrentTime: () => player.currentTimeMs,
    isPlaying: () => player.isPlaying,
    onSeek: (handler) => player.onSeek(handler),
  };
}
