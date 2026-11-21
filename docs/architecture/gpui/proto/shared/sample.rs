use blocks::{samples, Block, List, Op, Row, Screen, Text, Toned};

const KINDS: [&str; 6] = ["list", "row", "card", "text", "prose", "composer"];

fn screen(id: &str, title: &str, blocks: Vec<Block>) -> Block {
    Block::Screen(Box::new(Screen::new().id(id).title(title).blocks(blocks)))
}

pub fn look() -> Block {
    let blocks = KINDS
        .iter()
        .flat_map(|k| samples().into_iter().filter(move |(kind, _)| kind == k))
        .map(|(_, b)| b)
        .collect();
    screen("samples", "Samples", blocks)
}

fn row(i: usize, title: &str) -> Block {
    let r = Row::new(format!("{title} {i}"))
        .id(format!("r{i}"))
        .subtitle(Toned::Text("build green".into()))
        .value("2m");
    Block::Row(Box::new(r))
}

fn note(id: &str, text: &str) -> Block {
    Block::Text(Box::new(Text::new().id(id).markdown(text)))
}

pub fn rows(n: usize) -> Block {
    let rows = (0..n).map(|i| row(i, "Run")).collect::<Vec<_>>();
    let list = Block::List(Box::new(List::new(rows).id("rows")));
    screen("s", "Queue", vec![note("reply", "Streaming"), list])
}

pub fn row_burst(frames: usize, per_frame: usize) -> Vec<Vec<Op>> {
    (0..frames)
        .map(|f| {
            (0..per_frame)
                .map(|k| {
                    let i = (f * per_frame + k) % 200;
                    Op::Replace {
                        id: format!("r{i}"),
                        block: row(i, "Patched"),
                    }
                })
                .collect()
        })
        .collect()
}

pub fn text_burst(frames: usize) -> Vec<Vec<Op>> {
    let mut text = String::from("Streaming");
    (0..frames)
        .map(|f| {
            text.push_str(&format!(" token{f}"));
            vec![Op::Replace {
                id: "reply".into(),
                block: note("reply", &text),
            }]
        })
        .collect()
}

pub fn scripts() -> Block {
    let lines = [
        ("latin", "The quick brown fox jumps over the lazy dog."),
        (
            "thai",
            "ภาษาไทยไม่มีช่องว่างระหว่างคำ การตัดบรรทัดต้องใช้พจนานุกรม ที่นี่มีสระบนล่างและวรรณยุกต์ เช่น น้ำ ผู้ ก็ ปิ่น",
        ),
        ("arabic", "مرحبا بالعالم. هذا نص عربي من اليمين إلى اليسار."),
        ("hebrew", "שלום עולם. זהו טקסט בעברית מימין לשמאל."),
        ("mixed", "Total: 42 ريال, due שבת, ราคา 99 บาท."),
        ("cjk", "日本語のテキスト、中文文本、한국어 텍스트。"),
        ("emoji", "Emoji: 🙂 👍🏽 👩‍💻 🇹🇭"),
    ];
    let mut blocks: Vec<Block> = lines.iter().map(|(id, t)| note(id, t)).collect();
    blocks.push(Block::Row(Box::new(
        Row::new("สวัสดี مرحبا שלום")
            .id("row")
            .subtitle(Toned::Text("ผู้ใช้ مستخدم משתמש".into()))
            .value("٤٢"),
    )));
    screen("scripts", "Scripts ภาษา عربي עברית", blocks)
}
