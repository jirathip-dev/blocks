import type { Accept, FileRef, UploadField } from "../../gen/types.ts";

/// What the renderer tells the app about one file. `progress` takes 0 to 1; `signal` aborts when the file is removed.
export type Picked = { screen: string; block?: string; field: string; name: string; mime: string; size: number; progress: (part: number) => void; signal: AbortSignal };
/// The app takes the bytes and answers with a small ref. A rejection is the failed state.
export type OnFile = (file: Blob, about: Picked) => Promise<FileRef>;
/// One file row's state: `refused` never reached the handler.
export type FileState = "done" | "uploading" | "failed" | "refused";
/// One file row of an upload field.
export type FileRow = { name: string; size: number; mime: string; state: FileState; part: number; why?: "type" | "size"; id?: string; src?: string; blob?: Blob; stop?: AbortController };
type Word = (key: string) => string;

const OWN: Record<string, (name: string, mime: string) => boolean> = {
  image: (_, m) => m.startsWith("image/"),
  pdf: (n, m) => m === "application/pdf" || /\.pdf$/i.test(n),
  sheet: (n, m) => m === "text/csv" || m.endsWith("spreadsheetml.sheet") || /\.(csv|xlsx)$/i.test(n),
};
const MIME: Record<string, string> = { image: "image/*", pdf: ".pdf,application/pdf", sheet: ".csv,.xlsx,text/csv" };

/// `text` with each `{key}` filled from `v`.
export const fill = (text: string, v: Record<string, unknown>): string => text.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
/// The file input's `accept` for a field's kinds.
export const accepts = (accept: Accept[] = []): string => accept.map((a) => MIME[a] ?? a).join(",");
/// Why a file is refused before it reaches the handler: the wrong kind, or over `mb`; `undefined` when it is taken.
export function refused(x: UploadField, name: string, mime: string, size: number): "type" | "size" | undefined {
  const kinds = x.accept ?? [];
  if (kinds.length && !kinds.some((k) => (OWN[k] ?? ((_: string, m: string) => m === k))(name, mime))) return "type";
  return x.mb != null && size > x.mb * 1048576 ? "size" : undefined;
}
/// A size as the status line draws it: "320 KB", "14.2 MB".
export const sized = (n: number): string => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const kinds = (x: UploadField, w: Word) => (x.accept ?? []).map((a) => w(a) || a).join(w("or"));
/// The hint under the list: the kinds it takes and the size limit, or that uploads are off.
export function hint(x: UploadField, w: Word, on: boolean): string {
  if (!on) return w("off");
  const mb = x.mb != null ? fill(w(x.many ? "each" : "upTo"), { mb: x.mb }) : "";
  return [kinds(x, w), mb].filter(Boolean).join(" · ");
}
/// The pick button's word: replace a held file, else add or choose photos or files.
export function pick(x: UploadField, rows: FileRow[], w: Word): string {
  const image = !!x.accept?.length && x.accept.every((a) => a === "image");
  if (!x.many && rows.some((r) => r.state !== "refused")) return w("replace");
  return w(`${image ? "photo" : "file"}${x.many ? "N" : "1"}`);
}
/// A row's status line: its size, its progress, failed, or why it was refused.
export function status(x: UploadField, r: FileRow, w: Word): string {
  if (r.state === "uploading") return fill(w("uploading"), { p: Math.round(r.part * 100) });
  if (r.state === "failed") return `${w("failed")} · ${sized(r.size)}`;
  if (r.state === "refused") return r.why === "size" ? fill(w("tooBig"), { size: sized(r.size), mb: x.mb }) : fill(w("onlyType"), { types: kinds(x, w) });
  return r.size ? sized(r.size) : "";
}
/// The rows a field starts with: each of its `files`, done.
export const held = (x: UploadField): FileRow[] => (x.files ?? []).map((f) => ({ name: f.name ?? f.id, size: 0, mime: "", state: "done", part: 1, id: f.id, src: f.src ?? undefined }));
/// The ids an upload sends: each done file's.
export const ids = (rows: FileRow[]): string[] => rows.flatMap((r) => (r.state === "done" && r.id != null ? [r.id] : []));
/// How many files are uploading, and how many failed: the form's submit waits on both.
export const waits = (rows: FileRow[]) => ({ up: rows.filter((r) => r.state === "uploading").length, failed: rows.filter((r) => r.state === "failed").length });
/// The rows after picking `files`: refused ones never reach the handler; without `many` the first file replaces the rows.
export function picked(x: UploadField, rows: FileRow[], files: Blob[], names: string[]): { rows: FileRow[]; send: FileRow[] } {
  const keep = x.many ? rows.filter((r) => r.state !== "refused") : [];
  for (const r of x.many ? [] : rows) r.stop?.abort();
  const fresh = (x.many ? files : files.slice(0, 1)).map((blob, i): FileRow => {
    const name = names[i] ?? "", why = refused(x, name, blob.type, blob.size);
    return { name, size: blob.size, mime: blob.type, state: why ? "refused" : "uploading", part: 0, why, blob: why ? undefined : blob };
  });
  return { rows: [...keep, ...fresh], send: fresh.filter((r) => r.state === "uploading") };
}
/// Hands `r` to the handler: `done` with its ref, `failed` on a rejection; `again` redraws after each change.
export function send(r: FileRow, file: OnFile, about: Omit<Picked, "name" | "mime" | "size" | "progress" | "signal">, again: () => void): void {
  if (!r.blob) return;
  const stop = new AbortController();
  Object.assign(r, { state: "uploading", part: 0, stop });
  const progress = (p: number) => ((r.part = Math.min(1, Math.max(0, p))), again());
  file(r.blob, { ...about, name: r.name, mime: r.mime, size: r.size, progress, signal: stop.signal }).then(
    (ref) => !stop.signal.aborted && (Object.assign(r, { state: "done", part: 1, id: ref.id, src: ref.src ?? r.src, name: ref.name ?? r.name, blob: undefined }), again()),
    () => !stop.signal.aborted && ((r.state = "failed"), again()),
  );
}
