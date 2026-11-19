use std::collections::{BTreeMap, VecDeque};
use std::sync::Arc;

use crate::diff::diff;
use crate::kind::Block;
use crate::wire::{Broken, Frame, KeyState, Op};

const RING_DELTAS: usize = 16;
const RING_BYTES: usize = 64 * 1024;

/// One change of a key, its frame serialized once for every stream.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Delta {
    pub from: u64,
    pub rev: u64,
    pub frame: Arc<str>,
}

/// What a `put` did: nothing changed, the key is new, or a frame to send its holders.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Put {
    Same,
    First,
    Changed(Delta),
}

#[derive(Debug)]
struct Entry {
    rev: u64,
    json: String,
    ring: VecDeque<Delta>,
    bytes: usize,
}

/// The server's half: per key its rev, its screen as JSON and a ring of its last deltas (16 or 64 KB).
#[derive(Debug)]
pub struct Shelf<K> {
    keys: BTreeMap<K, Entry>,
}

impl<K> Default for Shelf<K> {
    fn default() -> Self {
        Self { keys: BTreeMap::new() }
    }
}

impl<K: Ord + Clone> Shelf<K> {
    /// Keeps `new` as key `k` (named `wire` on the stream) and gives the frame that carries the change.
    pub fn put(&mut self, k: &K, wire: &str, new: &Block) -> Result<Put, Broken> {
        let json = serde_json::to_string(new)?;
        let Some(e) = self.keys.get_mut(k) else {
            let ring = VecDeque::new();
            self.keys.insert(
                k.clone(),
                Entry {
                    rev: 1,
                    json,
                    ring,
                    bytes: 0,
                },
            );
            return Ok(Put::First);
        };
        if e.json == json {
            return Ok(Put::Same);
        }
        let ops = serde_json::from_str::<Block>(&e.json).map_or_else(|_| vec![], |old| diff(&old, new));
        let whole = !matches!(ops.first(), Some(op) if !matches!(op, Op::Screen { .. }));
        let (from, rev) = (e.rev, e.rev.saturating_add(1));
        let frame = Frame {
            k: wire.into(),
            from: (!whole).then_some(from),
            rev,
            ops: (!whole).then_some(ops),
            screen: whole.then(|| new.clone()),
        };
        let delta = Delta {
            from,
            rev,
            frame: serde_json::to_string(&frame)?.into(),
        };
        if whole {
            e.ring.clear();
            e.bytes = 0;
        } else {
            e.bytes = e.bytes.saturating_add(delta.frame.len());
            e.ring.push_back(delta.clone());
            while e.ring.len() > RING_DELTAS || e.bytes > RING_BYTES {
                let gone = e.ring.pop_front().map_or(0, |d| d.frame.len());
                e.bytes = e.bytes.saturating_sub(gone);
            }
        }
        e.rev = rev;
        e.json = json;
        Ok(Put::Changed(delta))
    }

    /// What a client holding rev `have` of key `k` needs: nothing, the ring's ops since, the whole screen, or gone.
    pub fn state(&self, k: &K, wire: &str, have: Option<u64>) -> Result<KeyState, Broken> {
        let mut out = KeyState {
            k: wire.into(),
            rev: None,
            ops: None,
            screen: None,
            gone: None,
        };
        let Some(e) = self.keys.get(k) else {
            out.gone = Some(404);
            return Ok(out);
        };
        out.rev = Some(e.rev);
        match have {
            Some(h) if h == e.rev => {}
            Some(h) if h < e.rev && e.ring.front().is_some_and(|d| d.from <= h) => {
                let mut ops = vec![];
                for d in e.ring.iter().filter(|d| d.from >= h) {
                    ops.extend(serde_json::from_str::<Frame>(&d.frame)?.ops.unwrap_or_default());
                }
                out.ops = Some(ops);
            }
            _ => out.screen = Some(serde_json::from_str(&e.json)?),
        }
        Ok(out)
    }

    /// Drops key `k` and its ring.
    pub fn forget(&mut self, k: &K) {
        self.keys.remove(k);
    }
}
