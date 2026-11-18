use std::collections::VecDeque;

use serde::{Deserialize, Serialize};

use crate::ops::{apply, diff, ApplyError, Op};
use crate::screen::Screen;

/// One message on a device stream: its sequence number and what it carries.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Frame {
    pub seq: u64,
    pub body: Body,
}

/// A whole screen, or the ops from the frame before.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "snake_case")]
pub enum Body {
    Snapshot { screen: Screen },
    Ops { ops: Vec<Op> },
}

/// The sending side: the current screen and the last `keep` frames for a resume.
#[derive(Debug)]
pub struct Stream {
    screen: Screen,
    seq: u64,
    log: VecDeque<Frame>,
    keep: usize,
}

impl Stream {
    /// A stream at frame 0 showing `screen`.
    pub fn new(screen: Screen, keep: usize) -> Self {
        Self {
            screen,
            seq: 0,
            log: VecDeque::new(),
            keep,
        }
    }

    /// Moves the stream to `next` and returns the frame that carries the change.
    pub fn push(&mut self, next: Screen) -> Frame {
        let ops = diff(&self.screen, &next);
        self.screen = next;
        self.seq += 1;
        let frame = Frame {
            seq: self.seq,
            body: Body::Ops { ops },
        };
        self.log.push_back(frame.clone());
        while self.log.len() > self.keep {
            self.log.pop_front();
        }
        frame
    }

    /// The frames a receiver that last applied `from` needs: the logged ops, else a snapshot.
    pub fn resume(&self, from: Option<u64>) -> Vec<Frame> {
        let first = self.log.front().map_or(self.seq.saturating_add(1), |f| f.seq);
        match from {
            Some(s) if s == self.seq => vec![],
            Some(s) if s < self.seq && s.saturating_add(1) >= first => {
                self.log.iter().filter(|f| f.seq > s).cloned().collect()
            }
            _ => vec![Frame {
                seq: self.seq,
                body: Body::Snapshot {
                    screen: self.screen.clone(),
                },
            }],
        }
    }
}

/// The receiving side: the screen as of the last frame applied.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Replica {
    pub screen: Screen,
    pub seq: Option<u64>,
}

impl Replica {
    /// Applies `frame`; an ops frame must follow the last one applied, else nothing changes.
    pub fn receive(&mut self, frame: &Frame) -> Result<(), ApplyError> {
        match &frame.body {
            Body::Snapshot { screen } => self.screen.clone_from(screen),
            Body::Ops { ops } => {
                let want = self.seq.map_or(0, |s| s.saturating_add(1));
                if self.seq.is_none() || frame.seq != want {
                    return Err(ApplyError::Gap { want, got: frame.seq });
                }
                let mut next = self.screen.clone();
                apply(&mut next, ops)?;
                self.screen = next;
            }
        }
        self.seq = Some(frame.seq);
        Ok(())
    }
}
