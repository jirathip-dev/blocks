import type { Answer, Block, Op } from "../gen/types.ts";
import { behave } from "../behave.ts";
import { apply } from "../core/apply.ts";
import { type Blk, blks, isBlk } from "../core/tree.ts";
import { linkable } from "../render/act.ts";
import { obj, type Post, posted, type Store } from "../render/ctx.ts";
import { stream } from "../stream.ts";
import { plain, type Theme } from "../theme.ts";
import { type AppBlocks, host } from "./host.ts";
import { looks, type Worn, wearer } from "./look.ts";
import { sheet } from "./sheet.ts";
import { local } from "./store.ts";
import { decode } from "../core/code.ts";
import { toasts } from "../toasts.ts";

const drawn = (b: Blk): [string, string][] =>
  [...(typeof b["id"] === "string" ? [[b["id"], String(b["type"])] satisfies [string, string]] : []), ...["blocks", "rows", "buttons"].flatMap((k) => (Array.isArray(b[k]) ? b[k].filter(isBlk).flatMap(drawn) : []))];

function fits(model: Block, root: HTMLElement): boolean {
  const want = new Map(drawn(obj(model)));
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-block]"));
  const top = [obj(model), ...blks(obj(model)["blocks"])];
  const off =
    els.find((e) => e.dataset["id"] && want.get(e.dataset["id"]) !== e.dataset["block"])?.dataset["id"] ??
    top.find((b) => typeof b["id"] === "string" && !els.some((e) => e.dataset["id"] === b["id"] && e.dataset["block"] === b["type"]))?.["id"];
  if (off === undefined) return true;
  console.warn(`blocks: the page stays static, block ${off} is missing or differs`);
  return false;
}

type Wearer = ReturnType<typeof wearer>;

function shared(given: string, schemes: Record<string, Worn>, store: Store, w: Wearer & { show: (name: string | null, keep?: Store) => void }, notes: ReturnType<typeof toasts>) {
  history.replaceState(null, "", location.pathname + location.hash);
  const was = store.get("b:look");
  try {
    const { scheme } = decode(given);
    w.show(w.named(given) ?? given, store);
    const known = scheme === null || Object.prototype.hasOwnProperty.call(schemes, scheme);
    const title = known ? "Wearing a shared look" : `No scheme “${scheme}” here: wearing the shared style on the default colours`;
    notes.say({ title, tone: known ? "ok" : "warn", undo: { action: "look" } }, async () => (w.show(was, store), true));
  } catch (e) {
    notes.say({ title: `${e instanceof Error ? e.message : "not a look code"}: your look is unchanged`, tone: "bad" });
  }
}

/// Takes over a page `site` wrote without redrawing it: its forms post in place and the stream patches it; false: it stays static.
export function adopt(o: { theme?: Theme; store?: Store; blocks?: AppBlocks } = {}): boolean {
  const data = document.getElementById("blocks-screen");
  const root = document.querySelector("main");
  if (!data || !root) return false;
  let model: Block = JSON.parse(data.textContent ?? "null");
  if (!fits(model, root)) return false;
  const screen = String(obj(model)["id"] ?? "");
  const theme = o.theme ?? plain;
  const store = o.store ?? local();
  const schemes: Record<string, Worn> = JSON.parse(data.dataset["looks"] || "{}");
  const w = wearer(schemes, theme, document.head.querySelector("style"));
  const notes = toasts();
  document.body.append(notes.box);
  const wear = (name: string | null, keep?: Store) => {
    w.wear(name, keep);
    const c = w.code();
    if (c) document.querySelectorAll('[data-id="look-code"] code').forEach((e) => (e.textContent = c));
  };
  wear(store.get("b:look"));
  const given = typeof location.search === "string" ? new URLSearchParams(location.search).get("look") : null;
  if (given !== null) shared(given, schemes, store, { ...w, show: wear }, notes);
  const lk = sheet(() => {});
  const lookSheet = () => {
    lk.show("look", [looks(schemes, store, wear, lookSheet)]);
    if (!lk.box.isConnected) document.body.append(lk.box);
  };
  document.addEventListener("click", (e) => {
    const s = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-sheet],[data-copy]") : null;
    if (s) tap({ sheet: s.dataset["sheet"], copy: s.dataset["copy"] });
  });
  const act = async (a: Post): Promise<boolean> => {
    if (isBlk(a.confirm) && !confirm(String(a.confirm["title"] ?? ""))) return false;
    const body = posted(screen, a);
    const r = await fetch(data.dataset["action"] ?? "", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => undefined);
    const j: Answer = (await r?.json().catch(() => undefined)) ?? {};
    if (j.ops?.length) take(j.ops);
    if (j.open && linkable(j.open)) location.assign(j.open);
    return !!r?.ok;
  };
  const tap = (t: unknown) => {
    const x = obj(t);
    if (typeof x["url"] === "string") {
      if (linkable(x["url"])) open(x["url"], "_blank", "noopener");
    } else if (typeof x["open"] === "string") {
      if (linkable(x["open"])) location.assign(x["open"]);
    }
    else if (typeof x["action"] === "string") void act({ action: x["action"], values: x["values"] });
    else if (x["sheet"] === "look") lookSheet();
    else if (x["sheet"] === "look:code" || x["sheet"] === "look:link") {
      const link = `${location.origin}${location.pathname}?look=${encodeURIComponent(w.code())}`;
      void navigator.clipboard?.writeText(x["sheet"] === "look:code" ? w.code() : link).then(() => notes.say({ title: "copied" }));
    } else if (typeof x["sheet"] === "string" && x["sheet"].startsWith("look:") && x["sheet"] !== "look:shared") wear(x["sheet"].slice(5), store);
    else if (typeof x["copy"] === "string") void navigator.clipboard?.writeText(x["copy"]);
  };
  const page = host({ theme, store, apps: o.blocks }, { screen: () => screen, act, tap });
  const p = page.patch(root, () => model);
  behave(root, () => model);
  const take = (ops: Op[]) => {
    model = apply(model, ops) ?? model;
    p.queue(ops);
  };
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (!(f instanceof HTMLFormElement) || !f.elements.namedItem("_action")) return;
    e.preventDefault();
    const v: Blk = {};
    new FormData(f).forEach((x, k) => (v[k] = x));
    const { _block, _action, _screen, ...values } = v;
    void act({ action: _action, block: _block || undefined, values });
  });
  if (data.dataset["stream"])
    stream({ url: data.dataset["stream"] }).open(location.pathname, (s, ops) => {
      const same = JSON.stringify(s) === JSON.stringify(model);
      model = s;
      if (ops) return p.queue(ops);
      if (same) return;
      root.replaceChildren(...[page.draw(s)].filter((e): e is HTMLElement => e !== null));
    });
  return true;
}
