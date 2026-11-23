use std::collections::HashMap;

use serde::Serialize;
use serde_json::Value;

use crate::kind::{Block, Fields, Part, Plot, Prose, Table, TableRow, Trace};
use crate::patch::{apply_with, merge_value, ApplyError, Spot};
use crate::wire::{Child, Op};

/// The smallest ops that turn `old` into `new`, recursing into nested lists by id, else one `screen` op.
pub fn diff(old: &Block, new: &Block) -> Vec<Op> {
    root_ops(old, new)
        .filter(|ops| applies(old, ops, new))
        .unwrap_or_else(|| vec![Op::Screen { screen: new.clone() }])
}

fn applies(old: &Block, ops: &[Op], new: &Block) -> bool {
    let mut s = old.clone();
    let untyped = |spot: Spot<'_>, fields: &Fields| match spot {
        Spot::Block(b) => {
            let want = b.id().and_then(|id| new.get(id)).map(|w| w.with_lists_of(b));
            rebuilt(b, want, fields)
        }
        Spot::Row(r) => {
            let want = new.row(&r.id).cloned();
            rebuilt(r, want, fields)
        }
        Spot::Lane(_) | Spot::Round(_) => Err(ApplyError::Unknown),
    };
    apply_with(&mut s, ops, untyped).is_ok() && &s == new
}

fn rebuilt<T: Serialize>(now: &mut T, want: Option<T>, fields: &Fields) -> Result<(), ApplyError> {
    let merged = serde_json::to_value(&*now).ok().map(|mut v| {
        merge_value(&mut v, fields);
        v
    });
    match want.filter(|w| merged.is_some() && serde_json::to_value(w).ok() == merged) {
        Some(w) => {
            *now = w;
            Ok(())
        }
        None => Err(ApplyError::Shape("the merge does not rebuild the new block".into())),
    }
}

fn root_ops(old: &Block, new: &Block) -> Option<Vec<Op>> {
    let mut fields = own_fields(old, new)?;
    let badge = match (new, fields.remove("badge")) {
        (Block::Screen(_), Some(v)) => Some(Op::Badge { count: v.as_u64()? }),
        (_, Some(_)) => return None,
        (_, None) => None,
    };
    if !fields.is_empty() {
        return None;
    }
    Some(badge.into_iter().chain(kid_ops(old, new)?).collect())
}

fn own_fields(old: &Block, new: &Block) -> Option<Fields> {
    let (Ok(Value::Object(mut a)), Ok(Value::Object(mut b))) =
        (serde_json::to_value(old.bare()), serde_json::to_value(new.bare()))
    else {
        return None;
    };
    if old.kids().or(new.kids()).is_some() {
        let key = if matches!(new, Block::List(_)) {
            "rows"
        } else {
            "blocks"
        };
        a.remove(key);
        b.remove(key);
    }
    if a.get("type") != b.get("type") {
        return None;
    }
    let gone: Vec<String> = a.keys().filter(|k| !b.contains_key(*k)).cloned().collect();
    let mut out: Fields = b.into_iter().filter(|(k, v)| a.get(k) != Some(v)).collect();
    out.extend(gone.into_iter().map(|k| (k, Value::Null)));
    Some(out)
}

fn kid_ops(old: &Block, new: &Block) -> Option<Vec<Op>> {
    if old.kids() == new.kids() {
        return Some(vec![]);
    }
    list_ops(old, new)
}

fn changed(old: &Block, new: &Block, id: &str) -> Vec<Op> {
    match (old, new) {
        (Block::Table(_), Block::Table(_)) => row_ops(old, new),
        _ => block_ops(old, new, id),
    }
    .filter(|ops| applies(old, ops, new))
    .unwrap_or_else(|| {
        vec![Op::Replace {
            id: id.into(),
            block: Child::Block(new.clone()),
        }]
    })
}

fn block_ops(old: &Block, new: &Block, id: &str) -> Option<Vec<Op>> {
    let mut fields = own_fields(old, new)?;
    let grown = match (old, new) {
        (Block::Prose(a), Block::Prose(b)) if fields.remove("parts").is_some() => vec![append(id, a, b)],
        (Block::Plot(a), Block::Plot(b)) if fields.contains_key("series") => match points(id, a, b) {
            Some(mut ops) => {
                fields.remove("series");
                if !fields.is_empty() {
                    ops.push(Op::Merge {
                        id: id.into(),
                        fields: std::mem::take(&mut fields),
                    });
                }
                ops
            }
            None => vec![],
        },
        _ => vec![],
    };
    let merge = (!fields.is_empty()).then(|| Op::Merge { id: id.into(), fields });
    Some(merge.into_iter().chain(grown).chain(kid_ops(old, new)?).collect())
}

