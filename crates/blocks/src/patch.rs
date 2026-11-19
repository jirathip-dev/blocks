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
            Self::Sheet(b) => Some(&b.blocks),
            Self::Section(b) => Some(&b.blocks),
            Self::List(b) => Some(&b.rows),
            Self::Card(b) => b.blocks.as_ref(),
            _ => None,
        }
    }

    fn list(&mut self) -> Option<Kids<'_>> {
        Some(match self {
            Self::Screen(b) => Kids::Blocks(b.blocks.get_or_insert_with(Vec::new)),
            Self::Sheet(b) => Kids::Blocks(&mut b.blocks),
            Self::Section(b) => Kids::Blocks(&mut b.blocks),
            Self::List(b) => Kids::Blocks(&mut b.rows),
            Self::Card(b) => Kids::Blocks(b.blocks.get_or_insert_with(Vec::new)),
            Self::Scene(b) => Kids::Lanes(b.lanes.get_or_insert_with(Vec::new)),
            Self::Row(b) => Kids::Rounds(b.rounds.get_or_insert_with(Vec::new)),
            Self::Table(b) => Kids::Rows(&mut b.rows),
            _ => return None,
        })
    }

    fn lists(&mut self) -> Vec<&mut Vec<Block>> {
        match self {
            Self::Screen(b) => b.blocks.iter_mut().collect(),
            Self::Sheet(b) => vec![&mut b.blocks],
            Self::Section(b) => vec![&mut b.blocks],
            Self::List(b) => vec![&mut b.rows],
            Self::Card(b) => b.blocks.iter_mut().chain(b.buttons.iter_mut()).collect(),
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

    fn row(&mut self, id: &str) -> Option<&mut TableRow> {
        if let Self::Table(t) = self {
            return t.rows.iter_mut().find(|r| r.id == id);
        }
        self.lists().into_iter().flatten().find_map(|b| b.row(id))
    }

    fn take_row(&mut self, id: &str) -> Option<TableRow> {
        if let Self::Table(t) = self {
            let i = t.rows.iter().position(|r| r.id == id)?;
            return Some(t.rows.remove(i));
        }
        self.lists().into_iter().flatten().find_map(|b| b.take_row(id))
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

/// Applies `ops` in order; on an error the ops before it stay applied; `badge` and `dot` leave the screen as is.
pub fn apply(root: &mut Block, ops: &[Op]) -> Result<(), ApplyError> {
    let no = |id: &str| ApplyError::NoBlock(id.into());
    for op in ops {
        match op {
            Op::Merge { id, fields } => match root.find(id) {
                Some(b) => merge(b, fields)?,
                None => merge(root.row(id).ok_or_else(|| no(id))?, fields)?,
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
                if root.take(id).is_none() {
                    drop(root.take_row(id).ok_or_else(|| no(id))?);
                }
            }
            Op::Replace { id, block } => *root.find(id).ok_or_else(|| no(id))? = block.clone(),
            Op::Badge { .. } | Op::Dot { .. } => {}
            Op::Screen { screen } => root.clone_from(screen),
            Op::Unknown => return Err(ApplyError::Unknown),
        }
    }
    Ok(())
}
