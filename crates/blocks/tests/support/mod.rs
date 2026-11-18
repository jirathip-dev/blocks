use blocks::{Block, Row, Screen};

pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) | 1)
    }

    pub fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }

    pub fn below(&mut self, n: usize) -> usize {
        usize::try_from(self.next() % u64::try_from(n.max(1)).unwrap()).unwrap()
    }
}

pub fn block(rng: &mut Rng, size: usize) -> Block {
    let text: String = (0..size)
        .map(|_| char::from(b'a' + u8::try_from(rng.below(26)).unwrap()))
        .collect();
    if rng.below(4) == 0 {
        Block::Button {
            label: text,
            action: format!("act-{}", rng.below(10)),
        }
    } else {
        Block::Text { text }
    }
}

pub fn screen(rng: &mut Rng, rows: usize, size: usize) -> Screen {
    Screen {
        rows: (0..rows)
            .map(|i| Row {
                id: format!("r{i}"),
                block: block(rng, size),
            })
            .collect(),
    }
}

pub fn mutate(rng: &mut Rng, s: &Screen, fresh: &mut usize, edits: usize) -> Screen {
    let mut rows = s.rows.clone();
    for _ in 0..edits {
        let n = rows.len();
        match rng.below(5) {
            0 if n > 0 => {
                rows.remove(rng.below(n));
            }
            1 => {
                *fresh += 1;
                let row = Row {
                    id: format!("n{fresh}"),
                    block: block(rng, 8),
                };
                rows.insert(rng.below(n + 1), row);
            }
            2 if n > 1 => rows.swap(rng.below(n), rng.below(n)),
            _ if n > 0 => {
                let i = rng.below(n);
                rows[i].block = block(rng, 8);
            }
            _ => {}
        }
    }
    Screen { rows }
}
