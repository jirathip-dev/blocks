use blocks::{Block, Button, Screen, Text};

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

pub fn block(rng: &mut Rng, id: String, size: usize) -> Block {
    let text: String = (0..size)
        .map(|_| char::from(b'a' + u8::try_from(rng.below(26)).unwrap()))
        .collect();
    if rng.below(4) == 0 {
        Block::Button(Box::new(Button {
            id: Some(id),
            label: text,
            action: Some(format!("act-{}", rng.below(10))),
            ..Button::default()
        }))
    } else {
        Block::Text(Box::new(Text {
            id: Some(id),
            markdown: Some(text),
            ..Text::default()
        }))
    }
}

pub fn screen(rng: &mut Rng, rows: usize, size: usize) -> Block {
    Block::Screen(Box::new(Screen {
        id: Some("s".into()),
        title: Some("sim".into()),
        blocks: Some((0..rows).map(|i| block(rng, format!("r{i}"), size)).collect()),
        ..Screen::default()
    }))
}

pub fn mutate(rng: &mut Rng, s: &Block, fresh: &mut usize, edits: usize) -> Block {
    let mut next = s.clone();
    let Block::Screen(screen) = &mut next else {
        panic!("not a screen")
    };
    let rows = screen.blocks.get_or_insert_with(Vec::new);
    for _ in 0..edits {
        let n = rows.len();
        match rng.below(12) {
            0 | 1 if n > 0 => {
                rows.remove(rng.below(n));
            }
            2 | 3 if n < 256 => {
                *fresh += 1;
                let b = block(rng, format!("n{fresh}"), 8);
                rows.insert(rng.below(n + 1), b);
            }
            4 | 5 if n > 1 => rows.swap(rng.below(n), rng.below(n)),
            6 => screen.title = Some(format!("sim {}", rng.below(3))),
            _ if n > 0 => {
                let i = rng.below(n);
                rows[i] = block(rng, rows[i].id().unwrap().into(), 8);
            }
            _ => {}
        }
    }
    next
}
