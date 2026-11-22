# Measured: what egui 0.37 does with right-to-left text, and what the prototype does (#304)

Taken on the fleet's Mac (arm64, macOS 27.2, rustc 1.99.1) on 2026-11-21, with egui 0.37.0 and `unicode-bidi`
0.3.18 from crates.io. `proto/` is a crate outside every workspace: 465 lines of `bidi.rs`, the sketch, and 547 of
`main.rs`, the probes. It draws with `blocks-desk`'s own rasteriser, so a shot is what the harness would write.

## How to take them again

```sh
cd docs/architecture/rtl/proto
base=https://github.com/notofonts/notofonts.github.io/raw/main/fonts
mkdir -p out/fonts
curl -sL -o out/fonts/he.ttf $base/NotoSansHebrew/hinted/ttf/NotoSansHebrew-Regular.ttf     # 26,860 bytes
curl -sL -o out/fonts/ar.ttf $base/NotoSansArabic/unhinted/ttf/NotoSansArabic-Regular.ttf   # 142,140 bytes
cargo run -- probe --font out/fonts/he.ttf --font out/fonts/ar.ttf      # the script's font is a fallback
cargo run -- probe --first /System/Library/Fonts/Supplemental/Arial.ttf # one font has every script
cargo run -- probe                                                      # no font for the script at all
cargo run -- edge  --font out/fonts/he.ttf --font out/fonts/ar.ttf
cargo run -- keys  --font out/fonts/he.ttf --font out/fonts/ar.ttf
cargo run -- caret --font out/fonts/he.ttf --font out/fonts/ar.ttf
cargo run -- shot out/noto.png --font out/fonts/he.ttf --font out/fonts/ar.ttf
cargo run --release -- bench --font out/fonts/he.ttf --font out/fonts/ar.ttf
```

`--font` adds a font every text falls back to, as `blocks-desk --font` does; `--first` puts one before egui's own.
The shots in `look/` are these PNGs, compressed again without loss.

## 1. egui as it is

x of each letter in reading order, at 14 points. "Glyphs" is the length of the row's glyph list.

| Text (characters) | The script's font is a fallback | One font has every script |
|---|---|---|
| `אב גד` (5) | 7, 0, 25, 18: words in the wrong order. 7 glyphs | 22, 15, 6, 0: right. 9 glyphs |
| `اب جد` (5) | 13, 0, 26, 19: the same fault. 8 glyphs | 24, 15, 4, 0: right. 9 glyphs |
| `abc אבג 123` (11) | the Hebrew word reads right, 13 glyphs | every letter left to right: the word is spelled backwards |
| `מחיר 1250 שקל` (13) | words in the wrong order, 18 glyphs | every glyph right to left: the number is drawn `0521`. 25 glyphs |
| `السعر ۱۲۳ ريال` (14) | words in the wrong order and `۱۲۳` drawn `۳۲۱`. 24 glyphs | the same number fault, 24 glyphs |

- With the script's font as a fallback the space comes from the first font, so every word is a run of its own. This
  is the spike's result (8, 0, 27, 20 with another font).
- The extra glyphs are zero-width copies. `layout_shaped_run` adds "continuation" glyphs by cluster order, which runs
  backwards in a right-to-left run, so it adds one for almost every character at the run's end.
- With no font for the script, the missing-glyph boxes are one run: the same as "one font".

## 2. The prototype's `bidi::lay` on the same texts

| Text | x in reading order (fallback fonts) | Glyphs | Drawn order against `unicode-bidi`'s `reorder_line` |
|---|---|---|---|
| `אב גד` | 22, 15, 7, 0: right to left | 5 | same |
| `اب جد` | 30, 17, 7, 0: right to left | 5 | same |
| `abc אבג 123` | `abc 123 גבא` | 11 | same |
| `מחיר 1250 שקל` | `לקש 1250 ריחמ` | 13 | same |
| `שלום (עולם)!` | `!)םלוע( םולש`, brackets mirrored | 12 | same |
| `السعر ۱۲۳ ريال` | `لاير ۱۲۳ رعسلا` | 14 | same |
| `لا إله` (a ligature) | right to left | 6 | same |
| `Build נכשל on main` | as egui draws it | 18 | same |
| `שָׁלוֹם` (marks) | right to left | 7 | same |

