import type { Run } from "../gen/types.ts";
import { btn, type Ctx, el, esc } from "./index.ts";

export function run(b: Run, c: Ctx): HTMLElement {
  const s = el("div", "run", `<pre class=cmd>${esc(b.command)}</pre><p class=m>${[b.dir, b.touches, b.sha && `sha ${b.sha}`].filter(Boolean).map(esc).join(" · ")}</p>`);
  const bar = el("div", "bar");
  for (const choice of ["approve", "deny"]) {
    const x = btn(choice, choice === "deny" ? "bad" : "primary");
    x.onclick = () => c.act({ action: b.action, block: b.id, values: { choice, sha: b.sha } }, x);
    bar.append(x);
  }
  s.append(bar);
  return s;
}
