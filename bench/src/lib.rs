use std::sync::{Mutex, MutexGuard, PoisonError};

/// One row of the bench screen.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub value: String,
}

/// The bench's three updates: one row changed, one row inserted, 20 rows changed.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Update {
    One,
    Insert,
    Twenty,
}

impl Update {
    /// The update a URL segment or shard argument names.
    pub fn named(s: &str) -> Option<Self> {
        match s {
            "one" | "1" => Some(Self::One),
            "insert" | "2" => Some(Self::Insert),
            "twenty" | "3" => Some(Self::Twenty),
            _ => None,
        }
    }
}

/// The screen's rows and how many updates they have had since the last reset.
#[derive(Clone, Debug)]
pub struct Rows {
    pub rows: Vec<Row>,
    seq: usize,
}

impl Default for Rows {
    fn default() -> Self {
        let rows = (0..200)
            .map(|i| Row {
                id: format!("r{i}"),
                title: format!("Row {i}"),
                subtitle: "green".into(),
                value: "2m".into(),
            })
            .collect();
        Self { rows, seq: 0 }
    }
}

impl Rows {
    /// Applies update number `seq + 1`; its text carries `v<seq>.` or, for twenty, `w<seq>-<j>.`.
    pub fn apply(&mut self, u: Update) {
        self.seq += 1;
        let s = self.seq;
        let n = self.rows.len();
        match u {
            Update::One => {
                if let Some(r) = self.rows.get_mut(s * 7 % n) {
                    r.value = format!("v{s}.");
                }
            }
            Update::Insert => {
                let row = Row {
                    id: format!("n{s}"),
                    title: format!("New v{s}."),
                    subtitle: "green".into(),
                    value: "1s".into(),
                };
                self.rows.insert(s * 13 % (n + 1), row);
            }
            Update::Twenty => {
                for j in 0..20 {
                    if let Some(r) = self.rows.get_mut((s * 11 + j) % n) {
                        r.value = format!("w{s}-{j}.");
                    }
                }
            }
        }
    }
}

/// Locks a server-wide value, a poisoned lock included.
pub fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(PoisonError::into_inner)
}
