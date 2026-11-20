use crate::kind::{Act, Block, Media};

listed! { 24: Hero(Hero) = "hero" }

kind! {
    /// A page's opening: a title, a line, a picture and its actions.
    pub struct Hero {
        id: Option<String>,
        title: String,
        subtitle: Option<String>,
        media: Option<Media>,
        actions: Option<Vec<Act>>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let media = Media::new("/media/chart.png", "a bar chart", 640_u32, 360_u32).caption("This week");
    let act = Act {
        label: "Start".into(),
        action: Some("start".into()),
        ..Act::default()
    };
    let hero = Hero::new("Blocks")
        .id("hero")
        .subtitle("One shape, three renderers")
        .media(media)
        .actions(vec![act]);
    vec![Block::Hero(Box::new(hero))]
}
