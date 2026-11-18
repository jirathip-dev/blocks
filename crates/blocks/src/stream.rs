use std::collections::VecDeque;

use serde::{Deserialize, Serialize};

use crate::ops::{apply, diff, ApplyError, Op};
use crate::screen::Block;

/// One message on a device stream: its sequence number and its ops; one that starts with `screen` stands alone.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Frame {
    pub seq: u64,
    pub ops: Vec<Op>,
}

impl Frame {
    fn whole(&self) -> Option<&Block> {
        match self.ops.first() {
            Some(Op::Screen { screen }) => Some(screen),
            _ => None,
        }
    }
}

/// The sending side: the current screen and the last `keep` frames for a resume.
#[derive(Debug)]
pub struct Stream {
    screen: Block,
    seq: u64,
    log: VecDeque<Frame>,
    keep: usize,
}

impl Stream {
    /// A stream at frame 0 showing `screen`.
    pub fn new(screen: Block, keep: usize) -> Self {
        Self {
            screen,
            seq: 0,
            log: VecDeque::new(),
            keep,
        }
    }

    /// Moves the stream to `next` and returns the frame that carries the change.
    pub fn push(&mut self, next: Block) -> Frame {
        let ops = diff(&self.screen, &next);
        self.screen = next;
        self.seq += 1;
        let frame = Frame { seq: self.seq, ops };
        self.log.push_back(frame.clone());
        while self.log.len() > self.keep {
            self.log.pop_front();
        }
        frame
    }

    /// The frames a receiver that last applied `from` needs: the logged ops, else the whole screen.
    pub fn resume(&self, from: Option<u64>) -> Vec<Frame> {
        let first = self.log.front().map_or(self.seq.saturating_add(1), |f| f.seq);
        match from {
            Some(s) if s == self.seq => vec![],
            Some(s) if s < self.seq && s.saturating_add(1) >= first => {
                self.log.iter().filter(|f| f.seq > s).cloned().collect()
            }
            _ => vec![Frame {
                seq: self.seq,
                ops: vec![Op::Screen {
                    screen: self.screen.clone(),
                }],
            }],
        }
    }
}

/// The receiving side: the screen as of the last frame applied.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Replica {
    pub screen: Option<Block>,
    pub seq: Option<u64>,
}

impl Replica {
    /// Applies `frame`; a frame that does not stand alone must follow the last one applied, else nothing changes.
    pub fn receive(&mut self, frame: &Frame) -> Result<(), ApplyError> {
        let want = self.seq.map_or(0, |s| s.saturating_add(1));
        let gap = ApplyError::Gap { want, got: frame.seq };
        let mut next = match (frame.whole(), &self.screen) {
            (Some(s), _) => s.clone(),
            (None, Some(s)) if self.seq.is_some() && frame.seq == want => s.clone(),
            _ => return Err(gap),
        };
        apply(&mut next, &frame.ops)?;
        self.screen = Some(next);
        self.seq = Some(frame.seq);
        Ok(())
    }
}
