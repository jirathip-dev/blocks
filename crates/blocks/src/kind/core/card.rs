use crate::kind::{Act, Block, CardKind, Fold, Label, Row, Shown, Stat, Tap, Time, Tone, Toned};

listed! { 5: Card(Card) = "card" }

kind! {
    /// A card: an ask, a run, a config or a proposal.
    pub struct Card {
        id: Option<String>,
        kind: Option<CardKind>,
        tone: Option<Tone>,
        title: Option<String>,
        subtitle: Option<Toned>,
        meta: Option<Shown>,
        badge: Option<Label>,
        buttons: Option<Vec<Block>>,
        tap: Option<Tap>,
        push: Option<bool>,
        blocks: Option<Vec<Block>>,
        menu: Option<Vec<Act>>,
        fold: Option<Fold>,
    }
}

fn card() -> Card {
    let at = |since: Option<&str>, until: Option<&str>, label: &str| Time {
        since: since.map(Into::into),
        until: until.map(Into::into),
        label: Some(label.into()),
    };
    let ago = |label: &str| at(Some("2026-11-09T09:35:00Z"), None, label);
    let left = |label: &str| at(None, Some("2026-11-09T09:53:00Z"), label);
    let timed = Row::new("Review")
        .id("card-row")
        .subtitle(Toned::Label(Label {
            text: left("decides in {rel}").into(),
            tone: None,
        }))
        .value(ago("{} ago"));
    Card::new()
        .id("card")
        .kind(CardKind::Ask)
        .title("q1")
        .subtitle("waiting")
        .meta(ago("as of {} ago"))
        .badge(Label {
            text: left("lapses in {rel}").into(),
            tone: None,
        })
        .blocks(vec![
            Block::Row(Box::new(timed)),
            Block::Stat(Box::new(Stat::new().id("card-up").label("up").value(ago("{}")))),
        ])
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Card(Box::new(card()))]
}
