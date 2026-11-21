use gpui::{div, prelude::*, px, rgb, size, App, Bounds, Context, Window, WindowBounds, WindowOptions};

struct Hello;

impl Render for Hello {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .size_full()
            .flex()
            .justify_center()
            .items_center()
            .bg(rgb(0x00ff_ffff))
            .text_color(rgb(0x0011_1111))
            .child("Hello from GPUI")
    }
}

fn main() {
    gpui_platform::application().run(|cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(480.0), px(320.0)), cx);
        let options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(bounds)),
            ..Default::default()
        };
        if cx.open_window(options, |_, cx| cx.new(|_| Hello)).is_err() {
            cx.quit();
            return;
        }
        cx.on_window_closed(|cx, _| cx.quit()).detach();
        cx.activate(true);
    });
}
