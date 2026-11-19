import type { Round, Row, Tap } from "../gen/types.ts";
import { acts, btn, type Ctx, el, h, href, kids, offable, sends, ticked, toggle, tone, urlOf } from "./index.ts";

const press = (e: HTMLElement, go: () => void) => {
  e.tabIndex = 0;
  e.setAttribute("role", "button");
  e.onclick = go;
  e.onkeydown = (k) => k.key === "Enter" && go();
};

function round(d: Round, now: boolean, c: Ctx): HTMLElement {
  const tap: Tap | null = now ? null : (d.tap ?? null);
  const url = urlOf(tap);
  const l: HTMLElement = url ? href(el("a", "rdl tap"), url) : el("div", tap ? "rdl tap" : "rdl");
  l.append(h("span", "rdn", d.name), h("span", "rdu", d.summary ?? ""));
  if (d.since) l.append(h("span", "rdt", ticked({ since: d.since })));
  if (tap) l.append(h("span", "rc", "›"));
  if (tap && !url) press(acts(l, sends(tap)), () => c.tap(tap));
  const m = el("i", "rdm");
  m.setAttribute("aria-label", d.state);
  const x = h("div", "rdx", l);
  const links = d.links ?? [];
  if (now && (d.lane || d.blocks?.length || links.length)) {
    const body = el("div", "rdb");
    if (d.lane) {
      const lines = d.lane.lines ?? [];
      const head = [d.lane.name, d.lane.harness, d.lane.model, d.lane.host].filter(Boolean).join(" · ");
      const live = (i: number) => d.state === "working" && i === lines.length - 1;
      body.append(h("div", "rdh", head), h("div", "rdo", ...lines.map((t, i) => (live(i) ? h("div", "live", `▍ ${t}`) : h("div", "", t)))));
    }
    body.append(...kids(d.blocks, c));
    if (links.length)
      body.append(
        h(
          "div",
          "rdk",
          ...links.map((k) => {
            const b = btn(k.label, "", urlOf(k.tap), sends(k.tap));
            if (!urlOf(k.tap)) b.onclick = () => c.tap(k.tap);
            return b;
          }),
        ),
      );
    x.append(body);
  }
  return h("li", `rd ${d.state}${now ? " now" : ""}`, m, x);
}

export function row(b: Row, c: Ctx): HTMLElement {
  const cls = `row${b.style === "link" ? " link" : ""}${b.sticky ? " sticky" : ""}${b.indent ? " in" + Math.min(b.indent, 3) : ""}`;
  const rounds = b.rounds ?? [];
  const open = rounds.length > 0 && (rounds[rounds.length - 1].state === "needs") !== c.open.has(String(b.id));
  const url = rounds.length ? undefined : urlOf(b.tap);
  const r: HTMLElement = url ? href(el("a", cls), url) : el("div", cls);
  r.dataset.id = b.id ?? "";
  const sub = b.subtitle == null || open ? null : tone(b.subtitle);
  const badge = b.badge == null ? null : tone(b.badge);
  const fig = b.figure ? c.theme.figure(b.figure) : null;
  if (fig instanceof Element) fig.classList.add("b-row__figure");
  const main = h("span", "rm", h("span", "rt b-row__title", b.title ?? ""));
  if (badge) main.append(" ", h("span", `tag b-row__badge ${badge.tone ?? ""}`, badge.text));
  if (sub) main.append(h("span", `rs b-row__subtitle ${sub.tone ?? ""}`, ticked(sub.text)));
  r.replaceChildren(...(fig ? [fig] : []), main, ...(b.value != null ? [h("span", "rv b-row__value", ticked(b.value))] : []));
  if (rounds.length) {
    r.classList.add("tap");
    r.setAttribute("aria-expanded", String(open));
    r.append(h("span", "rc", "›"));
    press(r, () => toggle(r, b.id, c, true));
    const w = h("div", `rr${open ? " open" : ""}`, r);
    if (open) w.append(h("ol", "rds", ...rounds.map((d, i) => round(d, i === rounds.length - 1, c))));
    return w;
  }
  const swipe = b.swipe ?? [];
  if (url) r.classList.add("tap");
  else if (b.tap || swipe.length) {
    r.classList.add("tap");
    r.tabIndex = 0;
    r.setAttribute("role", "button");
    acts(r, sends(b.tap));
    r.onclick = () => (b.tap ? c.tap(b.tap) : toggle(r, b.id, c));
  }
  if (!swipe.length) return r;
  const w = el("div", "rw");
  w.append(r);
  const bar = el("div", "ra b-row__actions");
  bar.hidden = !c.open.has(`sw:${b.id}`);
  for (const s of swipe) {
    const x = btn(s.label, s.tone === "bad" ? "bad" : "", undefined, sends(s.tap, s.action));
    x.onclick = () => c.act({ action: s.action, block: b.id, values: s.values ?? {}, confirm: s.confirm }, x);
    bar.append(offable(x, s));
  }
  w.append(bar);
  let x0 = 0;
  r.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  r.addEventListener("touchend", (e) => x0 - e.changedTouches[0].clientX > 40 && bar.hidden && toggle(r, b.id, c), { passive: true });
  return w;
}
