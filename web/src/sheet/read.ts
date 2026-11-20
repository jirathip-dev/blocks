import { unzip } from "./zip.ts";

export type Line = { n: number; cells: string[] };
export type Book = { sheets: string[]; sheet: number; head: string[]; rows: Line[]; enc: string };

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unxml = (s: string) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e: string) => (e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" || e[1] === "X" ? "0" + e.slice(1) : e.slice(1))) : (ENT[e] ?? m)));
const runs = (x: string) => unxml(Array.from(x.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g), (m) => m[1]).join(""));
const attr = (tag: string, k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(tag)?.[1];
const col = (ref: string) => [...ref.replace(/\d+$/, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
const day = (serial: number) => new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 864e5).toISOString().slice(0, 10);

function dates(styles: string): boolean[] {
  const own = new Map(Array.from(styles.matchAll(/<numFmt\b[^>]*>/g), (m) => [attr(m[0], "numFmtId"), attr(m[0], "formatCode") ?? ""]));
  const xfs = /<cellXfs\b[\s\S]*?<\/cellXfs>/.exec(styles)?.[0] ?? "";
  return Array.from(xfs.matchAll(/<xf\b[^>]*>/g), (m) => {
    const id = Number(attr(m[0], "numFmtId") ?? 0), code = own.get(String(id)) ?? "";
    return (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || /[dy]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, ""));
  });
}

function rows(xml: string, shared: string[], date: boolean[]): Line[] {
  return Array.from(xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g), (r) => {
    const cells: string[] = [];
    for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const t = attr(c[1], "t"), v = unxml(/<v>([\s\S]*?)<\/v>/.exec(c[2] ?? "")?.[1] ?? "");
      const at = col(attr(c[1], "r") ?? "A");
      cells[at] = t === "s" ? (shared[Number(v)] ?? "") : t === "inlineStr" ? runs(c[2] ?? "") : t === "b" ? (v === "1" ? "TRUE" : "FALSE") : !t && v && date[Number(attr(c[1], "s") ?? 0)] ? day(Number(v)) : v;
    }
    return { n: Number(attr(r[1], "r") ?? 0), cells: Array.from(cells, (x) => x ?? "") };
  });
}

async function xlsx(files: Map<string, Uint8Array>, pick: number): Promise<Book | null> {
  const dec = new TextDecoder(), get = (p: string) => dec.decode(files.get(p) ?? new Uint8Array());
  const book = get("xl/workbook.xml"), rels = get("xl/_rels/workbook.xml.rels");
  const target = new Map(Array.from(rels.matchAll(/<Relationship\b[^>]*>/g), (m) => [attr(m[0], "Id"), attr(m[0], "Target") ?? ""]));
  const sheets = Array.from(book.matchAll(/<sheet\b[^>]*>/g), (m) => ({ name: unxml(attr(m[0], "name") ?? ""), to: target.get(attr(m[0], "r:id")) ?? "" }));
  const sheet = Math.min(pick, sheets.length - 1);
  if (sheet < 0) return null;
  const to = sheets[sheet].to.replace(/^\//, "");
  const shared = Array.from(get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g), (m) => runs(m[1]));
  const all = rows(get(to.startsWith("xl/") ? to : `xl/${to}`), shared, dates(get("xl/styles.xml")));
  return { sheets: sheets.map((s) => s.name), sheet, ...split(all), enc: "" };
}

function csv(s: string): Line[] {
  const first = s.slice(0, s.search(/\r?\n|$/));
  const sep = [",", ";", "\t"].reduce((a, b) => (first.split(b).length > first.split(a).length ? b : a));
  const out: Line[] = [];
  let row: string[] = [], cell = "", quoted = false, n = 1;
  for (let i = 0; i <= s.length; i++) {
    const c = s[i];
    if (quoted && c === '"' && s[i + 1] === '"') (cell += '"'), i++;
    else if (c === '"' && (quoted || cell === "")) quoted = !quoted;
    else if (quoted && c !== undefined) cell += c;
    else if (c === sep) row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r" || c === undefined) {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell), out.push({ n: n++, cells: row }), (row = []), (cell = "");
    } else cell += c;
  }
  return out.filter((r) => r.cells.some((x) => x !== ""));
}

function split(all: Line[]): { head: string[]; rows: Line[] } {
  const at = all.findIndex((r) => r.cells.some((x) => x.trim() !== ""));
  return at < 0 ? { head: [], rows: [] } : { head: all[at].cells.map((x) => x.trim()), rows: all.slice(at + 1) };
}

/// The file's header and rows, from sheet `pick` of an .xlsx or from a .csv; a string says why it cannot be read.
export async function read(name: string, b: Uint8Array, pick = 0): Promise<Book | "old" | "not"> {
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "old";
  if (b[0] === 0x50 && b[1] === 0x4b) {
    const files = await unzip(b);
    return (files && (await xlsx(files, pick))) ?? "not";
  }
  if (!/\.(csv|tsv|txt)$/i.test(name)) return "not";
  let enc = "UTF-8", s: string;
  try {
    s = new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    (enc = "Windows-874"), (s = new TextDecoder("windows-874").decode(b));
  }
  return { sheets: [], sheet: 0, ...split(csv(s.replace(/^\uFEFF/, ""))), enc };
}
