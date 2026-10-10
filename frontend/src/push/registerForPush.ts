import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getDeviceId } from "./device";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// Traži dozvolu, uzima native push token i registruje uređaj na backend-u.
// Tiho izlazi na web-u / Expo Go / bez FCM-a (radi samo na pravom buildu).
export async function registerForPush(): Promise<void> {
  if (Platform.OS === "web") return;
  if (!Device.isDevice) return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const userId = await getDeviceId();
    await fetch(`${BACKEND}/api/register-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        platform: Platform.OS,
        device_token: String(tokenResp.data),
      }),
    });
  } catch {
    // Push nije dostupan (Expo Go / nema FCM) — ignoriši.
  }
}
