use std::collections::{HashMap, HashSet};

use crate::kind::Block;
use crate::patch::apply;
use crate::wire::{Child, Op};

/// The ops that turn `old` into `new` in the root's own list, else one `screen` op.
pub fn diff(old: &Block, new: &Block) -> Vec<Op> {
    list_ops(old, new)
        .filter(|ops| {
            let mut s = old.clone();
            apply(&mut s, ops).is_ok() && &s == new
        })
        .unwrap_or_else(|| vec![Op::Screen { screen: new.clone() }])
}

fn ids(list: &[Block]) -> Option<HashMap<&str, (usize, &Block)>> {
    let mut seen = HashMap::with_capacity(list.len());
    for (i, b) in list.iter().enumerate() {
        if seen.insert(b.id()?, (i, b)).is_some() {
            return None;
        }
    }
    Some(seen)
}

fn kids(b: &Block) -> Option<&Vec<Block>> {
    match b {
        Block::Screen(x) => x.blocks.as_ref(),
        Block::Sheet(x) => Some(&x.blocks),
        Block::Section(x) => Some(&x.blocks),
        Block::List(x) => Some(&x.rows),
        Block::Card(x) => x.blocks.as_ref(),
        _ => None,
    }
}

fn list_ops(old: &Block, new: &Block) -> Option<Vec<Op>> {
    let into = new.id().filter(|id| old.id() == Some(id))?;
    let (was, now) = (kids(old)?, kids(new)?);
    let (by_id, _) = (ids(was)?, ids(now)?);
    let kept: Vec<(usize, &str)> = now
        .iter()
        .filter_map(|b| Some((by_id.get(b.id()?)?.0, b.id()?)))
        .collect();
    let order: Vec<usize> = kept.iter().map(|k| k.0).collect();
    let stay: HashSet<&str> = rising(&order)
        .into_iter()
        .filter_map(|i| Some(kept.get(i)?.1))
        .collect();
    let next: HashSet<&str> = now.iter().filter_map(Block::id).collect();
    let gone = was.iter().filter_map(Block::id).filter(|id| !next.contains(id));
    let mut ops: Vec<Op> = gone.map(|id| Op::Remove { id: id.into() }).collect();
    let mut before: Option<String> = None;
    for b in now.iter().rev() {
        let id = b.id()?;
        match by_id.get(id) {
            Some((_, o)) => {
                if *o != b {
                    ops.push(Op::Replace {
                        id: id.into(),
                        block: b.clone(),
                    });
                }
                if !stay.contains(id) {
                    ops.push(Op::Move {
                        id: id.into(),
                        into: into.into(),
                        before: before.clone(),
                    });
                }
            }
            None => ops.push(Op::Insert {
                into: into.into(),
                before: before.clone(),
                after: None,
                block: Child::Block(b.clone()),
            }),
        }
        before = Some(id.into());
    }
    Some(ops)
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
