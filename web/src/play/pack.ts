const b64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/[/]/g, "_")
    .replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const through = (body: Blob, t: CompressionStream | DecompressionStream) => new Response(body.stream().pipeThrough(t));

/// A screen's JSON as a link's `#s=` part: minified, deflate-raw, base64url.
export async function pack(text: string): Promise<string> {
  const min = new Blob([JSON.stringify(JSON.parse(text))]);
  return b64(new Uint8Array(await through(min, new CompressionStream("deflate-raw")).arrayBuffer()));
}

/// The JSON a packed link holds, pretty-printed as the playground shows it.
export async function unpack(packed: string): Promise<string> {
  const text = await through(new Blob([unb64(packed)]), new DecompressionStream("deflate-raw")).text();
  return JSON.stringify(JSON.parse(text), null, 2);
}
