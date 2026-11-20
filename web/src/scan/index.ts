import type { Rules } from "../core/gesture.ts";
import { gestured } from "../gesture.ts";
import { A4, corners, inset, pdf, type Pt, type Quad, turn, warp } from "./page.ts";

/// One scanned page: the photo, its corners, the ones found first, and the corrected JPEG with a URL to draw it.
export type Page = { photo: ImageBitmap; quad: Quad; auto: Quad; jpeg: Uint8Array<ArrayBuffer>; url: string };
/// What the scanner gives back: the PDF, and the pages to edit again.
export type Scanned = { pdf: Blob; pages: Page[] };
/// What the scanner is opened with: the field's label, its page limit, its words, and the pages of an earlier scan.
export type Opts = { label: string; max: number; w(key: string): string; pages?: Page[] | undefined };

type Ask = { op: "find"; frame: ImageBitmap } | { op: "page"; photo: ImageBitmap; quad: Quad } | { op: "pdf"; pages: Uint8Array[] };
type Reply = { id: number; quad?: Quad | null; jpeg?: Blob; pdf?: Blob; made?: number };
type Edit = { photo: ImageBitmap; quad: Quad; auto: Quad; at: number };
type S = {
  o: Opts;
  pages: Page[];
  step: "capture" | "corners" | "review" | "pdf";
  sel: number;
  made: number;
  cam: "wait" | "on" | "none" | "denied";
  live?: Quad | null;
  edit?: Edit | undefined;
  at: number;
  open: boolean;
  queue: ImageBitmap[];
  box: HTMLElement;
  video: HTMLVideoElement;
  input: HTMLInputElement;
  focus: number;
  close(out?: Scanned): void;
};

const scaled = (q: Quad, k: number): Quad => {
  const f = ([x, y]: Pt): Pt => [x / k, y / k];
  return [f(q[0]), f(q[1]), f(q[2]), f(q[3])];
};
const pixels = (b: ImageBitmap, long = Infinity) => {
  const k = Math.min(1, long / Math.max(b.width, b.height)), c = new OffscreenCanvas(Math.round(b.width * k), Math.round(b.height * k));
  const x = c.getContext("2d", { willReadFrequently: true });
  x?.drawImage(b, 0, 0, c.width, c.height);
  return { k, img: x?.getImageData(0, 0, c.width, c.height) ?? new ImageData(1, 1) };
};

async function work(a: Ask, made: (n: number) => void): Promise<Omit<Reply, "id">> {
  if (a.op === "find") {
    const { k, img } = pixels(a.frame, 640), q = corners(img);
    return { quad: q ? scaled(q, k) : null };
  }
  if (a.op === "page") {
    const xs = a.quad.map(([x]) => x), ys = a.quad.map(([, y]) => y), x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const sw = Math.min(a.photo.width, Math.ceil(Math.max(...xs))) - x0, sh = Math.min(a.photo.height, Math.ceil(Math.max(...ys))) - y0;
    const k = Math.min(1, Math.max(...A4) / Math.max(sw, sh, 1)), crop = new OffscreenCanvas(Math.max(1, Math.round(sw * k)), Math.max(1, Math.round(sh * k)));
    const cx = crop.getContext("2d", { willReadFrequently: true });
    cx?.drawImage(a.photo, x0, y0, sw, sh, 0, 0, crop.width, crop.height);
    const f = ([x, y]: Pt): Pt => [(x - x0) * k, (y - y0) * k], [p, q, r, t] = a.quad;
    const c = new OffscreenCanvas(A4[0], A4[1]), page = warp(cx?.getImageData(0, 0, crop.width, crop.height) ?? new ImageData(1, 1), [f(p), f(q), f(r), f(t)]);
    c.getContext("2d")?.putImageData(new ImageData(page.data, A4[0], A4[1]), 0, 0);
    return { jpeg: await c.convertToBlob({ type: "image/jpeg", quality: 0.8 }) };
  }
  const jpegs = [];
  for (const bytes of a.pages) made(jpegs.push({ bytes, width: A4[0], height: A4[1] }));
  return { pdf: pdf(jpegs) };
}

if (typeof document === "undefined")
  addEventListener("message", (e: MessageEvent<Ask & { id: number }>) => {
    const id = e.data.id;
    work(e.data, (made) => postMessage({ id, made })).then((out) => postMessage({ id, ...out }));
  });

