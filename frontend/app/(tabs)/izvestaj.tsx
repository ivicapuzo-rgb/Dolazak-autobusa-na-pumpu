import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  CalendarBlank,
  ChartBar,
  ClockCounterClockwise,
  DownloadSimple,
  Lock,
  LockOpen,
  Trash,
} from "phosphor-react-native";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateBar } from "@/src/components/DateBar";
import { StatCard } from "@/src/components/StatCard";
import { useToast } from "@/src/components/Toast";
import {
  cekajuList,
  datesWithRecords,
  dayCounts,
  neDolazeList,
  spotCounts,
  stigliByTimeDesc,
  useData,
} from "@/src/data/DataContext";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { savePeriodPdf, saveReportPdf } from "@/src/utils/pdf";

const ADMIN_PASS = "puzopb";

export default function IzvestajScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { buses, dayRecords, selectedDate, setSelectedDate, records, stats, resetDate } =
    useData();

  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [exporting, setExporting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [exportingPeriod, setExportingPeriod] = useState(false);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const stigli = useMemo(
    () => stigliByTimeDesc(buses, dayRecords),
    [buses, dayRecords],
  );
  const cekaju = useMemo(() => cekajuList(buses, dayRecords), [buses, dayRecords]);
  const neDolaze = useMemo(
    () => neDolazeList(buses, dayRecords),
    [buses, dayRecords],
  );
  const spots = useMemo(() => spotCounts(dayRecords), [dayRecords]);
  const spotMax = useMemo(() => Math.max(1, ...spots.slice(1)), [spots]);
  const history = useMemo(() => datesWithRecords(records), [records]);

  const tryUnlock = () => {
    if (pass === ADMIN_PASS) {
      setUnlocked(true);
      setPass("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show("Pogrešna lozinka", "error");
      setPass("");
    }
  };

  const handleExport = async () => {
    if (Platform.OS === "web") {
      toast.show("PDF izvoz je dostupan na telefonu", "info");
      return;
    }
    try {
      setExporting(true);
      const res = await saveReportPdf(selectedDate, buses, dayRecords);
      if (res.status === "saved")
        toast.show(`Sačuvano u Preuzimanja: ${res.name}`, "success");
      else if (res.status === "shared")
        toast.show("PDF spreman za čuvanje", "success");
      else toast.show("Čuvanje otkazano", "info");
    } catch {
      toast.show("Greška pri izradi PDF-a", "error");
    } finally {
      setExporting(false);
    }
  };

  const handlePeriodExport = async () => {
    if (Platform.OS === "web") {
      toast.show("PDF izvoz je dostupan na telefonu", "info");
      return;
    }
    if (dayjs(fromDate).isAfter(dayjs(toDate))) {
      toast.show("Datum 'Od' je posle datuma 'Do'", "error");
      return;
    }
    try {
      setExportingPeriod(true);
      const res = await savePeriodPdf(fromDate, toDate, buses, records);
      if (res.status === "saved")
        toast.show(`Sačuvano u Preuzimanja: ${res.name}`, "success");
      else if (res.status === "shared")
        toast.show("PDF za period spreman", "success");
      else toast.show("Čuvanje otkazano", "info");
    } catch {
      toast.show("Greška pri izradi PDF-a", "error");
    } finally {
      setExportingPeriod(false);
    }
  };

  if (!unlocked) {
    return (
      <View style={[styles.root, styles.lockWrap]}>
        <View style={styles.lockIcon}>
          <Lock size={40} color={colors.brandPrimary} weight="fill" />
        </View>
        <Text style={styles.lockTitle}>Admin panel</Text>
        <Text style={styles.lockSub}>Unesi lozinku za pristup izveštaju.</Text>
        <TextInput
          testID="admin-pass-input"
          style={styles.passInput}
          value={pass}
          onChangeText={setPass}
          placeholder="Lozinka"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={tryUnlock}
          returnKeyType="go"
        />
        <Pressable
          testID="admin-unlock-btn"
          onPress={tryUnlock}
          style={({ pressed }) => [styles.unlockBtn, pressed && { opacity: 0.8 }]}
        >
          <LockOpen size={20} color={colors.onBrandPrimary} weight="bold" />
          <Text style={styles.unlockText}>Otključaj</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Izveštaj</Text>
          <Pressable
            testID="admin-lock-btn"
            onPress={() => setUnlocked(false)}
            hitSlop={8}
            style={styles.lockBtn}
          >
            <Lock size={16} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.lockBtnText}>Zaključaj</Text>
          </Pressable>
        </View>
        <DateBar />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomChrome + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <StatCard label="STIGLO" value={stats.stiglo} color={colors.success} />
          <StatCard label="ČEKA SE" value={stats.cekaSe} color={colors.muted} />
          <StatCard
            label="NE DOLAZI"
            value={stats.neDolazi}
            color={colors.error}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Stigli — redom po vremenu ({stigli.length})
          </Text>
          {stigli.length === 0 ? (
            <Text style={styles.emptyText}>Nijedan autobus još nije stigao.</Text>
          ) : (
            stigli.map(({ bus, zapis }, i) => (
              <View key={bus.broj} style={styles.repRow} testID={`rep-${bus.broj}`}>
                <Text style={styles.repIdx}>{i + 1}.</Text>
                <Text style={styles.repBroj}>{bus.broj}</Text>
                <Text style={styles.repMeta}>
                  {zapis.vreme} / mesto {zapis.mesto}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <ChartBar size={18} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.sectionTitle}>Statistika mesta sipanja</Text>
          </View>
          {stats.stiglo === 0 ? (
            <Text style={styles.emptyText}>Još nema sipanja za ovaj dan.</Text>
          ) : (
            [1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
              const c = spots[s];
              const w = Math.round((c / spotMax) * 100);
              const isTop = c === spotMax && c > 0;
              return (
                <View key={s} style={styles.barRow} testID={`spot-stat-${s}`}>
                  <Text style={styles.barLabel}>Mesto {s}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${w}%` },
                        isTop && styles.barFillTop,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barVal, isTop && styles.barValTop]}>
                    {c}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Koji fale — čekaju ({cekaju.length})
          </Text>
          {cekaju.length === 0 ? (
            <Text style={styles.emptyText}>Svi su evidentirani.</Text>
          ) : (
            <View style={styles.chipsWrap}>
              {cekaju.slice(0, 120).map((b) => (
                <View key={b.broj} style={styles.chip}>
                  <Text style={styles.chipText}>{b.broj}</Text>
                </View>
              ))}
              {cekaju.length > 120 && (
                <Text style={styles.emptyText}>+{cekaju.length - 120} još…</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ne dolaze — isključeni ({neDolaze.length})
          </Text>
          {neDolaze.length === 0 ? (
            <Text style={styles.emptyText}>Nema isključenih.</Text>
          ) : (
            <View style={styles.chipsWrap}>
              {neDolaze.map((b) => (
                <View key={b.broj} style={[styles.chip, styles.chipRed]}>
                  <Text style={[styles.chipText, styles.chipTextRed]}>
                    {b.broj}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          testID="btn-export-pdf"
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [
            styles.pdfBtn,
            (pressed || exporting) && { opacity: 0.7 },
          ]}
        >
          <DownloadSimple size={22} color={colors.onBrandPrimary} weight="bold" />
          <Text style={styles.pdfText}>
            {exporting ? "Priprema…" : "Izvezi PDF (A4)"}
          </Text>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <CalendarBlank size={18} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.sectionTitle}>Izvezi izveštaj za period</Text>
          </View>
          <View style={styles.periodRow}>
            <Pressable
              testID="period-from"
              onPress={() => setShowFrom(true)}
              style={styles.periodField}
            >
              <Text style={styles.periodLabel}>Od</Text>
              <Text style={styles.periodValue}>
                {dayjs(fromDate).format("DD.MM.YYYY.")}
              </Text>
            </Pressable>
            <Pressable
              testID="period-to"
              onPress={() => setShowTo(true)}
              style={styles.periodField}
            >
              <Text style={styles.periodLabel}>Do</Text>
              <Text style={styles.periodValue}>
                {dayjs(toDate).format("DD.MM.YYYY.")}
              </Text>
            </Pressable>
          </View>
          <Pressable
            testID="btn-export-period"
            onPress={handlePeriodExport}
            disabled={exportingPeriod}
            style={({ pressed }) => [
              styles.periodBtn,
              (pressed || exportingPeriod) && { opacity: 0.7 },
            ]}
          >
            <DownloadSimple size={18} color={colors.onBrandPrimary} weight="bold" />
            <Text style={styles.periodBtnText}>
              {exportingPeriod ? "Priprema…" : "Izvezi period (PDF)"}
            </Text>
          </Pressable>
          {showFrom && (
            <DateTimePicker
              value={new Date(fromDate)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(e, d) => {
                setShowFrom(Platform.OS === "ios");
                if (e.type === "set" && d) {
                  setFromDate(dayjs(d).format("YYYY-MM-DD"));
                  if (Platform.OS === "ios") setShowFrom(false);
                }
              }}
            />
          )}
          {showTo && (
            <DateTimePicker
              value={new Date(toDate)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(e, d) => {
                setShowTo(Platform.OS === "ios");
                if (e.type === "set" && d) {
                  setToDate(dayjs(d).format("YYYY-MM-DD"));
                  if (Platform.OS === "ios") setShowTo(false);
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <ClockCounterClockwise
              size={18}
              color={colors.brandPrimary}
              weight="fill"
            />
            <Text style={styles.sectionTitle}>Istorija po danima</Text>
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Nema zabeleženih dana.</Text>
          ) : (
            history.map((d) => {
              const c = dayCounts(buses, records[d]);
              const active = d === selectedDate;
              return (
                <Pressable
                  key={d}
                  testID={`hist-${d}`}
                  onPress={() => {
                    setSelectedDate(d);
                    Haptics.selectionAsync();
                    toast.show(
                      `Prikazan dan ${dayjs(d).format("DD.MM.YYYY.")}`,
                      "info",
                    );
                  }}
                  style={[styles.histRow, active && styles.histRowActive]}
                >
                  <Text style={styles.histDate}>
                    {dayjs(d).format("DD.MM.YYYY.")}
                    {d === dayjs().format("YYYY-MM-DD") ? "  •  danas" : ""}
                  </Text>
                  <View style={styles.histCounts}>
                    <Text style={[styles.histC, { color: colors.success }]}>
                      {c.stiglo}
                    </Text>
                    <Text style={[styles.histC, { color: colors.muted }]}>
                      {c.cekaSe}
                    </Text>
                    <Text style={[styles.histC, { color: colors.error }]}>
                      {c.neDolazi}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <Pressable
          testID="btn-reset"
          onPress={() => setResetOpen(true)}
          style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
        >
          <Trash size={18} color={colors.error} weight="bold" />
          <Text style={styles.resetText}>Reset evidencije za ovaj dan</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={resetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setResetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="reset-modal">
            <Text style={styles.modalTitle}>Reset dana?</Text>
            <Text style={styles.modalHint}>
              Briše sve evidencije za{" "}
              {dayjs(selectedDate).format("DD.MM.YYYY.")}. Popis autobusa ostaje.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                testID="reset-cancel"
                onPress={() => setResetOpen(false)}
                style={({ pressed }) => [
                  styles.modalCancel,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalCancelText}>Otkaži</Text>
              </Pressable>
              <Pressable
                testID="reset-confirm"
                onPress={() => {
                  resetDate();
                  setResetOpen(false);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  toast.show("Evidencija za dan obrisana", "info");
                }}
                style={({ pressed }) => [
                  styles.modalConfirm,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalConfirmText}>Resetuj</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  lockWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  lockIcon: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  lockTitle: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  lockSub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  passInput: {
    width: "100%",
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  unlockBtn: {
    width: "100%",
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  unlockText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  lockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  lockBtnText: { fontSize: 13, fontWeight: "800", color: colors.brandPrimary },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  section: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 5,
  },
  barLabel: { width: 66, fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  barTrack: {
    flex: 1,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  barFill: {
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary,
  },
  barFillTop: { backgroundColor: colors.brandPrimary },
  barVal: { width: 26, textAlign: "right", fontSize: 13, fontWeight: "700", color: colors.muted },
  barValTop: { color: colors.brandPrimary },
  periodRow: { flexDirection: "row", gap: spacing.sm },
  periodField: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  periodLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5 },
  periodValue: { fontSize: 16, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  periodBtn: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  periodBtnText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  histRowActive: { borderColor: colors.brandPrimary, borderWidth: 2 },
  histDate: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  histCounts: { flexDirection: "row", gap: spacing.md },
  histC: { fontSize: 16, fontWeight: "800", minWidth: 22, textAlign: "right" },
  repRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  repIdx: { fontSize: 13, fontWeight: "700", color: colors.muted, width: 28 },
  repBroj: { fontSize: 18, fontWeight: "800", color: colors.onSurface, flex: 1 },
  repMeta: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipRed: { borderColor: colors.error },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  chipTextRed: { color: colors.error },
  pdfBtn: {
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  pdfText: { color: colors.onBrandPrimary, fontSize: 17, fontWeight: "800" },
  resetBtn: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  resetText: { color: colors.error, fontSize: 15, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  modalHint: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  modalCancel: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  modalConfirm: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: { fontSize: 15, fontWeight: "800", color: colors.onError },
}));
