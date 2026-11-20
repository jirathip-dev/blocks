use blocks::tree::Drawn as Way;
use blocks::Block;
use egui::Ui;

use crate::cx::{Cx, Draw};
use crate::{fallback, island};

fn either<T>(view: Option<Draw<T>>, x: &T, b: &Block, name: &str, ui: &mut Ui, cx: &mut Cx<'_>) -> Way {
    if let Some(view) = view {
        view(x, ui, cx);
        Way::Native
    } else {
        fallback::draw(b, name, ui, cx);
        Way::Fallback
    }
}

macro_rules! switch {
    ($($v:ident => $m:ident,)*) => {
        $(mod $m;)*

        /// The core kinds drawn natively: every `draw/<kind>.rs` with a view.
        pub fn kinds() -> Vec<&'static str> {
            let all = [$(($m::DRAW.is_some(), stringify!($m))),*];
            all.into_iter().filter_map(|(d, k)| d.then_some(k)).collect()
        }

        pub(crate) fn draw(b: &Block, name: &str, ui: &mut Ui, cx: &mut Cx<'_>) -> Way {
            $(if let Block::$v(x) = b {
                return either($m::DRAW, x, b, name, ui, cx);
            })*
            match b {
                Block::App(a) => island::app(a, b, name, ui, cx),
                Block::Island(x) => island::island(x, b, name, ui, cx),
                _ => fallback::draw(b, name, ui, cx),
            }
            Way::Fallback
        }
    };
}

switch! {
    Screen => screen,
    Sheet => sheet,
    Section => section,
    List => list,
    Row => row,
    Card => card,
    Choice => choice,
    Form => form,
    Config => config,
    Secret => secret,
    Run => run,
    Button => button,
    Chips => chips,
    Stat => stat,
    Text => text,
    Images => images,
    Web => web,
    Diff => diff,
    Editor => editor,
    Scene => scene,
    Diagram => diagram,
    Composer => composer,
    Lines => lines,
    Prose => prose,
    Hero => hero,
    Media => media,
    Nav => nav,
    Table => table,
    Steps => steps,
    Toast => toast,
    Chart => chart,
    Pages => pages,
    Import => import,
    Timeline => timeline,
}
