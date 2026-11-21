# Measured: where egui 0.37 breaks Thai, and what the prototype does (#306)

Taken on the fleet's Mac (arm64, macOS 27.2, rustc 1.99.1) on 2026-11-21, with egui 0.37.0 and `icu_segmenter` 2.4.0
from crates.io, at a 1-minute load average of 10 to 13: read the times for their order of size. `proto/` is a crate
outside every workspace: 246 lines of `words.rs`, the sketch, and 714 of `main.rs`, the probes. It draws with
`blocks-desk`'s own rasteriser, so a shot is what the harness would write. `proto/size` is a second crate, for the
binary size alone.

## How to take them again

```sh
cd docs/architecture/thai/proto
bash measure.sh gaps     # section 1, with the Thai font as a fallback and then first
bash measure.sh probe    # sections 1 and 2: the Thai font is a fallback, as in the harness
bash measure.sh first    # the same with the Thai font first
bash measure.sh none     # the same with no Thai font at all
bash measure.sh seg      # section 3
bash measure.sh flow     # section 4
bash measure.sh edit     # section 5
bash measure.sh copy     # section 4, the drag and the copy
bash measure.sh same     # section 2, the PNG bytes
bash measure.sh shot     # look/words-390.png, before it was compressed again without loss
bash measure.sh bench    # section 6, in release
bash measure.sh size     # section 7
bash measure.sh deps     # section 8
bash measure.sh deny     # section 8: needs cargo-deny; works on a copy of the workspace in a temp folder
```

The font is the one the harness's Thai test already has, `crates/blocks-desk/tests/thai/NotoSansThai-Regular.ttf`.

## 1. egui as it is

The issue's line, `ภาษาไทยไม่มีช่องว่างระหว่างคำ`, in a job wrapped at 120 points, body text:

| | Rows |
|---|---|
| egui 0.37 | `ภาษาไทยไม่มีช่องว่างระ` and `หว่างคำ`: the break is inside `ระหว่าง` |
| The #299 spike, another font and size | inside `ว่าง` |

What can stand between two words so that egui breaks there, each tried between the line's eight words:

| Between the words | Width of the line not wrapped | Breaks there at 120 | First row at 120 |
|---|---|---|---|
| nothing (egui as it is) | 156.75 | no | 116.4, ending inside a word |
| U+200B, zero width space | 156.75 | no: it is not whitespace to egui's breaker | the same |
| `\r` | 177.5: each is as wide as a space | yes | 102.0 |
| U+2028, line separator | 202.25 | yes | 119.5 |
| a space | 177.5 | yes | 102.0 |
| `\r` in a section of its own | 177.5 | yes | 102.0 |
| a space in a section of its own, font size 0 | panic in `epaint`'s glyph atlas (not in `gaps`: it ends the run) | | |
| **a space in a section of its own, font size 0.001 or 0.000001** | **156.75** | **yes** | **106.0** |
| a space in a section of its own, letter spacing of minus its width | 156.75 | yes | 105.97; 106.375 with the Thai font first |

With the Thai font first the widths with `\r`, U+2028 and a space are 180.4, 211.3 and 180.4; the other rows are the
same. The tiny space is the only one that adds no width in both set-ups and needs no measuring of the font's space.

egui lists 30 glyphs for the line's 29 characters with the Thai font, 29 with none: `คำ` is two characters and three
glyphs, because the shaper splits `ำ` in two.

## 2. The prototype's `words` on the same line and on ten texts

| | Result |
|---|---|
| The line at 120 | `ภาษาไทยไม่มีช่องว่าง` and `ระหว่างคำ`: between words |
| The same with the Thai font first, and with no Thai font | the same rows |
| The line not wrapped, against egui's own | the same place and advance for every glyph, the same size, 120 vertices each |
| Its text and glyph count after hardening | the caller's text; egui's own count |
| Ten texts at 390, 200, 120 and 60 points: 22 of the 40 wrap | every row end of all 22 is a word end or a space; in each of the three font set-ups |
| The same 22 in egui as it is | 10 (4 have spaces and no Thai run to break; 6 by luck) |
| The same ten at 20 points, narrower than most words | words break inside themselves, as Latin does; no more rows over the width than egui's own |
| Rows wider than their width, at 60 | egui's own 2, the prototype 0 |
| `Build green on main, 12 minutes` and a Japanese line | not softened: the same `Arc` as egui's own galley |
| Six Thai and Latin texts that fit their row at 1440, drawn as labels | the same PNG bytes as egui's own labels |
| The same Thai title strong, in italics, with a code background | the same PNG bytes |
| The same underlined, and struck through | 13 bytes of the picture differ: the line is drawn a word at a time and looks unbroken |

