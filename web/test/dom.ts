class Text {
  nodeType = 3;
  parentNode = null;
  constructor(text) {
    this.textContent = String(text);
  }
  remove() {
    this.parentNode?.drop(this);
  }
}

class Parent {
  childNodes = [];
  parentNode = null;
  get children() {
    return this.childNodes.filter((n) => n instanceof El);
  }
  get firstElementChild() {
    return this.children[0] ?? null;
  }
  get childElementCount() {
    return this.children.length;
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join("");
  }
  set textContent(t) {
    this.replaceChildren(String(t));
  }
  drop(n) {
    this.childNodes.splice(this.childNodes.indexOf(n), 1);
    n.parentNode = null;
  }
  insertBefore(n, ref) {
    if (n instanceof Frag) {
      [...n.childNodes].forEach((k) => this.insertBefore(k, ref));
      return n;
    }
    n.parentNode?.drop(n);
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, n);
    n.parentNode = this;
    return n;
  }
  append(...ns) {
    ns.forEach((n) => this.insertBefore(typeof n === "string" ? new Text(n) : n, null));
  }
  replaceChildren(...ns) {
    [...this.childNodes].forEach((n) => this.drop(n));
    this.append(...ns);
  }
  querySelectorAll(sel) {
    const out = [];
    const scoped = sel.startsWith(":scope > ");
    const walk = (p) =>
      p.children.forEach((c) => {
        if (c.matches(scoped ? sel.slice(9) : sel)) out.push(c);
        if (!scoped) walk(c);
      });
    walk(this);
    return out;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
}

class Frag extends Parent {}

class El extends Parent {
  nodeType = 1;
  attrs = new Map();
  style = {};
  listeners = [];
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
    const kebab = (k) => "data-" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
    this.dataset = new Proxy(
      {},
      {
        get: (_, k) => this.attrs.get(kebab(String(k))),
        set: (_, k, v) => (this.attrs.set(kebab(String(k)), String(v)), true),
        has: (_, k) => this.attrs.has(kebab(String(k))),
      },
    );
    const own = this;
    this.classList = {
      get list() {
        return (own.attrs.get("class") ?? "").split(/\s+/).filter(Boolean);
      },
      add: (...cs) => own.setAttribute("class", [...new Set([...own.classList.list, ...cs])].join(" ")),
      remove: (...cs) => own.setAttribute("class", own.classList.list.filter((c) => !cs.includes(c)).join(" ")),
      contains: (c) => own.classList.list.includes(c),
      toggle: (c, on) => ((on ?? !own.classList.contains(c)) ? own.classList.add(c) : own.classList.remove(c)),
    };
  }
  get className() {
    return this.attrs.get("class") ?? "";
  }
  set className(v) {
    this.setAttribute("class", v);
  }
  get isConnected() {
    return false;
  }
  setAttribute(k, v) {
    this.attrs.set(k, String(v));
  }
  getAttribute(k) {
    return this.attrs.get(k) ?? null;
  }
  hasAttribute(k) {
    return this.attrs.has(k);
  }
  removeAttribute(k) {
    this.attrs.delete(k);
  }
  remove() {
    this.parentNode?.drop(this);
  }
  replaceWith(n) {
    this.before(n);
    this.remove();
  }
  before(...ns) {
    ns.forEach((n) => this.parentNode.insertBefore(n, this));
  }
  after(...ns) {
    const p = this.parentNode;
    const next = p.childNodes[p.childNodes.indexOf(this) + 1] ?? null;
    ns.forEach((n) => p.insertBefore(n, next));
  }
  matches(sel) {
    return sel.split(",").some((s) => {
      const [own, ...up] = s.trim().split(/\s+/).reverse();
      const [tag, ...cls] = own.split(".");
      if (!((!tag || tag.toUpperCase() === this.tagName) && cls.every((c) => this.classList.contains(c)))) return false;
      let p = this.parentNode;
      for (const u of up) {
        while (p instanceof El && !p.matches(u)) p = p.parentNode;
        if (!(p instanceof El)) return false;
        p = p.parentNode;
      }
      return true;
    });
  }
  addEventListener(type, f) {
    this.listeners.push([type, f]);
  }
  dispatchEvent() {
    return true;
  }
  focus() {}
  isEqualNode(o) {
    const same = (a, b) => (a instanceof El ? a.isEqualNode(b) : a.textContent === b?.textContent);
    const attrs = (e) => JSON.stringify([...e.attrs].sort());
    return o instanceof El && o.tagName === this.tagName && attrs(o) === attrs(this) && o.childNodes.length === this.childNodes.length && this.childNodes.every((n, i) => same(n, o.childNodes[i]));
  }
}

export function install() {
  const g = globalThis;
  g.Element = El;
  g.HTMLElement = El;
  g.HTMLInputElement = El;
  g.CustomEvent = class {};
  g.customElements = { get: () => undefined, whenDefined: () => new Promise(() => {}) };
  g.DOMParser = class {
    parseFromString(html) {
      const body = new Frag();
      body.append(html.replace(/^<body>/, ""));
      return { body };
    }
  };
  g.document = {
    baseURI: "http://blocks.test/",
    body: new El("body"),
    documentElement: Object.assign(new El("html"), { lang: "" }),
    createElement: (t) => new El(t),
    createElementNS: (_, t) => new El(t),
    createTextNode: (t) => new Text(t),
    createDocumentFragment: () => new Frag(),
    querySelectorAll: () => [],
  };
}
