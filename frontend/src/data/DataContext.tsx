import dayjs from "dayjs";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { storage } from "@/src/utils/storage";

import { SEED_BUSES } from "./seed";
import { Bus, RecordsByDate, Status, Zapis } from "./types";

const BUSES_KEY = "pumpa_buses_v1";
const RECORDS_KEY = "pumpa_records_v1";

export function todayKey(): string {
  return dayjs().format("YYYY-MM-DD");
}

export interface DayStats {
  ukupno: number;
  stiglo: number;
  cekaSe: number;
  neDolazi: number;
}

interface DataCtxValue {
  ready: boolean;
  buses: Bus[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  records: RecordsByDate;
  dayRecords: Record<string, Zapis>;
  stats: DayStats;
  addVanredni: (broj: string) => boolean; // false if already exists
  setStatus: (broj: string, status: Status, mesto?: number | null) => void;
  clearStatus: (broj: string) => void;
  resetDate: () => void;
  hasBus: (broj: string) => boolean;
}

const DataContext = createContext<DataCtxValue | null>(null);

async function loadBuses(): Promise<Bus[]> {
  const raw = await storage.getItem(BUSES_KEY, "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Bus[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // ignore, fall through to seed
    }
  }
  return SEED_BUSES;
}

async function loadRecords(): Promise<RecordsByDate> {
  const raw = await storage.getItem(RECORDS_KEY, "");
  if (raw) {
    try {
      return JSON.parse(raw) as RecordsByDate;
    } catch {
      return {};
    }
  }
  return {};
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [records, setRecords] = useState<RecordsByDate>({});
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());

  useEffect(() => {
    (async () => {
      const [b, r] = await Promise.all([loadBuses(), loadRecords()]);
      setBuses(b);
      setRecords(r);
      setReady(true);
    })();
  }, []);

  // Persist whenever data changes (after initial load).
  useEffect(() => {
    if (!ready) return;
    storage.setItem(BUSES_KEY, JSON.stringify(buses));
  }, [buses, ready]);

  useEffect(() => {
    if (!ready) return;
    storage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [records, ready]);

  const hasBus = useCallback(
    (broj: string) => buses.some((x) => x.broj === broj),
    [buses],
  );

  const addVanredni = useCallback(
    (broj: string) => {
      const trimmed = broj.trim();
      if (!trimmed) return false;
      if (buses.some((x) => x.broj === trimmed)) return false;
      setBuses((prev) => [...prev, { broj: trimmed, marka: "Vanredno" }]);
      return true;
    },
    [buses],
  );

  const setStatus = useCallback(
    (broj: string, status: Status, mesto: number | null = null) => {
      const trimmed = broj.trim();
      if (!trimmed) return;
      // auto-add unlisted buses so they are tracked like the rest
      setBuses((prev) =>
        prev.some((x) => x.broj === trimmed)
          ? prev
          : [...prev, { broj: trimmed, marka: "Vanredno" }],
      );
      const zapis: Zapis = {
        broj: trimmed,
        status,
        vreme: status === "stigao" ? dayjs().format("HH:mm") : null,
        mesto: status === "stigao" ? mesto : null,
        ts: Date.now(),
      };
      setRecords((prev) => {
        const day = { ...(prev[selectedDate] ?? {}) };
        day[trimmed] = zapis;
        return { ...prev, [selectedDate]: day };
      });
    },
    [selectedDate],
  );

  const clearStatus = useCallback(
    (broj: string) => {
      setRecords((prev) => {
        const day = { ...(prev[selectedDate] ?? {}) };
        delete day[broj];
        return { ...prev, [selectedDate]: day };
      });
    },
    [selectedDate],
  );

  const resetDate = useCallback(() => {
    setRecords((prev) => ({ ...prev, [selectedDate]: {} }));
  }, [selectedDate]);

  const dayRecords = useMemo(
    () => records[selectedDate] ?? {},
    [records, selectedDate],
  );

  const stats = useMemo<DayStats>(() => {
    const values = Object.values(dayRecords);
    const stiglo = values.filter((z) => z.status === "stigao").length;
    const neDolazi = values.filter((z) => z.status === "ne_dolazi").length;
    const ukupno = buses.length;
    return {
      ukupno,
      stiglo,
      neDolazi,
      cekaSe: Math.max(ukupno - stiglo - neDolazi, 0),
    };
  }, [dayRecords, buses]);

  const value: DataCtxValue = {
    ready,
    buses,
    selectedDate,
    setSelectedDate,
    records,
    dayRecords,
    stats,
    addVanredni,
    setStatus,
    clearStatus,
    resetDate,
    hasBus,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataCtxValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// Selectors -----------------------------------------------------------------

export function stigliByTimeDesc(
  buses: Bus[],
  day: Record<string, Zapis>,
): { bus: Bus; zapis: Zapis }[] {
  return Object.values(day)
    .filter((z) => z.status === "stigao")
    .sort((a, b) => b.ts - a.ts)
    .map((z) => ({
      bus: buses.find((x) => x.broj === z.broj) ?? {
        broj: z.broj,
        marka: "Vanredno" as const,
      },
      zapis: z,
    }));
}

export function neDolazeList(
  buses: Bus[],
  day: Record<string, Zapis>,
): Bus[] {
  return buses.filter((b) => day[b.broj]?.status === "ne_dolazi");
}

export function cekajuList(buses: Bus[], day: Record<string, Zapis>): Bus[] {
  return buses.filter((b) => !day[b.broj]);
}
