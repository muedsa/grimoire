import { ImageBackground } from "expo-image";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

type ScreenBackgroundImageType = "blur" | "scrim";

type ScreenBackgroundContextImageType = {
  image: string;
  type: ScreenBackgroundImageType;
  changeScreenBackgroundImage: (
    image: string,
    type: ScreenBackgroundImageType,
  ) => void;
  clearScreenBackgroundImage: () => void;
};

const ScreenBackgroundImageContext =
  createContext<ScreenBackgroundContextImageType | null>(null);

export function useScreenBackgroundImage(): ScreenBackgroundContextImageType {
  const value = useContext(ScreenBackgroundImageContext);
  if (!value) {
    throw new Error(
      "useScreenBackgroundContext must be wrapped in a <ScreenBackgroundProvider/>",
    );
  }
  return value;
}

export function ScreenBackgroundImageProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const [image, setImage] = useState<string>("");
  const [type, setType] = useState<"blur" | "scrim">("blur");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeScreenBackgroundImage = useCallback(
    (image: string, type: ScreenBackgroundImageType) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setImage(image);
        setType(type);
      }, 500);
    },
    [],
  );

  const clearScreenBackgroundImage = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setImage("");
  }, []);

  return (
    <ScreenBackgroundImageContext.Provider
      value={{
        image,
        type,
        changeScreenBackgroundImage,
        clearScreenBackgroundImage,
      }}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ImageBackground
          source={image ? { uri: image } : undefined}
          blurRadius={type === "blur" ? 5 : 0}
          style={[styles.background, !image && styles.hidden]}
          transition={1000}
        ></ImageBackground>
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.9)", "rgba(0, 0, 0, 0.5)", "transparent"]}
          locations={[0.1, 0.3, 1.0]} // 渐变控制点：40%处开始渐变，70%半透明，100%全黑
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
        {children}
      </View>
    </ScreenBackgroundImageContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  background: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  hidden: {
    display: "none",
  },
});
