import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useToast } from "@/src/components/Toast";
import {
  GITHUB_LATEST_RELEASE_API,
  GITHUB_RELEASES_PAGE,
  UPDATE_CHECK_THROTTLE_MS,
} from "@/src/config";
import { makeStyles, radius, spacing } from "@/src/theme";

import { isNewerVersion } from "./version";

const CURRENT_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const ANDROID_PACKAGE =
  (Constants.expoConfig?.android?.package as string | undefined) ?? "";

interface LatestRelease {
  version: string;
  notes: string;
  apkUrl: string;
  pageUrl: string;
  size: number;
}

type Phase = "idle" | "downloading" | "error";

interface UpdateCtx {
  currentVersion: string;
  checking: boolean;
  checkForUpdate: (manual?: boolean) => void;
}

const Ctx = createContext<UpdateCtx | null>(null);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const toast = useToast();

  const [checking, setChecking] = useState(false);
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const lastCheck = useRef(0);

  const checkForUpdate = useCallback(
    async (manual = false) => {
      if (checking) return;
      setChecking(true);
      try {
        const resp = await fetch(GITHUB_LATEST_RELEASE_API, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const tag: string = data.tag_name ?? data.name ?? "";
        const apkAsset = (data.assets ?? []).find((a: { name?: string }) =>
          (a.name ?? "").toLowerCase().endsWith(".apk"),
        );
        const rel: LatestRelease = {
          version: tag,
          notes: data.body ?? "",
          apkUrl: apkAsset?.browser_download_url ?? "",
          pageUrl: data.html_url ?? GITHUB_RELEASES_PAGE,
          size: apkAsset?.size ?? 0,
        };
        if (tag && isNewerVersion(tag, CURRENT_VERSION)) {
          setLatest(rel);
          setPhase("idle");
          setProgress(0);
          setVisible(true);
        } else if (manual) {
          toast.show(`Imate najnoviju verziju (v${CURRENT_VERSION})`, "info");
        }
      } catch {
        if (manual)
          toast.show("Provera nije uspela — proveri internet", "error");
      } finally {
        setChecking(false);
        lastCheck.current = Date.now();
      }
    },
    [checking, toast],
  );

  // Auto-provera na startu i kad se aplikacija vrati u prvi plan (Android).
  useEffect(() => {
    if (Platform.OS !== "android") return;
    checkForUpdate(false);
    const sub = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        Date.now() - lastCheck.current > UPDATE_CHECK_THROTTLE_MS
      ) {
        checkForUpdate(false);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPage = useCallback(() => {
    if (latest?.pageUrl) Linking.openURL(latest.pageUrl);
  }, [latest]);

  const downloadAndInstall = useCallback(async () => {
    if (!latest) return;
    if (Platform.OS !== "android" || !latest.apkUrl) {
      openPage();
      return;
    }
    try {
      setPhase("downloading");
      setProgress(0);
      const fileUri = `${FileSystem.cacheDirectory}update-${latest.version}.apk`;
      const dl = FileSystem.createDownloadResumable(
        latest.apkUrl,
        fileUri,
        {},
        (p) => {
          const total =
            p.totalBytesExpectedToWrite > 0
              ? p.totalBytesExpectedToWrite
              : latest.size || 1;
          setProgress(Math.min(p.totalBytesWritten / total, 1));
        },
      );
      const res = await dl.downloadAsync();
      if (!res?.uri) throw new Error("download failed");
      const contentUri = await FileSystem.getContentUriAsync(res.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: "application/vnd.android.package-archive",
      });
      setPhase("idle");
    } catch {
      setPhase("error");
    }
  }, [latest, openPage]);

  const openInstallSettings = useCallback(async () => {
    try {
      await IntentLauncher.startActivityAsync(
        "android.settings.MANAGE_UNKNOWN_APP_SOURCES",
        ANDROID_PACKAGE ? { data: `package:${ANDROID_PACKAGE}` } : {},
      );
    } catch {
      toast.show("Otvori: Podešavanja → Instaliranje nepoznatih aplikacija", "info");
    }
  }, [toast]);

  const isAndroid = Platform.OS === "android";
  const pct = Math.round(progress * 100);

  return (
    <Ctx.Provider
      value={{ currentVersion: CURRENT_VERSION, checking, checkForUpdate }}
    >
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => phase !== "downloading" && setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card} testID="update-modal">
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NOVA VERZIJA</Text>
            </View>
            <Text style={styles.title} testID="update-version">
              v{latest?.version?.replace(/^v/i, "")}
            </Text>
            <Text style={styles.sub}>
              Trenutna verzija: v{CURRENT_VERSION}
            </Text>

            {latest?.notes ? (
              <ScrollView style={styles.notes} testID="update-notes">
                <Text style={styles.notesText}>{latest.notes}</Text>
              </ScrollView>
            ) : null}

            {phase === "downloading" && (
              <View style={styles.progressWrap} testID="update-progress">
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.progressText}>Preuzimanje… {pct}%</Text>
              </View>
            )}

            {phase === "error" && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  Instalacija je blokirana. Dozvoli instaliranje nepoznatih
                  aplikacija za ovu aplikaciju, pa pokušaj ponovo.
                </Text>
                <Pressable
                  testID="update-open-settings"
                  onPress={openInstallSettings}
                  style={({ pressed }) => [
                    styles.settingsBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.settingsBtnText}>Dozvoli instalaciju</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                testID="update-later"
                disabled={phase === "downloading"}
                onPress={() => setVisible(false)}
                style={({ pressed }) => [
                  styles.laterBtn,
                  (pressed || phase === "downloading") && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.laterText}>Kasnije</Text>
              </Pressable>
              <Pressable
                testID="update-install"
                disabled={phase === "downloading"}
                onPress={downloadAndInstall}
                style={({ pressed }) => [
                  styles.installBtn,
                  (pressed || phase === "downloading") && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.installText}>
                  {phase === "downloading"
                    ? "Preuzimanje…"
                    : isAndroid && latest?.apkUrl
                      ? "Preuzmi i instaliraj"
                      : "Otvori stranicu"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

export function useUpdate(): UpdateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUpdate must be used within UpdateProvider");
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.onSuccess,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  notes: {
    maxHeight: 160,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  notesText: { fontSize: 13, color: colors.onSurfaceTertiary, lineHeight: 19 },
  progressWrap: { marginTop: spacing.md, gap: spacing.xs },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.brandPrimary,
  },
  progressText: { fontSize: 12, fontWeight: "700", color: colors.muted },
  errorBox: {
    marginTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.error, fontWeight: "600" },
  settingsBtn: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBtnText: { color: colors.error, fontSize: 14, fontWeight: "800" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  laterBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  laterText: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  installBtn: {
    flex: 2,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  installText: { fontSize: 15, fontWeight: "800", color: colors.onBrandPrimary },
}));
