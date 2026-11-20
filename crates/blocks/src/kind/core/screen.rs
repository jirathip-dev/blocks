use crate::expr::{Expr, Lit, State};
use crate::kind::{Act, Block, Fields, Locale, Pending, Submit, Text};

listed! { 0: Screen(Screen) = "screen" }

kind! {
    /// A whole screen.
    pub struct Screen {
        id: Option<String>,
        title: Option<String>,
        large: Option<bool>,
        state: Option<State>,
        stream: Option<String>,
        actions: Option<Vec<Act>>,
        blocks: Option<Vec<Block>>,
        back: Option<String>,
        done: Option<Submit>,
        refresh: Option<bool>,
        pending: Option<Pending>,
        focus: Option<bool>,
        badge: Option<u64>,
        source: Option<String>,
        url: Option<String>,
        sites: Option<u64>,
        personas: Option<Vec<Fields>>,
        threads: Option<Vec<Fields>>,
        locale: Option<Locale>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let shown = Text::new().id("hint").markdown("Ready").show(Expr::Get("ready".into()));
    let state: State = [("ready".to_string(), Lit::Bool(true))].into_iter().collect();
    let screen = Screen::new()
        .id("home")
        .title("Home")
        .state(state)
        .blocks(vec![Block::Text(Box::new(shown))]);
    vec![Block::Screen(Box::new(screen))]
}
