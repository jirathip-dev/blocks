use std::hint::black_box;
use std::time::Instant;

use blocks::theme::Mode;
use gpui::{point, prelude::*, px, size, AnyWindowHandle, Entity, HeadlessAppContext};

use crate::look::Look;
use crate::stage::Stage;
use crate::{bursts, sample, shot, stats, STEP};

fn ms(clock: Instant) -> f64 {
    clock.elapsed().as_secs_f64() * 1000.0
}

struct Head {
    cx: HeadlessAppContext,
    win: AnyWindowHandle,
    stage: Entity<Stage>,
    gpu: bool,
}

impl Head {
    fn pass(&mut self) -> f64 {
        let clock = Instant::now();
        let gpu = self.gpu;
        let drawn = self.cx.update_window(self.win, |_, window, cx| {
            window.draw(cx).clear(cx);
            if gpu {
                match window.render_to_image() {
                    Ok(image) => drop(black_box(image)),
                    Err(e) => {
                        eprintln!("blocks-gpui: no pixels with no window here: {e:#}");
                        std::process::exit(1);
                    }
                }
            }
        });
        if let Err(e) = drawn {
            eprintln!("draw: {e:#}");
        }
        ms(clock)
    }
}

pub fn run((w, h): (u32, u32), gpu: bool) -> Result<(), String> {
    let name = if gpu { "gpui+gpu" } else { "gpui" };
    let clock = Instant::now();
    let mut cx = shot::context(gpu);
    let win = cx
        .open_window(size(px(w as f32), px(h as f32)), |_, cx| {
            cx.new(|_| Stage::new(Look::new(Mode::Light), Some(sample::rows(200))))
        })
        .map_err(|e| format!("open: {e:#}"))?;
    cx.simulate_window_scale_factor_change(win.into(), 1.0);
    let stage = win.entity(&cx).map_err(|e| format!("root: {e:#}"))?;
    let mut head = Head {
        cx,
        win: win.into(),
        stage,
        gpu,
    };
    head.pass();
    stats::report(name, "first-paint", (w, h), &[ms(clock)]);
    let still: Vec<f64> = (0..120).map(|_| head.pass()).collect();
    stats::report(name, "repaint-still", (w, h), &still);
    let scroll: Vec<f64> = (0..240)
        .map(|i| {
            let y = STEP * (if i < 120 { i } else { 240 - i }) as f32;
            head.cx.update(|cx| {
                head.stage.update(cx, |s, cx| {
                    s.scroll.set_offset(point(px(0.0), px(-y)));
                    cx.notify();
                });
            });
            head.pass()
        })
        .collect();
    stats::report(name, "scroll", (w, h), &scroll);
    for (case, frames) in bursts() {
        let took: Vec<f64> = frames
            .iter()
            .map(|ops| {
                let clock = Instant::now();
                head.cx.update(|cx| {
                    head.stage.update(cx, |s, cx| {
                        if let Err(e) = s.apply(ops, cx) {
                            eprintln!("ops: {e}");
                        }
                    });
                });
                ms(clock) + head.pass()
            })
            .collect();
        stats::report(name, case, (w, h), &took);
    }
    Ok(())
}
