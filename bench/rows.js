export const KINDS = ["one", "insert", "twenty"];

export function fresh() {
  const rows = Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}`, subtitle: "green", value: "2m" }));
  return { rows, seq: 0 };
}

export function apply(m, kind) {
  const s = ++m.seq;
  const n = m.rows.length;
  if (kind === "one") m.rows[(s * 7) % n] = { ...m.rows[(s * 7) % n], value: `v${s}.` };
  if (kind === "insert") m.rows.splice((s * 13) % (n + 1), 0, { id: `n${s}`, title: `New v${s}.`, subtitle: "green", value: "1s" });
  if (kind === "twenty") for (let j = 0; j < 20; j++) m.rows[(s * 11 + j) % n] = { ...m.rows[(s * 11 + j) % n], value: `w${s}-${j}.` };
  return m;
}

export const token = (kind, s) => (kind === "twenty" ? `w${s}-19.` : `v${s}.`);
