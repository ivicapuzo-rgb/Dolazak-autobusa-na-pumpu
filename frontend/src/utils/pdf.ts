import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";

import {
  cekajuList,
  neDolazeList,
  stigliByTimeDesc,
} from "@/src/data/DataContext";
import { Bus, Zapis } from "@/src/data/types";

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

export function buildReportHtml(
  datum: string,
  buses: Bus[],
  day: Record<string, Zapis>,
): string {
  const stigli = stigliByTimeDesc(buses, day);
  const cekaju = cekajuList(buses, day);
  const neDolaze = neDolazeList(buses, day);
  const datumStr = dayjs(datum).format("DD.MM.YYYY.");
  const ukupno = buses.length;

  const stigliRows = stigli
    .map(
      ({ bus, zapis }, i) =>
        `<tr><td>${i + 1}</td><td class="b">${esc(bus.broj)}</td><td>${esc(
          bus.marka,
        )}</td><td>${esc(zapis.vreme ?? "")}</td><td>${
          zapis.mesto ?? ""
        }</td></tr>`,
    )
    .join("");

  const cekajuRows = cekaju
    .map(
      (b) => `<span class="chip">${esc(b.broj)}</span>`,
    )
    .join("");

  const neDolazeRows = neDolaze
    .map((b) => `<span class="chip red">${esc(b.broj)}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 16mm; }
  * { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; }
  body { color: #0F172A; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1E3A8A; }
  .sub { color: #64748B; font-size: 13px; margin-bottom: 18px; }
  .cards { display: flex; gap: 10px; margin-bottom: 22px; }
  .card { flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; }
  .card .n { font-size: 30px; font-weight: 800; }
  .card .l { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: .5px; }
  .g { color: #16A34A; } .r { color: #DC2626; } .gr { color: #64748B; } .bl { color: #1E3A8A; }
  h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #F1F5F9; padding: 8px; color: #334155; font-size: 11px; text-transform: uppercase; }
  td { padding: 7px 8px; border-bottom: 1px solid #F1F5F9; }
  td.b { font-weight: 700; }
  .chip { display: inline-block; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px 8px; margin: 3px; font-size: 12px; font-weight: 600; }
  .chip.red { border-color: #FCA5A5; color: #DC2626; }
  .empty { color: #94A3B8; font-size: 12px; font-style: italic; }
</style></head>
<body>
  <h1>Dolazak autobusa na pumpu</h1>
  <div class="sub">Datum: ${datumStr} &nbsp;•&nbsp; Ukupno u popisu: ${ukupno}</div>
  <div class="cards">
    <div class="card"><div class="n g">${stigli.length}</div><div class="l">Stiglo / sipalo</div></div>
    <div class="card"><div class="n gr">${cekaju.length}</div><div class="l">Čeka se</div></div>
    <div class="card"><div class="n r">${neDolaze.length}</div><div class="l">Ne dolazi</div></div>
  </div>

  <h2>Stigli — redom po vremenu (${stigli.length})</h2>
  ${
    stigli.length
      ? `<table><thead><tr><th>#</th><th>Broj</th><th>Marka</th><th>Vreme</th><th>Mesto</th></tr></thead><tbody>${stigliRows}</tbody></table>`
      : `<div class="empty">Nijedan autobus nije evidentiran.</div>`
  }

  <h2>Koji fale — čekaju (${cekaju.length})</h2>
  ${cekaju.length ? cekajuRows : `<div class="empty">Svi su evidentirani.</div>`}

  <h2>Ne dolaze — isključeni (${neDolaze.length})</h2>
  ${
    neDolaze.length
      ? neDolazeRows
      : `<div class="empty">Nema isključenih autobusa.</div>`
  }
</body></html>`;
}

export async function exportReportPdf(
  datum: string,
  buses: Bus[],
  day: Record<string, Zapis>,
): Promise<void> {
  const html = buildReportHtml(datum, buses, day);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `Izveštaj ${dayjs(datum).format("DD.MM.YYYY.")}`,
    });
  }
}
