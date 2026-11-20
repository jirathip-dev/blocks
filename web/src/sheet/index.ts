export { check, match, type Row, type Say } from "./check.ts";
export { read, type Book } from "./read.ts";
export { book, template, type Cell } from "./write.ts";

/// Hands `data` to the browser as a download named `name`.
export function save(name: string, data: Uint8Array) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data.slice()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
