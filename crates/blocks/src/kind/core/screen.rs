use crate::expr::{Expr, Lit, State};
use crate::kind::{Act, Block, Fields, Form, List, Locale, Pending, Row, SearchField, Section, Submit, Text};

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
    vec![Block::Screen(Box::new(screen)), found()]
}

fn rows(id: &str, rows: &[(&str, &str)]) -> Block {
    let rows = rows.iter().map(|(id, t)| Block::Row(Box::new(Row::new(*t).id(*id))));
    Block::List(Box::new(List::new(rows.collect::<Vec<_>>()).id(id)))
}

fn found() -> Block {
    let q = SearchField::new("q").label("Search").value("ops").placeholder("Search every app");
    let group = |id: &str, header: &str, hits: &[(&str, &str)]| {
        let list = rows(&format!("rows-{id}"), hits);
        Block::Section(Box::new(Section::new(vec![list]).id(format!("hits-{id}")).header(header)))
    };
    let blocks = vec![
        Block::Form(Box::new(Form::new(vec![q.into()]).id("find").action("find"))),
        group("hr", "HR", &[("hr-1", "Ops shift swaps"), ("hr-2", "Ops leave requests")]),
        group("fleet", "Fleet", &[("fl-1", "Ops trucks in Bangkok")]),
    ];
    Block::Screen(Box::new(Screen::new().id("hub").title("Apps").blocks(blocks)))
}
