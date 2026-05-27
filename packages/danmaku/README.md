# @grimoire/danmaku

跨端纯文本弹幕调度库。核心引擎零依赖 TypeScript，适配层基于 RN-Skia + Reanimated，60fps 位置更新不经过 React reconcile。

## 架构

```
@grimoire/danmaku (core)
  ├── DanmakuStore       # 时间排序 + id 去重
  ├── FilterChain        # 关键词/正则/用户/模式/自定义过滤
  ├── DanmakuMerger      # 窗口内同文本合并为 "text ×N"
  ├── TrackAllocator     # scroll/top/bottom 三模式轨道分配
  ├── DanmakuScheduler   # 调度管线：store → filter → merge → allocate
  ├── DensityGovernor    # fps 自适应降级/回升 maxOnScreen
  ├── TimeKeeper         # RAF 驱动的时间插值，支持外部 seek
  └── TextMeasurer       # 接口契约（core）；web 可用 EstimateTextMeasurer 回退

@grimoire/danmaku/react-native
  ├── useDanmakuController  # React hook：组装 controller + measurer
  ├── DanmakuView           # Skia Canvas 容器，订阅 layout/tick 事件
  ├── DanmakuTextNode       # 单条弹幕：UI thread x 插值 + 渲染
  └── SkiaTextMeasurer      # 基于 RN-Skia 的精确文本测量
```

## 子入口

| 入口 | 依赖 | 适用场景 |
|------|------|----------|
| `@grimoire/danmaku` | 无（純 TS） | Node 测试、自定义适配层 |
| `@grimoire/danmaku/react-native` | RN-Skia + Reanimated | Android / iOS / Web / TV |

仅用核心入口的 Node 消费者**无需**安装 RN-Skia 等依赖。

## 安装

```bash
yarn add @grimoire/danmaku @shopify/react-native-skia react-native-reanimated
```

## 快速开始

```tsx
import { useFont } from "@shopify/react-native-skia";
import {
  useDanmakuController,
  DanmakuView,
} from "@grimoire/danmaku/react-native";
import fontTtf from "./assets/NotoSansSC-Regular.ttf";

function VideoOverlay({ player }: { player: VideoPlayer }) {
  const font = useFont(fontTtf, 24);

  // font 可为 null（加载中），controller 始终创建，字体就绪后自动注入
  const controller = useDanmakuController({
    font,
    items: [],
    viewport: { width: 0, height: 0 },
    timeline: {
      getCurrentTime: () => Math.round(player.currentTime * 1000),
      isPlaying: () => player.isPlaying,
    },
    config: {
      maxOnScreen: 80,
      adaptive: { enabled: true, targetFps: 60 },
    },
  });

  // 直播推送
  useWebSocket("wss://...", (msg) => {
    controller.append([{ id: msg.id, time: msg.timeMs, text: msg.text }]);
  });

  return <DanmakuView controller={controller} />;
}
```

## API

### DanmakuController

| 方法 | 说明 |
|------|------|
| `append(items: DanmakuItem[])` | 增量添加弹幕，按 id 去重 |
| `setItems(items: DanmakuItem[])` | 全量替换弹幕列表 |
| `clearItems()` | 清空全部弹幕 |
| `pause()` / `resume()` | 暂停 / 继续播放 |
| `setVisible(v: boolean)` | 切换可见性（不可见时停止渲染） |
| `setRate(rate: number)` | 设置播放速率（1 = 正常，2 = 两倍速） |
| `seek(timeMs: number)` | 跳转到指定播放时间 |
| `attachTimeline(source)` | 绑定时间源（视频播放器） |
| `detachTimeline()` | 解绑时间源 |
| `setOpacity(n: number)` | 全局透明度 0–1 |
| `setFontScale(s: number)` | 字号缩放比例 |
| `setDisplayArea(r: number)` | 可用显示区域比例 0–1 |
| `setMaxOnScreen(n: number)` | 最大同时在屏弹幕数 |
| `setViewport(v: DanmakuViewport)` | 更新视口尺寸 |
| `updateConfig(patch)` | 批量更新配置 |
| `setMerge(config)` | 设置合并策略 |
| `setAdaptive(config)` | 设置密度自适应 |
| `setMeasurer(measurer)` | 注入自定义文本测量器 |
| `getMeasurer()` | 获取当前测量器实例 |
| `destroy()` | 销毁 controller，释放资源 |

