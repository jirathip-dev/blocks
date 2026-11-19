import { createElement as h, memo, useEffect, useState } from "react";

const Row = memo(({ id, title, subtitle, value }) =>
  h("div", { className: "row", "data-id": id }, h("span", { className: "rm" }, h("span", { className: "rt b-row__title" }, title), h("span", { className: "rs b-row__subtitle" }, subtitle)), h("span", { className: "rv b-row__value" }, value)),
);

export function App({ initial }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    window.bump = async (kind) => setRows(await (await fetch(`/bump/${kind}`, { method: "POST" })).json());
  }, []);
  return h("div", { className: "scr" }, h("p", { className: "tabh" }, h("span", { className: "tw b-screen__title" }, "rows")), rows.map((r) => h(Row, { key: r.id, ...r })));
}
