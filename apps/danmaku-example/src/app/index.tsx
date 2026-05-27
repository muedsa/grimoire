import {
  useDanmakuController,
  DanmakuView,
} from "@grimoire/danmaku/react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEMO_DANMAKU_ITEMS, DEMO_DURATION_MS } from "../demoDanmaku";
import { createTimelineSource, type MockPlayer } from "../playerSource";
import { useFont } from "@shopify/react-native-skia";

const TICK_MS = 33; // 模拟播放器 30fps onProgress

// 实时弹幕文案池，点击发送时随机抽取。
const LIVE_TEXTS = [
  "实时弹幕来啦!",
  "666666",
  "前方高能!",
  "哈哈哈笑死",
  "来了来了",
  "打卡~",
  "第一!",
  "这也太强了吧",
  "直接狂暴",
  "到位了",
];

export default function DanmakuExampleScreen() {
  const font = useFont(require("../../assets/NotoSansSC-Regular.ttf"));

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const playerWidth = Math.min(windowWidth - 32, 960);
  const playerHeight = Math.min(playerWidth * 0.5625, windowHeight * 0.62);

  // 模拟播放器状态，存在 ref 里避免高频 setState。
  const playerRef = useRef<MockPlayer>({
    currentTimeMs: 0,
    isPlaying: true,
    onSeek: (h) => {
      seekHandlersRef.current.add(h);
      return () => seekHandlersRef.current.delete(h);
    },
    emitSeek: (timeMs) => {
      playerRef.current.currentTimeMs = timeMs;
      for (const h of seekHandlersRef.current) h(timeMs);
    },
  });
  const seekHandlersRef = useRef<Set<(t: number) => void>>(new Set());
  const startedAtRef = useRef(Date.now());
  // 实时弹幕序号，生成唯一 id 用。
  const liveSeqRef = useRef(0);

  const timeline = useMemo(() => createTimelineSource(playerRef.current), []);

  const controller = useDanmakuController({
    items: DEMO_DANMAKU_ITEMS,
    viewport: { width: playerWidth, height: playerHeight },
    timeline,
    font: font,
    config: {
      scrollDurationMs: Platform.isTV ? 10_000 : 8_000,
      fixedDurationMs: 3_500,
      maxOnScreen: Platform.isTV ? 36 : 72,
      defaultFontSize: Platform.isTV ? 28 : 24,
      trackGap: Platform.isTV ? 8 : 5,
      safeAreaInsets: { top: 12, right: 20, bottom: 18, left: 20 },
      merge: { enabled: false },
      adaptive: { enabled: true, targetFps: Platform.isTV ? 30 : 60 },
    },
  });

  // 用于触发本地 ui 渲染状态的"播放/暂停/进度"显示。
  const [uiState, setUiState] = useState({ playing: true, timeMs: 0 });

  // 30fps 的"模拟播放器"循环：推进 currentTimeMs，并把状态镜像到 uiState。
  useEffect(() => {
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player.isPlaying) return;
      const nextMs = Date.now() - startedAtRef.current;
      if (nextMs >= DEMO_DURATION_MS) {
        player.currentTimeMs = DEMO_DURATION_MS;
        player.isPlaying = false;
        setUiState({ playing: false, timeMs: DEMO_DURATION_MS });
        return;
      }
      player.currentTimeMs = nextMs;
      setUiState({ playing: true, timeMs: nextMs });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const togglePlay = () => {
    const player = playerRef.current;
    if (player.isPlaying) {
      player.isPlaying = false;
      setUiState({ playing: false, timeMs: player.currentTimeMs });
    } else {
      startedAtRef.current = Date.now() - player.currentTimeMs;
      player.isPlaying = true;
      setUiState({ playing: true, timeMs: player.currentTimeMs });
    }
  };

  const replay = () => {
    const player = playerRef.current;
    startedAtRef.current = Date.now();
    player.currentTimeMs = 0;
    player.isPlaying = true;
    player.emitSeek(0);
    setUiState({ playing: true, timeMs: 0 });
  };

  // 发送一条实时弹幕：以当前播放时间为 time，随机抽取文案。
  const sendDanmaku = () => {
    const player = playerRef.current;
    const id = `live-${liveSeqRef.current++}`;
    const text = LIVE_TEXTS[Math.floor(Math.random() * LIVE_TEXTS.length)];
    controller.append([
      {
        id,
        time: player.currentTimeMs,
        text,
        color: "#f8fafc",
        mode: "scroll",
      },
    ]);
  };

  // 屏蔽词输入：逗号分隔。
  const [blockedInput, setBlockedInput] = useState("");
  useEffect(() => {
    const words = blockedInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    controller.setBlockedKeywords(words);
  }, [blockedInput, controller]);

  if (!font) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.shell}>
          <Text style={styles.title}>正在加载字体...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>@grimoire/danmaku example</Text>
            <Text style={styles.title}>Skia Canvas 弹幕示例</Text>
          </View>
          <Text style={styles.platform}>{platformLabel()}</Text>
        </View>

        <View
          style={[styles.player, { width: playerWidth, height: playerHeight }]}
        >
          <View style={styles.videoGlow} />
          <Text style={styles.videoLabel}>模拟视频区域</Text>
          <DanmakuView
            controller={controller}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.primaryButton} onPress={togglePlay}>
            <Text style={styles.primaryButtonText}>
              {uiState.playing ? "暂停" : "播放"}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={replay}>
            <Text style={styles.secondaryButtonText}>重播</Text>
          </Pressable>
          <Pressable style={styles.liveButton} onPress={sendDanmaku}>
            <Text style={styles.liveButtonText}>发送弹幕</Text>
          </Pressable>
          <Text style={styles.time}>
            {(uiState.timeMs / 1000).toFixed(1)}s /{" "}
            {(DEMO_DURATION_MS / 1000).toFixed(1)}s
          </Text>
        </View>

        <TextInput
          placeholder="输入屏蔽词，逗号分隔（如：广告,水军）"
          placeholderTextColor="#64748b"
          value={blockedInput}
          onChangeText={setBlockedInput}
          style={styles.input}
        />

        <Text style={styles.note}>
          本示例驱动模拟播放器 30fps 推进 currentTimeMs， DanmakuController
          内部以 RAF 60fps 平滑插值； 弹幕位置完全不经过 React reconcile。
        </Text>
      </View>
    </SafeAreaView>
  );
}

