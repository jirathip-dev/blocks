import { readFileSync } from "node:fs";
import { webkit } from "playwright";

const BASE = "http://blocks.test/";
const dist = (f) => readFileSync(new URL(`../dist/${f}`, import.meta.url));
const PAGE = (css) =>
  `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css>${css.map((_, i) => `<link rel=stylesheet href=css/${i}>`).join("")}` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;

function boot(screen) {
  const B = window.B;
  const root = document.getElementById("root");
  const h = { model: screen, sent: [] };
  const ctx = {
    screen: String(screen.id ?? ""),
    act: async (a) => (h.sent.push({ screen: ctx.screen, action: a.action, block: a.block ?? null, values: a.values ?? null }), true),
    tap: (t) => typeof t?.action === "string" && ctx.act({ action: t.action, values: t.values }),
    open: new Set(),
    theme: B.plain,
    store: { get: () => null, put: () => {} },
  };
  h.paint = () => root.replaceChildren(...[B.render(h.model, ctx)].filter(Boolean));
  h.ops = (ops) => ((h.model = (ops?.length && B.apply(h.model, ops)) || h.model), h.paint());
  h.frame = (f) => (f.screen ? ((h.model = f.screen), h.paint()) : h.ops(f.ops));
  h.dump = () => B.dump(root)[0] ?? null;
  root.addEventListener("redraw", h.paint);
  window.h = h;
  const t0 = performance.now();
  h.paint();
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t0))));
}

const who = (n) => `${n.kind}${n.id ? `#${n.id}` : ""}`;

function same(want, got, at, out) {
  if (!got || want.kind !== got.kind || (want.id ?? null) !== (got.id ?? null) || want.drawn !== got.drawn)
    return out.push(`${at}: drew ${got ? `${who(got)} ${got.drawn}` : "nothing"}, expected ${who(want)} ${want.drawn}`);
  if (want.children.length !== got.children.length) out.push(`${at}/${who(got)}: ${got.children.length} children, expected ${want.children.length}`);
  want.children.forEach((c, i) => same(c, got.children[i], `${at}/${who(got)}`, out));
}

function fit(n, width, at, out) {
  const here = `${at}/${who(n)}`;
  const [x, , w, h] = n.rect ?? [0, 0, 0, 0];
  if (!(w > 0 && h > 0)) out.push(`${here}: has no size`);
  if (x < -0.5 || x + w > width + 0.5) out.push(`${here}: leaves the screen's width`);
  const kids = n.children.filter((c) => c.drawn !== "hidden");
  const over = (a, b) => Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 0.5 && Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0.5;
  kids.forEach((a, i) => kids.slice(i + 1).forEach((b) => over(a.rect, b.rect) && out.push(`${here}: ${who(a)} overlaps ${who(b)}`)));
  kids.forEach((c) => fit(c, width, here, out));
}

/// Draws `screen` in WebKit, runs `steps`, and gives each shot's PNG and tree, the report and the failed checks.
export async function shot({ screen, steps = [], name = "shot", size = "390x844", css = [], expect, check = false, browser }) {
  const [width, height] = size.split("x").map(Number);
  const own = browser ?? (await webkit.launch());
  const page = await own.newPage({ viewport: { width, height } });
  try {
    await page.route("**/*", (r) => {
      const p = r.request().url().slice(BASE.length);
      if (!r.request().url().startsWith(BASE)) return r.abort();
      if (p === "") return r.fulfill({ body: PAGE(css), contentType: "text/html" });
      if (p.startsWith("css/")) return r.fulfill({ body: readFileSync(css[Number(p.slice(4))]), contentType: "text/css" });
      if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: dist(p), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
      return r.fulfill({ status: 404 });
    });
    await page.goto(BASE);
    await page.waitForFunction(() => window.B);
    const report = { shots: [], sent: [], dropped: [], timings: { first_paint_ms: await page.evaluate(boot, screen), steps_ms: [] } };
    const pngs = {}, trees = {}, faults = [];
    const script = steps.some((s) => s.shot) ? steps : [...steps, { shot: { name } }];
    for (const s of script) {
      const t0 = performance.now();
      const on = (id) => page.locator(`[data-block][data-id="${id}"]`).first();
      const hit = (id, what) => on(id).locator(`xpath=descendant-or-self::*[${what}]`).or(on(id)).first();
      if (s.tap) await hit(s.tap.id, "self::button or self::a or @role='button'").click();
      if (s.type) await hit(s.type.id, "self::input or self::textarea").fill(s.type.text);
      if (s.scroll) await on(s.scroll.id).scrollIntoViewIfNeeded();
      if (s.frame) await page.evaluate((f) => window.h.frame(f), s.frame);
      if (s.answer) await page.evaluate((ops) => window.h.ops(ops), s.answer.ops ?? []);
      if (s.shot) {
        const n = s.shot.name;
        pngs[n] = await page.screenshot();
        trees[n] = await page.evaluate(() => window.h.dump());
        report.shots.push(n);
        if (check && expect) same(expect, trees[n], n, faults);
        if (check && trees[n]) fit(trees[n], width, n, faults);
      }
      report.timings.steps_ms.push(performance.now() - t0);
    }
    report.sent = await page.evaluate(() => window.h.sent);
    return { report, pngs, trees, faults };
  } finally {
    await page.close();
    if (!browser) await own.close();
  }
}
