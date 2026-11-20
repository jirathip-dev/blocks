import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { read } from "../src/play/fault.ts";
import { pack, unpack } from "../src/play/pack.ts";

const screen = {
  type: "screen",
  id: "today",
  blocks: [{ type: "stat", id: "week", items: [{ label: "open", value: 3 }] }, { type: "text", id: "note", markdown: "Ship on **Friday** · ünïcode ✓" }],
};
const pretty = JSON.stringify(screen, null, 2);

test("pack writes base64url deflate-raw that unpack turns back into the same screen", async () => {
  const packed = await pack(pretty);
  ok(/^[A-Za-z0-9_-]+$/.test(packed), packed);
  const raw = await new Response(new Blob([JSON.stringify(screen)]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
  strictEqual(packed, Buffer.from(raw).toString("base64url"));
  strictEqual(await unpack(packed), pretty);
  deepStrictEqual(JSON.parse(await unpack(await pack(JSON.stringify(screen)))), screen);
});

test("read gives the screen, or marks the line and token where it stops being JSON", () => {
  deepStrictEqual(read(pretty), { value: screen });
  const lines = pretty.split("\n");
  const at = lines.findIndex((l) => l.includes('"id": "week"'));
  const broken = lines.map((l, i) => (i === at ? l.replace(/,$/, "") : l)).join("\n");
  deepStrictEqual(read(broken), { mark: { line: at + 2, col: 7, len: 7, why: "not JSON: expected a comma or }" } });
  deepStrictEqual(read('{"type": "screen",}'), { mark: { line: 1, col: 19, len: 1, why: "not JSON: expected a key in quotes" } });
});

test("read marks the line of the first schema fault check() finds", () => {
  const unknown = pretty.replace('"type": "stat"', '"type": "stats"');
  deepStrictEqual(read(unknown), { mark: { line: 6, col: 7, len: 15, why: 'schema: "stats" is not a kind' } });
  const twice = pretty.replace('"id": "note"', '"id": "week"');
  const m = read(twice);
  ok("mark" in m && m.mark.line === pretty.split("\n").findIndex((l) => l.includes('"note"')) + 1 && m.mark.why === "schema: two blocks have the id week", JSON.stringify(m));
  const extra = read(pretty.replace('"markdown"', '"markdwn"'));
  ok("mark" in extra && extra.mark.why === "schema: a text has no field markdwn", JSON.stringify(extra));
});