let worker: Worker | undefined, seq = 0;
const waiting = new Map<number, { done(r: Reply): void; made?: ((n: number) => void) | undefined }>();
function ask(a: Ask, made?: (n: number) => void): Promise<Reply> {
  if (!worker) {
    worker = new Worker(import.meta.url, { type: "module" });
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const w = waiting.get(e.data.id);
      if (e.data.made) return w?.made?.(e.data.made);
      waiting.delete(e.data.id);
      w?.done(e.data);
    };
  }
  const id = ++seq;
  worker.postMessage({ ...a, id });
  return new Promise((done) => waiting.set(id, { done, made }));
}
/// The corners found in `photo`, or the frame's inset when none are.
export const quadOf = async (photo: ImageBitmap): Promise<Quad> => (await ask({ op: "find", frame: photo })).quad ?? inset(photo.width, photo.height);
/// The page inside `quad` in `photo`, corrected to A4 and drawn to a JPEG in the worker.
export const pageOf = async (photo: ImageBitmap, quad: Quad, auto: Quad): Promise<Page> => {
  const jpeg = new Uint8Array((await (await ask({ op: "page", photo, quad })).jpeg?.arrayBuffer()) ?? new ArrayBuffer(0));
  return { photo, quad, auto, jpeg, url: URL.createObjectURL(new Blob([jpeg], { type: "image/jpeg" })) };
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", ...kids: (Node | string)[]) => {
  const e = document.createElement(tag);
  e.className = cls;
  e.append(...kids);
  return e;
};
const sv = (tag: string, attrs: Record<string, string>) => {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const btn = (label: string, f: () => unknown, cls = "", name = "", off = false) => {
  const b = Object.assign(el("button", cls, ...(label ? [el("span", "", label)] : [])), { type: "button", disabled: off, onclick: f });
  if (name) b.setAttribute("aria-label", name);
  return b;
};
const shown = (alt = "") => {
  const im = Object.assign(el("img"), { alt });
  if (!alt) im.setAttribute("aria-hidden", "true");
  return im;
};
const pts = (q: Quad) => q.map((p) => p.join(",")).join(" ");
const pct = ([x, y]: Pt, w: number, h: number) => `${Math.round((x / w) * 100)} %, ${Math.round((y / h) * 100)} %`;
const say = (s: S, k: string, v: Record<string, unknown> = {}) => s.o.w(k).replace(/\{(\w+)\}/g, (_, x: string) => String(v[x] ?? ""));
const full = (s: S) => s.pages.length >= s.o.max;
const go = (s: S, next: Partial<S>) => (Object.assign(s, next), paint(s));
const CORNERS = ["tl", "tr", "br", "bl"];
const STEP: Record<string, Pt | undefined> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

function adjust(s: S, e: Edit): HTMLElement {
  const { photo } = e, [w, h] = [photo.width, photo.height], v = el("div", "snv adjust");
  v.style.aspectRatio = `${w} / ${h}`;
  const c = Object.assign(el("canvas"), { width: Math.min(w, 1280), height: Math.round((h * Math.min(w, 1280)) / w) });
  c.setAttribute("aria-hidden", "true");
  c.getContext("2d")?.drawImage(photo, 0, 0, c.width, c.height);
  const svg = sv("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none", "aria-hidden": "true" }), mask = sv("path", { class: "snm" }), shape = sv("polygon", { class: "snq" });
  const lens = Object.assign(el("canvas", "snl"), { width: 240, height: 240, hidden: true });
  lens.setAttribute("aria-hidden", "true");
  svg.append(mask, shape);
  const fit = ([x, y]: Pt): Pt => [Math.min(w, Math.max(0, x)), Math.min(h, Math.max(0, y))];
  const knobs = CORNERS.map((k) => {
    const b = btn("", () => undefined, "snc", s.o.w(k));
    b.setAttribute("role", "slider");
    return b;
  });
  const place = (q: Quad, i = -1) => {
    shape.setAttribute("points", pts(q));
    mask.setAttribute("d", `M0 0H${w}V${h}H0Z M${q.map((p) => p.join(" ")).join("L")}Z`);
    knobs.forEach((b, j) => {
      const p = q[j] ?? [0, 0];
      Object.assign(b.style, { left: `${(p[0] / w) * 100}%`, top: `${(p[1] / h) * 100}%` });
      b.setAttribute("aria-valuetext", pct(p, w, h));
    });
    const p = q[i], r = v.getBoundingClientRect(), z = (lens.clientWidth * w) / (3 * (r.width || 1));
    lens.hidden = !p;
    if (!p) return;
    lens.getContext("2d")?.drawImage(photo, p[0] - z / 2, p[1] - z / 2, z, z, 0, 0, lens.width, lens.height);
    Object.assign(lens.style, { left: `${(p[0] / w) * 100}%`, top: `${(p[1] / h) * 100}%` });
    lens.classList.toggle("low", p[1] > h / 2);
  };
  let moved: Pt | null = null;
  knobs.forEach((b, i) => {
    b.append(el("i"));
    v.append(b);
    const by = (n: { dir: string; big?: boolean }, k: 0 | 1) => ((STEP[n.dir]?.[k] ?? 0) * (k ? h : w) * (n.big ? 10 : 1)) / 100;
    const rules: Rules<{ id: string }, number, Pt, Pt> = {
      word: () => "move",
      start: () => e.quad[i] ?? null,
      candidate: (_, _g, p) => fit(p),
      nudge: (_, _g, [x, y], n) => fit([x + by(n, 0), y + by(n, 1)]),
      steps: () => [],
      says: (_, _g, p) => `${s.o.w(CORNERS[i] ?? "")} ${pct(p, w, h)}`,
    };
    const reach = (dx: number, dy: number, x0: number, y0: number): Pt => {
      const r = v.getBoundingClientRect();
      return [((x0 + dx - r.left) / r.width) * w, ((y0 + dy - r.top) / r.height) * h];
    };
    const show = (p: Pt | null) => {
      moved = p;
      const q: Quad = [e.quad[0], e.quad[1], e.quad[2], e.quad[3]];
      if (p) q[i] = p;
      place(q, p ? i : -1);
    };
    const act = async () => {
      if (moved) e.quad[i] = moved;
      go(s, { focus: i });
      return true;
    };
    gestured(b, { act }, { block: { id: "corners" }, gesture: { action: "corner", name: "at" }, rules, grab: i, item: CORNERS[i] ?? "", reach, show });
  });
  v.prepend(c, svg);
  v.append(lens);
  place(e.quad);
  return v;
}

