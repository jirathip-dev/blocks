# The desktop renderer: how the callers read (#45)

Sketches, written before the design. Names are final; bodies are not. The shapes are in `design.md`.

## The pin: three lines in the app

```toml
blocks         = { git = "https://github.com/jirathip-dev/blocks", rev = "<40 hex>" }
blocks-desktop = { git = "https://github.com/jirathip-dev/blocks", rev = "<the same 40 hex>" }
eframe         = "0.37"        # the app's own: the window, the GPU, the OS accessibility bridge, the fonts
```

A server, a web app or a Swift app pins `blocks` alone and links nothing of egui.

## An app's window

The app owns the window, the transport and the clock. The renderer draws one screen into the `Ui` it is handed and
gives back what the user did.

```rust
use blocks::{Mirror, Took};
use blocks_desktop::{Event, Kit, Look, Stage};

struct App { mirror: Mirror, stage: Stage, kit: Kit, stream: Stream }

impl App {
    fn new() -> Self {
        let kit = Kit::new(Look::default());             // the neutral pair, light or dark by the OS
        Self { mirror: Mirror::default(), stage: Stage::default(), kit, stream: Stream::open("queue") }
    }

    fn frame(&mut self, ui: &mut egui::Ui) {             // called from the app's eframe `App`, once per pass
        for f in self.stream.take() {                    // the crate's Mirror: no second copy of patch or resync
            match self.mirror.frame(f) {
                Took::Patched | Took::Replaced => self.stage.set(self.mirror.screen("queue")),
                Took::Gap => self.stream.reopen(self.mirror.have()),
                Took::Old => {}
            }
        }
        for e in self.stage.show(ui, &self.kit, self.stream.unix_now()) {
            match e {
                Event::Act(action) => self.stream.post(action),      // its ops come back on the stream
                Event::Open(screen) => self.go(&screen),
                Event::Sheet(screen) => self.sheet(&screen),
                Event::Thread(id) => self.thread(&id),
                Event::Refresh => self.stream.reopen(self.mirror.have()),
                Event::Dropped(what) => log(&what),
            }
        }
    }
}
```

- Typing, a toggle, a pick and a tap's `set` change the stage's own state and send nothing (`renderers.md` 3).
- A link (`tap.url`) and a copy go out through egui's own output, which eframe carries to the OS.
- `stage.set` keeps the local state: an op that lands while a field is being edited does not clear it.

## The look, an app kind, an island, a style

```rust
let look = Look { schemes: paper_pair, style: cooee_style, ..Look::default() };   // `Scheme` and `Style`, gated by the app
let kit = Kit::new(look)
    .art(Pack::new(theme_json))                          // the `Theme` port: a pack's words; `Plain` without one
    .kind("herd", |ui, block, out| herd(ui, block, out))?            // a core kind's name is `Err(Clash)`
    .island("x-chart", || Box::new(Chart::default()))    // one instance per block, kept until the block goes
    .wrap("card", |ui, styled, content| {                // the style hook: wraps the drawn card, cannot reach inside
        egui::Frame::new().stroke((1.0, accent(styled.tone))).show(ui, |ui| content(ui));
    });
```

```rust
impl blocks_desktop::Island for Chart {
    fn show(&mut self, ui: &mut egui::Ui, props: &blocks::Fields, out: &mut blocks_desktop::Out<'_>) {
        if plot(ui, props, &mut self.zoom).clicked() { out.send("pick", picked(props)); }   // only a name in `events` is posted
    }
}
```

A kind or an island nobody registered draws its fallback. No file in this repo changes.

## Headless: a verify lane, a perf gate, a test

The same contract as `blocks-shot` and `blocks-snap` (`renderers.md` 6), with no window, GPU or display server:

```sh
cargo run -q --release -p blocks-desk -- --screen queue.json --size 1440x900 --scheme dark \
    --script tap-first-row.json --check --out shots/
```

It writes `shots/<shot>.png`, `shots/<shot>.tree.json` and `shots/report.json`, and exits 1 when a check fails. With
`--check` and no `--expect`, the expected tree is `tree::expect` with the renderer's own list of drawn kinds, worked
out in process: no tree files are committed for the desktop.

The same in a test, where an app's kinds, islands and styles can be passed:

```rust
let run = Desk::new(screen).size(390, 844).kit(kit).run(&[Step::Tap(On { id: "12".into() }), shot("opened")]);
assert_eq!(run.report.sent, [Action { screen: "queue".into(), block: Some("12".into()), action: "open".into(), ..Action::default() }]);
assert!(run.faults.is_empty(), "{:?}", run.faults);
```

An e2e test in a real window finds a block by the same ids as in SwiftUI: the accessibility identifier
`block:<id>`, and `action:<action>` on what a tap sends from (`renderers.md` 2b).

## A kind's file

One file per core kind in `crates/blocks-desktop/src/draw/`, all 27 present from the first slice. A view is plain
calls on the `Ui`; it draws its children through the context, which is how each child gets its hooks:

```rust
// draw/section.rs
pub(super) const DRAW: Option<Draw<Section>> = Some(draw);

fn draw(b: &Section, ui: &mut Ui, cx: &mut Cx<'_>) {
    if let Some(h) = &b.header { ui.label(cx.look.label(LabelRole::Section, h)); }
    cx.blocks(ui, &b.blocks);
    if let Some(f) = &b.footer { ui.label(cx.look.muted(f)); }
}
```

```rust
// draw/diff.rs, a gap: the whole file until its issue draws it
pub(super) const DRAW: Option<Draw<Diff>> = None; // TODO(#N)
```

`None` is a gap: the switch draws the block's fallback and the kind is left out of the list of drawn kinds, so the two
cannot disagree. The PR that draws `diff` edits `draw/diff.rs` and nothing else.

## A new core kind (a PR in this repo)

One more line in `usage.md`'s list in `docs/architecture/blocks/`:

```
crates/blocks-desktop/src/draw/gauge.rs      without it the crate does not build: the switch matches every `Block`
```
