import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { gzipSync } from "node:zlib";
import { webkit } from "playwright";
import { fresh, KINDS, token } from "./rows.js";

const RUNS = Math.max(10, Number(process.env.BENCH_RUNS ?? 10));
const UPDATES = Number(process.env.BENCH_UPDATES ?? 1000);
const GAP_MS = 150;
const at = (p) => new URL(p, import.meta.url);
const say = (s) => process.stderr.write(`${s}\n`);

function start(cmd, args) {
  const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "inherit"] });
  return new Promise((ok, bad) => {
    p.stdout.once("data", (d) => ok({ url: String(d).split("\n")[0].trim(), p }));
    p.once("exit", (c) => bad(new Error(`${cmd} exited ${c}`)));
  });
}

function prelude() {
  const b = (window.__bench = { bytes: 0, pending: [], painted: null });
  const size = (t) => new TextEncoder().encode(t).length;
  const f = window.fetch;
  window.fetch = async (...a) => {
    const r = await f(...a);
    b.pending.push(r.clone().text().then((t) => (b.bytes += size(t))));
    return r;
  };
  const ES = window.EventSource;
  window.EventSource = class extends ES {
    constructor(...a) {
      super(...a);
      this.addEventListener("message", (e) => (b.bytes += size(e.data)));
    }
  };
  const drawn = () => document.querySelectorAll(".scr > .row").length >= 200;
  new MutationObserver((_, o) => {
    if (!drawn()) return;
    o.disconnect();
    requestAnimationFrame(() => (b.painted = performance.now()));
  }).observe(document, { childList: true, subtree: true });
}

async function update({ how, kind, tok }) {
  const b = window.__bench;
  await Promise.all(b.pending);
  b.pending = [];
  const from = b.bytes;
  const done = new Promise((ok, bad) => {
    const o = new MutationObserver(() => document.body.textContent.includes(tok) && (o.disconnect(), ok(performance.now())));
    o.observe(document.body, { childList: true, subtree: true, characterData: true });
    setTimeout(() => bad(new Error(`${tok} never drawn`)), 10000);
  });
  const t0 = performance.now();
  const sent =
    how === "fetch" ? fetch(`/bump/${kind}`, { method: "POST" }) : how === "bump" ? window.bump(kind) : document.getElementById(`u${["one", "insert", "twenty"].indexOf(kind) + 1}`).click();
  const t1 = await done;
  await sent;
  await Promise.all(b.pending);
  return { ms: t1 - t0, bytes: b.bytes - from };
}

const rowsOf = () => [...document.querySelectorAll(".scr > .row")].map((r) => [".rt", ".rs", ".rv"].map((s) => r.querySelector(s)?.textContent ?? "").join("|"));

async function open(ctx, t) {
  const page = await ctx.newPage();
  await page.goto(t.url);
  await page.waitForFunction(
    (how) => window.__bench.painted !== null && (how === "bump" ? typeof window.bump === "function" : how === "fetch" ? document.getElementById("root").dataset.stream === "live" : document.readyState === "complete"),
    t.how,
  );
  return page;
}

async function context(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(prelude);
  return ctx;
}

const webContent = () =>
  execFileSync("ps", ["-axo", "pid=,comm="], { encoding: "utf8" })
    .split("\n")
    .filter((l) => /WebContent|WebKitWebProcess/.test(l))
    .map((l) => ({ pid: Number(l.trim().split(/\s+/)[0]) }));

const secs = (t) => t.split(":").reduce((a, x) => a * 60 + Number(x), 0);

async function memory(t) {
  const server = await webkit.launchServer();
  const browser = await webkit.connect(server.wsEndpoint());
  try {
    const before = new Set(webContent().map((p) => p.pid));
    const page = await open(await context(browser), t);
    const mine = webContent().filter((p) => !before.has(p.pid)).map((p) => p.pid);
    if (!mine.length) throw new Error(`${t.name}: no new WebContent process`);
    for (let s = 1; s <= UPDATES; s++) {
      const kind = KINDS[(s - 1) % KINDS.length];
      await page.evaluate(update, { how: t.how, kind, tok: token(kind, s) });
    }
    await page.waitForTimeout(1000);
    const ps = execFileSync("ps", ["-o", "rss=,time=", "-p", mine.join(",")], { encoding: "utf8" });
    const [busiest] = ps.trim().split("\n").map((l) => l.trim().split(/\s+/)).sort((a, b) => secs(b[1]) - secs(a[1]));
    return Number(busiest[0]) / 1024;
  } finally {
    await browser.close();
    await server.close();
  }
}

async function scriptGzip(browser, t) {
  const ctx = await context(browser);
  const page = await ctx.newPage();
  const got = [];
  page.on("response", (r) => r.request().resourceType() === "script" && got.push(r.body().then((b) => gzipSync(b, { level: 9 }).length)));
  await page.goto(t.url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__bench.painted !== null);
  const n = (await Promise.all(got)).reduce((a, b) => a + b, 0);
  await ctx.close();
  return n;
}

