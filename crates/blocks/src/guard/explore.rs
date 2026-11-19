use std::collections::BTreeSet;

use serde::Deserialize;
use serde_json::Value;

use super::cx::{list, sends, text, Cx};
use super::{lint, Seen};
use crate::behave::{start, view};
use crate::built::Built;
use crate::expr::{eval, Expr, Lit, State};
use crate::kind::{Block, Fields};
use crate::patch::apply;
use crate::tree::{On, Refusal, Step, Typing};
use crate::wire::{Action, Answer};

/// What an answerer gave an action: an answer, an error with its reason, or `None` for no answer at all.
pub type Reply = Option<Result<Answer, String>>;

/// One walk of a screen: the steps with their answers, the actions the screen declared for them, and what was seen.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Walk {
    pub steps: Vec<Step>,
    pub sent: Vec<Action>,
    pub seen: Vec<Seen>,
}

fn pool() -> [String; 6] {
    [
        String::new(),
        "a".into(),
        "W".repeat(200),
        "ada@".into(),
        "ada@example.com".into(),
        "Ada Лавлейс 愛達 لافليس".into(),
    ]
}

fn saw(rule: &str, at: &str, detail: impl Into<String>) -> Seen {
    Seen {
        rule: rule.into(),
        at: at.into(),
        detail: detail.into(),
        ..Seen::default()
    }
}

struct Model<'a> {
    screen: Built,
    app: &'a [&'a str],
    state: State,
    start: BTreeSet<(String, String)>,
    walk: Walk,
    done: bool,
}

impl<'a> Model<'a> {
    fn new(screen: &Built, app: &'a [&'a str]) -> Model<'a> {
        Model {
            start: lint(screen, app).into_iter().map(|s| (s.rule, s.at)).collect(),
            state: start(screen),
            screen: screen.clone(),
            app,
            walk: Walk::default(),
            done: false,
        }
    }

    fn over(&self) -> bool {
        self.done || !self.walk.seen.is_empty()
    }

    fn options(&self) -> Vec<Step> {
        let v = view(&self.screen, &self.state);
        let cx = Cx::at(&self.screen, self.app, &self.state);
        let mut out = vec![];
        for b in cx.blocks.iter().filter(|b| !b.hidden) {
            let Some(id) = text(b.o, "id").filter(|id| !v.disabled.contains(*id)) else {
                continue;
            };
            let tap = b.o.get("tap").is_some_and(Value::is_object);
            let set = b.o.get("tap").and_then(|t| t.get("set")).is_some_and(|s| !s.is_null());
            let confirm = b.o.get("confirm").is_some_and(|c| !c.is_null());
            if self.field(b.o).is_some() {
                out.extend(pool().map(|text| Step::Type(Typing { id: id.into(), text })));
            } else if (b.kind == "button" || tap) && (sends(b.o).is_some() || set) && !confirm {
                out.push(Step::Tap(On { id: id.into() }));
            }
        }
        out
    }

    fn field(&self, o: &Fields) -> Option<String> {
        let hidden = view(&self.screen, &self.state).hidden;
        let input = |f: &&Fields| matches!(text(f, "type"), Some("text" | "secret" | "toggle"));
        let first = list(o, "fields")
            .filter(input)
            .find(|f| text(f, "name").is_some_and(|n| !hidden.contains(n)));
        first
            .filter(|f| text(f, "type") != Some("toggle"))
            .and_then(|f| text(f, "name"))
            .map(String::from)
    }

    fn block(&self, id: &str) -> Option<(String, Fields)> {
        let cx = Cx::at(&self.screen, self.app, &self.state);
        let b = cx.blocks.into_iter().find(|b| text(b.o, "id") == Some(id))?;
        Some((b.at, b.o.clone()))
    }

    fn step(&mut self, step: Step, answer: &mut dyn FnMut(&Action) -> Reply) {
        let id = match &step {
            Step::Tap(On { id }) | Step::Type(Typing { id, .. }) => id.clone(),
            _ => return,
        };
        let Some((at, o)) = self.block(&id) else { return };
        self.walk.steps.push(step.clone());
        if let Step::Type(t) = step {
            self.state.extend(self.field(&o).map(|n| (n, Lit::Str(t.text))));
            return;
        }
        let tap = o.get("tap");
        let sets = tap.and_then(|t| t.get("set")).and_then(Value::as_array);
        for s in sets.into_iter().flatten() {
            let to = s.get("to").and_then(|e| Expr::deserialize(e).ok());
            let value = to.map(|e| eval(&e, &self.state)).unwrap_or_default();
            self.state
                .extend(s.get("key").and_then(Value::as_str).map(|k| (k.into(), value)));
        }
        let Some(name) = sends(&o) else { return };
        let values = o.get("values").or_else(|| tap?.get("values"));
        let action = Action {
            screen: self
                .screen
                .value()
                .get("id")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .into(),
            block: Some(id),
            action: name.into(),
            values: values.and_then(|v| Fields::deserialize(v).ok()).unwrap_or_default(),
        };
        self.walk.sent.push(action.clone());
        match answer(&action) {
            None => self.walk.seen.push(saw("explore/unanswered", &at, name)),
            Some(Err(why)) => {
                self.walk.steps.push(Step::Refuse(Refusal { toast: why.clone() }));
                self.walk.seen.push(saw("explore/error-screen", &at, why));
            }
            Some(Ok(a)) => {
                self.walk.steps.push(Step::Answer(Box::new(a.clone())));
                self.answer(&a, &at);
            }
        }
    }

    fn answer(&mut self, a: &Answer, at: &str) {
        self.done = a.close || a.open.is_some();
        if a.ops.is_empty() {
            return;
        }
        let applied = Block::deserialize(self.screen.value())
            .map_err(|e| e.to_string())
            .and_then(|mut b| apply(&mut b, &a.ops).map(|()| b).map_err(|e| format!("{e:?}")))
            .and_then(|b| serde_json::to_value(b).map_err(|e| e.to_string()));
        match applied {
            Err(why) => self.walk.seen.push(saw("explore/error-screen", at, why)),
            Ok(v) => {
                self.screen = Built::new(v);
                for s in lint(&self.screen, self.app) {
                    let key = (s.rule.clone(), s.at.clone());
                    if !self.start.contains(&key) && !self.walk.seen.contains(&s) {
                        let fault = s.rule == "lint/fault";
                        self.walk.seen.push(if fault {
                            saw("explore/error-screen", at, s.detail)
                        } else {
                            s
                        });
                    }
                }
            }
        }
    }
}

