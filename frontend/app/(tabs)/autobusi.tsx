import * as Haptics from "expo-haptics";
import { MagnifyingGlass, Plus, Trash, X } from "phosphor-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DateBar } from "@/src/components/DateBar";
import { useToast } from "@/src/components/Toast";
import {
  cekajuList,
  neDolazeList,
  stigliByTimeDesc,
  useData,
} from "@/src/data/DataContext";
import { Bus, Marka, Zapis } from "@/src/data/types";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Tab = "stigli" | "cekaju" | "nedolaze";

interface Row {
  bus: Bus;
  zapis?: Zapis;
}

export default function AutobusiScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { buses, dayRecords, clearStatus, addVanredni, removeBus } = useData();

  const [tab, setTab] = useState<Tab>("stigli");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newBroj, setNewBroj] = useState("");
  const [newMarka, setNewMarka] = useState<Marka>("Solaris");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const counts = useMemo(() => {
    const stigli = stigliByTimeDesc(buses, dayRecords).length;
    const nedolaze = neDolazeList(buses, dayRecords).length;
    const cekaju = cekajuList(buses, dayRecords).length;
    return { stigli, cekaju, nedolaze };
  }, [buses, dayRecords]);

  const rows: Row[] = useMemo(() => {
    let list: Row[];
    if (tab === "stigli") {
      list = stigliByTimeDesc(buses, dayRecords).map((x) => ({
        bus: x.bus,
        zapis: x.zapis,
      }));
    } else if (tab === "cekaju") {
      list = cekajuList(buses, dayRecords).map((bus) => ({ bus }));
    } else {
      list = neDolazeList(buses, dayRecords).map((bus) => ({
        bus,
        zapis: dayRecords[bus.broj],
      }));
    }
    const q = query.trim();
    if (q) list = list.filter((r) => r.bus.broj.includes(q));
    return list;
  }, [tab, buses, dayRecords, query]);

  const dotColor =
    tab === "stigli"
      ? colors.success
      : tab === "cekaju"
        ? colors.muted
        : colors.error;

  const handleAdd = () => {
    const t = newBroj.trim();
    if (!t) {
      toast.show("Unesi garažni broj", "error");
      return;
    }
    const ok = addVanredni(t, newMarka);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(`${newMarka} ${t} dodat u popis`, "success");
      setNewBroj("");
      setModalOpen(false);
    } else {
      toast.show(`Autobus ${t} već postoji`, "error");
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    removeBus(deleteTarget);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show(`Autobus ${deleteTarget} obrisan iz popisa`, "info");
    setDeleteTarget(null);
  };

  const renderRow = ({ item }: { item: Row }) => (
    <View style={styles.row} testID={`bus-row-${item.bus.broj}`}>
      <View style={[styles.rowDot, { backgroundColor: dotColor }]} />
      <View style={styles.rowMain}>
        <View style={styles.rowMainTop}>
          <Text style={styles.rowBroj}>{item.bus.broj}</Text>
          <View style={styles.markaBadge}>
            <Text style={styles.markaText}>{item.bus.marka}</Text>
          </View>
        </View>
        {item.zapis?.napomena ? (
          <Text style={styles.rowNote} numberOfLines={1}>
            📝 {item.zapis.napomena}
          </Text>
        ) : null}
      </View>
      {tab === "stigli" && item.zapis && (
        <Text style={styles.rowMeta}>
          {item.zapis.vreme} / mesto {item.zapis.mesto}
        </Text>
      )}
      {(tab === "stigli" || tab === "nedolaze") && (
        <Pressable
          testID={`revert-${item.bus.broj}`}
          onPress={() => {
            clearStatus(item.bus.broj);
            Haptics.selectionAsync();
            toast.show(`${item.bus.broj} vraćen na čekanje`, "info");
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.revertBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.revertText}>Vrati</Text>
        </Pressable>
      )}
      <Pressable
        testID={`delete-${item.bus.broj}`}
        onPress={() => setDeleteTarget(item.bus.broj)}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
      >
        <Trash size={18} color={colors.error} weight="bold" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Autobusi</Text>
        <DateBar />

        <View style={styles.segment}>
          {(
            [
              ["stigli", "Stigli", counts.stigli],
              ["cekaju", "Čekaju", counts.cekaju],
              ["nedolaze", "Ne dolaze", counts.nedolaze],
            ] as [Tab, string, number][]
          ).map(([key, label, count]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                testID={`seg-${key}`}
                onPress={() => {
                  setTab(key);
                  Haptics.selectionAsync();
                }}
                style={[styles.segItem, active && styles.segItemActive]}
              >
                <Text
                  style={[styles.segText, active && styles.segTextActive]}
                  numberOfLines={1}
                >
                  {label} {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchWrap}>
          <MagnifyingGlass size={18} color={colors.muted} weight="bold" />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Pretraži po broju…"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.bus.broj}
        renderItem={renderRow}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomChrome + 96 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty} testID="list-empty">
            <Text style={styles.emptyText}>
              Nema autobusa u ovoj kategoriji.
            </Text>
          </View>
        }
      />

      <Pressable
        testID="btn-dodaj-vanredno"
        onPress={() => setModalOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottomChrome + spacing.lg },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Plus size={20} color={colors.onBrandPrimary} weight="bold" />
        <Text style={styles.fabText}>Dodaj vanredno</Text>
      </Pressable>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="modal-vanredno">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dodaj vanredni autobus</Text>
              <Pressable
                testID="modal-close"
                onPress={() => setModalOpen(false)}
                hitSlop={8}
              >
                <X size={22} color={colors.onSurface} weight="bold" />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>
              Garažni broj koji nije na spisku. Biće u popisu kao i ostali.
            </Text>
            <Text style={styles.markaLabel}>Marka</Text>
            <View style={styles.markaSelectRow}>
              {(["Solaris", "BMC", "Minibus"] as Marka[]).map((m) => {
                const active = newMarka === m;
                return (
                  <Pressable
                    key={m}
                    testID={`marka-${m}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setNewMarka(m);
                    }}
                    style={[
                      styles.markaSelect,
                      active && styles.markaSelectActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.markaSelectText,
                        active && styles.markaSelectTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              testID="modal-input"
              style={styles.modalInput}
              value={newBroj}
              onChangeText={setNewBroj}
              placeholder="npr. 3200"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              autoFocus
              maxLength={8}
            />
            <Pressable
              testID="modal-add"
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.modalBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.modalBtnText}>Dodaj u popis</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="delete-modal">
            <Text style={styles.modalTitle}>Obrisati iz popisa?</Text>
            <Text style={styles.modalHint}>
              Autobus {deleteTarget} će biti uklonjen iz popisa. Ovo ne briše
              istoriju evidencije.
            </Text>
            <View style={styles.deleteActions}>
              <Pressable
                testID="delete-cancel"
                onPress={() => setDeleteTarget(null)}
                style={({ pressed }) => [
                  styles.deleteCancel,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.deleteCancelText}>Otkaži</Text>
              </Pressable>
              <Pressable
                testID="delete-confirm"
                onPress={confirmDelete}
                style={({ pressed }) => [
                  styles.deleteConfirm,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.deleteConfirmText}>Obriši</Text>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segItem: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segItemActive: { backgroundColor: colors.surfaceSecondary },
  segText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  segTextActive: { color: colors.brandPrimary },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.onSurface,
  },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDot: { width: 12, height: 12, borderRadius: 999 },
  rowMain: { flex: 1, gap: 4 },
  rowMainTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowBroj: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  rowNote: { fontSize: 12, fontWeight: "600", color: colors.muted },
  markaBadge: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  markaText: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceTertiary },
  rowMeta: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  revertBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  revertText: { fontSize: 12, fontWeight: "800", color: colors.onSurfaceTertiary },
  empty: { paddingTop: spacing["3xl"], alignItems: "center" },
  emptyText: { fontSize: 15, color: colors.muted, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  modalHint: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  modalInput: {
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
  modalBtn: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
  markaLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
    marginTop: spacing.xs,
  },
  markaSelectRow: { flexDirection: "row", gap: spacing.sm },
  markaSelect: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  markaSelectActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  markaSelectText: { fontSize: 14, fontWeight: "800", color: colors.onSurfaceTertiary },
  markaSelectTextActive: { color: colors.onBrandPrimary },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  deleteActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  deleteCancel: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCancelText: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  deleteConfirm: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmText: { fontSize: 15, fontWeight: "800", color: colors.onError },
}));
