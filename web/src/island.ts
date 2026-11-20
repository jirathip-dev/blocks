import type { Island } from "./gen/types.ts";

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/// Whether `name` can be a custom element's tag; any other island draws its plain fallback.
export const isTag = (name: string) => /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/.test(name);

/// The island as its app's custom element: `props` set now and when it upgrades, the fallback inside until then, a named `blocks-event` sent.
export function island(b: Island, fallback: Node[], send: (name: string, values: Record<string, unknown>) => void, drop: (name: string) => void): HTMLElement {
  const e = document.createElement(b.name);
  if (b.props) e.dataset["props"] = JSON.stringify(b.props);
  e.addEventListener("blocks-event", (ev) => {
    ev.stopPropagation();
    const d: unknown = ev instanceof CustomEvent ? ev.detail : null;
    const name = isRec(d) && typeof d["name"] === "string" ? d["name"] : "";
    if (b.events?.includes(name)) send(name, isRec(d) && isRec(d["values"]) ? d["values"] : {});
    else drop(name);
  });
  Reflect.set(e, "props", b.props ?? {});
  if (customElements.get(b.name)) return e;
  e.dataset["fallback"] = "";
  e.append(...fallback);
  void customElements.whenDefined(b.name).then(() => {
    const props: unknown = Reflect.get(e, "props");
    Reflect.deleteProperty(e, "props");
    Reflect.set(e, "props", props);
    delete e.dataset["fallback"];
  });
  return e;
}
