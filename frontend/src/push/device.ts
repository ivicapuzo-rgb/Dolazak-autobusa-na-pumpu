import { storage } from "@/src/utils/storage";

const KEY = "push_device_id";

// Stabilan ID uređaja (nije token) — koristi se kao user_id za push registraciju.
export async function getDeviceId(): Promise<string> {
  let id = await storage.getItem(KEY, "");
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await storage.setItem(KEY, id);
  }
  return id;
}
