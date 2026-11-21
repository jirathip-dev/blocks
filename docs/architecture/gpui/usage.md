# How cooee's desktop app reads, on each toolkit (#299)

Sketches. The egui side is `docs/architecture/desktop/usage.md` unchanged, since the decision keeps it. The GPUI side
is what the prototype in `proto/gpui/` does today, so the owner can see the road not taken.

## egui, chosen: the app's window, as it reads today

```toml
blocks         = { git = "https://github.com/jirathip-dev/blocks", rev = "<40 hex>" }
blocks-desktop = { git = "https://github.com/jirathip-dev/blocks", rev = "<the same 40 hex>" }
eframe         = "0.37"        # cooee's own: the window, the GPU, the OS accessibility bridge, the fonts
```

```rust
struct Cooee { mirror: Mirror, stage: Stage, kit: Kit, link: Link }      // Link is cooee's transport

impl eframe::App for Cooee {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        for f in self.link.take() {                                      // every frame since the last pass
            match self.mirror.frame(f) {
                Took::Patched | Took::Replaced => self.stage.set(self.mirror.screen("chat")),
                Took::Gap => self.link.reopen(self.mirror.have()),
                Took::Old => {}
            }
        }
        egui::ScrollArea::vertical().show(ui, |ui| {                     // the app scrolls; the stage draws
            for e in self.stage.show(ui, &self.kit, self.link.unix_now()) {
                if let Event::Act(action) = e { self.link.post(action) }
            }
        });
    }
}
```

The app sets its look once, with no change to the renderer: a font, the type sizes and the spacing on egui's
`Context`, and a margin around the stage. `proto/egui/src/window.rs` (`--styled`) does it in about 30 lines;
`look/egui-look-390-*-styled.png` is the result.

## GPUI, not chosen: the same app

```toml
blocks        = { git = "https://github.com/jirathip-dev/blocks", rev = "<40 hex>" }
gpui          = { git = "https://github.com/zed-industries/zed", rev = "<40 hex>" }      # no usable crates.io release
gpui_platform = { git = "https://github.com/zed-industries/zed", rev = "<the same>", features = ["font-kit", "wayland", "x11"] }
```

```rust
gpui_platform::application().run(|cx: &mut App| {
    cx.open_window(WindowOptions::default(), |_, cx| {
        let stage = cx.new(|_| Stage::new(Look::new(Mode::Light), None));  // an entity GPUI keeps and redraws
        cx.subscribe(&stage, |_, e: &Event, cx| post(e, cx)).detach();      // what the user did comes as events
        cx.new(|_| Cooee { stage, mirror: Mirror::default() })
    })
});

// a frame arrived on the app's link:
stage.update(cx, |s, cx| s.apply(&ops, cx));                                // `blocks::apply`, then `cx.notify()`

// the app's root view:
impl Render for Cooee {
    fn render(&mut self, _: &mut Window, _: &mut Context<Self>) -> impl IntoElement {
        div().size_full().child(self.stage.clone())                         // the stage scrolls itself
    }
}
```

A kind is a function from the block to elements, laid out by flexbox:

```rust
fn row(b: &Block, x: &Row, n: usize, d: &mut Cx) -> AnyElement {
    shell(b, n, Role::ListItem, &x.title)                                   // id, role, name, `block:<id>`
        .py_2().border_b_1().border_color(d.look.line)
        .child(div().flex().items_center().gap_3()
            .child(div().flex_1().child(x.title.clone()).children(x.subtitle.as_ref().map(|s| toned(s, d.look))))
            .children(x.value.as_ref().map(|v| label(shown(v), d.look.mute))))
        .into_any_element()
}
```

## What differs for the caller

| | egui | GPUI |
|---|---|---|
| Who holds the screen | the app's `Stage`, a plain value | an `Entity<Stage>` GPUI owns; the app holds a handle |
| A pass | the app calls `stage.show(ui, ..)` every frame and gets `Vec<Event>` back | GPUI calls `Stage::render` when the entity was notified; events arrive through `cx.subscribe` |
| An op lands | `stage.set(screen)`; the next pass draws it | `stage.update(cx, \|s, cx\| s.apply(ops, cx))` |
| A text field | `ui.text_edit_singleline`, with IME, selection and the clipboard | the app writes it: `proto/gpui/src/field.rs` is 195 lines with no caret movement, selection or clipboard; GPUI's own example is 912 |
| Text the user can select and copy | every label, by default | nothing: the app builds selection on `StyledText`'s hit test |
| Headless test | `Desk::new(screen).run(&steps)`: CPU only, the same on three OSes | `HeadlessAppContext` with a GPU renderer on macOS and Linux; a real window on Windows |
