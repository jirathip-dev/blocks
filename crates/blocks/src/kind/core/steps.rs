use crate::kind::{Bar, Block, Fallback, Stage, Tap};

listed! { 29: Steps(Steps) = "steps" }

kind! {
    /// A stepper of named steps with its current one, or progress bars.
    pub struct Steps {
        id: Option<String>,
        title: Option<String>,
        steps: Option<Vec<Stage>>,
        current: Option<String>,
        done: Option<bool>,
        bars: Option<Vec<Bar>>,
        fallback: Option<Fallback>,
    }
}

fn step(id: &str, label: &str, sub: &str) -> Stage {
    Stage {
        id: id.into(),
        label: label.into(),
        sub: Some(sub.into()),
        tap: Some(Tap {
            open: Some(id.into()),
            ..Tap::default()
        }),
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Steps(Box::new(
        Steps::new()
            .id("stop")
            .title("Stop 3 of 8")
            .steps(vec![
                step("stop", "Stop", "arrived 09:42"),
                step("lines", "Lines", "6 checked"),
            ])
            .done(true),
    ))]
}
