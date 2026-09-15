import dayjs from "dayjs";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import {
  cekajuList,
  neDolazeList,
  spotCounts,
  stigliByTimeDesc,
} from "@/src/data/DataContext";
import { Bus, RecordsByDate, Zapis } from "@/src/data/types";
import { storage } from "@/src/utils/storage";

const SAF_KEY = "saf_dir_uri";

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

function spotStatsHtml(day: Record<string, Zapis>): string {
  const counts = spotCounts(day); // index 1..8
  const max = Math.max(1, ...counts.slice(1));
  const bars = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((s) => {
      const c = counts[s];
      const w = Math.round((c / max) * 100);
      return `<div class="barrow"><span class="barlabel">Mesto ${s}</span><span class="bartrack"><span class="barfill" style="width:${w}%"></span></span><span class="barval">${c}</span></div>`;
    })
    .join("");
  return bars;
}

function dayReportBody(
  datum: string,
  buses: Bus[],
  day: Record<string, Zapis>,
): string {
  const stigli = stigliByTimeDesc(buses, day);
  const cekaju = cekajuList(buses, day);
  const neDolaze = neDolazeList(buses, day);
  const datumStr = dayjs(datum).format("DD.MM.YYYY.");

  const stigliRows = stigli
    .map(
      ({ bus, zapis }, i) =>
        `<tr><td>${i + 1}</td><td class="b">${esc(bus.broj)}</td><td>${esc(
          bus.marka,
        )}</td><td>${esc(zapis.vreme ?? "")}</td><td>${
          zapis.mesto ?? ""
        }</td><td>${esc(zapis.napomena ?? "")}</td></tr>`,
    )
    .join("");

  const cekajuRows = cekaju
    .map((b) => `<span class="chip">${esc(b.broj)}</span>`)
    .join("");
  const neDolazeRows = neDolaze
    .map((b) => `<span class="chip red">${esc(b.broj)}</span>`)
    .join("");

  return `
  <div class="sub">Datum: ${datumStr} &nbsp;•&nbsp; Ukupno u popisu: ${buses.length}</div>
  <div class="cards">
    <div class="card"><div class="n g">${stigli.length}</div><div class="l">Stiglo / sipalo</div></div>
    <div class="card"><div class="n gr">${cekaju.length}</div><div class="l">Čeka se</div></div>
    <div class="card"><div class="n r">${neDolaze.length}</div><div class="l">Ne dolazi</div></div>
  </div>

  <h2>Stigli — redom po vremenu (${stigli.length})</h2>
  ${
    stigli.length
      ? `<table><thead><tr><th>#</th><th>Broj</th><th>Marka</th><th>Vreme</th><th>Mesto</th><th>Napomena</th></tr></thead><tbody>${stigliRows}</tbody></table>`
      : `<div class="empty">Nijedan autobus nije evidentiran.</div>`
  }

  <h2>Statistika mesta sipanja (1–8)</h2>
  ${stigli.length ? spotStatsHtml(day) : `<div class="empty">Nema podataka.</div>`}

  <h2>Koji fale — čekaju (${cekaju.length})</h2>
  ${cekaju.length ? cekajuRows : `<div class="empty">Svi su evidentirani.</div>`}

  <h2>Ne dolaze — isključeni (${neDolaze.length})</h2>
  ${
    neDolaze.length
      ? neDolazeRows
      : `<div class="empty">Nema isključenih autobusa.</div>`
  }`;
}

const STYLE = `
  @page { size: A4; margin: 16mm; }
  * { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; }
  body { color: #0F172A; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1E3A8A; }
  h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px; }
  .sub { color: #64748B; font-size: 13px; margin-bottom: 18px; }
  .cards { display: flex; gap: 10px; margin-bottom: 8px; }
  .card { flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; }
  .card .n { font-size: 30px; font-weight: 800; }
  .card .l { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: .5px; }
  .g { color: #16A34A; } .r { color: #DC2626; } .gr { color: #64748B; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #F1F5F9; padding: 8px; color: #334155; font-size: 11px; text-transform: uppercase; }
  td { padding: 7px 8px; border-bottom: 1px solid #F1F5F9; }
  td.b { font-weight: 700; }
  .chip { display: inline-block; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px 8px; margin: 3px; font-size: 12px; font-weight: 600; }
  .chip.red { border-color: #FCA5A5; color: #DC2626; }
  .empty { color: #94A3B8; font-size: 12px; font-style: italic; }
  .barrow { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .barlabel { width: 64px; font-size: 12px; color: #334155; font-weight: 600; }
  .bartrack { flex: 1; height: 14px; background: #F1F5F9; border-radius: 7px; overflow: hidden; }
  .barfill { display: block; height: 14px; background: #1E3A8A; }
  .barval { width: 28px; text-align: right; font-size: 12px; font-weight: 700; }
  .daysep { margin-top: 26px; padding-top: 10px; border-top: 3px solid #1E3A8A; }
`;

export function buildReportHtml(
  datum: string,
  buses: Bus[],
  day: Record<string, Zapis>,
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${STYLE}</style></head>
<body><h1>Dolazak autobusa na pumpu</h1>${dayReportBody(datum, buses, day)}</body></html>`;
}

export function buildPeriodHtml(
  from: string,
  to: string,
  buses: Bus[],
  records: RecordsByDate,
): string {
  const start = dayjs(from);
  const end = dayjs(to);
  const days: string[] = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    days.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }
  const withData = days.filter(
    (d) => records[d] && Object.keys(records[d]).length > 0,
  );

  let totalStiglo = 0;
  let totalNeDolazi = 0;
  withData.forEach((d) => {
    const vals = Object.values(records[d]);
    totalStiglo += vals.filter((z) => z.status === "stigao").length;
    totalNeDolazi += vals.filter((z) => z.status === "ne_dolazi").length;
  });

  const blocks = withData.length
    ? withData
        .map(
          (d) =>
            `<div class="daysep"><h1>${dayjs(d).format("DD.MM.YYYY.")}</h1>${dayReportBody(
              d,
              buses,
              records[d],
            )}</div>`,
        )
        .join("")
    : `<div class="empty">Nema evidencije u izabranom periodu.</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${STYLE}</style></head>
<body>
  <h1>Izveštaj za period</h1>
  <div class="sub">${dayjs(from).format("DD.MM.YYYY.")} – ${dayjs(to).format(
    "DD.MM.YYYY.",
  )} &nbsp;•&nbsp; Dana sa evidencijom: ${withData.length}</div>
  <div class="cards">
    <div class="card"><div class="n g">${totalStiglo}</div><div class="l">Ukupno stiglo</div></div>
    <div class="card"><div class="n r">${totalNeDolazi}</div><div class="l">Ukupno ne dolazi</div></div>
  </div>
  ${blocks}
</body></html>`;
}

// --- Saving ---------------------------------------------------------------

async function getGrantedDir(): Promise<string | null> {
  const cached = await storage.getItem(SAF_KEY, "");
  if (cached) {
    try {
      await FileSystem.StorageAccessFramework.readDirectoryAsync(cached);
      return cached;
    } catch {
      // permission lost — re-request below
    }
  }
  const perm =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (perm.granted) {
    await storage.setItem(SAF_KEY, perm.directoryUri);
    return perm.directoryUri;
  }
  return null;
}

export interface SaveResult {
  status: "saved" | "shared" | "cancelled";
  name: string;
}

async function finalizePdf(
  html: string,
  fileName: string,
): Promise<SaveResult> {
  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

  if (Platform.OS === "android") {
    const dir = await getGrantedDir();
    if (dir && base64) {
      const target = await FileSystem.StorageAccessFramework.createFileAsync(
        dir,
        fileName,
        "application/pdf",
      );
      await FileSystem.writeAsStringAsync(target, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { status: "saved", name: `${fileName}.pdf` };
    }
    // permission not granted -> fall back to share sheet
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: fileName,
      });
      return { status: "shared", name: `${fileName}.pdf` };
    }
    return { status: "cancelled", name: `${fileName}.pdf` };
  }

  // iOS / other native
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: fileName,
    });
    return { status: "shared", name: `${fileName}.pdf` };
  }
  return { status: "cancelled", name: `${fileName}.pdf` };
}

export async function saveReportPdf(
  datum: string,
  buses: Bus[],
  day: Record<string, Zapis>,
): Promise<SaveResult> {
  const html = buildReportHtml(datum, buses, day);
  const fileName = `Izvestaj_${dayjs(datum).format("DD-MM-YYYY")}`;
  return finalizePdf(html, fileName);
}

export async function savePeriodPdf(
  from: string,
  to: string,
  buses: Bus[],
  records: RecordsByDate,
): Promise<SaveResult> {
  const html = buildPeriodHtml(from, to, buses, records);
  const fileName = `Izvestaj_${dayjs(from).format("DD-MM-YYYY")}_do_${dayjs(
    to,
  ).format("DD-MM-YYYY")}`;
  return finalizePdf(html, fileName);
}

// Always open the OS share sheet (Viber, e-mail, WhatsApp, Files…).
async function sharePdf(html: string, fileName: string): Promise<SaveResult> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: fileName,
    });
    return { status: "shared", name: `${fileName}.pdf` };
  }
  return { status: "cancelled", name: `${fileName}.pdf` };
}

