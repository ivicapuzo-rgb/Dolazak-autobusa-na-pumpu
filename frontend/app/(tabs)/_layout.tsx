import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Bus, ClipboardText, FileText } from "phosphor-react-native";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="fuelpump.fill" />
          <NativeTabs.Trigger.Label>Danas</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="autobusi">
          <NativeTabs.Trigger.Icon sf="list.bullet" />
          <NativeTabs.Trigger.Label>Autobusi</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="izvestaj">
          <NativeTabs.Trigger.Icon sf="doc.text.fill" />
          <NativeTabs.Trigger.Label>Izveštaj</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Danas",
          tabBarIcon: ({ color, size }) => (
            <Bus color={color} size={size} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="autobusi"
        options={{
          title: "Autobusi",
          tabBarIcon: ({ color, size }) => (
            <ClipboardText color={color} size={size} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="izvestaj"
        options={{
          title: "Izveštaj",
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} weight="fill" />
          ),
        }}
      />
    </Tabs>
  );
}