### 过滤

| 方法 | 说明 |
|------|------|
| `setBlockedKeywords(words)` | 屏蔽关键词列表 |
| `setBlockedPatterns(patterns)` | 屏蔽正则表达式列表 |
| `setBlockedUserIds(ids)` | 屏蔽用户 ID 列表 |
| `setBlockedModes(modes)` | 屏蔽弹幕模式（scroll/top/bottom） |
| `setFilter(predicate \| null)` | 自定义过滤函数 |

### 事件

```ts
controller.on("tick", ({ timeMs }) => { ... });
controller.on("layout", ({ snapshot }) => { ... });
controller.on("overload", ({ fps, effectiveMaxOnScreen }) => { ... });
controller.on("warn", ({ code, message }) => { ... });
controller.on("error", ({ error }) => { ... });
```

## 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `scrollDurationMs` | number | 8000 | 滚动弹幕从出现到消失的时长 |
| `fixedDurationMs` | number | 4000 | 顶部/底部弹幕持续时长 |
| `maxOnScreen` | number | 80 | 最大同时在屏弹幕数 |
| `opacity` | number | 1 | 全局透明度 0–1 |
| `rate` | number | 1 | 播放速率 |
| `fontScale` | number | 1 | 字号缩放比例 |
| `displayArea` | number | 1 | 可用显示区域比例 0–1 |
| `trackGap` | number | 4 | 轨道间距（像素） |
| `defaultFontSize` | number | 24 | 默认字号 |
| `safeAreaInsets` | object | `{top,right,bottom,left: 0}` | 安全区 |
| `merge.enabled` | boolean | false | 启用同文本合并 |
| `merge.windowMs` | number | 5000 | 合并时间窗口（毫秒） |
| `merge.minCount` | number | 3 | 触发合并的最小重复次数 |
| `adaptive.enabled` | boolean | false | 启用密度自适应 |
| `adaptive.targetFps` | number | 60 | 目标帧率 |
| `adaptive.minMaxOnScreen` | number | 30 | 降级下限 |

## DanmakuItem

```ts
interface DanmakuItem {
  id: string;           // 去重主键，必填
  time: number;         // 出现时间（毫秒），必填
  text: string;         // 弹幕文本，必填
  mode?: "scroll" | "top" | "bottom";  // 默认 "scroll"
  color?: string;       // CSS 颜色，默认 "#ffffff"
  fontSize?: number;    // 字号，默认取 config.defaultFontSize
  weight?: "normal" | "bold";          // 默认 "normal"
  userId?: string;      // 用户标识，供过滤用
  borderColor?: string; // 描边色，可选
  meta?: Record<string, unknown>;      // 透传业务字段
}
```

## Web 兼容性

RN-Skia Web 底层使用 CanvasKit（Skia 编译到 WASM）。CanvasKit 的 WASM 绑定层有严格的指针所有权语义：

- `font.getTypeface()` 返回**借用指针**（non-owning reference），生命周期绑定在父 `SkFont` 上
- `new CanvasKit.Font(typeface, fontSize)` 要求**智能指针**（owning reference）

因此 `SkiaTextMeasurer` 在 Web 端**不会**通过 typeface 创建新 `SkFont`，而是复用 `useFont` 返回的原始 `SkFont`：
- **测量**：以 baseFont 测量后按 `fontSize / baseFontSize` 比例缩放
- **渲染**：当弹幕字号与 baseFont 不同时，通过 Skia Group `scale` 变换实现

> 若 `useFont(fontTtf, 24)` 中 24 即为弹幕的实际字号，则测量与渲染均零额外开销（scale = 1，跳过变换）。

## 版本要求

- React ≥ 18.0
- React Native ≥ 0.73
- @shopify/react-native-skia ≥ 1.4
- react-native-reanimated ≥ 3.6