The ten texts: the line; a row title and a subtitle from the harness's Thai sample; its 165-character paragraph; a
sentence with `main`, `12` and `(บรรทัด 238)`; one with `ๆ`; one with `ฯ`; a price with Thai digits; one with a
person's and a product's name; a Latin line.

## 3. The dictionary against the LSTM model

`LineSegmenter::new_dictionary` and `new_lstm`, after the prototype's rule for characters that cannot start a word.

| Text | Dictionary | LSTM |
|---|---|---|
| the line | `ภาษา\|ไทย\|ไม่มี\|ช่อง\|ว่าง\|ระหว่าง\|คำ` | `ภาษา\|ไทย\|ไม่\|มี\|ช่องว่าง\|ระหว่าง\|คำ` |
| a row title | `สั่ง\|ซื้อ\|น้ำ\|ผึ้ง\|ป่า\|สอง\|ขวด` | the same |
| with `ๆ` | `เด็กๆ ชอบ\|กิน\|ขนม\|หวานๆ\|มากๆ\|เลย` | `เด็กๆ ชอบกิน\|ขนม\|หวานๆมากๆเลย` |
| with `ฯ` | `กรุงเทพฯ\|เป็น\|เมือง\|หลวง\|ของ\|ประเทศไทย` | `กรุงเทพฯเป็น\|เมืองหลวง\|ของ\|ประเทศ\|ไทย` |
| names | `คุณ\|จิร\|ทีปต์\|ส่ง\|ข้อความ\|ถึง\|ทีม\|โด\|รเว\|อร์` | `คุณ\|จิรทีปต์\|ส่ง\|ข้อ\|ความ\|ถึง\|ทีม\|โดร\|เวอร์` |
| the end of the paragraph | `…\|อ่าน\|ยาก\|ขึ้น\|มาก` | `…\|อ่าน\|ยาก\|ขึ้น\|มา\|ก` |
| digits and `฿` | no break but at its spaces | the same |

- Both give the issue's line only breaks at the ends of its eight words. The dictionary has `ไม่มี` as one word and
  the LSTM `ช่องว่าง`, so each offers one break fewer than the issue lists.
- Without the rule the dictionary also offers `หวาน|ๆ`, `มาก|ๆ` and `ทีป|ต์`.
- The dictionary cuts a name it does not know into short pieces. The LSTM keeps `จิรทีปต์` whole and cuts `มาก`.

## 4. A label along a wrapping row

A row 120 points wide holding `Status: `, the line, and ` ok`:

| | The line's rows |
|---|---|
| egui's own label | a box 50 points high, and ` ok` starts 35 points down: with no place to break, none of the line goes after `Status: ` |
| `words::label` | `ภาษาไทยไม่มี` after `Status: `, then `ช่องว่างระหว่างคำ`: a box 35 points high, and ` ok` goes on after it, 20 points down |

It is `Label::layout_in_ui` that places it, so the first row starts after the label before and the label after
starts where the last row ends.

The line as a label 120 points wide, through egui's own pointer events: a press at its start, a drag past the end of
its second row, a release, then a copy. The text copied is the line, character for character, with no gap in it: the
same as from egui's own label.

## 5. A text field of many rows, through egui's own events

`TextEdit::multiline`, 120 points wide, with `words::lay` as its layouter:

| Event | Rows | Caret index |
|---|---|---|
| type the line | `ภาษาไทยไม่มีช่อง` and `ว่างระหว่างคำ` | 29 |
| up | | 11 |
| home | | 0 |
| right | | 1 |
| down | | 18 |
| end | | 30, one past the 29 characters |
| type `ครับ` | `ภาษาไทยไม่มีช่อง` and `ว่างระหว่างคำครับ` | 34 |
| backspace | | 33 |

