import { readdirSync, readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import { webkit } from "playwright";
import { native } from "../src/gen/kinds.ts";
import { native as drawn } from "../react/src/view.ts";
import { defaultPair } from "../src/gen/schemes.ts";
import { tiles, css as wear } from "../src/theme.ts";
import { tree } from "../src/core/tree.ts";
import { at, blocks } from "./at.ts";
import { leaks, pick } from "./file.ts";
import { gesture } from "./gesture.ts";
import { declared, measure } from "./look.ts";

const BASE = "http://blocks.test/";
const BUDGET_MS = 16.7;
const dist = (f) => readFileSync(new URL(`../dist/${f}`, import.meta.url));
const LOOK = `${tiles}${wear(defaultPair.light)}@media (prefers-color-scheme: dark){${wear(defaultPair.dark)}}html{color:var(--fg)}`;
const ECHO = `customElements.define("x-echo", class extends HTMLElement {
  set props(p) { this.textContent = JSON.stringify(p); this.dispatchEvent(new CustomEvent("blocks-event", { bubbles: true, detail: { name: "echo", values: p } })); }
});`;
const CHECKED = ["render/tree", "render/no-size", "render/overflow", "render/overlap", "render/no-name"];
const PROBES = await Promise.all(readdirSync(new URL("./probe/", import.meta.url)).sort().map((f) => import(`./probe/${f}`)));
let bundled;
/// The React boot (`shot/react.ts`) as one script that sets `window.R`, built once.
export const reactJs = () => (bundled ??= buildSync({ entryPoints: [new URL("./react.ts", import.meta.url).pathname], bundle: true, format: "iife", globalName: "R", write: false, define: { "process.env.NODE_ENV": '"production"' } }).outputFiles[0].text);
const PAGE = (css, scripts, adapter) =>
  `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><link rel=stylesheet href=look.css>${css.map((_, i) => `<link rel=stylesheet href=css/${i}>`).join("")}` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script><script>${ECHO}${at}</script>${scripts.map((_, i) => `<script src=js/${i}></script>`).join("")}${adapter === "react" ? "<script src=react.js></script>" : ""}`;

/// What the `css/` probes see in the stylesheet `file`, as `Seen`s.
export const sheets = (file) => PROBES.filter((p) => p.sheet).flatMap((p) => p.sheet(readFileSync(file, "utf8")).map((s) => ({ rule: p.rule, at: "", file, ...s })));

function boot(screen) {
  const B = window.B;
  const root = document.getElementById("root");
  const h = { model: screen, sent: [], dropped: [], files: [] };
  const file = (_, a) => (h.files.push(a.name), h.handler === "fails" ? Promise.reject(new Error("refused")) : h.handler === "waits" ? new Promise(() => {}) : Promise.resolve({ id: `file-${h.files.length}`, name: a.name }));
  const ctx = {
    file, screen: String(screen.id ?? ""),
    act: async (a) => (h.sent.push({ screen: ctx.screen, action: a.action, block: a.block ?? null, values: a.values ?? null }), h.hold ? new Promise((done) => (h.wait = done)) : true),
    tap: (t) => typeof t?.action === "string" && ctx.act({ action: t.action, values: t.values }),
    open: new Set(),
    theme: B.plain,
    store: { get: () => null, put: () => {} },
    drop: (what) => h.dropped.push(what),
    apps: window.blocksApps,
    held: new Map(),
  };
  const R = window.R, out = { sent: (a) => (h.sent.push(a), h.hold ? new Promise((done) => (h.wait = done)) : true), dropped: (w) => h.dropped.push(w), file };
  const sync = R ? () => {} : B.behave(root, () => h.model);
  h.paint = R ? () => (h.react ? h.react.set(h.model) : (h.react = R.boot(root, h.model, out))) : () => (root.replaceChildren(...[B.render(h.model, ctx)].filter(Boolean)), sync());
  h.ops = (ops) => ((h.model = (ops?.length && B.apply(h.model, ops)) || h.model), h.paint());
  h.patch = [];
  const p = B.patcher({ root, draw: (b) => B.render(b, ctx), grow: B.grow, sync: { plot: B.plotSync }, model: () => ((h.t = performance.now()), h.model), saved: () => (sync(), h.patch.push(performance.now() - h.t)) });
  h.frame = (f) => {
    const next = f.screen ?? (f.ops?.length && B.apply(h.model, f.ops));
    if (next) h.model = next;
    if (f.screen || R) h.paint();
    else if (next) p.queue(f.ops);
  };
  h.meter = () => {
    const out = [];
    let on = true, busy = 0;
    const tick = () => {
      if (!on) return;
      const t0 = performance.now();
      requestAnimationFrame(tick);
      const ch = new MessageChannel();
      ch.port1.onmessage = () => (out.push(performance.now() - t0 + busy), (busy = 0));
      ch.port2.postMessage(0);
    };
    requestAnimationFrame(tick);
    return { add: (ms) => (busy += ms), stop: () => ((on = false), out.slice()) };
  };
  const settle = (m, done) => requestAnimationFrame(() => requestAnimationFrame(() => done(m.stop())));
  h.burst = (frames) =>
    new Promise((done) => {
      const m = h.meter(), took = [];
      const id = setInterval(() => {
        const t0 = performance.now();
        h.frame(frames[took.length]);
        took.push(performance.now() - t0);
        m.add(took.at(-1));
        if (took.length === frames.length) clearInterval(id), settle(m, (f) => done({ took, frames: f }));
      }, 1000 / 60);
    });
  h.scroll = (id) =>
    new Promise((done) => {
      const el = root.querySelector(`[data-block][data-id="${CSS.escape(id)}"]`);
      const m = h.meter();
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      let last, still = 0, n = 0;
      const watch = () => {
        const y = el?.getBoundingClientRect().top;
        still = y === last ? still + 1 : 0;
        last = y;
        if (still < 5 && ++n < 600) requestAnimationFrame(watch);
        else settle(m, done);
      };
      requestAnimationFrame(watch);
    });
  h.dump = () => B.dump(root)[0] ?? null;
  h.ids = () => ({
    blocks: Array.from(root.querySelectorAll("[data-block][data-id]"), (e) => e.dataset.id),
    actions: Array.from(root.querySelectorAll("[data-action]"), (e) => e.dataset.action),
  });
  root.addEventListener("redraw", h.paint);
  window.h = h;
  const t0 = performance.now();
  h.paint();
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t0))));
}

/// Draws `screen` in WebKit in `scheme`, runs `steps`, and gives each shot's PNG and tree, the report, what the probes saw and the failed checks.
export async function shot({ screen, steps = [], name = "shot", size = "390x844", css = [], scripts = [], kinds = [], expect, ids, check = false, probes = false, scheme = "light", look = false, adapter = "html", browser }) {
  const [width, height] = size.split("x").map(Number);
  const own = browser ?? (await webkit.launch());
  const page = await own.newPage({ viewport: { width, height }, colorScheme: scheme });
  try {
    await page.route("**/*", (r) => {
      const p = r.request().url().slice(BASE.length);
      if (!r.request().url().startsWith(BASE)) return r.abort();
      if (p === "") return r.fulfill({ body: PAGE(css, scripts, adapter), contentType: "text/html" });
      if (p.startsWith("js/")) return r.fulfill({ body: readFileSync(scripts[Number(p.slice(3))]), contentType: "text/javascript" });
      if (p === "react.js") return r.fulfill({ body: reactJs(), contentType: "text/javascript" });
      if (p === "look.css") return r.fulfill({ body: LOOK, contentType: "text/css" });
      if (p.startsWith("css/")) return r.fulfill({ body: readFileSync(css[Number(p.slice(4))]), contentType: "text/css" });
      if (p === "blocks.js" || p === "import.js" || p === "scan.js" || p === "blocks.css") return r.fulfill({ body: dist(p), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
      return r.fulfill({ status: 404 });
    });
    const logged = [];
    if (probes || check) page.on("pageerror", (e) => logged.push(e.message));
    if (probes || check) page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && logged.push(m.text()));
    await page.goto(BASE);
    await page.waitForFunction(() => window.B);
    const report = { shots: [], sent: [], dropped: [], timings: { first_paint_ms: await page.evaluate(boot, screen), steps_ms: [] } };
    const pngs = {}, trees = {}, seen = [], faults = [], frames = [];
    const script = steps.some((s) => s.shot) ? steps : [...steps, { shot: { name } }];
    for (let i = 0; i < script.length; i++) {
      const s = script[i];
      if (s.frame) {
        let j = i;
        while (script[j + 1]?.frame) j++;
        const run = await page.evaluate((fs) => window.h.burst(fs), script.slice(i, j + 1).map((x) => x.frame));
        report.timings.steps_ms.push(...run.took);
        frames.push(...run.frames);
        i = j;
        continue;
      }
      const t0 = performance.now();
      const on = (id) => page.locator(`[data-block][data-id="${id}"], [data-act="${id}"]`).first();
      const hit = async (id, what) => {
        const t = on(id).locator(`xpath=descendant-or-self::*[${what}]`).first();
        return (await t.count()) ? t : on(id);
      };
      const live = async (t) => (await t.isVisible()) && (await t.isEnabled());
      const tap = s.tap && ((await on(s.tap.id).locator("[data-submit]").count()) ? on(s.tap.id).locator("[data-submit]").first() : await hit(s.tap.id, "self::button or self::a or @role='button'"));
      const type = s.type && (await hit(s.type.id, "self::input or self::textarea"));
      if (tap) await ((await live(tap)) ? tap.click() : report.dropped.push(`tap ${s.tap.id}`));
      if (type) await ((await live(type)) ? type.fill(s.type.text) : report.dropped.push(`type ${s.type.id}`));
      if (s.scroll) frames.push(...(await page.evaluate((id) => window.h.scroll(id), s.scroll.id)));
      if (s.answer) await page.evaluate((ops) => (window.h.ops(ops), window.h.wait?.(true)), s.answer.ops ?? []);
      await (s.gesture || s.refuse ? gesture(page, s) : s.file ? pick(page, s.file, report.dropped) : null);
      if (s.shot) {
        const n = s.shot.name;
        pngs[n] = await page.screenshot();
        trees[n] = await page.evaluate(() => window.h.dump());
        report.shots.push(n);
        const f = await page.evaluate(() => (document.activeElement instanceof HTMLInputElement ? `${document.activeElement.name}@${document.activeElement.selectionStart}` : ""));
        if (f) (report.focus ??= {})[n] = f;
        const want = expect ?? (probes ? tree(await page.evaluate(() => window.h.model), [...(adapter === "react" ? drawn : native), ...kinds]) : undefined);
        const cx = { page, width, logged, tree: trees[n], want, blocks: trees[n] ? blocks(trees[n]) : [] };
        for (const p of PROBES.filter((p) => p.shot && (probes || (check && CHECKED.includes(p.rule))))) seen.push(...(await p.shot(cx)).map((s) => ({ rule: p.rule, shot: n, ...s })));
        if (check && look) faults.push(...measure(pngs[n], trees[n], defaultPair[scheme].tokens, await declared(page)).map((f) => `${n}: ${f}`));
        const drew = ids && (await page.evaluate(() => window.h.ids()));
        if (check && ids && JSON.stringify(drew) !== JSON.stringify(ids)) faults.push(`${n}: drew ids ${JSON.stringify(drew)}, expected ${JSON.stringify(ids)}`);
      }
      report.timings.steps_ms.push(performance.now() - t0);
    }
    report.sent = await page.evaluate(() => window.h.sent);
    report.dropped.push(...(await page.evaluate(() => window.h.dropped)));
    if (frames.length) {
      report.timings.longest_frame_ms = Math.max(...frames);
      report.timings.frames_over_budget = frames.filter((f) => f > BUDGET_MS).length;
    }
    const patch = await page.evaluate(() => window.h.patch);
    if (patch.length) {
      const sorted = [...patch].sort((a, b) => a - b);
      report.timings.longest_patch_ms = sorted.at(-1);
      report.timings.p99_patch_ms = sorted[Math.ceil(sorted.length * 0.99) - 1];
    }
    faults.unshift(...seen.map((s) => `${s.shot}: ${s.rule} ${s.at}: ${s.detail}`), ...leaks(report.sent));
    return { report, pngs, trees, seen, faults };
  } finally {
    await page.close();
    if (!browser) await own.close();
  }
}
