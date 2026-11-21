use std::fmt;

use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::Value;

use crate::kind::{Block, Fields, Lane, Round, TableRow};
use crate::wire::{Child, Op};

/// Why an op or a frame does not fit the screen it is applied to.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ApplyError {
    NoBlock(String),
    NoList(String),
    Shape(String),
    Unknown,
}

impl fmt::Display for ApplyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoBlock(id) => write!(f, "no block `{id}`"),
            Self::NoList(id) => write!(f, "block `{id}` holds no list to insert into"),
            Self::Shape(why) => write!(f, "the edit does not fit: {why}"),
            Self::Unknown => write!(f, "an op this version does not know: ask for the whole screen"),
        }
    }
}

impl std::error::Error for ApplyError {}

trait Id {
    fn key(&self) -> Option<&str>;
}

impl Id for Block {
    fn key(&self) -> Option<&str> {
        self.id()
    }
}

impl Id for Lane {
    fn key(&self) -> Option<&str> {
        Some(&self.id)
    }
}

impl Id for Round {
    fn key(&self) -> Option<&str> {
        Some(&self.id)
    }
}

impl Id for TableRow {
    fn key(&self) -> Option<&str> {
        Some(&self.id)
    }
}

fn place<T: Id>(list: &mut Vec<T>, item: T, before: Option<&str>, after: Option<&str>) {
    let at = |id: Option<&str>| list.iter().position(|x| id.is_some() && x.key() == id);
    let i = at(before).or(at(after).map(|i| i + 1)).unwrap_or(list.len());
    list.insert(i, item);
}

fn pull<T: Id>(list: &mut Vec<T>, id: &str) -> bool {
    let Some(i) = list.iter().position(|x| x.key() == Some(id)) else {
        return false;
    };
    drop(list.remove(i));
    true
}

