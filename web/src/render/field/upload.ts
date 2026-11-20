import { accepts, type FileRow, fill, held, hint, ids, pick, picked, send, status, waits } from "../../core/field/files.ts";
import type { UploadField } from "../../gen/types.ts";
import { btn, el, h } from "../dom.ts";
import { type FieldView, word } from "./_view.ts";

const named = (b: HTMLElement, name: string) => (b.setAttribute("aria-label", name), b);

function item(x: UploadField, r: FileRow, w: (k: string) => string, drop: (r: FileRow) => void, again: (r: FileRow) => void): HTMLElement {
  const line = status(x, r, w);
  const head = r.src && r.state !== "refused" ? Object.assign(el("img", "fut"), { src: r.src, alt: "" }) : h("span", "fux", r.state === "refused" ? "!" : (r.name.split(".").pop() ?? "").slice(0, 4));
  head.setAttribute("aria-hidden", "true");
  const m = h("span", "fum", h("span", "fun", r.name));
  if (r.state === "uploading") {
    const p = Math.round(r.part * 100);
    const t = h("span", "pgt", el("b"));
    t.setAttribute("style", `--v:${p}`);
    for (const [k, v] of [["role", "progressbar"], ["aria-valuemin", "0"], ["aria-valuemax", "100"], ["aria-valuenow", String(p)], ["aria-label", r.name]]) t.setAttribute(k, v);
    m.append(t);
  }
  m.append(h("span", "fus", line));
  const b = (k: string, f: () => void, cls = "") => Object.assign(named(btn(w(k), cls), `${w(k)} ${r.name}`), { onclick: f });
  const acts = r.state === "failed" ? [b("retry", () => again(r)), b("remove", () => drop(r), "bad")] : [b(r.state === "refused" ? "dismiss" : "remove", () => drop(r))];
  const li = h("li", `fui ${r.state}`, head, m, h("span", "fua", ...acts));
  li.setAttribute("aria-label", `${r.name}, ${line}`);
  return li;
}

export const upload: FieldView<UploadField> = {
  row: " up",
  group: true,
  draw(x, c) {
    const w = (k: string) => word(c, k);
    const box = el("div", "fu");
    box.setAttribute("role", "group");
    box.dataset.field = x.name;
    let rows = held(x);
    const input = Object.assign(el("input"), { type: "file", tabIndex: -1, multiple: !!x.many, accept: accepts(x.accept ?? []) });
    input.setAttribute("aria-hidden", "true");
    const about = { screen: c.screen, block: c.block, field: x.name };
    const changed = (commit: boolean) => {
      paint();
      if (commit) c.set?.(ids(rows));
      box.dispatchEvent(new CustomEvent("field", { bubbles: true, detail: { name: x.name, value: ids(rows) } }));
    };
    const go = (r: FileRow) => c.file && send(r, c.file, about, () => changed(r.state === "done"));
    const drop = (r: FileRow) => {
      r.stop?.abort();
      rows = rows.filter((o) => o !== r);
      changed(r.state === "done");
    };
    const open = (camera: boolean) => {
      if (camera) input.setAttribute("capture", "environment");
      else input.removeAttribute("capture");
      input.click();
    };
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      const next = picked(x, rows, files, files.map((f) => f.name));
      rows = next.rows;
      input.value = "";
      changed(!x.many);
      next.send.forEach(go);
    };
    const paint = () => {
      const label = x.label ?? x.name;
      box.setAttribute("aria-label", fill(w("files"), { label, n: rows.filter((r) => r.state !== "refused").length }));
      const bar = el("div", "fub");
      const choice = pick(x, rows, w);
      const choose = named(btn(choice), `${choice}: ${label}`);
      choose.onclick = () => open(false);
      if (x.capture) bar.append(Object.assign(btn(w("camera"), "fuc"), { onclick: () => open(true) }));
      bar.append(choose);
      for (const b of bar.querySelectorAll("button")) b.disabled = !c.file;
      const tip = hint(x, w, !!c.file);
      if (tip) bar.append(h("span", "fuh", tip));
      bar.append(input);
      const list = rows.length ? [h("ul", "fuf", ...rows.map((r) => item(x, r, w, drop, go)))] : [];
      box.replaceChildren(...(x.error ? [h("span", "fe", x.error)] : []), ...list, bar);
    };
    paint();
    return { el: box, sent: () => ids(rows), busy: () => waits(rows) };
  },
};