/// The seed of walk `walk` of fixture `name` in a run seeded `run`, so one walk replays alone.
pub fn seed(run: u64, name: &str, walk: u64) -> u64 {
    let fnv = name.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |h, b| {
        (h ^ u64::from(b)).wrapping_mul(0x0100_0000_01b3)
    });
    fnv ^ run.rotate_left(29) ^ walk.wrapping_mul(0x9e37_79b9_7f4a_7c15)
}

/// A walk of `screen` from `seed`: at most `budget` declared steps, each action asked of `answer`, each new screen linted; it ends at the first thing seen.
pub fn walk(screen: &Built, app: &[&str], seed: u64, budget: usize, answer: &mut dyn FnMut(&Action) -> Reply) -> Walk {
    let mut m = Model::new(screen, app);
    let mut x = seed.wrapping_mul(0x9e37_79b9_7f4a_7c15) | 1;
    for _ in 0..budget {
        let options = m.options();
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        let pick = u64::try_from(options.len()).ok().filter(|n| *n > 0).map(|n| x % n);
        let Some(step) = pick.and_then(|i| options.into_iter().nth(usize::try_from(i).ok()?)) else {
            break;
        };
        m.step(step, answer);
        if m.over() {
            break;
        }
    }
    m.walk
}

fn units(steps: &[Step]) -> Vec<Vec<Step>> {
    let mut out: Vec<Vec<Step>> = vec![];
    for s in steps {
        match (s, out.last_mut()) {
            (_, Some(u)) if !matches!(s, Step::Tap(_) | Step::Type(_)) => u.push(s.clone()),
            _ => out.push(vec![s.clone()]),
        }
    }
    out
}

/// `steps` again on the model with their recorded answers: a step whose block is not live is skipped with its answer.
pub fn replay(screen: &Built, app: &[&str], steps: &[Step]) -> Walk {
    let mut m = Model::new(screen, app);
    for unit in units(steps) {
        let Some((first, rest)) = unit.split_first() else {
            continue;
        };
        if m.over() {
            break;
        }
        if !m.options().contains(first) {
            continue;
        }
        let reply = rest.iter().find_map(|s| match s {
            Step::Answer(a) => Some(Ok((**a).clone())),
            Step::Refuse(r) => Some(Err(r.toast.clone())),
            _ => None,
        });
        m.step(first.clone(), &mut |_| reply.clone());
    }
    m.walk
}

/// The shortest `steps` that still `fails`, dropping chunks of whole steps (a tap with its answer), at most `tries` runs.
pub fn shrink(steps: &[Step], fails: &mut dyn FnMut(&[Step]) -> bool, tries: usize) -> Vec<Step> {
    let mut units = units(steps);
    let mut size = units.len().div_ceil(2).max(1);
    let mut left = tries;
    while left > 0 && !units.is_empty() {
        let (mut i, mut cut) = (0, false);
        while i < units.len() && left > 0 {
            let end = (i + size).min(units.len());
            let rest: Vec<Vec<Step>> = units
                .iter()
                .enumerate()
                .filter(|(j, _)| *j < i || *j >= end)
                .map(|(_, u)| u.clone())
                .collect();
            left -= 1;
            if fails(&rest.concat()) {
                (units, cut) = (rest, true);
            } else {
                i = end;
            }
        }
        if !cut && size == 1 {
            break;
        }
        if !cut {
            size = size.div_ceil(2);
        }
    }
    units.concat()
}

/// `explore/sent-differs` when a harness's `got` action names are not those the walk declared.
pub fn sent_differs(want: &[Action], got: &[String]) -> Option<Seen> {
    let want: Vec<&str> = want.iter().map(|a| a.action.as_str()).collect();
    (want != got).then(|| saw("explore/sent-differs", "", format!("sent {got:?}, declared {want:?}")))
}
