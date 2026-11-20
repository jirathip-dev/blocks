import { ids, type ScanRow, scanHeld, scanHint, scanLine, scanned, scanner, send, waits } from "../../core/field/files.ts";
import type { ScanField } from "../../gen/types.ts";
import type { Page } from "../../scan/index.ts";
import { btn, el, h } from "../dom.ts";
import { type FieldView, word } from "./_view.ts";
import { item } from "./upload.ts";

export const scan: FieldView<ScanField> = {
  row: " up",
  group: true,
  draw(x, c) {
    const w = (k: string) => word(c, k), label = x.label ?? x.name;
    const box = el("div", "fu");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", label);
    box.dataset.field = x.name;
    let rows: ScanRow[] = scanHeld(x), kept: Page[] | undefined;
    const changed = (commit: boolean) => {
      paint();
      if (commit) c.set?.(ids(rows));
      box.dispatchEvent(new CustomEvent("field", { bubbles: true, detail: { name: x.name, value: ids(rows) } }));
    };
    const go = (r: ScanRow) => c.file && send(r, c.file, { screen: c.screen, block: c.block, field: x.name }, () => changed(r.state === "done"));
    const drop = () => {
      rows.forEach((r) => r.stop?.abort());
      rows = [];
      kept = undefined;
      changed(true);
    };
    const open = async (again: boolean) => {
      const out = await (await scanner()).scan({ label, max: x.max ?? 20, w, pages: again ? kept : undefined });
      if (!out) return;
      rows.forEach((r) => r.stop?.abort());
      kept = out.pages;
      const r = scanned(x, out.pdf, out.pages.length, out.pages[0]?.url);
      rows = [r];
      changed(false);
      go(r);
    };
    const paint = () => {
      const named = (k: string, name: string, f: () => void) => {
        const b = Object.assign(btn(w(k)), { onclick: f, disabled: !c.file });
        b.setAttribute("aria-label", `${w(k)}: ${name}`);
        return b;
      };
      const list = rows.map((r) => item(scanLine(r, w), r, w, drop, go, kept ? [named("editPages", r.name, () => open(true))] : []));
      const start = named(rows.length ? "rescan" : "scan", label, () => open(false));
      box.replaceChildren(...(x.error ? [h("span", "fe", x.error)] : []), ...(list.length ? [h("ul", "fuf", ...list)] : []), h("div", "fub", start, h("span", "fuh", scanHint(x, w, !!c.file))));
    };
    paint();
    return { el: box, sent: () => ids(rows), busy: () => waits(rows) };
  },
};
