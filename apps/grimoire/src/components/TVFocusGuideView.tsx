import {
  TVFocusGuideView as NativeTVFocusGuideView,
  Platform,
  View,
} from "react-native";

export const TVFocusGuideView = (props: any) => {
  if (Platform.OS === "web") {
    return <View {...props} />;
  }
  return <NativeTVFocusGuideView {...props} />;
};
