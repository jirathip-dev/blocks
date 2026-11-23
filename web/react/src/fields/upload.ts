import { createElement, type ReactNode, useRef, useState } from "react";
import { accepts, type FileRow, fill, held, hint, ids, pick, picked, send, status, type UploadField, waits } from "../../../src/core/index.ts";
import { btn } from "../draw.ts";
import { h } from "../h.ts";
import { type FieldCx, type FieldView, word } from "./_view.ts";

/// One file's row: its picture, name, progress and `line`, then retry, `more` and remove.
export function item(line: string, r: FileRow, w: (k: string) => string, drop: (r: FileRow) => void, again: (r: FileRow) => void, more: ReactNode[] = []) {
  const hide = { "aria-hidden": "true" };
  const head = r.src && r.state !== "refused" ? h("img", "fut", { ...hide, src: r.src, alt: "" }) : h("span", "fux", hide, r.state === "refused" ? "!" : (r.name.split(".").pop() ?? "").slice(0, 4));
  const p = Math.round(r.part * 100);
  const bar = { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p), "aria-label": r.name, style: { "--v": p } };
  const b = (k: string, f: () => void, cls = "") => btn(w(k), cls, undefined, undefined, { "aria-label": `${w(k)} ${r.name}`, onClick: f });
  const acts = r.state === "failed" ? [b("retry", () => again(r)), ...more, b("remove", () => drop(r), "bad")] : [...more, b(r.state === "refused" ? "dismiss" : "remove", () => drop(r))];
  const m = h("span", "fum", null, h("span", "fun", null, r.name), r.state === "uploading" ? h("span", "pgt", bar, h("b", "", null)) : null, h("span", "fus", null, line));
  return h("li", `fui ${r.state}`, { key: r.id ?? `${r.name}~${r.size}`, "aria-label": `${r.name}, ${line}` }, head, m, h("span", "fua", null, ...acts));
}

function Upload({ x, c, attrs }: { x: UploadField; c: FieldCx; attrs: Record<string, unknown> }) {
  const w = (k: string) => word(c, k);
  const [rows, setRows] = useState<FileRow[]>(() => held(x));
  const live = useRef(rows);
  const input = useRef<HTMLInputElement | null>(null);
  const changed = (next: FileRow[]) => {
    live.current = next;
    setRows(next);
    c.hold(ids(next), waits(next));
  };
  const go = (r: FileRow) => c.file && send(r, c.file, { screen: c.screen, block: c.block, field: x.name }, () => changed([...live.current]));
  const drop = (r: FileRow) => {
    r.stop?.abort();
    changed(live.current.filter((o) => o !== r));
  };
  const open = (camera: boolean) => {
    const i = input.current;
    if (camera) i?.setAttribute("capture", "environment");
    else i?.removeAttribute("capture");
    i?.click();
  };
  const take = (e: { target: HTMLInputElement }) => {
    const files = Array.from(e.target.files ?? []);
    const next = picked(x, live.current, files, files.map((f) => f.name));
    e.target.value = "";
    changed(next.rows);
    next.send.forEach(go);
  };
  const label = x.label ?? x.name;
  const choice = pick(x, rows, w);
  const tip = hint(x, w, !!c.file);
  const off = !c.file;
  const fub = h(
    "div",
    "fub",
    null,
    x.capture ? btn(w("camera"), "fuc", undefined, undefined, { onClick: () => open(true) }, off) : null,
    btn(choice, "", undefined, undefined, { "aria-label": `${choice}: ${label}`, onClick: () => open(false) }, off),
    tip ? h("span", "fuh", null, tip) : null,
    h("input", "", { ref: input, type: "file", tabIndex: -1, multiple: !!x.many, accept: accepts(x.accept ?? []), "aria-hidden": "true", onChange: take }),
  );
  const named = { role: "group", "data-field": x.name, "aria-label": fill(w("files"), { label, n: rows.filter((r) => r.state !== "refused").length }), "aria-invalid": attrs["aria-invalid"] };
  return h("div", "fu", named, x.error ? h("span", "fe", null, x.error) : null, rows.length ? h("ul", "fuf", null, ...rows.map((r) => item(status(x, r, w), r, w, drop, go))) : null, fub);
}

export const upload: FieldView<UploadField> = {
  row: " up",
  group: true,
  waits: true,
  draw: (x, c, attrs) => createElement(Upload, { x, c, attrs }),
  sent: (x) => ids(held(x)),
};
