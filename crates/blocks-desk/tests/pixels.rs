use std::path::{Path, PathBuf};

use blocks::theme::{default, Mode};
use blocks::tree::{Node, Step};
use blocks::Block;
use blocks_desk::{Desk, Shot};
use blocks_desktop::{Kit, Look};
use egui::emath::Numeric;
use serde_json::json;

fn thai() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/thai")
}

fn light(screen: Block) -> Desk {
    let look = Look {
        mode: Some(Mode::Light),
        ..Look::default()
    };
    Desk::new(screen).kit(Kit::new(look))
}

fn bg() -> [u8; 4] {
    let hex = default().light.tokens.bg.as_str().to_owned();
    let byte = |i: usize| u8::from_str_radix(&hex[i..i + 2], 16).unwrap();
    [byte(1), byte(3), byte(5), 255]
}

fn shot(desk: Desk) -> Shot {
    let steps: Vec<Step> = serde_json::from_value(json!([{"shot": {"name": "s"}}])).unwrap();
    desk.run(&steps).shots.remove(0)
}

fn decode(png: &[u8]) -> (usize, usize, Vec<[u8; 4]>) {
    assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n");
    let (mut at, mut w, mut h, mut z) = (8, 0, 0, vec![]);
    while at < png.len() {
        let n = u32::from_be_bytes(png[at..at + 4].try_into().unwrap()) as usize;
        let data = &png[at + 8..at + 8 + n];
        match &png[at + 4..at + 8] {
            b"IHDR" => {
                w = u32::from_be_bytes(data[..4].try_into().unwrap()) as usize;
                h = u32::from_be_bytes(data[4..8].try_into().unwrap()) as usize;
                assert_eq!(data[8..], [8, 6, 0, 0, 0]);
            }
            b"IDAT" => z.extend_from_slice(data),
            _ => {}
        }
        at += 12 + n;
    }
    let (mut raw, mut i) = (vec![], 2);
    loop {
        let len = u16::from_le_bytes([z[i + 1], z[i + 2]]) as usize;
        raw.extend_from_slice(&z[i + 5..i + 5 + len]);
        i += 5 + len;
        if z[i - 5 - len] & 1 == 1 {
            break;
        }
    }
    assert_eq!(raw.len(), (w * 4 + 1) * h);
    let px = raw
        .chunks(w * 4 + 1)
        .flat_map(|r| r[1..].chunks(4).map(|p| p.try_into().unwrap()))
        .collect();
    (w, h, px)
}

fn find<'a>(n: &'a Node, id: &str) -> &'a Node {
    fn at<'a>(n: &'a Node, id: &str) -> Option<&'a Node> {
        if n.id.as_deref() == Some(id) {
            return Some(n);
        }
        n.children.iter().find_map(|c| at(c, id))
    }
    at(n, id).unwrap()
}

fn inside(px: &[[u8; 4]], w: usize, [x, y, rw, rh]: [f64; 4]) -> Vec<[u8; 4]> {
    let (x0, y0) = (usize::from_f64(x), usize::from_f64(y));
    let (x1, y1) = (usize::from_f64(x + rw), usize::from_f64(y + rh));
    (y0..y1).flat_map(|y| (x0..x1).map(move |x| px[y * w + x])).collect()
}

#[test]
fn a_tiny_screen_is_a_png_any_decoder_reads_byte_for_byte() {
    let screen: Block = serde_json::from_value(json!({"type": "screen", "id": "s"})).unwrap();
    let png = shot(light(screen).size(2, 1)).png;
    let want = [
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 1, 8, 6, 0, 0, 0, 244, 34,
        127, 138, 0, 0, 0, 20, 73, 68, 65, 84, 120, 1, 1, 9, 0, 246, 255, 0, 246, 246, 246, 255, 246, 246, 246, 255,
        34, 215, 7, 195, 155, 128, 156, 113, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ];
    assert_eq!(png, want);
}

#[test]
fn text_is_inked_inside_its_rect_and_the_rest_is_the_schemes_background() {
    let screen: Block = serde_json::from_value(json!({"type": "screen", "id": "s", "blocks": [
        {"type": "text", "id": "a", "text": "Build green"}
    ]}))
    .unwrap();
    let s = shot(light(screen).size(390, 300));
    let (w, h, px) = decode(&s.png);
    assert_eq!((w, h), (390, 300));
    let bg = bg();
    assert_eq!(bg, [246, 246, 246, 255]);
    let text = inside(&px, w, find(&s.tree, "a").rect.unwrap());
    assert!(text.iter().filter(|p| **p != bg).count() > 40, "{text:?}");
    let [_, y, _, th] = find(&s.tree, "a").rect.unwrap();
    let below = usize::from_f64(y + th + 2.0);
    assert!(px[below * w..].iter().all(|p| *p == bg));
}

#[test]
fn thai_draws_with_the_given_font_and_a_paragraph_wraps_inside_390() {
    let text = std::fs::read_to_string(thai().join("screen.json")).unwrap();
    let screen: Block = serde_json::from_str(&text).unwrap();
    let font = std::fs::read(thai().join("NotoSansThai-Regular.ttf")).unwrap();
    let with = |w: u16| {
        let desk = Desk::new(screen.clone()).size(w, 844).font(font.clone());
        let steps: Vec<Step> = serde_json::from_value(json!([{"shot": {"name": "s"}}])).unwrap();
        let mut run = desk.run(&steps);
        run.check(&blocks_desk::Want::default());
        assert!(run.faults.is_empty(), "{:?}", run.faults);
        run.shots.remove(0)
    };
    let (narrow, wide) = (with(390), with(1440));
    let [_, _, nw, nh] = find(&narrow.tree, "note").rect.unwrap();
    let [_, _, _, wh] = find(&wide.tree, "note").rect.unwrap();
    assert!(nw <= 390.0 && nh > 2.0 * wh, "{nw}x{nh} at 390, {wh} high at 1440");
    let bare = shot(Desk::new(screen).size(390, 844));
    let (w, _, px) = decode(&narrow.png);
    let (_, _, plain) = decode(&bare.png);
    for id in ["thai", "order", "note"] {
        let r = find(&narrow.tree, id).rect.unwrap();
        assert_ne!(
            inside(&px, w, r),
            inside(&plain, w, r),
            "{id} looks the same without the font"
        );
    }
}
