import { createElement as h } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./app.js";

const root = document.getElementById("root");
const data = document.getElementById("data");
if (data) hydrateRoot(root, h(App, { initial: JSON.parse(data.textContent) }));
else fetch("/rows").then(async (r) => createRoot(root).render(h(App, { initial: await r.json() })));
