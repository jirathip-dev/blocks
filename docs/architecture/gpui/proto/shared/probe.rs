pub const HEBREW: &str = "אב גד";
pub const ARABIC: &str = "اب جد";
pub const THAI_BASE: &str = "ก";
pub const THAI_MARKED: &str = "ก็";
pub const THAI_LINE: &str = "ภาษาไทยไม่มีช่องว่างระหว่างคำ";
pub const THAI_WORDS: [&str; 8] = ["ภาษา", "ไทย", "ไม่", "มี", "ช่อง", "ว่าง", "ระหว่าง", "คำ"];
pub const WRAP_AT: f32 = 120.0;

pub fn order(xs: &[f32]) -> &'static str {
    let falls = xs.windows(2).all(|w| w[1] < w[0]);
    let rises = xs.windows(2).all(|w| w[1] > w[0]);
    match (falls, rises) {
        (true, _) => "right-to-left",
        (_, true) => "left-to-right",
        _ => "mixed",
    }
}

pub fn breaks_on_words(lines: &[String]) -> bool {
    let mut ends = vec![];
    let mut at = 0;
    for w in THAI_WORDS {
        at += w.len();
        ends.push(at);
    }
    let mut seen = 0;
    lines.iter().all(|l| {
        seen += l.len();
        ends.contains(&seen)
    })
}

pub fn report(toolkit: &str, hebrew: &[f32], arabic: &[f32], base: f32, marked: f32, lines: &[String]) {
    println!(
        "{{\"toolkit\":\"{toolkit}\",\"hebrew_x\":{hebrew:?},\"hebrew_order\":\"{}\",\"arabic_x\":{arabic:?},\"arabic_order\":\"{}\",\"thai_base_width\":{base:.2},\"thai_base_and_mark_width\":{marked:.2},\"thai_lines_at_{WRAP_AT}\":{lines:?},\"thai_breaks_on_words\":{}}}",
        order(hebrew),
        order(arabic),
        breaks_on_words(lines),
    );
}
