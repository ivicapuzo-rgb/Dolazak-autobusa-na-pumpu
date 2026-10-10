import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ArrowClockwise,
  CalendarBlank,
  ChartBar,
  ClockCounterClockwise,
  DownloadSimple,
  Lock,
  LockOpen,
  MagnifyingGlass,
  ShareNetwork,
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
  busHistory,
  busiestDays,
  cekajuList,
  dailyArrivalSeries,
  datesWithRecords,
  dayCounts,
  neDolazeList,
  spotCounts,
  stigliByTimeDesc,
  useData,
  weeklyTotals,
} from "@/src/data/DataContext";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useUpdate } from "@/src/update/UpdateContext";
import {
  saveBusHistoryPdf,
  savePeriodPdf,
  saveReportPdf,
  saveWeeklyPdf,
  shareBusHistoryPdf,
  sharePeriodPdf,
  shareReportPdf,
  shareWeeklyPdf,
} from "@/src/utils/pdf";

const ADMIN_PASS = "puzopb";

export default function IzvestajScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { buses, dayRecords, selectedDate, setSelectedDate, records, stats, resetDate } =
    useData();
  const { currentVersion, checking, checkForUpdate } = useUpdate();

  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [exporting, setExporting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [exportingPeriod, setExportingPeriod] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busQuery, setBusQuery] = useState("");
  const [busSubmitted, setBusSubmitted] = useState("");
  const [busPdfBusy, setBusPdfBusy] = useState(false);
  const [weeklyBusy, setWeeklyBusy] = useState(false);
  const BUS_DAYS = 7;

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
  const weeks = useMemo(() => weeklyTotals(records), [records]);
  const topDays = useMemo(() => busiestDays(records, 5), [records]);
  const series = useMemo(() => dailyArrivalSeries(records, 14), [records]);
  const seriesMax = useMemo(
    () => Math.max(1, ...series.map((s) => s.stiglo)),
    [series],
  );
  const busHist = useMemo(
    () => (busSubmitted ? busHistory(records, busSubmitted, BUS_DAYS) : []),
    [records, busSubmitted],
  );
  const busStiglo = useMemo(
    () => busHist.filter((h) => h.zapis.status === "stigao").length,
    [busHist],
  );

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

  const handleShareDaily = async () => {
    if (Platform.OS === "web") {
      toast.show("Deljenje je dostupno na telefonu", "info");
      return;
    }
    try {
      setSharing(true);
      await shareReportPdf(selectedDate, buses, dayRecords);
    } catch {
      toast.show("Greška pri deljenju", "error");
    } finally {
      setSharing(false);
    }
  };

  const handleSharePeriod = async () => {
    if (Platform.OS === "web") {
      toast.show("Deljenje je dostupno na telefonu", "info");
      return;
    }
    if (dayjs(fromDate).isAfter(dayjs(toDate))) {
      toast.show("Datum 'Od' je posle datuma 'Do'", "error");
      return;
    }
    try {
      setExportingPeriod(true);
      await sharePeriodPdf(fromDate, toDate, buses, records);
    } catch {
      toast.show("Greška pri deljenju", "error");
    } finally {
      setExportingPeriod(false);
    }
  };

  const handleBusShow = () => {
    const t = busQuery.trim();
    setBusSubmitted(t);
    Haptics.selectionAsync();
    if (t && busHistory(records, t, BUS_DAYS).length === 0) {
      toast.show("Nema dolazaka za ovaj autobus (7 dana)", "info");
    }
  };

  const handleBusPdf = async (share: boolean) => {
    if (!busSubmitted) {
      toast.show("Prvo unesi broj autobusa", "error");
      return;
    }
    if (Platform.OS === "web") {
      toast.show("PDF je dostupan na telefonu", "info");
      return;
    }
    try {
      setBusPdfBusy(true);
      const res = share
        ? await shareBusHistoryPdf(busSubmitted, busHist, BUS_DAYS)
        : await saveBusHistoryPdf(busSubmitted, busHist, BUS_DAYS);
      if (res.status === "saved")
        toast.show(`Sačuvano: ${res.name}`, "success");
    } catch {
      toast.show("Greška pri izradi PDF-a", "error");
    } finally {
      setBusPdfBusy(false);
    }
  };

  const handleWeeklyPdf = async (share: boolean) => {
    if (Platform.OS === "web") {
      toast.show("PDF je dostupan na telefonu", "info");
      return;
    }
    try {
      setWeeklyBusy(true);
      const res = share
        ? await shareWeeklyPdf(weeks, topDays, series)
        : await saveWeeklyPdf(weeks, topDays, series);
      if (res.status === "saved")
        toast.show(`Sačuvano: ${res.name}`, "success");
    } catch {
      toast.show("Greška pri izradi PDF-a", "error");
    } finally {
      setWeeklyBusy(false);
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
                  {zapis.napomena ? ` • ${zapis.napomena}` : ""}
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
          <View style={styles.sectionHeadRow}>
            <ChartBar size={18} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.sectionTitle}>Nedeljni pregled</Text>
          </View>
          {weeks.length === 0 ? (
            <Text style={styles.emptyText}>Nema podataka po nedeljama.</Text>
          ) : (
            <>
              {weeks.slice(0, 6).map((w) => (
                <View
                  key={w.weekStart}
                  style={styles.weekRow}
                  testID={`week-${w.weekStart}`}
                >
                  <Text style={styles.weekLabel}>
                    {dayjs(w.weekStart).format("DD.MM.")} –{" "}
                    {dayjs(w.weekEnd).format("DD.MM.")}
                  </Text>
                  <View style={styles.weekCounts}>
                    <Text style={[styles.weekC, { color: colors.success }]}>
                      {w.stiglo} sipalo
                    </Text>
                    <Text style={[styles.weekC, { color: colors.error }]}>
                      {w.neDolazi} ne
                    </Text>
                  </View>
                </View>
              ))}
              {topDays.length > 0 && (
                <View style={styles.topDaysWrap}>
                  <Text style={styles.topDaysTitle}>Najprometniji dani</Text>
                  {topDays.map((d, i) => (
                    <View key={d.datum} style={styles.topDayRow}>
                      <Text style={styles.topDayRank}>{i + 1}.</Text>
                      <Text style={styles.topDayDate}>
                        {dayjs(d.datum).format("DD.MM.YYYY.")}
                      </Text>
                      <Text style={styles.topDayVal}>{d.stiglo} sipalo</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {weeks.length > 0 && (
          <View style={styles.pdfRow}>
            <Pressable
              testID="btn-weekly-pdf"
              onPress={() => handleWeeklyPdf(false)}
              disabled={weeklyBusy}
              style={({ pressed }) => [
                styles.pdfBtn,
                { flex: 1 },
                (pressed || weeklyBusy) && { opacity: 0.7 },
              ]}
            >
              <DownloadSimple
                size={20}
                color={colors.onBrandPrimary}
                weight="bold"
              />
              <Text style={styles.pdfText}>Nedeljni PDF</Text>
            </Pressable>
            <Pressable
              testID="btn-weekly-share"
              onPress={() => handleWeeklyPdf(true)}
              disabled={weeklyBusy}
              style={({ pressed }) => [
                styles.shareBtn,
                (pressed || weeklyBusy) && { opacity: 0.7 },
              ]}
            >
              <ShareNetwork size={20} color={colors.brandPrimary} weight="bold" />
              <Text style={styles.shareBtnText}>Podeli</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <ChartBar size={18} color={colors.brandPrimary} weight="fill" />
            <Text style={styles.sectionTitle}>
              Grafikon po danima (14 dana)
            </Text>
          </View>
          {series.every((s) => s.stiglo === 0) ? (
            <Text style={styles.emptyText}>
              Još nema sipanja u poslednjih 14 dana.
            </Text>
          ) : (
            <View style={styles.chartArea} testID="daily-chart">
              {series.map((s) => {
                const h = 8 + Math.round((s.stiglo / seriesMax) * 96);
                const isTop = s.stiglo === seriesMax && s.stiglo > 0;
                const isToday = s.datum === dayjs().format("YYYY-MM-DD");
                return (
                  <View key={s.datum} style={styles.chartCol}>
                    <Text style={styles.chartVal}>
                      {s.stiglo > 0 ? s.stiglo : ""}
                    </Text>
                    <View
                      style={[
                        styles.chartBar,
                        { height: h },
                        isTop && styles.chartBarTop,
                      ]}
                    />
                    <Text
                      style={[styles.chartLabel, isToday && styles.chartLabelToday]}
                    >
                      {dayjs(s.datum).format("DD")}
                    </Text>
                  </View>
                );
              })}
            </View>
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

        <View style={styles.pdfRow}>
          <Pressable
            testID="btn-export-pdf"
            onPress={handleExport}
            disabled={exporting}
            style={({ pressed }) => [
              styles.pdfBtn,
              { flex: 1 },
              (pressed || exporting) && { opacity: 0.7 },
            ]}
          >
            <DownloadSimple
              size={20}
              color={colors.onBrandPrimary}
              weight="bold"
            />
            <Text style={styles.pdfText}>
              {exporting ? "Priprema…" : "Sačuvaj PDF"}
            </Text>
          </Pressable>
          <Pressable
            testID="btn-share-pdf"
            onPress={handleShareDaily}
            disabled={sharing}
            style={({ pressed }) => [
              styles.shareBtn,
              (pressed || sharing) && { opacity: 0.7 },
            ]}
          >
            <ShareNetwork size={20} color={colors.brandPrimary} weight="bold" />
            <Text style={styles.shareBtnText}>Podeli</Text>
          </Pressable>
        </View>

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
          <View style={styles.pdfRow}>
            <Pressable
              testID="btn-export-period"
              onPress={handlePeriodExport}
              disabled={exportingPeriod}
              style={({ pressed }) => [
                styles.periodBtn,
                { flex: 1 },
                (pressed || exportingPeriod) && { opacity: 0.7 },
              ]}
            >
              <DownloadSimple
                size={18}
                color={colors.onBrandPrimary}
                weight="bold"
              />
              <Text style={styles.periodBtnText}>
                {exportingPeriod ? "Priprema…" : "Sačuvaj period"}
              </Text>
            </Pressable>
            <Pressable
              testID="btn-share-period"
              onPress={handleSharePeriod}
              disabled={exportingPeriod}
              style={({ pressed }) => [
                styles.sharePeriodBtn,
                (pressed || exportingPeriod) && { opacity: 0.7 },
              ]}
            >
              <ShareNetwork size={18} color={colors.brandPrimary} weight="bold" />
              <Text style={styles.shareBtnText}>Podeli</Text>
            </Pressable>
          </View>
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

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <MagnifyingGlass size={18} color={colors.brandPrimary} weight="bold" />
            <Text style={styles.sectionTitle}>Pregled po autobusu (7 dana)</Text>
          </View>
          <View style={styles.busLookupRow}>
            <TextInput
              testID="bus-lookup-input"
              style={styles.busLookupInput}
              value={busQuery}
              onChangeText={setBusQuery}
              placeholder="Broj autobusa"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              onSubmitEditing={handleBusShow}
              returnKeyType="search"
              maxLength={8}
            />
            <Pressable
              testID="bus-lookup-show"
              onPress={handleBusShow}
              style={({ pressed }) => [
                styles.busShowBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.busShowText}>Prikaži</Text>
            </Pressable>
          </View>

          {busSubmitted !== "" && (
            <>
              <Text style={styles.busSummary} testID="bus-summary">
                Autobus {busSubmitted}: {busStiglo} dolazaka u 7 dana
              </Text>
              {busHist.length === 0 ? (
                <Text style={styles.emptyText}>
                  Nema evidencije u poslednjih 7 dana.
                </Text>
              ) : (
                busHist.map((h) => (
                  <View
                    key={h.datum}
                    style={styles.busHistRow}
                    testID={`bus-hist-${h.datum}`}
                  >
                    <Text style={styles.busHistDate}>
                      {dayjs(h.datum).format("DD.MM.")}
                    </Text>
                    {h.zapis.status === "stigao" ? (
                      <Text style={styles.busHistMeta}>
                        {h.zapis.vreme} / mesto {h.zapis.mesto}
                        {h.zapis.napomena ? ` • ${h.zapis.napomena}` : ""}
                      </Text>
                    ) : (
                      <Text style={[styles.busHistMeta, { color: colors.error }]}>
                        Ne dolazi
                        {h.zapis.napomena ? ` • ${h.zapis.napomena}` : ""}
                      </Text>
                    )}
                  </View>
                ))
              )}
              {busHist.length > 0 && (
                <View style={[styles.pdfRow, { marginTop: spacing.md }]}>
                  <Pressable
                    testID="bus-save-pdf"
                    onPress={() => handleBusPdf(false)}
                    disabled={busPdfBusy}
                    style={({ pressed }) => [
                      styles.periodBtn,
                      { flex: 1, marginTop: 0 },
                      (pressed || busPdfBusy) && { opacity: 0.7 },
                    ]}
                  >
                    <DownloadSimple
                      size={18}
                      color={colors.onBrandPrimary}
                      weight="bold"
                    />
                    <Text style={styles.periodBtnText}>Izdaj PDF</Text>
                  </Pressable>
                  <Pressable
                    testID="bus-share-pdf"
                    onPress={() => handleBusPdf(true)}
                    disabled={busPdfBusy}
                    style={({ pressed }) => [
                      styles.sharePeriodBtn,
                      (pressed || busPdfBusy) && { opacity: 0.7 },
                    ]}
                  >
                    <ShareNetwork
                      size={18}
                      color={colors.brandPrimary}
                      weight="bold"
                    />
                    <Text style={styles.shareBtnText}>Podeli</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <ArrowClockwise size={18} color={colors.brandPrimary} weight="bold" />
            <Text style={styles.sectionTitle}>Ažuriranje aplikacije</Text>
          </View>
          <Text style={styles.emptyText}>
            Trenutna verzija: v{currentVersion}. Aplikacija sama proverava nove
            verzije na GitHub-u.
          </Text>
          <Pressable
            testID="btn-check-update"
            onPress={() => checkForUpdate(true)}
            disabled={checking}
            style={({ pressed }) => [
              styles.periodBtn,
              (pressed || checking) && { opacity: 0.7 },
            ]}
          >
            <ArrowClockwise
              size={18}
              color={colors.onBrandPrimary}
              weight="bold"
            />
            <Text style={styles.periodBtnText}>
              {checking ? "Proveravam…" : "Proveri ažuriranje"}
            </Text>
          </Pressable>
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
  pdfRow: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  shareBtn: {
    height: 58,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  sharePeriodBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  shareBtnText: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800" },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  weekLabel: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  weekCounts: { flexDirection: "row", gap: spacing.md },
  weekC: { fontSize: 13, fontWeight: "800" },
  topDaysWrap: { marginTop: spacing.md },
  topDaysTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topDayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 5,
  },
  topDayRank: { width: 22, fontSize: 14, fontWeight: "800", color: colors.brandPrimary },
  topDayDate: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.onSurface },
  topDayVal: { fontSize: 13, fontWeight: "800", color: colors.success },
  busLookupRow: { flexDirection: "row", gap: spacing.sm },
  busLookupInput: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
  },
  busShowBtn: {
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  busShowText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  busSummary: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.brandPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  busHistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  busHistDate: { width: 60, fontSize: 15, fontWeight: "800", color: colors.onSurface },
  busHistMeta: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.onSurfaceTertiary },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 150,
    paddingTop: spacing.sm,
  },
  chartCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  chartVal: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    marginBottom: 2,
    height: 14,
  },
  chartBar: {
    width: 14,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.brandSecondary,
  },
  chartBarTop: { backgroundColor: colors.brandPrimary },
  chartLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    marginTop: 4,
  },
  chartLabelToday: { color: colors.brandPrimary, fontWeight: "800" },
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
