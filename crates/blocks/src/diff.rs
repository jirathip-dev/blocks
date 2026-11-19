use std::collections::HashMap;

use crate::kind::{Block, Screen};
use crate::patch::apply;
use crate::wire::{Child, Op};

/// The ops that turn `old` into `new` in the root's own list, else one `screen` op.
pub fn diff(old: &Block, new: &Block) -> Vec<Op> {
    Some(())
        .filter(|()| same_frame(old, new))
        .and_then(|()| list_ops(old, new))
        .filter(|ops| {
            let mut s = old.clone();
            apply(&mut s, ops).is_ok() && &s == new
        })
        .unwrap_or_else(|| vec![Op::Screen { screen: new.clone() }])
}

fn same_frame(old: &Block, new: &Block) -> bool {
    let (Block::Screen(a), Block::Screen(b)) = (old, new) else {
        return true;
    };
    let Screen {
        id,
        title,
        large,
        state,
        stream,
        actions,
        blocks: _,
        back,
        done,
        refresh,
        pending,
        focus,
        badge,
        source,
        url,
        sites,
        personas,
        threads,
        show,
        more,
    } = &**a;
    (id, title, large, state, stream, actions, back, done, refresh)
        == (
            &b.id, &b.title, &b.large, &b.state, &b.stream, &b.actions, &b.back, &b.done, &b.refresh,
        )
        && (pending, focus, badge, source, url, sites, personas, threads, show, more)
            == (
                &b.pending,
                &b.focus,
                &b.badge,
                &b.source,
                &b.url,
                &b.sites,
                &b.personas,
                &b.threads,
                &b.show,
                &b.more,
            )
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

fn list_ops(old: &Block, new: &Block) -> Option<Vec<Op>> {
    let into = new.id().filter(|id| old.id() == Some(id))?;
    let (was, now) = (old.kids()?, new.kids()?);
    let (by_id, next) = (ids(was)?, ids(now)?);
    let kept: Vec<usize> = now.iter().filter_map(|b| Some(by_id.get(b.id()?)?.0)).collect();
    let stay = rising(&kept, was.len());
    let gone = was.iter().filter_map(Block::id).filter(|id| !next.contains_key(id));
    let mut ops: Vec<Op> = gone.map(|id| Op::Remove { id: id.into() }).collect();
    let mut before: Option<String> = None;
    for b in now.iter().rev() {
        let id = b.id()?;
        match by_id.get(id) {
            Some((i, o)) => {
                if *o != b {
                    ops.push(Op::Replace {
                        id: id.into(),
                        block: b.clone(),
                    });
                }
                if stay.get(*i) != Some(&true) {
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

fn rising(seq: &[usize], len: usize) -> Vec<bool> {
    let (mut tails, mut prev) = (Vec::<usize>::new(), Vec::with_capacity(seq.len()));
    for (i, v) in seq.iter().enumerate() {
        let k = tails.partition_point(|&t| seq.get(t).is_some_and(|x| x < v));
        prev.push(k.checked_sub(1).and_then(|p| tails.get(p).copied()));
        match tails.get_mut(k) {
            Some(t) => *t = i,
            None => tails.push(i),
        }
    }
    let (mut out, mut at) = (vec![false; len], tails.last().copied());
    while let Some(i) = at {
        if let Some(keep) = seq.get(i).and_then(|&v| out.get_mut(v)) {
            *keep = true;
        }
        at = prev.get(i).copied().flatten();
    }
    out
}
