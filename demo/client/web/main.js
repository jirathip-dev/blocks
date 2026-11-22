import { local, mount } from "./blocks.js";

const { instance } = await WebAssembly.instantiateStreaming(fetch("meter.wasm"));
const x = instance.exports;
const call = (f, text = "") => {
  const sent = new TextEncoder().encode(text);
  new Uint8Array(x.memory.buffer, x.text(sent.length), sent.length).set(sent);
  f();
  return new TextDecoder().decode(new Uint8Array(x.memory.buffer, x.text_at(), x.text_len()));
};

const meter = local({
  screen: () => JSON.parse(call(x.screen)),
  act: (action) => JSON.parse(call(x.act, JSON.stringify(action))),
});

const at = (place) => ({ compact: place, wide: place });
const screen = { type: "screen", id: "meter", source: "meter", path: "/meter", label: "Meter", place: at("strip"), transition: "push" };
mount({
  root: document.body,
  layout: { format: 1, root: { type: "nav", id: "root", place: at("inline"), transition: "push", slots: { main: [screen] } } },
  sources: { meter },
});