function platformLabel(): string {
  if (Platform.isTV) return "TV";
  return Platform.OS.toUpperCase();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#07111f" },
  shell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 16,
  },
  header: {
    width: "100%",
    maxWidth: 960,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: "#f8fafc", fontSize: 30, fontWeight: "800", marginTop: 4 },
  platform: {
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.5)",
    color: "#bae6fd",
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontWeight: "700",
  },
  player: {
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    backgroundColor: "#020617",
  },
  videoGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(14, 165, 233, 0.16)",
  },
  videoLabel: {
    position: "absolute",
    left: 24,
    bottom: 20,
    color: "rgba(226, 232, 240, 0.72)",
    fontSize: 18,
    fontWeight: "700",
  },
  controls: {
    width: "100%",
    maxWidth: 960,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    minWidth: 96,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#38bdf8",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: { color: "#082f49", fontWeight: "900" },
  secondaryButton: {
    minWidth: 96,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: "#e2e8f0", fontWeight: "800" },
  liveButton: {
    minWidth: 96,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  liveButtonText: { color: "#451a03", fontWeight: "900" },
  time: { color: "#cbd5e1", fontVariant: ["tabular-nums"], fontWeight: "700" },
  input: {
    width: "100%",
    maxWidth: 960,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f8fafc",
  },
  note: { width: "100%", maxWidth: 960, color: "#94a3b8", lineHeight: 22 },
});
