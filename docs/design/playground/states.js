// Preview-only: six fixed states of the playground, drawn by the same panes as playground.html.
import { pack, unpack, h } from "./play.js";
import { playground, settled } from "./page.js";
import { samples } from "./samples.js";

const stat = samples.find((s) => s.name === "stat").json;
const tile = (title, caption, ...kids) =>
  h("div", "pg-state", h("h3", "sh", title), h("p", "pg-from", caption), ...kids);
const sheet = document.getElementById("sheet");
const waits = [];

const notJson = playground({ sample: "stat", text: stat.replace('"value": 3\n', '"value": 3\n').replace('"label": "open",', '"label": "open"'), rows: 13 });
sheet.append(tile("1 · Not JSON", "A missing comma. The line is marked in the gutter and under the token; the message is under the box; the preview keeps the last good screen.", notJson.edit, notJson.prev));

const schema = playground({ sample: "stat", text: stat.replace('"type": "stat"', '"type": "stats"'), rows: 13 });
sheet.append(tile("2 · Breaks the schema", "Valid JSON, but not a blocks screen: the same marks, the schema's path and a near kind.", schema.edit, schema.prev));

const rust = playground({ sample: "steps", tab: "rust", rows: 12 });
sheet.append(tile("3 · The Rust tab", "Read only, highlighted, with the source's own line numbers; the path links to the line on GitHub.", rust.edit));

const shared = playground({ sample: "stat", text: stat.replace('"value": 3', '"value": 5'), rows: 8 });
sheet.append(tile("4 · Shared", "share compresses the screen into #s=… (deflate-raw, base64url), writes it to the address and copies it.", shared.edit));
waits.push(shared.share.onclick());

const link = await pack(stat.replace('"value": 3', '"value": 5'));
const opened = playground({ sample: "stat", text: await unpack(link), shared: true, tab: "rust", rows: 8 });
sheet.append(tile("5 · Opened from a link", "The screen comes back from the hash. No sample is picked, so the Rust tab says why it is empty; reset goes back to a sample.", opened.edit));

const look = playground({ sample: "list", view: { look: "console", mode: "dark", width: 390 }, rows: 8 });
sheet.append(tile("6 · Preview switches", "Console, dark, 390: only the preview wears them. The page around it stays as the visitor's look and light/dark.", look.prev));

await Promise.all([...waits, notJson.ready, schema.ready, look.ready]);
await settled();
document.body.dataset.h = String(document.documentElement.scrollHeight);
