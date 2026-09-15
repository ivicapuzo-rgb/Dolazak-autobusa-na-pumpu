import { Platform } from "react-native";

// iOS 26+ gets native Liquid Glass tabs; older iOS, Android and web use the
// classic JS <Tabs> bar.
export const usesNativeTabs =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
