import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateBar } from "@/src/components/DateBar";
import { StatCard } from "@/src/components/StatCard";
import { useToast } from "@/src/components/Toast";
import { useData } from "@/src/data/DataContext";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const HERO_IMG =
  "https://images.unsplash.com/photo-1617727553220-ab21c48259c6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBhcnRpY3VsYXRlZCUyMGNpdHklMjBidXMlMjBpbGx1c3RyYXRpb258ZW58MHx8fHwxNzg5NTA3MDI1fDA&ixlib=rb-4.1.0&q=85";

const SPOTS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function DanasScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { stats, setStatus, dayRecords, hasBus } = useData();

  const [broj, setBroj] = useState("");
  const [mesto, setMesto] = useState<number | null>(null);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const trimmed = broj.trim();

  const existing = trimmed ? dayRecords[trimmed] : undefined;
  const isVanredni = trimmed !== "" && !hasBus(trimmed);

  const statusHint = useMemo(() => {
    if (!existing) return null;
    if (existing.status === "stigao")
      return `Već evidentiran: stiglo u ${existing.vreme} / mesto ${existing.mesto}`;
    return "Već označen: NE DOLAZI";
  }, [existing]);

  const resetForm = () => {
    setBroj("");
    setMesto(null);
  };

  const handleDolazak = () => {
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show("Unesi broj autobusa", "error");
      return;
    }
    if (!mesto) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show("Izaberi mesto sipanja (1–8)", "error");
      return;
    }
    setStatus(trimmed, "stigao", mesto);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show(
      `${trimmed} evidentiran • ${dayjs().format("HH:mm")} • mesto ${mesto}`,
      "success",
    );
    resetForm();
  };

  const handleNeDolazi = () => {
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show("Unesi broj autobusa", "error");
      return;
    }
    setStatus(trimmed, "ne_dolazi");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    toast.show(`${trimmed} označen: NE DOLAZI`, "info");
    resetForm();
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Dolazak na pumpu</Text>
            <Text style={styles.headerSub}>Evidencija točenja goriva</Text>
          </View>
          <View style={styles.komBadge}>
            <Text style={styles.komNum}>{stats.ukupno}</Text>
            <Text style={styles.komLabel}>kom</Text>
          </View>
        </View>
        <DateBar />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={180}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={{ uri: HERO_IMG }}
            style={styles.heroImg}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroText}>Dolazak autobusa na pumpu</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            testID="stat-stiglo"
            label="STIGLO"
            value={stats.stiglo}
            color={colors.success}
          />
          <StatCard
            testID="stat-ceka"
            label="ČEKA SE"
            value={stats.cekaSe}
            color={colors.muted}
          />
          <StatCard
            testID="stat-nedolazi"
            label="NE DOLAZI"
            value={stats.neDolazi}
            color={colors.error}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Unesi autobus</Text>

          <Text style={styles.label}>Garažni broj</Text>
          <TextInput
            testID="input-broj"
            style={styles.input}
            value={broj}
            onChangeText={setBroj}
            placeholder="npr. 3127"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={8}
          />
          {isVanredni && (
            <Text style={styles.vanredniHint} testID="vanredni-hint">
              Vanredni — biće dodat u popis
            </Text>
          )}
          {statusHint && (
            <Text style={styles.statusHint} testID="status-hint">
              {statusHint}
            </Text>
          )}

          <Text style={[styles.label, { marginTop: spacing.lg }]}>
            Mesto sipanja (1–8)
          </Text>
          <View style={styles.spotsWrap}>
            {SPOTS.map((s) => {
              const active = mesto === s;
              return (
                <Pressable
                  key={s}
                  testID={`spot-${s}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMesto(active ? null : s);
                  }}
                  style={[styles.spot, active && styles.spotActive]}
                >
                  <Text
                    style={[styles.spotText, active && styles.spotTextActive]}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.timeNote}>
            🕒 Vreme dolaska se evidentira automatski.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View
          style={[
            styles.actionBar,
            { paddingBottom: bottomChrome + spacing.md },
          ]}
        >
          <Pressable
            testID="btn-evidentiraj"
            onPress={handleDolazak}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>EVIDENTIRAJ DOLAZAK</Text>
          </Pressable>
          <Pressable
            testID="btn-nedolazi"
            onPress={handleNeDolazi}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryBtnText}>Označi da NE DOLAZI</Text>
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  komBadge: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  komNum: { fontSize: 20, fontWeight: "800", color: colors.onBrandPrimary },
  komLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.onBrandPrimary,
    opacity: 0.8,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  hero: {
    height: 140,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.brandTertiary,
    justifyContent: "flex-end",
  },
  heroImg: { ...StyleSheetAbsolute() },
  heroOverlay: {
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  heroText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  formCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.sm,
  },
  input: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
  },
  vanredniHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "700",
    color: colors.warning,
  },
  statusHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  spotsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  spot: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  spotActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  spotText: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  spotTextActive: { color: colors.onBrandPrimary },
  timeNote: {
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  actionBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  primaryBtn: {
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: colors.onBrandPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: { opacity: 0.75 },
}));

// helper to spread absolute fill without importing StyleSheet at module scope
function StyleSheetAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}
