use std::collections::{HashMap, HashSet};
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::screen::{Row, Screen};

/// One edit to a screen's rows.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "snake_case")]
pub enum Op {
    Insert { at: usize, row: Row },
    Remove { id: String },
    Update { row: Row },
}

/// Why an op or a frame does not fit the screen it is applied to.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ApplyError {
    NoRow(String),
    Duplicate(String),
    OutOfRange { at: usize, len: usize },
    Gap { want: u64, got: u64 },
}

impl fmt::Display for ApplyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoRow(id) => write!(f, "no row `{id}`"),
            Self::Duplicate(id) => write!(f, "row `{id}` is already on the screen"),
            Self::OutOfRange { at, len } => write!(f, "insert at {at} on a screen of {len} rows"),
            Self::Gap { want, got } => write!(f, "frame {got} where {want} was due"),
        }
    }
}

impl std::error::Error for ApplyError {}

/// The ops that turn `old` into `new`: removes first, then inserts in order; rows that keep their order stay put.
pub fn diff(old: &Screen, new: &Screen) -> Vec<Op> {
    let was: HashMap<&str, (usize, &Row)> = old
        .rows
        .iter()
        .enumerate()
        .map(|(i, r)| (r.id.as_str(), (i, r)))
        .collect();
    let kept: Vec<(usize, &str)> = new
        .rows
        .iter()
        .filter_map(|r| Some((was.get(r.id.as_str())?.0, r.id.as_str())))
        .collect();
    let order: Vec<usize> = kept.iter().map(|k| k.0).collect();
    let stay: HashSet<&str> = rising(&order)
        .into_iter()
        .filter_map(|i| Some(kept.get(i)?.1))
        .collect();
    let gone = old.rows.iter().filter(|r| !stay.contains(r.id.as_str()));
    let mut ops: Vec<Op> = gone.map(|r| Op::Remove { id: r.id.clone() }).collect();
    for (at, row) in new.rows.iter().enumerate() {
        match was.get(row.id.as_str()) {
            Some((_, o)) if stay.contains(row.id.as_str()) => {
                if o.block != row.block {
                    ops.push(Op::Update { row: row.clone() });
                }
            }
            _ => ops.push(Op::Insert { at, row: row.clone() }),
        }
    }
    ops
}

fn rising(seq: &[usize]) -> HashSet<usize> {
    let (mut tails, mut prev) = (Vec::<usize>::new(), Vec::with_capacity(seq.len()));
    for (i, v) in seq.iter().enumerate() {
        let k = tails.partition_point(|&t| seq.get(t).is_some_and(|x| x < v));
        prev.push(k.checked_sub(1).and_then(|p| tails.get(p).copied()));
        match tails.get_mut(k) {
            Some(t) => *t = i,
            None => tails.push(i),
        }
    }
    let (mut out, mut at) = (HashSet::new(), tails.last().copied());
    while let Some(i) = at {
        out.insert(i);
        at = prev.get(i).copied().flatten();
    }
    out
}

/// Applies `ops` in order; on an error the ops before it stay applied.
pub fn apply(screen: &mut Screen, ops: &[Op]) -> Result<(), ApplyError> {
    for op in ops {
        match op {
            Op::Insert { at, row } => {
                if screen.rows.iter().any(|r| r.id == row.id) {
                    return Err(ApplyError::Duplicate(row.id.clone()));
                }
                let len = screen.rows.len();
                if *at > len {
                    return Err(ApplyError::OutOfRange { at: *at, len });
                }
                screen.rows.insert(*at, row.clone());
            }
            Op::Remove { id } => {
                let j = screen.rows.iter().position(|r| &r.id == id);
                screen.rows.remove(j.ok_or_else(|| ApplyError::NoRow(id.clone()))?);
            }
            Op::Update { row } => {
                let r = screen.rows.iter_mut().find(|r| r.id == row.id);
                r.ok_or_else(|| ApplyError::NoRow(row.id.clone()))?.block = row.block.clone();
            }
        }
    }
    Ok(())
}
