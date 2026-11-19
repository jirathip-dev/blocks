import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { apply, fresh, KINDS } from "../rows.js";
import { App } from "./app.js";

const file = (p) => readFileSync(new URL(p, import.meta.url));
const assets = { "/react.js": [file("../dist/react.js"), "text/javascript"], "/blocks.css": [file("../../web/dist/blocks.css"), "text/css"] };
const page = (body) => `<!doctype html><meta charset=utf-8><link rel=stylesheet href=/blocks.css><body>${body}<script type=module src=/react.js></script>`;
let m = fresh();

const server = createServer((req, res) => {
  const send = (status, type, body, cache = false) => {
    res.writeHead(status, { "content-type": type, "cache-control": cache ? "max-age=3600" : "no-store" });
    res.end(body);
  };
  const [path] = req.url.split("?");
  const kind = path.startsWith("/bump/") ? path.slice(6) : null;
  if (path === "/csr") return (m = fresh()), send(200, "text/html", page("<div id=root></div>"));
  if (path === "/ssr") {
    m = fresh();
    const html = renderToString(h(App, { initial: m.rows }));
    return send(200, "text/html", page(`<div id=root>${html}</div><script id=data type=application/json>${JSON.stringify(m.rows)}</script>`));
  }
  if (path === "/rows") return send(200, "application/json", JSON.stringify(m.rows));
  if (req.method === "POST" && KINDS.includes(kind)) return send(200, "application/json", JSON.stringify(apply(m, kind).rows));
  if (assets[path]) return send(200, assets[path][1], assets[path][0], true);
  send(404, "text/plain", "");
});
server.listen(0, "127.0.0.1", () => process.stdout.write(`http://127.0.0.1:${server.address().port}\n`));
