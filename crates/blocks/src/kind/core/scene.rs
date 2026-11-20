use crate::kind::{Block, Lane, LaneState, Load, SceneRepo, Weather};

listed! { 19: Scene(Scene) = "scene" }

kind! {
    /// Lanes at work.
    pub struct Scene {
        id: Option<String>,
        label: Option<String>,
        lanes: Option<Vec<Lane>>,
        load: Option<Load>,
        weather: Option<Weather>,
        repos: Option<Vec<SceneRepo>>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let lane = Lane {
        id: "impl-1".into(),
        title: "impl".into(),
        state: LaneState::Working,
        ..Lane::default()
    };
    vec![Block::Scene(Box::new(
        Scene::new().id("scene").label("lanes").lanes(vec![lane]),
    ))]
}
