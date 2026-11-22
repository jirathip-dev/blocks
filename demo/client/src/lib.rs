use blocks::{diff, Action, Answer, Block, Button, List, Row, Screen, Shown, Stat};

#[cfg(target_arch = "wasm32")]
mod glue;

/// The app's state: how many sends, and the screen it last handed out.
#[derive(Default)]
pub struct Meter {
    sent: u64,
    drawn: Option<Block>,
}

impl Meter {
    fn build(&self) -> Block {
        let rows = (0..self.sent).map(|i| Block::Row(Box::new(Row::new(format!("Send {i}")).id(format!("send-{i}")))));
        let screen = Screen::new().id("meter").title("Meter").blocks(vec![
            Block::Stat(Box::new(
                Stat::new()
                    .id("count")
                    .label("sent")
                    .value(Shown::Number(self.sent.into())),
            )),
            Block::List(Box::new(List::new(rows.collect::<Vec<_>>()).id("sends"))),
            Block::Button(Box::new(Button::new("Send one").id("send").action("send"))),
        ]);
        Block::Screen(Box::new(screen))
    }

    /// The whole screen; the next ops start from it.
    pub fn screen(&mut self) -> &Block {
        self.drawn.insert(self.build())
    }

    /// What an action does: the state changes and the answer carries the ops from the screen last handed out.
    pub fn act(&mut self, a: &Action) -> Answer {
        if a.action == "send" {
            self.sent += 1;
        }
        let next = self.build();
        let ops = self.drawn.as_ref().map(|old| diff(old, &next)).unwrap_or_default();
        self.drawn = Some(next);
        Answer {
            ops,
            ..Answer::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use blocks::{apply, Built};
    use serde_json::{json, Value};

    fn held(name: &str, got: &Value) {
        let path = format!("{}/../../fixtures/client/{name}", env!("CARGO_MANIFEST_DIR"));
        let text = format!("{}\n", serde_json::to_string_pretty(got).unwrap());
        if std::env::var_os("BLOCKS_GEN").is_some() {
            std::fs::write(&path, &text).unwrap();
        }
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            text,
            "{path} is behind: rerun just gen"
        );
    }

    #[test]
    fn generated_a_send_adds_a_row_and_counts_it() {
        let mut m = Meter::default();
        let first = m.screen().clone();
        let asked = Action {
            screen: "meter".into(),
            block: Some("send".into()),
            action: "send".into(),
            ..Action::default()
        };
        let answer = m.act(&asked);
        let mut drawn = first.clone();
        apply(&mut drawn, &answer.ops).unwrap();
        assert_eq!(&drawn, m.screen());
        held("screen.json", &json!(first));
        held("send.json", &json!({ "action": asked, "answer": answer }));
    }

    #[test]
    fn the_screen_passes_the_check_and_an_unknown_action_changes_nothing() {
        let mut m = Meter::default();
        assert_eq!(Built::new(json!(m.screen())).check(&[]), Vec::new());
        let answer = m.act(&Action {
            screen: "meter".into(),
            action: "nope".into(),
            ..Action::default()
        });
        assert_eq!(answer, Answer::default());
    }
}
