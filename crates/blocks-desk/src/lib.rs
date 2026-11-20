mod fit;
mod png;
mod raster;
mod stopwatch;

use blocks::tree::{expect, Node, Report, Step, Timings};
use blocks::{apply, Block, Built, Fields, Op};
use blocks_desktop::{kinds, Event, Island, Kit, Out, Stage};
use egui::emath::Numeric;
use egui::epaint::text::{FontData, FontInsert, FontPriority, InsertFontFamily};
use egui::{Button, Context, FontFamily, Key, Modifiers, PointerButton, Pos2, RawInput, Rect, Vec2, ViewportId};
use serde::Deserialize;

use crate::raster::{Canvas, Textures};
use crate::stopwatch::Stopwatch;

const PASSES: usize = 8;

/// The name the harness's echo island is registered under.
pub const ECHO: &str = "x-echo";

/// The harness's island: its props as text in its box; a tap sends the event its `send` prop names, with its props.
pub struct Echo;

impl Island for Echo {
    fn show(&mut self, ui: &mut egui::Ui, props: &Fields, out: &mut Out<'_>) {
        let text = serde_json::to_string(props).unwrap_or_default();
        let tall = ui.available_height().max(ui.spacing().interact_size.y);
        if ui.add_sized([ui.available_width(), tall], Button::new(text)).clicked() {
            let name = props.get("send").and_then(serde_json::Value::as_str);
            out.send(name.unwrap_or(ECHO), props.clone());
        }
    }
}
const FRAME_MS: f64 = 1000.0 / 60.0;

/// The block and action ids a shot drew, in order: a `fixtures/ids` file.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
pub struct Ids {
    pub blocks: Vec<String>,
    pub actions: Vec<String>,
}

/// One shot of a run: its name, the PNG, the tree drawn with rects, and the ids.
#[derive(Clone, Debug, PartialEq)]
pub struct Shot {
    pub name: String,
    pub png: Vec<u8>,
    pub tree: Node,
    pub ids: Ids,
}

/// What `Run::check` holds a run to: `--expect`'s tree, else the crate's `tree::expect`, and `--ids`.
#[derive(Clone, Debug, Default)]
pub struct Want {
    pub tree: Option<Node>,
    pub ids: Option<Ids>,
}

/// A harness run: the report, the shots and the faults found.
#[derive(Clone, Debug)]
pub struct Run {
    pub report: Report,
    pub shots: Vec<Shot>,
    pub faults: Vec<String>,
    width: f64,
    plans: Vec<Node>,
}

impl Run {
    /// Adds to `faults` each shot's tree, sizes, width, overlaps and ids that differ from `want`.
    pub fn check(&mut self, want: &Want) {
        for (s, plan) in self.shots.iter().zip(&self.plans) {
            let tree = want.tree.as_ref().unwrap_or(plan);
            self.faults.extend(fit::faults(&s.tree, tree, self.width, &s.name));
            if let Some(ids) = want.ids.as_ref().filter(|i| **i != s.ids) {
                self.faults
                    .push(format!("{}: drew ids {:?}, expected {ids:?}", s.name, s.ids));
            }
        }
    }
}

/// A screen drawn headless, on the CPU with no window, at a size and with a kit.
pub struct Desk {
    screen: Block,
    width: u16,
    height: u16,
    kit: Kit,
    font: Option<Vec<u8>>,
}

struct Live {
    ctx: Context,
    stage: Stage,
    kit: Kit,
    screen: Block,
    size: Vec2,
    run: Run,
    textures: Textures,
    canvas: Canvas,
    frames: Option<Vec<f64>>,
}

impl Desk {
    /// A desk for `screen` at 390x844 with the default kit and the echo island.
    pub fn new(screen: Block) -> Self {
        Self {
            screen,
            width: 390,
            height: 844,
            kit: Kit::default().island(ECHO, || Box::new(Echo)),
            font: None,
        }
    }

    /// The screen's size in points, at scale 1.
    #[must_use]
    pub fn size(self, width: u16, height: u16) -> Self {
        Self { width, height, ..self }
    }

    /// The kit every pass draws with.
    #[must_use]
    pub fn kit(self, kit: Kit) -> Self {
        Self { kit, ..self }
    }

    /// A font every text falls back to for a glyph egui's own fonts lack, such as Thai.
    #[must_use]
    pub fn font(self, data: Vec<u8>) -> Self {
        Self {
            font: Some(data),
            ..self
        }
    }

    /// Paints the screen, then runs `steps` in turn.
    pub fn run(self, steps: &[Step]) -> Run {
        let clock = Stopwatch::start();
        let mut live = Live::new(self);
        live.run.report.timings.first_paint_ms = clock.ms();
        let mut frames = vec![];
        for s in steps {
            live.frames = matches!(s, Step::Frame(_)).then(Vec::new);
            let clock = Stopwatch::start();
            live.step(s);
            live.run.report.timings.steps_ms.push(clock.ms());
            frames.extend(live.frames.take().unwrap_or_default());
        }
        let t = &mut live.run.report.timings;
        if !frames.is_empty() {
            t.longest_frame_ms = Some(frames.iter().copied().fold(0.0, f64::max));
            let over = frames.iter().filter(|f| **f > FRAME_MS).count();
            t.frames_over_budget = Some(u32::try_from(over).unwrap_or(u32::MAX));
        }
        live.run
    }
}

