use std::collections::BTreeMap;

use crate::kind::Block;
use crate::patch::apply;
use crate::wire::{Frame, Have, Hello, KeyState, Op, Outdated, Synced};
use crate::SCHEMA_VERSION;

/// What a frame or a key's state did to the key: patched, replaced, dropped, or open the key again (`have`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Took {
    Patched,
    Replaced,
    Old,
    Gap,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
struct Held {
    rev: Option<u64>,
    screen: Option<Block>,
}

/// A client's half: the epoch, and per key opened the rev held and the screen.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Mirror {
    v: u8,
    epoch: Option<String>,
    outdated: Option<Outdated>,
    keys: BTreeMap<String, Held>,
}

impl Default for Mirror {
    fn default() -> Self {
        Self::new(SCHEMA_VERSION)
    }
}

impl Mirror {
    /// A client at wire version `v` with no key open.
    pub fn new(v: u8) -> Self {
        Self {
            v,
            epoch: None,
            outdated: None,
            keys: BTreeMap::new(),
        }
    }

    /// Takes a stream's `hello`: a new epoch forgets every rev; a version over one apart stops syncing.
    pub fn hello(&mut self, h: &Hello) -> Result<(), Outdated> {
        self.outdated = if h.v > self.v {
            Some(Outdated::App)
        } else if h.v.saturating_add(1) < self.v {
            Some(Outdated::Server)
        } else {
            None
        };
        if self.epoch.as_deref() != Some(h.epoch.as_str()) {
            self.keys.values_mut().for_each(|k| k.rev = None);
            self.epoch = Some(h.epoch.clone());
        }
        self.outdated.map_or(Ok(()), Err)
    }

    /// Mounts key `k`; its first state comes with the next `have`.
    pub fn open(&mut self, k: &str) {
        self.keys.entry(k.into()).or_default();
    }

    /// Unmounts key `k` and forgets its screen.
    pub fn close(&mut self, k: &str) {
        self.keys.remove(k);
    }

    /// The keys to open on the server, each with the rev held; none while outdated.
    pub fn have(&self) -> Vec<Have> {
        if self.outdated.is_some() {
            return vec![];
        }
        let have = |(k, h): (&String, &Held)| Have {
            k: k.clone(),
            rev: h.rev,
        };
        self.keys.iter().map(have).collect()
    }

    /// Key `k`'s screen as of the last frame or state applied.
    pub fn screen(&self, k: &str) -> Option<&Block> {
        self.keys.get(k)?.screen.as_ref()
    }

    /// Takes a stream frame: patches on `from` = rev held, drops an old one, asks again on a gap or an unknown op.
    pub fn frame(&mut self, f: Frame) -> Took {
        let Some(held) = self.keys.get_mut(&f.k).filter(|_| self.outdated.is_none()) else {
            return Took::Old;
        };
        if held.rev.is_some_and(|r| f.rev <= r) {
            return Took::Old;
        }
        match (f.screen, f.from, held.rev) {
            (Some(s), _, _) => held.take(f.rev, s),
            (None, Some(from), Some(r)) if from == r => held.patch(f.rev, &f.ops.unwrap_or_default()),
            (None, Some(_), Some(_)) => Took::Gap,
            _ => Took::Old,
        }
    }

    /// Takes the answer to the `have` it `sent`: a screen applies, ops only on the rev that was sent.
    pub fn synced(&mut self, sent: &[Have], s: Synced) -> Vec<Took> {
        s.keys.into_iter().map(|st| self.state(sent, st)).collect()
    }

    fn state(&mut self, sent: &[Have], st: KeyState) -> Took {
        if self.outdated.is_some() || !self.keys.contains_key(&st.k) {
            return Took::Old;
        }
        if st.gone.is_some() {
            self.keys.remove(&st.k);
            return Took::Old;
        }
        let asked = sent.iter().find(|h| h.k == st.k).and_then(|h| h.rev);
        let (Some(held), Some(rev)) = (self.keys.get_mut(&st.k), st.rev) else {
            return Took::Old;
        };
        match (st.screen, st.ops) {
            (Some(_), _) if held.rev.is_some_and(|r| rev < r) => Took::Old,
            (Some(s), _) => held.take(rev, s),
            (None, Some(ops)) if asked.is_some() && held.rev == asked => held.patch(rev, &ops),
            _ => Took::Old,
        }
    }
}

impl Held {
    fn take(&mut self, rev: u64, screen: Block) -> Took {
        self.rev = Some(rev);
        self.screen = Some(screen);
        Took::Replaced
    }

    fn patch(&mut self, rev: u64, ops: &[Op]) -> Took {
        let Some(mut next) = self.screen.clone() else {
            self.rev = None;
            return Took::Gap;
        };
        if apply(&mut next, ops).is_err() {
            self.rev = None;
            return Took::Gap;
        }
        self.rev = Some(rev);
        self.screen = Some(next);
        Took::Patched
    }
}