async function measure(browser, t) {
  const cold = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await context(browser);
    cold.push(await (await open(ctx, t)).evaluate(() => window.__bench.painted));
    await ctx.close();
  }
  const ctx = await context(browser);
  const page = await open(ctx, t);
  const warm = [];
  for (let i = 0; i < RUNS; i++) {
    await page.goto(t.url);
    await page.waitForFunction(() => window.__bench.painted !== null);
    warm.push(await page.evaluate(() => window.__bench.painted));
  }
  await ctx.close();
  const live = await context(browser);
  const lp = await open(live, t);
  const by = Object.fromEntries(KINDS.map((k) => [k, { ms: [], bytes: [] }]));
  let s = 0;
  for (let i = 0; i < RUNS + 2; i++)
    for (const kind of KINDS) {
      await lp.waitForTimeout(GAP_MS);
      const r = await lp.evaluate(update, { how: t.how, kind, tok: token(kind, ++s) });
      if (i < 2) continue;
      by[kind].ms.push(r.ms);
      by[kind].bytes.push(r.bytes);
    }
  await live.close();
  const mem = [];
  for (let i = 0; i < RUNS; i++) mem.push(await memory(t));
  return { first_paint_cold_ms: cold, first_paint_warm_ms: warm, ...Object.fromEntries(KINDS.flatMap((k) => [[`update_${k}_ms`, by[k].ms], [`update_${k}_bytes`, by[k].bytes]])), script_gzip_bytes: [await scriptGzip(browser, t)], memory_after_updates_mb: mem };
}

function stat(xs) {
  const v = [...xs].sort((a, b) => a - b);
  const mid = v.length >> 1;
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return { median, min: v[0], max: v[v.length - 1], runs: v.length };
}

async function same(browser, targets) {
  const want = fresh().rows.map((r) => [r.title, r.subtitle, r.value].join("|"));
  for (const t of targets) {
    const ctx = await context(browser);
    const got = await (await open(ctx, t)).evaluate(rowsOf);
    await ctx.close();
    if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${t.name} draws ${got.length} rows, not the 200 expected (first: ${got[0]})`);
  }
}

const lock = (f) => readFileSync(at(f), "utf8");
const npmVersion = (name) => JSON.parse(lock("package-lock.json")).packages[`node_modules/${name}`].version;
const crateVersion = (name) => lock("Cargo.lock").match(new RegExp(`name = "${name}"\\nversion = "([^"]+)"`))?.[1];

const fmt = (k, s) => {
  const f = (x) => (k.endsWith("_ms") ? x.toFixed(1) : k.endsWith("_mb") ? x.toFixed(0) : String(Math.round(x)));
  return s.runs === 1 || s.min === s.max ? f(s.median) : `${f(s.median)} (${f(s.min)}–${f(s.max)})`;
};

async function main() {
  const dir = JSON.parse(execFileSync("cargo", ["metadata", "--format-version", "1", "--no-deps", "--manifest-path", at("Cargo.toml").pathname], { encoding: "utf8" })).target_directory;
  const servers = await Promise.all([start(`${dir}/release/blocks-bench`, []), start(process.execPath, [at("react/server.js").pathname]), start(`${dir}/release/topcoat-bench`, [])]);
  const [b, r, tc] = servers.map((s) => s.url);
  const targets = [
    { name: "blocks", url: `${b}/`, how: "fetch" },
    { name: "react-csr", url: `${r}/csr`, how: "bump" },
    { name: "react-ssr", url: `${r}/ssr`, how: "bump" },
    { name: "topcoat", url: `${tc}/`, how: "click" },
  ];
  const browser = await webkit.launch();
  try {
    await same(browser, targets);
    say(`same rows: all ${targets.length} draw the same 200 rows`);
    const results = {};
    for (const t of targets) {
      say(`measuring ${t.name} (${RUNS} runs)`);
      results[t.name] = Object.fromEntries(Object.entries(await measure(browser, t)).map(([k, v]) => [k, stat(v)]));
    }
    const out = {
      date: new Date().toISOString().slice(0, 10),
      runs: RUNS,
      updates_for_memory: UPDATES,
      machine: { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memory_gb: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()}` },
      versions: { webkit: browser.version(), playwright: npmVersion("playwright"), react: npmVersion("react"), "react-dom": npmVersion("react-dom"), topcoat: crateVersion("topcoat"), node: process.versions.node },
      results,
    };
    writeFileSync(at("results.json"), `${JSON.stringify(out, null, 2)}\n`);
    const { versions, ...rest } = out;
    writeFileSync(at("../docs/bench-blocks.json"), `${JSON.stringify({ ...rest, versions: { webkit: versions.webkit }, results: results.blocks }, null, 2)}\n`);
    const keys = Object.keys(results.blocks);
    const table = [`| measure | ${targets.map((t) => t.name).join(" | ")} |`, `|---|${targets.map(() => "---|").join("")}`, ...keys.map((k) => `| ${k} | ${targets.map((t) => fmt(k, results[t.name][k])).join(" | ")} |`)].join("\n");
    process.stdout.write(`${table}\n`);
  } finally {
    await browser.close();
    for (const s of servers) s.p.kill();
  }
}

await main();
