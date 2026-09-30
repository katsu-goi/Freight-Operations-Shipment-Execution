import type { Shipment } from "@/types";

export interface ReportFilters {
  from?: string;
  to?: string;
  status?: string;
  platform?: string;
  search?: string;
}

export function applyReportFilters(
  rows: Shipment[],
  f: ReportFilters,
): Shipment[] {
  const from = f.from ? new Date(`${f.from}T00:00:00`) : null;
  const to = f.to ? new Date(`${f.to}T23:59:59`) : null;
  const search = (f.search ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.platform && r.platform !== f.platform) return false;
    const created = new Date(r.created_at);
    if (from && created < from) return false;
    if (to && created > to) return false;
    if (search) {
      const hay =
        `${r.reference} ${r.tracking_number ?? ""} ${r.client_name} ${r.consignee ?? ""} ${r.destination} ${r.origin}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

const CSV_COLS: (keyof Shipment)[] = [
  "reference",
  "tracking_number",
  "client_name",
  "consignee",
  "origin",
  "destination",
  "platform",
  "status",
  "weight_kg",
  "cod_amount",
  "created_at",
];

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Shipment[]): string {
  const header = CSV_COLS.join(",");
  const lines = rows.map((r) => CSV_COLS.map((c) => csvCell(r[c])).join(","));
  return [header, ...lines].join("\n");
}

/** Printable HTML report — the browser's Print → Save as PDF produces the PDF
 *  export with zero server dependencies. */
export function toPrintableHtml(
  rows: Shipment[],
  filters: ReportFilters,
  generatedAt: string,
): string {
  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const trs = rows
    .map(
      (r) => `<tr>
        <td>${esc(r.reference)}</td><td>${esc(r.tracking_number ?? "")}</td>
        <td>${esc(r.client_name)}</td><td>${esc(r.destination)}</td>
        <td>${esc(r.platform)}</td><td>${esc(r.status)}</td>
        <td style="text-align:right">${esc(r.weight_kg)}</td>
        <td style="text-align:right">${esc(r.cod_amount)}</td>
        <td>${esc(String(r.created_at).slice(0, 10))}</td>
      </tr>`,
    )
    .join("");
  const totalKg = rows.reduce((a, r) => a + Number(r.weight_kg ?? 0), 0);
  const totalCod = rows.reduce((a, r) => a + Number(r.cod_amount ?? 0), 0);
  return `<!doctype html><html><head><meta charset="utf-8">
<title>Freight Operations Report</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px}
h1{font-size:20px;margin:0} p.meta{color:#555;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #999;padding:6px 8px} th{background:#eee}
tfoot td{font-weight:bold}
@media print{.no-print{display:none}}
</style></head><body>
<h1>Airship Express — Shipment Report</h1>
<p class="meta">Generated ${esc(generatedAt)} · ${rows.length} rows ·
Filters: ${esc(JSON.stringify(filters))} ·
Total ${totalKg.toFixed(1)} kg · COD ₱${totalCod.toFixed(2)}</p>
<p class="no-print"><button onclick="window.print()">Save as PDF / Print</button></p>
<table><thead><tr>
<th>Reference</th><th>Tracking</th><th>Client</th><th>Destination</th>
<th>Platform</th><th>Status</th><th>Weight kg</th><th>COD ₱</th><th>Created</th>
</tr></thead><tbody>${trs || '<tr><td colspan="9">No rows match the filters.</td></tr>'}</tbody>
<tfoot><tr><td colspan="6">Totals</td><td style="text-align:right">${totalKg.toFixed(1)}</td>
<td style="text-align:right">${totalCod.toFixed(2)}</td><td></td></tr></tfoot></table>
</body></html>`;
}