impl Live {
    fn new(d: Desk) -> Self {
        let ctx = Context::default();
        ctx.global_style_mut(|s| s.animation_time = 0.0);
        if let Some(data) = d.font {
            let families = [FontFamily::Proportional, FontFamily::Monospace].map(|family| InsertFontFamily {
                family,
                priority: FontPriority::Lowest,
            });
            ctx.add_font(FontInsert::new("extra", FontData::from_owned(data), families.into()));
        }
        let report = Report {
            shots: vec![],
            sent: vec![],
            dropped: vec![],
            timings: Timings {
                first_paint_ms: 0.0,
                steps_ms: vec![],
                longest_frame_ms: None,
                frames_over_budget: None,
                longest_patch_ms: None,
            },
        };
        let run = Run {
            report,
            shots: vec![],
            faults: vec![],
            width: f64::from(d.width),
            plans: vec![],
        };
        let size = Vec2::new(f32::from(d.width), f32::from(d.height));
        let mut live = Self {
            ctx,
            stage: Stage::default(),
            kit: d.kit,
            screen: d.screen,
            size,
            run,
            textures: Textures::default(),
            canvas: Canvas::new(d.width, d.height),
            frames: None,
        };
        live.land();
        live
    }

    fn passes(&mut self, mut events: Vec<egui::Event>) {
        for _ in 0..PASSES {
            let input = RawInput {
                screen_rect: Some(Rect::from_min_size(Pos2::ZERO, self.size)),
                events: std::mem::take(&mut events),
                ..RawInput::default()
            };
            let clock = Stopwatch::start();
            let mut did = vec![];
            let mut full = self.ctx.run_ui(input, |ui| did = self.stage.show(ui, &self.kit, 0.0));
            self.textures.update(&full.textures_delta);
            let prims = self.ctx.tessellate(full.shapes, full.pixels_per_point);
            self.canvas.paint(&prims, &self.textures);
            self.textures.free(&full.textures_delta);
            full.textures_delta.clear();
            if let Some(f) = &mut self.frames {
                f.push(clock.ms());
            }
            for e in did {
                match e {
                    Event::Act(a) => self.run.report.sent.push(a),
                    Event::Dropped(what) => self.run.report.dropped.push(what),
                    Event::Open(_) | Event::Sheet(_) | Event::Thread(_) | Event::Refresh => {}
                }
            }
            let asked = full.viewport_output.get(&ViewportId::ROOT);
            if !asked.is_some_and(|v| v.repaint_delay.is_zero()) {
                break;
            }
        }
    }

    fn land(&mut self) {
        self.stage.set(Some(&self.screen));
        self.passes(vec![]);
    }

    fn ops(&mut self, ops: &[Op]) {
        let clock = Stopwatch::start();
        if let Err(e) = apply(&mut self.screen, ops) {
            self.run.faults.push(format!("ops: {e}"));
        }
        self.land();
        let took = clock.ms();
        let longest = &mut self.run.report.timings.longest_patch_ms;
        *longest = Some(longest.map_or(took, |l| l.max(took)));
    }

    fn step(&mut self, s: &Step) {
        let dropped = match s {
            Step::Tap(on) => return self.tap(&on.id),
            Step::Frame(f) => {
                if let Some(screen) = &f.screen {
                    self.screen = screen.clone();
                    return self.land();
                }
                return self.ops(f.ops.as_deref().unwrap_or_default());
            }
            Step::Answer(a) => return self.ops(&a.ops),
            Step::Shot(shot) => return self.shot(&shot.name),
            Step::Type(t) => return self.type_in(&t.id, &t.text),
            Step::Scroll(on) => format!("scroll {}", on.id),
            Step::Gesture(g) => format!("gesture {}", g.id),
            Step::Refuse(r) => format!("refuse {}", r.toast),
            Step::File(f) => format!("file {}", f.field),
        };
        self.run.report.dropped.push(dropped);
    }

    fn tap(&mut self, id: &str) {
        let hit = self.stage.drawn().and_then(|d| d.hits.get(id));
        match hit.filter(|h| h.live).and_then(|h| h.tap) {
            Some(at) => self.click(at),
            None => self.run.report.dropped.push(format!("tap {id}")),
        }
    }

    fn type_in(&mut self, id: &str, text: &str) {
        let hit = self.stage.drawn().and_then(|d| d.hits.get(id));
        let Some(at) = hit.filter(|h| h.live).and_then(|h| h.field) else {
            return self.run.report.dropped.push(format!("type {id}"));
        };
        self.click(at);
        let all = egui::Event::Key {
            key: Key::A,
            physical_key: None,
            pressed: true,
            repeat: false,
            modifiers: Modifiers::COMMAND,
        };
        self.passes(vec![all, egui::Event::Text(text.into())]);
    }

    fn click(&mut self, [x, y, w, h]: [f64; 4]) {
        let pos = Pos2::new(f32::from_f64(x + w / 2.0), f32::from_f64(y + h / 2.0));
        let press = |pressed| egui::Event::PointerButton {
            pos,
            button: PointerButton::Primary,
            pressed,
            modifiers: Modifiers::NONE,
        };
        self.passes(vec![egui::Event::PointerMoved(pos), press(true)]);
        self.passes(vec![press(false)]);
    }

    fn shot(&mut self, name: &str) {
        let Some(d) = self.stage.drawn() else {
            return self.run.faults.push(format!("{name}: drew nothing"));
        };
        let built = Built::new(serde_json::to_value(&self.screen).unwrap_or_default());
        self.run.plans.push(expect(&built, &kinds(), self.stage.state()));
        self.run.shots.push(Shot {
            name: name.into(),
            png: self.canvas.png(),
            tree: d.tree.clone(),
            ids: Ids {
                blocks: d.blocks.clone(),
                actions: d.actions.clone(),
            },
        });
        self.run.report.shots.push(name.into());
    }
}