With egui's own layouter the rows are `ภาษาไทยไม่มีช่องว่า` and `งระหว่างคำ`, and `end` gives the same 30: the index
one ahead after `ำ` is egui's, from its glyph count.

## 6. Time (release, one thread, a shared host)

| | Dictionary | LSTM |
|---|---|---|
| Breaks of a row title, 24 characters | 0.7 to 1.2 µs | 57 to 97 µs |
| Breaks of the paragraph, 165 characters | 3.7 to 5.8 µs | 450 to 550 µs |
| A Latin title | 0.01 µs: one scan of its bytes | the same |

| With the dictionary | egui's own | The prototype |
|---|---|---|
| A laid title, egui's cache warm, nothing kept here | 0.13 to 0.31 µs | 2.0 to 3.2 µs |
| A laid paragraph, the same | 0.17 to 0.28 µs | 11 to 19 µs |
| A pass of 200 Thai titles and 200 Thai paragraphs as labels, nothing kept | 0.10 to 0.12 ms | 2.9 to 3.1 ms |
| The same pass with the cut and the hard galley kept | | 0.86 to 0.96 ms |
| The first pass of that screen, fonts and all | 1.7 to 3.2 ms | 7.3 to 8.1 ms |
| A paragraph of about 1,000 characters that grows by a word a pass | 0.08 to 0.17 ms | 0.57 to 0.75 ms |

What is left of a kept label's cost is `Label` cloning and egui hashing a job of one section a word.

## 7. Release binary size

`measure.sh size`: a program that prints the breaks of its argument, built four ways with thin LTO and one codegen
unit, the workspace's own profile. macOS arm64, in bytes.

| | Binary | Stripped | More than none |
|---|---|---|---|
| none: breaks at spaces, no crate | 429,648 | 340,048 | |
| `icu_segmenter`, line rules only | 481,952 | 390,160 | 50,112 |
| **`icu_segmenter` with its dictionaries** | 1,540,944 | 1,447,424 | **1,107,376** |
| `icu_segmenter` with its LSTM models | 815,744 | 721,184 | 381,136 |

The dictionaries in `icu_segmenter_data` 2.4.0, by the length of each one's bytes: Khmer 472,213, Burmese 263,849,
Lao 168,034, Thai 131,747; together 1,035,843. A build with Thai alone would add about 203,000 (1,107,376 less the
other three): computed, not built.

For scale, #299 measured a window with one line of text at 10.1 MB stripped on macOS and 18.5 MB on Linux.

## 8. The dependency

`icu_segmenter` 2.4.0 with `default-features = false, features = ["compiled_data"]`: Unicode-3.0, which `deny.toml`
allows. It is the newest release.

| | |
|---|---|
| Crates in a tree of its own | 28 (30 with the LSTM, which adds `core_maths` and `libm`) |
| Packages it adds to this workspace's lock | 23: 78 to 101. `proc-macro2`, `quote`, `syn`, `unicode-ident` and `smallvec` are there already |
| `cargo deny --locked check` on the workspace with it added (cargo-deny 0.22.0) | advisories ok, bans ok, licenses ok, sources ok |

The 23: `icu_segmenter`, `icu_segmenter_data`, `icu_collections`, `icu_locale_core`, `icu_locale_fallback`,
`icu_locale_fallback_data`, `icu_provider`, `potential_utf`, `utf8_iter`, `utf_types`, `zerotrie`, `zerovec`,
`zerovec-derive`, `yoke`, `yoke-derive`, `zerofrom`, `zerofrom-derive`, `stable_deref_trait`, `tinystr`, `litemap`,
`writeable`, `displaydoc`, `synstructure`.

## Not measured

- Linux and Windows. The prototype ran on macOS only. Nothing in it is per OS: egui's raster is its own (#299 took
  the same bytes on four machines), the segmenter is tables and integer code, and a gap moves no glyph. The slices'
  tests run on the three OSes the desktop workflow already has. The size on the other two is the same data and other
  code.
- wasm. This host has no wasm target. `icu_segmenter` is `no_std` Rust; `demo/egui` would carry the same data.
- The Thai-only build (option C): its size is computed from the dictionaries' lengths.
- A screen reader, on any OS.
- Lao, Khmer and Burmese text.
