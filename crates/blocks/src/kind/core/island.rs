use serde::{Deserialize, Serialize};

use crate::kind::{Block, Fallback, Fields};

listed! { 27: Island(Island) = "island" }

wire! {
    /// The box an island holds before it loads: a width and height, or an aspect.
    pub struct IslandSize {
        width: Option<u32>,
        height: Option<u32>,
        aspect: Option<String>,
    }
}

kind! {
    /// A client component the app hosts: its props in, its named events out.
    pub struct Island {
        id: Option<String>,
        name: String,
        fallback: Fallback,
        props: Option<Fields>,
        events: Option<Vec<String>>,
        size: Option<IslandSize>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let fallback = Fallback {
        title: "The map".into(),
        ..Fallback::default()
    };
    let props = serde_json::Map::from_iter([("zoom".into(), serde_json::Value::from(3))]);
    let island = Island::new("x-map", fallback)
        .id("map")
        .props(props)
        .events(vec!["pick".to_string()]);
    vec![Block::Island(Box::new(island))]
}
