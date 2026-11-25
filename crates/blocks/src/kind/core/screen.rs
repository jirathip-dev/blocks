use crate::expr::{Expr, Lit, State};
use crate::kind::{
    Act, Block, Button, Fields, Form, List, Locale, Pending, Row, SearchField, Section, Shown, Stat, Submit, Text,
};

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
    vec![Block::Screen(Box::new(screen)), found(), side()]
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

fn side() -> Block {
    let rows = |id: &str, rows: &[(&str, &str, &str)]| {
        let rows = rows.iter().map(|(id, t, v)| Block::Row(Box::new(Row::new(*t).id(*id).value(Shown::Text((*v).into())))));
        Block::List(Box::new(List::new(rows.collect::<Vec<_>>()).id(id)))
    };
    let section = |id: &str, header: &str, blocks: Vec<Block>| Section::new(blocks).id(id).header(header);
    let button = |id: &str, label: &str| Block::Button(Box::new(Button::new(label).id(id).action(id)));
    let lines = [
        ("l1", "Sourdough loaf × 24", "24"),
        ("l2", "Rye bread × 12", "12"),
        ("l3", "Croissant tray × 4", "4"),
        ("l4", "Oat milk 1 L × 10", "8"),
    ];
    let trip = [
        ("trip-van", "Vehicle", "Van 7 · LB-221"),
        ("trip-km", "Distance", "42 km"),
        ("trip-next", "Next stop", "10:25"),
    ];
    let stops = Stat::new().id("trip-stops").label("stops left").value(Shown::Number(6.into()));
    let blocks = vec![
        Block::Section(Box::new(section("lines", "Lines · 4 of 6", vec![rows("line-rows", &lines)]))),
        Block::Section(Box::new(
            section("trip", "Trip summary", vec![Block::Stat(Box::new(stops)), rows("trip-rows", &trip)]).side(true),
        )),
        button("report", "Report a problem"),
        button("next", "Next: proof"),
        Block::Section(Box::new(
            section("customer", "Customer", vec![rows("cust-rows", &[("cust-who", "Ana Marlow", "owner")])]).side(true),
        )),
    ];
    Block::Screen(Box::new(Screen::new().id("side").title("Run 14 · Harbour Rd").blocks(blocks)))
}
