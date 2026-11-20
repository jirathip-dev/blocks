import { createElement, useRef, useState } from "react";
import { ids, type ScanField, type ScanRow, scanHeld, scanHint, scanLine, scanned, scanner, send, waits } from "../../../src/core/index.ts";
import type { Page } from "../../../src/scan/index.ts";
import { btn } from "../draw.ts";
import { h } from "../h.ts";
import { type FieldCx, type FieldView, word } from "./_view.ts";
import { item } from "./upload.ts";

function Scan({ x, c, attrs }: { x: ScanField; c: FieldCx; attrs: Record<string, unknown> }) {
  const w = (k: string) => word(c, k), label = x.label ?? x.name, off = !c.file;
  const [rows, setRows] = useState<ScanRow[]>(() => scanHeld(x));
  const live = useRef(rows), kept = useRef<Page[] | undefined>(undefined);
  const changed = (next: ScanRow[]) => {
    live.current = next;
    setRows(next);
    c.hold(ids(next), waits(next));
  };
  const go = (r: ScanRow) => c.file && send(r, c.file, { screen: c.screen, block: c.block, field: x.name }, () => changed([...live.current]));
  const drop = () => {
    live.current.forEach((r) => r.stop?.abort());
    kept.current = undefined;
    changed([]);
  };
  const open = async (again: boolean) => {
    const out = await (await scanner()).scan({ label, max: x.max ?? 20, w, pages: again ? kept.current : undefined });
    if (!out) return;
    live.current.forEach((r) => r.stop?.abort());
    kept.current = out.pages;
    const r = scanned(x, out.pdf, out.pages.length, out.pages[0]?.url);
    changed([r]);
    go(r);
  };
  const named = (k: string, name: string, f: () => void) => btn(w(k), "", undefined, undefined, { "aria-label": `${w(k)}: ${name}`, onClick: f }, off);
  const list = rows.map((r) => item(scanLine(r, w), r, w, drop, go, kept.current ? [named("editPages", r.name, () => open(true))] : []));
  const again = rows.length ? "rescan" : "scan";
  const group = { role: "group", "data-field": x.name, "aria-label": label, "aria-invalid": attrs["aria-invalid"] };
  return h("div", "fu", group, x.error ? h("span", "fe", null, x.error) : null, list.length ? h("ul", "fuf", null, ...list) : null, h("div", "fub", null, named(again, label, () => open(false)), h("span", "fuh", null, scanHint(x, w, !off))));
}

export const scan: FieldView<ScanField> = {
  row: " up",
  group: true,
  draw: (x, c, attrs) => createElement(Scan, { x, c, attrs }),
  sent: (x) => ids(scanHeld(x)),
};
