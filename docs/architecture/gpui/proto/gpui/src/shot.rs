use std::path::PathBuf;
use std::sync::Arc;

use blocks::theme::Mode;
use blocks::Block;
use gpui::{
    point, prelude::*, px, size, App, Bounds, HeadlessAppContext, SharedString, Window, WindowBounds, WindowOptions,
};

use crate::look::Look;
use crate::probe;
use crate::stage::Stage;

pub fn context(gpu: bool) -> HeadlessAppContext {
    let text = gpui_platform::current_platform(cfg!(not(target_os = "windows"))).text_system();
    HeadlessAppContext::with_platform(text, Arc::new(()), move || {
        if gpu {
            gpui_platform::current_headless_renderer()
        } else {
            Ok(None)
        }
    })
}

pub fn headless(block: Block, mode: Mode, (w, h): (u32, u32), scale: f32, out: &str) -> Result<(), String> {
    let mut cx = context(true);
    let at = size(px(w as f32), px(h as f32));
    let win = cx
        .open_window(at, |_, cx| cx.new(|_| Stage::new(Look::new(mode), Some(block))))
        .map_err(|e| format!("open: {e:#}"))?;
    cx.simulate_window_scale_factor_change(win.into(), scale);
    cx.run_until_parked();
    cx.update_window(win.into(), |_, window, cx| window.draw(cx).clear(cx))
        .map_err(|e| format!("draw: {e:#}"))?;
    let image = cx
        .capture_screenshot(win.into())
        .map_err(|e| format!("capture: {e:#}"))?;
    image.save(out).map_err(|e| format!("{out}: {e}"))
}

pub fn window(block: Block, mode: Mode, (w, h): (u32, u32), out: PathBuf) -> Result<(), String> {
    let done = std::rc::Rc::new(std::cell::RefCell::new(Err("the app never ran".to_owned())));
    let told = done.clone();
    gpui_platform::application().run(move |cx: &mut App| {
        let bounds = Bounds {
            origin: point(px(0.0), px(0.0)),
            size: size(px(w as f32), px(h as f32)),
        };
        let options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(bounds)),
            focus: false,
            show: false,
            ..Default::default()
        };
        let shot = cx
            .open_window(options, |_, cx| cx.new(|_| Stage::new(Look::new(mode), Some(block))))
            .and_then(|win| {
                cx.update_window(win.into(), |_, window, cx| {
                    println!("gpu {:?}", window.gpu_specs());
                    window.draw(cx).clear(cx);
                    window.render_to_image()
                })
            })
            .and_then(|image| image)
            .map_err(|e| format!("window shot: {e:#}"))
            .and_then(|image| image.save(&out).map_err(|e| format!("{}: {e}", out.display())));
        *told.borrow_mut() = shot;
        cx.quit();
    });
    let result = done.borrow().clone();
    result
}

fn probed(window: &mut Window) -> Result<(), String> {
    let style = window.text_style();
    let at = px(14.0);
    let system = window.text_system().clone();
    let line = |s: &str| system.shape_line(SharedString::from(s.to_owned()), at, &[style.to_run(s.len())], None);
    let xs = |s: &str| {
        let l = line(s);
        let glyphs: Vec<_> = l.runs.iter().flat_map(|r| r.glyphs.iter()).collect();
        s.char_indices()
            .filter(|(_, c)| !c.is_whitespace())
            .filter_map(|(i, _)| glyphs.iter().find(|g| g.index == i).map(|g| f32::from(g.position.x)))
            .collect::<Vec<f32>>()
    };
    let text = probe::THAI_LINE;
    let wrapped = system
        .shape_text(
            SharedString::from(text),
            at,
            &[style.to_run(text.len())],
            Some(px(probe::WRAP_AT)),
            None,
        )
        .map_err(|e| format!("shape: {e:#}"))?;
    let mut cuts = vec![0];
    for w in &wrapped {
        for b in &w.wrap_boundaries {
            let run = w.unwrapped_layout.runs.get(b.run_ix);
            cuts.extend(run.and_then(|r| r.glyphs.get(b.glyph_ix)).map(|g| g.index));
        }
    }
    cuts.push(text.len());
    let lines: Vec<String> = cuts
        .windows(2)
        .filter_map(|w| text.get(w[0]..w[1]).map(str::to_owned))
        .collect();
    probe::report(
        "gpui",
        &xs(probe::HEBREW),
        &xs(probe::ARABIC),
        f32::from(line(probe::THAI_BASE).width),
        f32::from(line(probe::THAI_MARKED).width),
        &lines,
    );
    Ok(())
}

pub fn probe() -> Result<(), String> {
    let mut cx = context(false);
    let win = cx
        .open_window(size(px(200.0), px(200.0)), |_, cx| {
            cx.new(|_| Stage::new(Look::new(Mode::Light), None))
        })
        .map_err(|e| format!("open: {e:#}"))?;
    cx.update_window(win.into(), |_, window, _| probed(window))
        .map_err(|e| format!("probe: {e:#}"))?
}

pub fn repack(path: &str) -> Result<(), String> {
    let image = image::open(path).map_err(|e| format!("{path}: {e}"))?;
    image.save(path).map_err(|e| format!("{path}: {e}"))
}