function camera(s: S): HTMLElement {
  const [w, h] = [s.video.videoWidth || 3, s.video.videoHeight || 4], v = el("div", `snv ${s.live ? "found" : "seek"}`);
  v.style.aspectRatio = `${w} / ${h}`;
  const svg = sv("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  svg.append(sv("polygon", { class: "snq", points: pts(s.live ?? inset(w, h)) }));
  v.append(s.video, svg);
  return v;
}

function strip(s: S): HTMLElement {
  const ol = el("ol", "snr");
  ol.setAttribute("aria-label", s.o.w("strip"));
  s.pages.forEach((p, i) => {
    const b = btn("", () => go(s, { sel: i, step: "review" }), "pg", `${say(s, "pageN", { n: i + 1 })}${s.sel === i && s.step === "review" ? `, ${s.o.w("review")}` : ""}`);
    b.append(Object.assign(shown(), { src: p.url }));
    if (s.sel === i) b.setAttribute("aria-current", "true");
    const li = el("li", s.sel === i ? "sel" : "", b, el("span", "", String(i + 1)));
    li.draggable = s.step === "review";
    li.ondragstart = (e) => e.dataTransfer?.setData("text/plain", String(i));
    li.ondragover = (e) => e.preventDefault();
    li.ondrop = (e) => {
      const [moved] = s.pages.splice(Number(e.dataTransfer?.getData("text/plain")), 1);
      if (moved) s.pages.splice(i, 0, moved);
      go(s, { sel: i });
    };
    ol.append(li);
  });
  if (!full(s)) ol.append(el("li", "add", btn(s.o.w("addPage"), () => go(s, { step: "capture", at: s.pages.length }), "pg", "", s.step === "pdf"), el("span", "", "+")));
  return ol;
}

function review(s: S, page: Page): HTMLElement[] {
  const busy = s.step === "pdf", n = s.pages.length;
  const swap = (d: number) => {
    const [p] = s.pages.splice(s.sel, 1);
    if (p) s.pages.splice(s.sel + d, 0, p);
    go(s, { sel: s.sel + d });
  };
  const turned = async () => {
    s.pages[s.sel] = await pageOf(page.photo, turn(page.quad), page.auto);
    go(s, {});
  };
  const drop = () => {
    s.pages.splice(s.sel, 1);
    go(s, { sel: Math.max(0, s.sel - 1), step: s.pages.length ? "review" : "capture", at: s.pages.length });
  };
  const retake = () => {
    go(s, { step: "capture", at: s.sel });
    if (s.cam !== "on") s.input.click();
  };
  const acts = el(
    "div",
    "sna",
    btn(s.o.w("retake"), retake, "", "", busy),
    btn(s.o.w("corners"), () => go(s, { edit: { photo: page.photo, quad: [...page.quad], auto: page.auto, at: s.sel }, step: "corners" }), "", "", busy),
    btn(s.o.w("rotate"), turned, "", "", busy),
    btn(s.o.w("earlier"), () => swap(-1), "", "", busy || !s.sel),
    btn(s.o.w("later"), () => swap(1), "", "", busy || s.sel === n - 1),
    btn(s.o.w("delete"), drop, "bad", "", busy),
  );
  return [Object.assign(shown(say(s, "pageN", { n: s.sel + 1 })), { className: "snp", src: page.url }), acts];
}

function bar(s: S): HTMLElement[] {
  const n = s.pages.length, doneN = say(s, n > 1 ? "doneN" : "done1", { n });
  if (s.step === "capture") {
    const last = s.pages[n - 1], thumb = btn("", () => go(s, { step: "review" }), "snk", `${s.o.w("review")}: ${doneN}`);
    if (last) thumb.append(Object.assign(shown(), { src: last.url }), el("b", "", String(n)));
    const shutter = btn("", () => shoot(s), "sno", say(s, "take", { n: s.at + 1 }), full(s) || s.cam !== "on");
    shutter.append(el("i"));
    return [last ? thumb : el("span"), shutter, btn(doneN, () => go(s, { step: "review" }), "", "", !n)];
  }
  if (s.step === "corners") return [btn(s.o.w("retake"), () => go(s, { edit: undefined, step: "capture" })), el("span"), btn(s.o.w("usePage"), () => use(s))];
  if (s.step === "review") return [btn(s.o.w("addPage"), () => go(s, { step: "capture", at: n }), "", "", full(s)), el("span"), btn(doneN, () => finish(s), "", "", !n)];
  const line = say(s, "making", { n: s.made, of: n }), meter = el("span", "pgt", el("b"));
  for (const [k, v] of [["role", "progressbar"], ["aria-valuemin", "0"], ["aria-valuemax", String(n)], ["aria-valuenow", String(s.made)], ["aria-label", line]] as const) meter.setAttribute(k, v);
  meter.style.setProperty("--v", String(Math.round((s.made / n) * 100)));
  const d = btn(doneN, () => undefined, "", "", true);
  d.setAttribute("aria-busy", "true");
  return [el("span"), el("span"), el("div", "snx", d, meter, el("span", "", line))];
}

function body(s: S): HTMLElement {
  const out = el("div", "sns"), page = s.pages[s.sel];
  if (s.step === "capture" && (s.cam === "none" || s.cam === "denied")) {
    const [b, why] = s.cam === "denied" ? ["denied", "deniedWhy"] : ["noCam", "noCamWhy"];
    out.append(el("div", "sne", el("b", "", s.o.w(b)), el("span", "", s.o.w(why)), btn(s.o.w("pickImages"), () => s.input.click(), "", "", full(s))));
    return out;
  }
  if ((s.step === "review" || s.step === "pdf") && page) return out.append(...review(s, page)), out;
  out.append(s.step === "corners" && s.edit ? adjust(s, s.edit) : camera(s));
  const [cls, line] = s.step === "corners" ? ["", "drag"] : full(s) ? [" warn", "limit"] : s.live === undefined ? ["", "seek"] : s.live ? [" ok", "found"] : [" warn", "noEdge"];
  const st = el("div", `snt${cls}`, say(s, line, { n: s.pages.length }));
  st.setAttribute("role", "status");
  out.append(st);
  return out;
}

function paint(s: S): void {
  if (!s.open) return;
  const listed = s.step === "review" || s.step === "pdf";
  s.box.className = `scn${listed ? " review" : ""}`;
  const title = listed ? say(s, "pageOf", { n: s.sel + 1, of: s.pages.length }) : say(s, "pageN", { n: (s.edit?.at ?? s.at) + 1 });
  const head = el("div", "snh", btn(s.o.w("cancel"), () => s.close()), el("span", "tw", `${s.o.label} `, el("small", "", `· ${title}`)));
  if (s.step === "capture") head.append(btn(s.o.w("pickImages"), () => s.input.click(), "", "", full(s)));
  const e = s.edit;
  if (s.step === "corners" && e) head.append(btn(s.o.w("reset"), () => go(s, { edit: { ...e, quad: [...e.auto] } })));
  s.box.replaceChildren(head, body(s), strip(s), el("div", "snb", ...bar(s)));
  if (s.focus >= 0) s.box.querySelectorAll<HTMLElement>(".snc")[s.focus]?.focus();
  s.focus = -1;
}

async function next(s: S, back = false) {
  const photo = s.queue.shift();
  if (!photo) return go(s, { step: back || (s.pages.length && s.cam !== "on") ? "review" : "capture" });
  const quad = await quadOf(photo);
  go(s, { edit: { photo, quad, auto: quad, at: s.at }, step: "corners" });
}
async function shoot(s: S) {
  s.queue.push(await createImageBitmap(s.video));
  return next(s);
}
async function use(s: S) {
  const e = s.edit;
  if (!e) return;
  const page = await pageOf(e.photo, e.quad, e.auto), back = e.at < s.pages.length;
  s.pages.splice(e.at, back ? 1 : 0, page);
  Object.assign(s, { sel: e.at, at: s.pages.length, edit: undefined });
  return next(s, back);
}
async function finish(s: S) {
  go(s, { step: "pdf" });
  const r = await ask({ op: "pdf", pages: s.pages.map((p) => p.jpeg) }, (made) => go(s, { made }));
  s.close({ pdf: r.pdf ?? new Blob(), pages: s.pages });
}
async function look(s: S) {
  while (s.open && s.cam === "on") {
    const t = performance.now(), [vw, vh] = [s.video.videoWidth, s.video.videoHeight];
    if (s.step === "capture" && vw) {
      const k = 640 / Math.max(vw, vh), frame = await createImageBitmap(s.video, { resizeWidth: Math.round(vw * k), resizeHeight: Math.round(vh * k) });
      const q = (await ask({ op: "find", frame })).quad, was = !!s.live;
      s.live = q ? scaled(q, k) : null;
      const shape = s.box.querySelector(".snv.found .snq, .snv.seek .snq");
      if (was !== !!s.live) paint(s);
      else if (shape && s.live) shape.setAttribute("points", pts(s.live));
    }
    await new Promise((r) => setTimeout(r, Math.max(0, 100 - (performance.now() - t))));
  }
}

/// Opens the scanner over the page: capture, corners and review, then the PDF; `undefined` when it is cancelled.
export function scan(o: Opts): Promise<Scanned | undefined> {
  const dlg = el("dialog", "scd"), video = Object.assign(el("video"), { muted: true, playsInline: true, autoplay: true });
  const input = Object.assign(el("input"), { type: "file", accept: "image/*", multiple: true, hidden: true });
  video.setAttribute("aria-hidden", "true");
  return new Promise((done) => {
    const pages = [...(o.pages ?? [])];
    const s: S = { o, pages, step: pages.length ? "review" : "capture", sel: 0, made: 0, cam: "wait", at: pages.length, open: true, queue: [], box: el("div", "scn"), video, input, focus: -1, close: () => undefined };
    let stream: MediaStream | undefined;
    s.close = (out) => {
      s.open = false;
      stream?.getTracks().forEach((t) => t.stop());
      dlg.close();
      dlg.remove();
      done(out);
    };
    dlg.setAttribute("aria-label", o.label);
    dlg.append(el("div", "scw", s.box), input);
    dlg.addEventListener("cancel", (e) => (e.preventDefault(), s.close()));
    document.body.append(dlg);
    dlg.showModal();
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, o.max - s.pages.length);
      input.value = "";
      s.queue.push(...(await Promise.all(files.map((f) => createImageBitmap(f)))));
      next(s);
    };
    paint(s);
    if (!navigator.mediaDevices?.getUserMedia) return go(s, { cam: "none" });
    const started = (m: MediaStream) => {
      stream = m;
      video.srcObject = m;
      go(s, { cam: "on" });
      look(s);
    };
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 4032 }, height: { ideal: 3024 } } })
      .then(started, (e: unknown) => go(s, { cam: e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "none" }));
  });
}
