import { SplashScreen, Stack, ThemeProvider, DarkTheme } from "expo-router";
import { ConduitProvider, useConduit } from "@/contexts/ConduitContext";
import { PaperProvider, useTheme } from "react-native-paper";
import { Theme } from "@/constants/theme";
import { useEffect } from "react";
import { SnackbarProvider } from "@/contexts/SnackbarContext";

SplashScreen.preventAutoHideAsync();

export function RootLayoutNav() {
  const { isReady } = useConduit();
  const { colors } = useTheme();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[mediaProvider]" />
    </Stack>
  );
}

const RNNTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "transparent",
  },
};

export default function StackLayout() {
  return (
    <ThemeProvider value={RNNTheme}>
      <PaperProvider theme={Theme}>
        <SnackbarProvider>
          <ConduitProvider>
            <RootLayoutNav />
          </ConduitProvider>
        </SnackbarProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
