const TILE = ".card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run";

const once = (e: Element, cls: string) => {
  const end = (ev: Event) => {
    if (ev.target !== e) return;
    e.classList.remove(cls);
    e.removeEventListener("animationend", end);
    e.removeEventListener("animationcancel", end);
  };
  e.addEventListener("animationend", end);
  e.addEventListener("animationcancel", end);
  e.classList.add(cls);
};

/// The screen's build-up: the tiles on its first screen settle in reading order, top to bottom then left to right.
export function settle(root: HTMLElement): void {
  if (!root.isConnected) return;
  const tiles = Array.from(root.querySelectorAll<HTMLElement>(TILE))
    .filter((t) => !t.parentElement?.closest(TILE))
    .map((t) => ({ t, r: t.getBoundingClientRect() }))
    .filter(({ r }) => r.height > 0 && r.top < innerHeight)
    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
  root.style.setProperty("--n", String(tiles.length));
  tiles.forEach(({ t }, i) => {
    t.style.setProperty("--i", String(i));
    once(t, "b-in");
  });
}

/// A block that arrives after the build-up fades in where it lands.
export const enter = (e: Element) => once(e, "b-late");
