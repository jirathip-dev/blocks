use blocks::{Block, Screen};
use blocks_desktop::{Kit, Stage};
use eframe::egui::{self, ComboBox, Theme};

struct Demo {
    kinds: Vec<(&'static str, Vec<Block>)>,
    at: usize,
    on: Option<usize>,
    dark: bool,
    stage: Stage,
}

impl Demo {
    fn new() -> Self {
        let mut kinds: Vec<(&'static str, Vec<Block>)> = vec![];
        for (kind, block) in blocks::samples() {
            match kinds.iter_mut().find(|(k, _)| *k == kind) {
                Some((_, of)) => of.push(block),
                None => kinds.push((kind, vec![block])),
            }
        }
        Self {
            kinds,
            at: 0,
            on: None,
            dark: false,
            stage: Stage::default(),
        }
    }

    fn land(&mut self) {
        let Some((kind, sample)) = self.kinds.get(self.at) else {
            return;
        };
        let screen = Block::Screen(Box::new(Screen::new().id(*kind).blocks(sample.clone())));
        self.stage = Stage::default();
        self.stage.set(Some(&screen));
        self.on = Some(self.at);
    }

    fn show(&mut self, ui: &mut egui::Ui) {
        egui::Panel::top("bar").show(ui, |ui| {
            ui.horizontal(|ui| {
                let shown = self.kinds.get(self.at).map_or("", |(k, _)| *k);
                ComboBox::from_label("kind").selected_text(shown).show_ui(ui, |ui| {
                    for (i, (k, _)) in self.kinds.iter().enumerate() {
                        ui.selectable_value(&mut self.at, i, *k);
                    }
                });
                ui.checkbox(&mut self.dark, "dark");
            });
        });
        if self.on != Some(self.at) {
            self.land();
        }
        let theme = if self.dark { Theme::Dark } else { Theme::Light };
        if ui.ctx().theme() != theme {
            ui.ctx().set_theme(theme);
        }
        egui::CentralPanel::default().show(ui, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| self.stage.show(ui, &Kit::default(), 0.0));
        });
    }
}

impl eframe::App for Demo {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        self.show(ui);
    }
}

fn start(_cc: &eframe::CreationContext<'_>) -> Box<dyn eframe::App> {
    Box::new(Demo::new())
}

#[cfg(not(target_arch = "wasm32"))]
fn main() -> eframe::Result {
    eframe::run_native(
        "blocks, drawn by egui",
        eframe::NativeOptions::default(),
        Box::new(|cc| Ok(start(cc))),
    )
}

#[cfg(target_arch = "wasm32")]
fn main() {
    use eframe::wasm_bindgen::JsCast;
    wasm_bindgen_futures::spawn_local(async {
        let canvas = eframe::web_sys::window()
            .and_then(|w| w.document())
            .and_then(|d| d.get_element_by_id("demo"))
            .and_then(|e| e.dyn_into().ok());
        if let Some(canvas) = canvas {
            let runner = eframe::WebRunner::new();
            let options = eframe::WebOptions::default();
            if let Err(e) = runner.start(canvas, options, Box::new(|cc| Ok(start(cc)))).await {
                eframe::web_sys::console::error_1(&e);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::Demo;
    use eframe::egui::{Context, RawInput};

    fn pass(ctx: &Context, demo: &mut Demo) {
        ctx.run_ui(RawInput::default(), |ui| demo.show(ui))
            .textures_delta
            .clear();
    }

    #[test]
    fn every_core_kind_is_picked_and_drawn() {
        let ctx = Context::default();
        let mut demo = Demo::new();
        let picked: Vec<&str> = demo.kinds.iter().map(|(k, _)| *k).collect();
        assert_eq!(picked, blocks::Block::KINDS);
        for at in 0..demo.kinds.len() {
            demo.at = at;
            pass(&ctx, &mut demo);
            let kind = demo.kinds[at].0;
            let drawn = demo.stage.drawn().unwrap();
            assert_eq!(drawn.blocks.first().map(String::as_str), Some(kind), "{kind}");
            assert!(drawn.blocks.len() > 1, "{kind} drew no sample");
        }
    }

    #[test]
    fn the_switch_turns_the_screen_dark_and_back() {
        let ctx = Context::default();
        let mut demo = Demo::new();
        pass(&ctx, &mut demo);
        assert!(!ctx.global_style().visuals.dark_mode);
        demo.dark = true;
        pass(&ctx, &mut demo);
        pass(&ctx, &mut demo);
        assert!(ctx.global_style().visuals.dark_mode);
        demo.dark = false;
        pass(&ctx, &mut demo);
        pass(&ctx, &mut demo);
        assert!(!ctx.global_style().visuals.dark_mode);
    }
}
