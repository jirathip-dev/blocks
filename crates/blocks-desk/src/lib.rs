mod fit;
mod stopwatch;

use blocks::tree::{expect, Node, Report, Step, Timings};
use blocks::{apply, Block, Built, Op};
use blocks_desktop::{kinds, Event, Kit, Stage};
use egui::emath::Numeric;
use egui::{Context, Modifiers, PointerButton, Pos2, RawInput, Rect, Vec2, ViewportId};
use serde::Deserialize;

use crate::stopwatch::Stopwatch;

const PASSES: usize = 8;

/// The block and action ids a shot drew, in order: a `fixtures/ids` file.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
pub struct Ids {
    pub blocks: Vec<String>,
    pub actions: Vec<String>,
}

/// One shot of a run: its name, the tree drawn with rects, and the ids.
#[derive(Clone, Debug, PartialEq)]
pub struct Shot {
    pub name: String,
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
}

struct Live {
    ctx: Context,
    stage: Stage,
    kit: Kit,
    screen: Block,
    size: Vec2,
    run: Run,
}

impl Desk {
    /// A desk for `screen` at 390x844 with the default kit.
    pub fn new(screen: Block) -> Self {
        Self {
            screen,
            width: 390,
            height: 844,
            kit: Kit::default(),
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

    /// Paints the screen, then runs `steps` in turn.
    pub fn run(self, steps: &[Step]) -> Run {
        let clock = Stopwatch::start();
        let mut live = Live::new(self);
        live.run.report.timings.first_paint_ms = clock.ms();
        for s in steps {
            let clock = Stopwatch::start();
            live.step(s);
            live.run.report.timings.steps_ms.push(clock.ms());
        }
        live.run
    }
}

impl Live {
    fn new(d: Desk) -> Self {
        let ctx = Context::default();
        ctx.global_style_mut(|s| s.animation_time = 0.0);
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
            let mut did = vec![];
            let mut full = self.ctx.run_ui(input, |ui| did = self.stage.show(ui, &self.kit, 0.0));
            full.textures_delta.clear();
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
        if let Err(e) = apply(&mut self.screen, ops) {
            self.run.faults.push(format!("ops: {e}"));
        }
        self.land();
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
            Step::Type(t) => format!("type {}", t.id),
            Step::Scroll(on) => format!("scroll {}", on.id),
            Step::Gesture(g) => format!("gesture {}", g.id),
            Step::Refuse(r) => format!("refuse {}", r.toast),
        };
        self.run.report.dropped.push(dropped);
    }

    fn tap(&mut self, id: &str) {
        let hit = self.stage.drawn().and_then(|d| d.hits.get(id));
        let Some([x, y, w, h]) = hit.filter(|h| h.live).and_then(|h| h.tap) else {
            return self.run.report.dropped.push(format!("tap {id}"));
        };
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
            tree: d.tree.clone(),
            ids: Ids {
                blocks: d.blocks.clone(),
                actions: d.actions.clone(),
            },
        });
        self.run.report.shots.push(name.into());
    }
}
