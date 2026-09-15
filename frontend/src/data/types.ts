export type Marka = "Solaris" | "BMC" | "Vanredno";

export type Status = "stigao" | "ne_dolazi";

export interface Bus {
  broj: string;
  marka: Marka;
}

// One record for a bus on a given day.
export interface Zapis {
  broj: string;
  status: Status;
  vreme: string | null; // "HH:mm" — only for status "stigao"
  mesto: number | null; // pump spot 1-8 — only for "stigao"
  napomena: string | null; // optional short note (e.g. "kasnio", "kvar")
  ts: number; // epoch millis for ordering
}

// datum ("YYYY-MM-DD") -> broj -> Zapis
export type RecordsByDate = Record<string, Record<string, Zapis>>;
