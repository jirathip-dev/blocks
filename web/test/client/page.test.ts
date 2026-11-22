import { deepStrictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { webkit } from "playwright";

const repo = new URL("../../../", import.meta.url);
const file = (p) => readFileSync(new URL(p, repo));
const wasm = process.env["METER_WASM"] ?? new URL("demo/client/target/wasm32-unknown-unknown/release/meter.wasm", repo).pathname;
const fixture = (name) => JSON.parse(file(`fixtures/client/${name}`).toString());
const BASE = "http://meter.test/";
const browser = await webkit.launch();
after(() => browser.close());

const caller = (x) => (name, text = "") => {
  const sent = new TextEncoder().encode(text);
  new Uint8Array(x.memory.buffer, x.text(sent.length), sent.length).set(sent);
  x[name]();
  return new TextDecoder().decode(new Uint8Array(x.memory.buffer, x.text_at(), x.text_len()));
};

test("the wasm32 build answers what the native test wrote", async () => {
  const call = caller((await WebAssembly.instantiate(readFileSync(wasm))).instance.exports);
  deepStrictEqual(JSON.parse(call("screen")), fixture("screen.json"));
  deepStrictEqual(JSON.parse(call("act", JSON.stringify(fixture("send.json").action))), fixture("send.json").answer);
  deepStrictEqual(JSON.parse(call("act", "no action")), {});
});

test("the example page draws the Rust screen and applies its ops with no request beyond its own files", async () => {
  const files = {
    "": ["demo/client/web/index.html", "text/html"],
    "main.js": ["demo/client/web/main.js", "text/javascript"],
    "blocks.js": ["web/dist/blocks.js", "text/javascript"],
    "blocks.css": ["web/dist/blocks.css", "text/css"],
  };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const asked = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (r) => {
    const url = r.request().url();
    const p = url.startsWith(BASE) ? url.slice(BASE.length) : url;
    asked.push(p);
    if (p === "meter.wasm") return r.fulfill({ body: readFileSync(wasm), contentType: "application/wasm" });
    const [path, contentType] = files[p] ?? [];
    return path ? r.fulfill({ body: file(path), contentType }) : r.abort();
  });
  await page.goto(BASE);
  await page.getByRole("button", { name: "Send one" }).click();
  await page.getByText("Send 0").waitFor();
  await page.getByRole("button", { name: "Send one" }).click();
  await page.getByText("Send 1").waitFor();
  const list = page.locator('[data-id="sends"]');
  deepStrictEqual(await list.locator("[data-id^='send-']").evaluateAll((rows) => rows.map((r) => r.dataset.id)), ["send-0", "send-1"]);
  deepStrictEqual([...new Set(asked)].sort(), ["", "blocks.css", "blocks.js", "main.js", "meter.wasm"]);
  deepStrictEqual(errors, []);
  await page.close();
});
