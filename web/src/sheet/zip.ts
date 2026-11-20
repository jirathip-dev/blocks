export type Entry = { name: string; data: Uint8Array };

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (u16(b, i) | (u16(b, i + 2) << 16)) >>> 0;
const text = new TextDecoder();

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/// The files in a zip, by name; null when it is not a zip this reader knows.
export async function unzip(b: Uint8Array): Promise<Map<string, Uint8Array> | null> {
  let end = b.length - 22;
  while (end >= 0 && u32(b, end) !== 0x06054b50) end--;
  if (end < 0) return null;
  const out = new Map<string, Uint8Array>();
  for (let i = u32(b, end + 16), n = u16(b, end + 10); n > 0; n--) {
    if (u32(b, i) !== 0x02014b50) return null;
    const method = u16(b, i + 10), size = u32(b, i + 20), len = u16(b, i + 28);
    const name = text.decode(b.subarray(i + 46, i + 46 + len)), at = u32(b, i + 42);
    const start = at + 30 + u16(b, at + 26) + u16(b, at + 28), raw = b.subarray(start, start + size);
    if (method !== 0 && method !== 8) return null;
    out.set(name, method === 8 ? await inflate(raw) : raw);
    i += 46 + len + u16(b, i + 30) + u16(b, i + 32);
  }
  return out;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (d: Uint8Array) => (d.reduce((c, x) => CRC[(c ^ x) & 255] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

/// A stored (uncompressed) zip of `files`.
export function zip(files: Entry[]): Uint8Array {
  const enc = new TextEncoder(), parts: number[][] = [], dir: number[][] = [];
  const le = (v: number, n: number) => Array.from({ length: n }, (_, i) => (v >>> (8 * i)) & 255);
  let at = 0;
  for (const f of files) {
    const name = Array.from(enc.encode(f.name)), c = crc(f.data);
    const head = [...le(20, 2), 0, 0, 0, 0, 0, 0, 0x21, 0, ...le(c, 4), ...le(f.data.length, 4), ...le(f.data.length, 4), ...le(name.length, 2), 0, 0];
    parts.push([...le(0x04034b50, 4), ...head, ...name], Array.from(f.data));
    dir.push([...le(0x02014b50, 4), 20, 0, ...head, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...le(at, 4), ...name]);
    at += 30 + name.length + f.data.length;
  }
  const size = dir.reduce((n, d) => n + d.length, 0);
  const tail = [...le(0x06054b50, 4), 0, 0, 0, 0, ...le(files.length, 2), ...le(files.length, 2), ...le(size, 4), ...le(at, 4), 0, 0];
  return Uint8Array.from([...parts, ...dir, tail].flat());
}
