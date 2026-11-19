use super::{Block, List};
use crate::gesture::{Dir, Nudge, Rules, Word};

const STEPS: [(&str, Dir, bool); 4] = [
    ("Move up", Dir::Up, false),
    ("Move down", Dir::Down, false),
    ("Move to top", Dir::Up, true),
    ("Move to bottom", Dir::Down, true),
];

fn moved(order: &[String], id: &str, to: usize) -> Option<Vec<String>> {
    let mut ids = order.to_vec();
    let from = ids.iter().position(|i| i == id)?;
    let it = ids.remove(from);
    ids.insert(to.min(ids.len()), it);
    Some(ids)
}

impl List {
    fn order(&self) -> Vec<String> {
        self.rows.iter().filter_map(Block::id).map(String::from).collect()
    }

    fn row(&self, id: &str) -> Option<&super::Row> {
        self.rows.iter().find_map(|b| match b {
            Block::Row(r) if r.id.as_deref() == Some(id) => Some(&**r),
            _ => None,
        })
    }
}

impl Rules for List {
    type Grab = String;
    type Reach = i64;
    type Change = Vec<String>;

    fn word(&self, grab: &String) -> Option<Word> {
        let handled = self.row(grab).is_some_and(|r| r.handle == Some(true));
        (self.reorder.is_some() && handled).then_some(Word::Reorder)
    }

    fn start(&self, grab: &String) -> Option<Vec<String>> {
        self.word(grab).map(|_| self.order())
    }

    fn candidate(&self, grab: &String, reach: &i64) -> Option<Vec<String>> {
        let order = self.start(grab)?;
        let from = i64::try_from(order.iter().position(|i| i == grab)?).ok()?;
        moved(&order, grab, usize::try_from(from.saturating_add(*reach).max(0)).ok()?)
    }

    fn nudge(&self, grab: &String, from: &Vec<String>, by: Nudge) -> Option<Vec<String>> {
        self.word(grab)?;
        let at = from.iter().position(|i| i == grab)?;
        let last = from.len().checked_sub(1)?;
        let to = match (by.dir, by.big) {
            (Dir::Up, _) if at == 0 => return None,
            (Dir::Down, _) if at == last => return None,
            (Dir::Up, true) => 0,
            (Dir::Up, false) => at - 1,
            (Dir::Down, true) => last,
            (Dir::Down, false) => at + 1,
            (Dir::Left | Dir::Right, _) => return None,
        };
        moved(from, grab, to)
    }

    fn steps(&self, grab: &String) -> Vec<(String, Nudge)> {
        let Some(start) = self.start(grab) else { return vec![] };
        let all = STEPS
            .iter()
            .map(|(name, dir, big)| ((*name).to_string(), Nudge { dir: *dir, big: *big }));
        all.filter(|(_, n)| self.nudge(grab, &start, *n).is_some()).collect()
    }

    fn says(&self, grab: &String, change: &Vec<String>) -> String {
        let title = self.row(grab).map_or(grab.as_str(), |r| r.title.as_str());
        let at = change.iter().position(|i| i == grab).map_or(0, |i| i + 1);
        format!("{title}, {at} of {}", change.len())
    }
}
