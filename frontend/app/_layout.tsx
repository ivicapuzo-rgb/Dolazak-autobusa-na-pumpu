import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { LogBox, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { ToastProvider } from "@/src/components/Toast";
import { DataProvider } from "@/src/data/DataContext";
import { registerForPush } from "@/src/push/registerForPush";
import { queryClient } from "@/src/query-client";
import { UpdateProvider } from "@/src/update/UpdateContext";
import { storage } from "@/src/utils/storage";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// 1. Foreground handler — MODULE SCOPE
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// 2. Android channel — MODULE SCOPE
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

export default function RootLayout() {
  const router = useRouter();
  const [nudgeVisible, setNudgeVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const openFromData = (data: Record<string, unknown>) => {
      const url = (data?.deeplink || data?.action_url) as string | undefined;
      if (!url) return;
      if (url.startsWith("http")) Linking.openURL(url);
      else router.push(url as never);
    };

    // 3. Warm tap
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        openFromData(response.notification.request.content.data || {});
      },
    );

    // 4. Cold-start tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response)
        openFromData(response.notification.request.content.data || {});
    });

    // Register device for push (silent on Expo Go / web / no FCM)
    registerForPush();

    // Weekly nudge when permission permanently denied
    (async () => {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== "denied" || canAskAgain) return;
      const last = await storage.getItem("pushNudgeAt", "");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (last && Date.now() - Number(last) <= oneWeek) return;
      setNudgeVisible(true);
    })();

    return () => {
      tapSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissNudge = async (openSettings: boolean) => {
    await storage.setItem("pushNudgeAt", String(Date.now()));
    setNudgeVisible(false);
    if (openSettings) Linking.openSettings();
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <DataProvider>
                <ToastProvider>
                  <UpdateProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                    <Modal
                      visible={nudgeVisible}
                      transparent
                      animationType="fade"
                      onRequestClose={() => dismissNudge(false)}
                    >
                      <View style={styles.backdrop}>
                        <View style={styles.card} testID="push-nudge">
                          <Text style={styles.title}>Uključi obaveštenja</Text>
                          <Text style={styles.body}>
                            Da bi dobijao obaveštenje kada izađe nova verzija
                            aplikacije, dozvoli obaveštenja u podešavanjima.
                          </Text>
                          <View style={styles.row}>
                            <Pressable
                              testID="push-nudge-later"
                              onPress={() => dismissNudge(false)}
                              style={styles.laterBtn}
                            >
                              <Text style={styles.laterText}>Kasnije</Text>
                            </Pressable>
                            <Pressable
                              testID="push-nudge-settings"
                              onPress={() => dismissNudge(true)}
                              style={styles.settingsBtn}
                            >
                              <Text style={styles.settingsText}>
                                Otvori podešavanja
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  </UpdateProvider>
                </ToastProvider>
              </DataProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  body: { fontSize: 14, color: "#475569", fontWeight: "500", lineHeight: 20 },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  laterBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  laterText: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  settingsBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#1E3A8A",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
