/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";
import { MD3DarkTheme } from "react-native-paper";

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#89D6B8",
    primaryContainer: "#00513D",
    secondary: "#B2CCC0",
    secondaryContainer: "#344C42",
    tertiary: "#A7CCE1",
    tertiaryContainer: "#0B3445",
    surface: "#0F1512",
    surfaceVariant: "#404944",
    surfaceDisabled: "#89D6B8",
    background: "#0F1512",
    error: "#FFB4AB",
    errorContainer: "#93000A",
    onPrimary: "#003829",
    onPrimaryContainer: "#A5F2D4",
    onSecondary: "#1E352C",
    onSecondaryContainer: "#CEE9DC",
    onTertiary: "#0B3445",
    onTertiaryContainer: "#C3E8FD",
    onSurface: "#DEE4DF",
    onSurfaceVariant: "#BFC9C3",
    onSurfaceDisabled: "#575C5A",
    onError: "#690005",
    onErrorContainer: "#FFDAD6",
    onBackground: "#DEE4DF",
    outline: "#89938D",
    outlineVariant: "#404944",
    inverseSurface: "#DEE4DF",
    inverseOnSurface: "#2C322F",
    inversePrimary: "#186B53",
    shadow: "#000000",
    scrim: "#000000",
    backdrop: "#0F1512",
    elevation: {
      level0: "#0F1512",
      level1: "#0A0F0D",
      level2: "#171D1A",
      level3: "#1B211E",
      level4: "#252B28",
      level5: "#303633",
    },
  },
};

export const Spacing = {
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 40,
  six: 48,
};

export const TV_HORIZONTAL_CARD_WIDTH = 250;
export const TV_VERTICAL_CARD_WIDTH = 180;