All nine are the same in the three font set-ups: fallback fonts, one font, no font. Also:

| Case | Result |
|---|---|
| An 88-character Hebrew paragraph with `main`, `12` and `(שורה 238)`, wrapped at 390, 200 and 120 | 2, 3 and 5 rows; every row in UAX 9's order, ending at the right edge; every glyph on a whole pixel; glyphs equal characters |
| The same at scale 2 | the same, on whole physical pixels |
| `שלום`, `hello`, an empty line, `עולם abc` in one text at 300 | each row by its own paragraph: right, left, left, right |
| The paragraph centred and right-aligned by the job | rows centred and right-aligned as egui's are |
| `می‌خواهم`, `لا إله إلا الله`, `שָׁלוֹם עֲלֵיכֶם`, the paragraph: 21 right-to-left words | 0 needed their carets spread evenly: every cluster was matched |
| `Build green on main, 12 minutes` | not laid: egui's own galley |
| The same job laid twice in a pass | egui returns the same `Arc<Galley>`, for one paragraph and for several |
| One word wider than the line | drawn with its rows in the wrong order: the written limit |
| The paragraph cut to one row with an ellipsis | laid without a fault; its cut end is not reordered: the written limit |

## 3. A text field, through egui's own events

`TextEdit::singleline` with `שלום`, right-aligned in 300 points, laid by the prototype, egui's caret hidden.

| Event | Text | Caret index | Caret drawn at x |
|---|---|---|---|
| focus, caret set to 2 | `שלום` | 2 | 267 |
| left arrow | | 3 | 263: moved left |
| left arrow | | 4 | 255: the end of the word, at its left |
| right arrow | | 3 | 263 |
| type `א` | `שלואם` | 4 | 256 |
| type `a` | `שלואaם` | 5 | 256 |
| left arrow (the character before the caret is Latin: not swapped) | | 4 | 256 |
| end | | 6 | 240: the row's left end |
| backspace | `שלואa` | 5 | 256 |

- egui's own caret for the end of `אבג` is at x 300.5, the row's right edge; the lines put it at 280.
- A press on `שלום עולם` at x 290, 270 and 250: egui sets index 9, 0 and 0; the lines give 0, 3 and 6.

## 4. Time (release, one thread, a shared host: read the order of size)

| Text | egui's cached layout | `lay` with nothing kept |
|---|---|---|
| A row title, `הזמנה 1250 נשלחה` | 0.2 to 0.3 µs | 2.6 to 4.7 µs |
| The 88-character paragraph at 390 | 0.2 to 0.3 µs | 12 to 24 µs |
| A Latin title | 0.1 to 0.3 µs | 0.3 to 0.8 µs (the prototype runs the whole bidi pass to find there is nothing to do; the design scans bytes) |

600 right-to-left labels a pass, nothing kept, is about 2 to 3 ms; today's pass of the 200-row screen is 0.26 to 0.44
ms. That is why the design keeps laid galleys.

## 5. The dependency

`unicode-bidi` 0.3.18: MIT or Apache-2.0, both in `deny.toml`'s allow list. No dependencies with its default features
(`std`, `hardcoded-data`), so one package is added to the lock. It is the newest release; egui 0.37.0 is still
egui's newest.

## Not measured

- Linux and Windows. The prototype ran on macOS only. Nothing in it is per OS: egui's raster is its own (#299 took
  the same bytes on four machines), `unicode-bidi` is tables, and the moves are whole pixels. The slices' tests run on
  the three OSes the desktop workflow already has.
- A real input method and a real screen reader, on any OS.
- The kept map: its cost is estimated, not run.
- Letter spacing from a style, underlines and backgrounds: no kind sets them today.
- Selection painting from `spans`: designed, not drawn in the prototype.