export async function shareReportPdf(
  datum: string,
  buses: Bus[],
  day: Record<string, Zapis>,
): Promise<SaveResult> {
  const html = buildReportHtml(datum, buses, day);
  return sharePdf(html, `Izvestaj_${dayjs(datum).format("DD-MM-YYYY")}`);
}

export async function sharePeriodPdf(
  from: string,
  to: string,
  buses: Bus[],
  records: RecordsByDate,
): Promise<SaveResult> {
  const html = buildPeriodHtml(from, to, buses, records);
  const fileName = `Izvestaj_${dayjs(from).format("DD-MM-YYYY")}_do_${dayjs(
    to,
  ).format("DD-MM-YYYY")}`;
  return sharePdf(html, fileName);
}

// --- Single bus history (last N days) -------------------------------------

export function buildBusHistoryHtml(
  broj: string,
  hist: { datum: string; zapis: Zapis }[],
  days: number,
): string {
  const stigloDana = hist.filter((h) => h.zapis.status === "stigao").length;
  const rows = hist.length
    ? hist
        .map((h) => {
          const z = h.zapis;
          const stat =
            z.status === "stigao"
              ? `<span class="g">Stigao</span>`
              : `<span class="r">Ne dolazi</span>`;
          return `<tr><td class="b">${dayjs(h.datum).format(
            "DD.MM.YYYY.",
          )}</td><td>${stat}</td><td>${esc(z.vreme ?? "-")}</td><td>${
            z.mesto ?? "-"
          }</td><td>${esc(z.napomena ?? "")}</td></tr>`;
        })
        .join("")
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${STYLE}</style></head>
<body>
  <h1>Autobus ${esc(broj)} — poslednjih ${days} dana</h1>
  <div class="sub">Dolazaka (sipanja): ${stigloDana} / ${days} dana</div>
  ${
    hist.length
      ? `<table><thead><tr><th>Datum</th><th>Status</th><th>Vreme</th><th>Mesto</th><th>Napomena</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty">Nema evidencije za ovaj autobus u poslednjih ${days} dana.</div>`
  }
</body></html>`;
}

export async function shareBusHistoryPdf(
  broj: string,
  hist: { datum: string; zapis: Zapis }[],
  days: number,
): Promise<SaveResult> {
  const html = buildBusHistoryHtml(broj, hist, days);
  return sharePdf(html, `Autobus_${broj}_${days}dana`);
}

export async function saveBusHistoryPdf(
  broj: string,
  hist: { datum: string; zapis: Zapis }[],
  days: number,
): Promise<SaveResult> {
  const html = buildBusHistoryHtml(broj, hist, days);
  return finalizePdf(html, `Autobus_${broj}_${days}dana`);
}