fn append(id: &str, old: &Prose, new: &Prose) -> Op {
    let (a, b) = (&old.parts, &new.parts);
    let keep = a.iter().zip(b).take_while(|(x, y)| x == y).count();
    let last = |p: &[Part]| p.last().and_then(Part::last_text);
    let added = last(a)
        .zip(last(b))
        .and_then(|(x, y)| Some(y.strip_prefix(&x)?.to_string()));
    let mut grown = old.clone();
    if let Some(text) = added
        .filter(|t| a.len() == b.len() && keep + 1 == a.len() && grown.grow(None, &[], t).is_ok() && grown.parts == *b)
    {
        return Op::Append {
            id: id.into(),
            keep: None,
            parts: vec![],
            text,
        };
    }
    Op::Append {
        id: id.into(),
        keep: Some(keep),
        parts: b.get(keep..).unwrap_or_default().to_vec(),
        text: String::new(),
    }
}

fn points(id: &str, old: &Plot, new: &Plot) -> Option<Vec<Op>> {
    let bare = |t: &Trace| (t.name.clone(), t.tone.clone());
    if !old.series.iter().map(bare).eq(new.series.iter().map(bare)) {
        return None;
    }
    let mut ops = vec![];
    for (a, b) in old.series.iter().zip(&new.series) {
        if a == b {
            continue;
        }
        let n = a.x.len();
        let tail = |d: usize| {
            let (x, y) = (a.x.get(d..)?, a.y.get(d..)?);
            (b.x.starts_with(x) && b.y.starts_with(y)).then(|| (b.x.get(x.len()..), b.y.get(y.len()..)))
        };
        let first = (b.x.first(), b.y.first());
        let whole = n == 0 || b.x.is_empty();
        let drop = (0..=n).find(|&d| {
            (if d == n {
                whole
            } else {
                (a.x.get(d), a.y.get(d)) == first
            }) && tail(d).is_some()
        })?;
        let (Some(x), Some(y)) = tail(drop)? else { return None };
        ops.push(Op::Points {
            id: id.into(),
            series: b.name.clone(),
            drop: (drop > 0).then_some(drop),
            x: x.to_vec(),
            y: y.to_vec(),
        });
    }
    Some(ops)
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
                    ops.extend(changed(o, b, id));
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

fn row_ops(old: &Block, new: &Block) -> Option<Vec<Op>> {
    let (Block::Table(a), Block::Table(b)) = (old, new) else {
        return None;
    };
    let bare = |t: &Table| Table {
        rows: vec![],
        ..t.clone()
    };
    let into = b.id.as_deref().filter(|_| bare(a) == bare(b))?;
    let has = |t: &Table, id: &str| t.rows.iter().any(|r| r.id == id);
    let kept = a.rows.iter().filter(|r| has(b, &r.id)).map(|r| &r.id);
    if !kept.eq(b.rows.iter().filter(|r| has(a, &r.id)).map(|r| &r.id)) {
        return None;
    }
    let gone = a.rows.iter().filter(|r| !has(b, &r.id));
    let mut ops: Vec<Op> = gone.map(|r| Op::Remove { id: r.id.clone() }).collect();
    let mut before: Option<String> = None;
    for r in b.rows.iter().rev() {
        match a.rows.iter().find(|o| o.id == r.id) {
            Some(o) if o == r => {}
            Some(_) => {
                let Ok(serde_json::Value::Object(mut fields)) = serde_json::to_value(r) else {
                    return None;
                };
                fields.entry("tap").or_insert(serde_json::Value::Null);
                ops.push(Op::Merge {
                    id: r.id.clone(),
                    fields,
                });
            }
            None => ops.push(Op::Insert {
                into: into.into(),
                before: before.clone(),
                after: None,
                block: Child::TableRow(Box::new(TableRow::clone(r))),
            }),
        }
        before = Some(r.id.clone());
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