enum Spot<'a> {
    Lane(&'a mut Lane),
    Round(&'a mut Round),
    Row(&'a mut TableRow),
}

enum Kids<'a> {
    Blocks(&'a mut Vec<Block>),
    Lanes(&'a mut Vec<Lane>),
    Rounds(&'a mut Vec<Round>),
    Rows(&'a mut Vec<TableRow>),
}

impl Block {
    pub(crate) fn kids(&self) -> Option<&Vec<Block>> {
        match self {
            Self::Screen(b) => b.blocks.as_ref(),
            Self::Modal(b) | Self::Sheet(b) => Some(&b.blocks),
            Self::Section(b) => Some(&b.blocks),
            Self::List(b) => Some(&b.rows),
            Self::Card(b) => b.blocks.as_ref(),
            Self::Message(b) => b.blocks.as_ref(),
            _ => None,
        }
    }

    pub(crate) fn bare(&self) -> Self {
        let mut b = self.clone();
        if let Some(Kids::Blocks(kids)) = b.list() {
            kids.clear();
        }
        b
    }

    fn list(&mut self) -> Option<Kids<'_>> {
        Some(match self {
            Self::Screen(b) => Kids::Blocks(b.blocks.get_or_insert_with(Vec::new)),
            Self::Modal(b) | Self::Sheet(b) => Kids::Blocks(&mut b.blocks),
            Self::Section(b) => Kids::Blocks(&mut b.blocks),
            Self::List(b) => Kids::Blocks(&mut b.rows),
            Self::Card(b) => Kids::Blocks(b.blocks.get_or_insert_with(Vec::new)),
            Self::Message(b) => Kids::Blocks(b.blocks.get_or_insert_with(Vec::new)),
            Self::Scene(b) => Kids::Lanes(b.lanes.get_or_insert_with(Vec::new)),
            Self::Row(b) => Kids::Rounds(b.rounds.get_or_insert_with(Vec::new)),
            Self::Table(b) => Kids::Rows(&mut b.rows),
            _ => return None,
        })
    }

    fn lists(&mut self) -> Vec<&mut Vec<Block>> {
        match self {
            Self::Screen(b) => b.blocks.iter_mut().collect(),
            Self::Modal(b) | Self::Sheet(b) => vec![&mut b.blocks],
            Self::Section(b) => vec![&mut b.blocks],
            Self::List(b) => vec![&mut b.rows],
            Self::Card(b) => b.blocks.iter_mut().chain(b.buttons.iter_mut()).collect(),
            Self::Message(b) => b.blocks.iter_mut().collect(),
            Self::Row(b) => b
                .rounds
                .iter_mut()
                .flatten()
                .filter_map(|r| r.blocks.as_mut())
                .collect(),
            _ => vec![],
        }
    }

    pub(crate) fn get(&self, id: &str) -> Option<&Block> {
        if self.id() == Some(id) {
            return Some(self);
        }
        let mut kids: Vec<&Block> = self.kids().into_iter().flatten().collect();
        if let Self::Card(c) = self {
            kids.extend(c.buttons.iter().flatten());
        }
        if let Self::Row(r) = self {
            kids.extend(r.rounds.iter().flatten().filter_map(|x| x.blocks.as_ref()).flatten());
        }
        kids.into_iter().find_map(|b| b.get(id))
    }

    fn find(&mut self, id: &str) -> Option<&mut Block> {
        if self.id() == Some(id) {
            return Some(self);
        }
        self.lists().into_iter().flatten().find_map(|b| b.find(id))
    }

    fn spot(&mut self, id: &str) -> Option<Spot<'_>> {
        let has = |key: Option<&str>| key == Some(id);
        let here = match &*self {
            Self::Scene(s) => s.lanes.iter().flatten().any(|x| has(x.key())),
            Self::Row(r) => r.rounds.iter().flatten().any(|x| has(x.key())),
            Self::Table(_) => true,
            _ => false,
        };
        if !here {
            return self.lists().into_iter().flatten().find_map(|b| b.spot(id));
        }
        match self {
            Self::Scene(s) => s.lanes.iter_mut().flatten().find(|x| has(x.key())).map(Spot::Lane),
            Self::Row(r) => r.rounds.iter_mut().flatten().find(|x| has(x.key())).map(Spot::Round),
            Self::Table(t) => t.rows.iter_mut().find(|x| has(x.key())).map(Spot::Row),
            _ => None,
        }
    }

    fn drop_part(&mut self, id: &str) -> bool {
        let hit = match self {
            Self::Scene(s) => s.lanes.as_mut().is_some_and(|l| pull(l, id)),
            Self::Row(r) => r.rounds.as_mut().is_some_and(|l| pull(l, id)),
            Self::Table(t) => pull(&mut t.rows, id),
            _ => false,
        };
        hit || self.lists().into_iter().flatten().any(|b| b.drop_part(id))
    }

    fn take(&mut self, id: &str) -> Option<Block> {
        for list in self.lists() {
            if let Some(i) = list.iter().position(|b| b.id() == Some(id)) {
                return Some(list.remove(i));
            }
            if let Some(b) = list.iter_mut().find_map(|b| b.take(id)) {
                return Some(b);
            }
        }
        None
    }
}

fn merge<T: Serialize + DeserializeOwned>(b: &mut T, fields: &Fields) -> Result<(), ApplyError> {
    let shape = |e: serde_json::Error| ApplyError::Shape(e.to_string());
    let mut v = serde_json::to_value(&*b).map_err(shape)?;
    if let Value::Object(o) = &mut v {
        o.extend(fields.iter().map(|(k, x)| (k.clone(), x.clone())));
    }
    *b = serde_json::from_value(v).map_err(shape)?;
    Ok(())
}

fn insert(
    root: &mut Block,
    into: &str,
    child: Child,
    before: Option<&str>,
    after: Option<&str>,
) -> Result<(), ApplyError> {
    let host = root.find(into).ok_or_else(|| ApplyError::NoBlock(into.into()))?;
    match (host.list(), child) {
        (Some(Kids::Blocks(l)), Child::Block(b)) => place(l, b, before, after),
        (Some(Kids::Lanes(l)), Child::Lane(x)) => place(l, *x, before, after),
        (Some(Kids::Rounds(l)), Child::Round(x)) => place(l, *x, before, after),
        (Some(Kids::Rows(l)), Child::TableRow(x)) => place(l, *x, before, after),
        (None, _) => return Err(ApplyError::NoList(into.into())),
        _ => return Err(ApplyError::Shape(format!("`{into}` holds another kind of child"))),
    }
    Ok(())
}

fn replace(root: &mut Block, id: &str, child: &Child) -> Result<(), ApplyError> {
    let other = || ApplyError::Shape(format!("`{id}` is another kind of child"));
    if let Some(b) = root.find(id) {
        let Child::Block(new) = child else { return Err(other()) };
        b.clone_from(new);
        return Ok(());
    }
    match (root.spot(id).ok_or_else(|| ApplyError::NoBlock(id.into()))?, child) {
        (Spot::Lane(x), Child::Lane(new)) => x.clone_from(new),
        (Spot::Round(x), Child::Round(new)) => x.clone_from(new),
        (Spot::Row(x), Child::TableRow(new)) => x.clone_from(new),
        _ => return Err(other()),
    }
    Ok(())
}

/// Applies `ops` in order; on an error the ops before it stay applied; `badge` sets a screen's badge, `dot` leaves the screen as is.
pub fn apply(root: &mut Block, ops: &[Op]) -> Result<(), ApplyError> {
    let no = |id: &str| ApplyError::NoBlock(id.into());
    for op in ops {
        match op {
            Op::Merge { id, fields } => match root.find(id) {
                Some(b) => merge(b, fields)?,
                None => match root.spot(id).ok_or_else(|| no(id))? {
                    Spot::Lane(x) => merge(x, fields)?,
                    Spot::Round(x) => merge(x, fields)?,
                    Spot::Row(x) => merge(x, fields)?,
                },
            },
            Op::Insert {
                into,
                before,
                after,
                block,
            } => insert(root, into, block.clone(), before.as_deref(), after.as_deref())?,
            Op::Move { id, into, before } => {
                let b = root.take(id).ok_or_else(|| no(id))?;
                insert(root, into, Child::Block(b), before.as_deref(), None)?;
            }
            Op::Remove { id } => {
                if root.take(id).is_none() && !root.drop_part(id) {
                    return Err(no(id));
                }
            }
            Op::Replace { id, block } => replace(root, id, block)?,
            Op::Append { id, keep, parts, text } => match root.find(id) {
                Some(Block::Prose(p)) => p.grow(*keep, parts, text).map_err(ApplyError::Shape)?,
                Some(_) => return Err(ApplyError::Shape(format!("`{id}` is no prose block"))),
                None => return Err(no(id)),
            },
            Op::Badge { count } => {
                if let Block::Screen(s) = root {
                    s.badge = Some(*count);
                }
            }
            Op::Dot { .. } => {}
            Op::Screen { screen } => root.clone_from(screen),
            Op::Unknown => return Err(ApplyError::Unknown),
        }
    }
    Ok(())
}
