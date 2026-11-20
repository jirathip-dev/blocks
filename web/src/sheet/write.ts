import type { ImportColumn } from "../gen/types.ts";
import type { Say } from "./check.ts";
import { zip } from "./zip.ts";

export type Cell = string | number;
export type Tab = { name: string; rows: Cell[][]; bold?: boolean[] };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const ref = (i: number): string => (i >= 26 ? ref(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const STYLES = `<styleSheet ${NS}><fonts count="2"><font/><font><b/></font></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`;

function sheet(t: Tab): string {
  const rows = t.rows.map((r, y) => {
    const cells = r.map((v, x) => {
      const s = y === 0 && t.bold?.[x] ? ' s="1"' : "";
      return typeof v === "number" ? `<c r="${ref(x)}${y + 1}"${s}><v>${v}</v></c>` : `<c r="${ref(x)}${y + 1}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    });
    return `<row r="${y + 1}">${cells.join("")}</row>`;
  });
  return `<worksheet ${NS}><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

/// An .xlsx workbook of `tabs`, one sheet each.
export function book(tabs: Tab[]): Uint8Array {
  const x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', ct = "application/vnd.openxmlformats-";
  const enc = new TextEncoder(), file = (name: string, s: string) => ({ name, data: enc.encode(x + s) });
  const over = tabs.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${ct}officedocument.spreadsheetml.worksheet+xml"/>`);
  return zip([
    file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="${ct}package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${ct}officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${ct}officedocument.spreadsheetml.styles+xml"/>${over.join("")}</Types>`),
    file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    file("xl/workbook.xml", `<workbook ${NS} xmlns:r="${REL}"><sheets>${tabs.map((t, i) => `<sheet name="${esc(t.name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31))}" sheetId="${i + 1}" r:id="s${i + 1}"/>`).join("")}</sheets></workbook>`),
    file("xl/_rels/workbook.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${tabs.map((_, i) => `<Relationship Id="s${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="st" Type="${REL}/styles" Target="styles.xml"/></Relationships>`),
    file("xl/styles.xml", STYLES),
    ...tabs.map((t, i) => file(`xl/worksheets/sheet${i + 1}.xml`, sheet(t))),
  ]);
}

/// The empty workbook a file to import starts from: the header row (required columns bold) and the allowed values.
export function template(title: string, cols: ImportColumn[], say: Say): Uint8Array {
  const choices = cols.filter((c) => c.values?.length);
  const values: Cell[][] = Array.from({ length: Math.max(0, ...choices.map((c) => c.values?.length ?? 0)) }, (_, i) => choices.map((c) => c.values?.[i] ?? ""));
  const tabs: Tab[] = [{ name: title, rows: [cols.map((c) => c.label)], bold: cols.map((c) => !!c.required) }];
  if (choices.length) tabs.push({ name: say("imValues"), rows: [choices.map((c) => c.label), ...values], bold: choices.map(() => true) });
  return book(tabs);
}
