# The desktop renderer

The renderer (`crates/blocks-desktop`) and its harness (`crates/blocks-desk`) follow
`docs/architecture/desktop/`. The renderer draws one screen into an egui `Ui` the app hands it; the window, the
transport and the clock are the app's.

## Opening a window with eframe

An app pins `blocks`, `blocks-desktop` and its own `eframe` of the same egui minor (0.37), and calls the stage from
its `eframe::App` (a sketch: the method eframe 0.37's `App` trait names is eframe's):

```rust
impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            for e in self.stage.show(ui, &self.kit, self.unix_now()) {
                self.carry_out(e);
            }
        });
    }
}

fn main() -> eframe::Result {
    eframe::run_native("queue", eframe::NativeOptions::default(), Box::new(|_| Ok(Box::new(App::new()))))
}
```

`stage.set(mirror.screen(key))` after every frame the app's `Mirror` takes; `Event::Act` goes out on the app's
transport and its ops come back as frames. `docs/architecture/desktop/usage.md` has the whole loop.

## Fonts

Type sizes, spacing and the page margin are the web renderer's tokens (`--fs`, `--fs-meta`, `--s2`, `--s4`), scaled
by the style's `space`. `Look::faces` sets the app's own font: the first face draws all proportional text, each
later one fills in the glyphs the ones before it lack, and egui's default comes after them; code stays monospace.

The renderer ships no font. eframe turns on egui's default fonts, which have no Thai glyphs (measured below); an
app that shows a script they lack adds a font for it with `ctx.add_font`, at the lowest priority so it only fills
in the glyphs the others lack. The harness does the same with `--font` (`Desk::font`).

## An app's kinds, islands and styles

`Kit::kind(name, draw)` draws an app's own kind; a core kind's name is refused with `Clash`. `Kit::island(name,
make)` hosts a component: one instance per block id, made on the first pass that draws it, dropped on the first
`set` whose screen no longer holds that id; it is drawn in the box `size` reserves and its `Out` sends a name in
the block's `events` as an action and drops any other. `Kit::wrap(kind, wrap)` wraps every drawn block of a kind.
A kind or an island nobody registered draws its fallback. As in the HTML and SwiftUI renderers, the drawn tree
records an app kind and an island as `fallback`: the crate's tree knows only the core kinds. The harness registers
an echo island as `x-echo`: it shows its props and a tap sends the event its `send` prop names.

## Kinds drawn later

These core kinds draw their fallback row, then their child blocks, until a later issue draws each in its one file
under `crates/blocks-desktop/src/draw/`:

- `prose`, `hero`, `nav`
- `images`, `media` (these need an image decoder, a dependency ask)
- `diff`, `editor`
- `scene`
- `diagram`
- `web`: egui has no web view, so it stays a fallback with its link

The kinds added after the ADR (`lines`, `table`, `steps`, `toast`, `chart`, `timeline`) are gaps the same way.

## What egui draws wrong

These are egui 0.37's own defects. The renderer does not work around them; each waits for an egui release that
fixes it.

### Right-to-left text

egui does not lay out right-to-left text: Arabic and Hebrew draw left to right. The web and SwiftUI renderers are
unaffected.

### Thai

Measured with the harness at 390 and 1440, with Noto Sans Thai given by `--font`
(`crates/blocks-desk/tests/thai/`; egui's own fonts have no Thai glyphs, so an app must give one):

- Shaping looks right in the PNG: tone marks and vowels above and below sit on their base consonant and stack (`น้ำ`, `ผึ้ง`,
  `ซึ่ง`, `นุ`).
- Line breaks are wrong: egui breaks a line only at a space or, failing that, at the last character that fits. Thai
  puts no space between words, so a long Thai line is cut inside a word (`อาศั` / `ย`). The other two renderers
  break between words.

![The Thai sample at 390, drawn by the harness](desktop-thai-390.png)
