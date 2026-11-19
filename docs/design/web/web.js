// Preview only: what `web/src/render/web.ts` draws, so these pages show it. Impl writes its own; nothing here is product code.
const SANDBOX = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";
const SCHEMES = ["https:", "http:", "file:"];

function web(b, opts = {}) {
  const root = document.createElement("div");
  root.className = "b b-web web";
  root.dataset.block = "web";
  if (b.id) root.dataset.id = b.id;
  let url = null;
  try { url = new URL(b.src, document.baseURI); } catch { url = null; }
  if (!url || !SCHEMES.includes(url.protocol)) {
    const none = document.createElement("div");
    none.className = "wf none";
    none.style.height = `${b.height}px`;
    none.textContent = "This page can't be shown here.";
    root.append(none);
    return root;
  }
  const f = document.createElement("iframe");
  f.className = "wf";
  f.style.height = `${b.height}px`;
  f.setAttribute("sandbox", SANDBOX);
  f.setAttribute("allow", "");
  f.referrerPolicy = "no-referrer";
  f.title = opts.shown ?? url.host + url.pathname;
  if (!opts.loading) f.src = url.href;
  const m = document.createElement("div");
  m.className = "wm";
  const u = document.createElement("span");
  u.className = "wu";
  u.textContent = opts.shown ?? (url.host + url.pathname).replace(/\/$/, "");
  const a = document.createElement("a");
  Object.assign(a, { href: url.href, target: "_blank", rel: "noopener", textContent: "open ↗" });
  m.append(u, a);
  root.append(f, m);
  return root;
}
