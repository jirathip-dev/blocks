const SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', b'\r', b'\n', 0x1a, b'\n'];
const STORED_MAX: usize = 0xffff;

fn crc_table() -> Vec<u32> {
    (0..256u32)
        .map(|n| (0..8).fold(n, |c, _| if c & 1 == 1 { 0xedb8_8320 ^ (c >> 1) } else { c >> 1 }))
        .collect()
}

fn chunk(out: &mut Vec<u8>, table: &[u32], kind: [u8; 4], data: &[u8]) {
    let len = u32::try_from(data.len()).unwrap_or(u32::MAX);
    out.extend(len.to_be_bytes());
    let crc = kind.iter().chain(data).fold(u32::MAX, |c, &b| {
        let i = usize::from(u8::try_from((c ^ u32::from(b)) & 0xff).unwrap_or(0));
        table.get(i).copied().unwrap_or(0) ^ (c >> 8)
    });
    out.extend(kind);
    out.extend(data);
    out.extend((!crc).to_be_bytes());
}

fn zlib(raw: &[u8]) -> Vec<u8> {
    let mut out = vec![0x78, 0x01];
    let blocks = raw.chunks(STORED_MAX);
    let last = blocks.len().saturating_sub(1);
    for (i, b) in blocks.enumerate() {
        let len = u16::try_from(b.len()).unwrap_or(u16::MAX);
        out.push(u8::from(i == last));
        out.extend(len.to_le_bytes());
        out.extend((!len).to_le_bytes());
        out.extend(b);
    }
    if raw.is_empty() {
        out.extend([1, 0, 0, 0xff, 0xff]);
    }
    let (a, b) = raw.iter().fold((1u32, 0u32), |(a, b), &x| {
        let a = (a + u32::from(x)) % 65_521;
        (a, (b + a) % 65_521)
    });
    out.extend(((b << 16) | a).to_be_bytes());
    out
}

pub(crate) fn encode(width: u32, height: u32, rgba: &[u8]) -> Vec<u8> {
    let stride = usize::try_from(width).unwrap_or(0) * 4;
    let mut raw = Vec::with_capacity(rgba.len() + rgba.len() / stride.max(1));
    for row in rgba.chunks(stride.max(1)) {
        raw.push(0);
        raw.extend(row);
    }
    let table = crc_table();
    let mut head = Vec::with_capacity(13);
    head.extend(width.to_be_bytes());
    head.extend(height.to_be_bytes());
    head.extend([8, 6, 0, 0, 0]);
    let mut out = SIGNATURE.to_vec();
    chunk(&mut out, &table, *b"IHDR", &head);
    chunk(&mut out, &table, *b"IDAT", &zlib(&raw));
    chunk(&mut out, &table, *b"IEND", &[]);
    out
}
