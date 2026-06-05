import { ScreenBackgroundImageProvider } from "@/contexts/ScreenBackgroundImageContext";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <ScreenBackgroundImageProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="detail" />
        <Stack.Screen name="playback" />
      </Stack>
    </ScreenBackgroundImageProvider>
  );
}
