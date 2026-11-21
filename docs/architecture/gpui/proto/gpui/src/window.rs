use std::time::Instant;

use blocks::theme::Mode;
use blocks::{Block, Op};
use gpui::{point, prelude::*, px, size, App, Bounds, Context, Entity, Window, WindowBounds, WindowOptions};

use crate::look::Look;
use crate::stage::{Event, Stage};
use crate::{bursts, stats, STEP};

const WARM: usize = 30;
const SCROLL: usize = 240;

struct Driver {
    stage: Entity<Stage>,
    bench: bool,
    size: (u32, u32),
    frame: usize,
    last: Option<Instant>,
    gaps: Vec<f64>,
    plan: Vec<(&'static str, usize)>,
    ops: Vec<Vec<Op>>,
}

impl Driver {
    fn step(&mut self, cx: &mut Context<Self>) {
        let at = self.frame.saturating_sub(WARM);
        let ops = at.checked_sub(SCROLL).and_then(|i| self.ops.get(i));
        self.stage.update(cx, |s, cx| {
            if at < SCROLL {
                let y = STEP * (if at < SCROLL / 2 { at } else { SCROLL - at }) as f32;
                s.scroll.set_offset(point(px(0.0), px(-y)));
                cx.notify();
            } else if let Some(Err(e)) = ops.map(|o| s.apply(o, cx)) {
                eprintln!("ops: {e}");
            }
        });
    }

    fn done(&self, cx: &mut Context<Self>) {
        let mut from = WARM;
        for (name, frames) in &self.plan {
            let to = (from + frames).min(self.gaps.len());
            stats::report("gpui-window-gap", name, self.size, &self.gaps[from.min(to)..to]);
            from = to;
        }
        cx.quit();
    }
}

impl Render for Driver {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        if self.bench {
            let now = Instant::now();
            let gap = self.last.replace(now).map_or(0.0, |l| (now - l).as_secs_f64() * 1000.0);
            self.gaps.push(gap);
            if self.frame >= WARM {
                self.step(cx);
            }
            self.frame += 1;
            let all: usize = self.plan.iter().map(|(_, n)| n).sum();
            if self.frame == WARM + all {
                self.done(cx);
            } else {
                window.request_animation_frame();
            }
        }
        self.stage.clone()
    }
}

pub fn open(block: Block, mode: Mode, (w, h): (u32, u32), bench: bool) -> Result<(), String> {
    gpui_platform::application().run(move |cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(w as f32), px(h as f32)), cx);
        let options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(bounds)),
            ..Default::default()
        };
        let opened = cx.open_window(options, |_, cx| {
            let stage = cx.new(|_| Stage::new(Look::new(mode), Some(block)));
            cx.subscribe(&stage, |_, e: &Event, _| match e {
                Event::Tap(id) => println!("tap {id}"),
                Event::Send { action, text } => println!("send {action}: {text}"),
            })
            .detach();
            let all = bursts();
            let mut plan = vec![("scroll", SCROLL)];
            plan.extend(all.iter().map(|(n, f)| (*n, f.len())));
            cx.new(|_| Driver {
                stage,
                bench,
                size: (w, h),
                frame: 0,
                last: None,
                gaps: vec![],
                plan,
                ops: all.into_iter().flat_map(|(_, f)| f).collect(),
            })
        });
        if let Err(e) = opened {
            eprintln!("open: {e:#}");
            cx.quit();
            return;
        }
        cx.on_window_closed(|cx, _| cx.quit()).detach();
        cx.activate(true);
    });
    Ok(())
}
