import { View } from "react-native";
import ScreenWrapper from "./ScreenWapper";
import { ActivityIndicator } from "react-native-paper";

export function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" animating />
    </View>
  );
}

export function LoadingScreen() {
  return (
    <ScreenWrapper>
      <Loading />
    </ScreenWrapper>
  );
}
