mod support;

use std::collections::{BTreeMap, VecDeque};

use blocks::expr::{eval, Expr, Lit, Match, Pattern, State};
use blocks::{apply, diff, Block, Built, Frame, Have, Hello, Mirror, Put, Shelf, Synced, Took};
use serde_json::{json, Number};
use support::{mutate, screen, Rng};

const SEEDS: &[u64] = &[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const K: &str = "/screens/sim";

fn env(key: &str) -> Option<u64> {
    std::env::var(key).ok()?.parse().ok()
}

enum Msg {
    Frame(Frame),
    Reply(Vec<Have>, Synced),
}

struct Net {
    shelf: Shelf<u8>,
    epoch: u64,
    seen: BTreeMap<u64, Block>,
    wire: VecDeque<Msg>,
}

impl Net {
    fn ask(&mut self, have: Vec<Have>) -> Result<(), String> {
        let keys = have
            .iter()
            .map(|h| self.shelf.state(&0, &h.k, h.rev).map_err(|e| e.to_string()))
            .collect::<Result<_, _>>()?;
        self.wire.push_back(Msg::Reply(have, Synced { keys }));
        Ok(())
    }

    fn hello(&mut self, m: &mut Mirror) -> Result<(), String> {
        self.wire.clear();
        let h = Hello {
            v: 1,
            sid: "sid".into(),
            epoch: format!("e{}", self.epoch),
            keys: 16,
        };
        m.hello(&h).map_err(|e| e.to_string())?;
        self.ask(m.have())
    }

    fn take(&mut self, m: &mut Mirror, msg: Msg) -> Result<(), String> {
        let took = match msg {
            Msg::Frame(f) => vec![m.frame(f)],
            Msg::Reply(sent, s) => m.synced(&sent, s),
        };
        if took.contains(&Took::Gap) {
            self.ask(m.have())?;
        }
        if took.iter().any(|t| matches!(t, Took::Patched | Took::Replaced)) {
            let rev = m.have().first().and_then(|h| h.rev).ok_or("applied but holds no rev")?;
            if m.screen(K) != self.seen.get(&rev) {
                return Err(format!("the mirror's rev {rev} is not the shelf's"));
            }
        }
        Ok(())
    }
}

fn run(seed: u64) -> Result<(), String> {
    let mut rng = Rng::new(seed);
    let rows = rng.below(30);
    let mut truth = screen(&mut rng, rows, 6);
    let mut net = Net {
        shelf: Shelf::default(),
        epoch: 0,
        seen: BTreeMap::from([(1, truth.clone())]),
        wire: VecDeque::new(),
    };
    net.shelf.put(&0, K, &truth).map_err(|e| e.to_string())?;
    let mut m = Mirror::default();
    m.open(K);
    net.hello(&mut m)?;
    let mut fresh = 0;
    for step in 0..300 {
        let at = |e: String| format!("step {step}: {e}");
        match rng.below(20) {
            0 => net.hello(&mut m).map_err(at)?,
            1 => {
                net.epoch += 1;
                net.shelf = Shelf::default();
                net.shelf.put(&0, K, &truth).map_err(|e| at(e.to_string()))?;
                net.seen = BTreeMap::from([(1, truth.clone())]);
                net.hello(&mut m).map_err(at)?;
            }
            2..=9 if !net.wire.is_empty() => {
                let i = if rng.below(4) == 0 {
                    rng.below(net.wire.len())
                } else {
                    0
                };
                if let Some(msg) = net.wire.remove(i) {
                    net.take(&mut m, msg).map_err(at)?;
                }
            }
            _ => {
                let edits = 1 + rng.below(6);
                let later = mutate(&mut rng, &truth, &mut fresh, edits);
                let mut applied = truth.clone();
                apply(&mut applied, &diff(&truth, &later)).map_err(|e| at(format!("diff/apply: {e}")))?;
                if applied != later {
                    return Err(at("apply(diff(a, b), a) is not b".into()));
                }
                truth = later;
                if let Put::Changed(d) = net.shelf.put(&0, K, &truth).map_err(|e| at(e.to_string()))? {
                    net.seen.insert(d.rev, truth.clone());
                    let f: Frame = serde_json::from_str(&d.frame).map_err(|e| at(e.to_string()))?;
                    let copies = [0, 1, 1, 1, 1, 1, 1, 1, 2, 2][rng.below(10)];
                    (0..copies).for_each(|_| net.wire.push_back(Msg::Frame(f.clone())));
                }
            }
        }
    }
    for _ in 0..4 {
        while let Some(msg) = net.wire.pop_front() {
            net.take(&mut m, msg).map_err(|e| format!("drain: {e}"))?;
        }
        if m.screen(K) == Some(&truth) {
            return Ok(());
        }
        net.ask(m.have())?;
    }
    Err("the mirror did not converge to the shelf's screen".into())
}

fn lit(rng: &mut Rng) -> Lit {
    let nums = [0.0, -1.0, 0.5, 3.0, 1e308, -1e308, f64::MIN_POSITIVE];
    let strs = ["", "a", "👍🏽", "ada@example.org", "https://x.org", "3", " 4.5 "];
    match rng.below(4) {
        0 => Lit::Null,
        1 => Lit::Bool(rng.below(2) == 0),
        2 => Lit::Num(Number::from_f64(nums[rng.below(nums.len())]).unwrap()),
        _ => Lit::Str(strs[rng.below(strs.len())].into()),
    }
}

fn expr(rng: &mut Rng, depth: usize) -> Expr {
    let key = |rng: &mut Rng| format!("k{}", rng.below(4));
    if depth == 0 {
        return if rng.below(2) == 0 {
            Expr::Get(key(rng))
        } else {
            Expr::Lit(lit(rng))
        };
    }
    let e = |rng: &mut Rng| expr(rng, depth - 1);
    let pattern = [
        Pattern::Filled,
        Pattern::Email,
        Pattern::Url,
        Pattern::Number,
        Pattern::Other("zip".into()),
    ];
    match rng.below(15) {
        0 => Expr::Get(key(rng)),
        1 => Expr::Not(Box::new(e(rng))),
        3 => Expr::All((0..rng.below(4)).map(|_| e(rng)).collect()),
        4 => Expr::Any((0..rng.below(4)).map(|_| e(rng)).collect()),
        5 => Expr::Eq(Box::new([e(rng), e(rng)])),
        6 => Expr::Lt(Box::new([e(rng), e(rng)])),
        7 => Expr::Len(Box::new(e(rng))),
        8 => Expr::Has(Box::new([e(rng), e(rng)])),
        9 => Expr::Is(Box::new(Match {
            value: e(rng),
            pattern: pattern[rng.below(pattern.len())].clone(),
        })),
        10 => Expr::Add(Box::new([e(rng), e(rng)])),
        11 => Expr::Sub(Box::new([e(rng), e(rng)])),
        12 => Expr::Cat((0..rng.below(4)).map(|_| e(rng)).collect()),
        13 => Expr::Pick(Box::new([e(rng), e(rng), e(rng)])),
        14 => Expr::Unknown(serde_json::Map::from_iter([(
            "fold".into(),
            serde_json::Value::from(1),
        )])),
        _ => Expr::Lit(lit(rng)),
    }
}

fn exprs(seed: u64) -> Result<(), String> {
    let mut rng = Rng::new(seed);
    let state: State = (0..4).map(|i| (format!("k{i}"), lit(&mut rng))).collect();
    for _ in 0..50 {
        let depth = 1 + rng.below(6);
        let e = expr(&mut rng, depth);
        eval(&e, &state);
        let back: Expr = serde_json::from_value(serde_json::to_value(&e).unwrap()).map_err(|x| x.to_string())?;
        if back != e {
            return Err(format!("{e:?} does not read back as itself"));
        }
    }
    let mut e = || serde_json::to_value(expr(&mut rng, 3)).unwrap();
    let screen = Built::new(json!({"type": "screen", "id": "s", "blocks": [
        {"type": "text", "id": "t", "markdown": "x", "show": e()},
        {"type": "button", "id": "b", "label": "x", "enabled": e(), "tap": {"set": [{"key": "k0", "to": e()}]}},
        {"type": "form", "id": "f", "fields": [{"type": "text", "name": "k1", "show": e(), "enabled": e(),
            "checks": [{"ok": e(), "say": "no"}, {"ok": {"lt": [{"len": {"get": "k1"}}, e()]}, "say": "long"}]}]}
    ]}));
    blocks::behave::view(&screen, &state);
    blocks::site::fragment(&screen, "/act");
    Ok(())
}

#[test]
fn no_expression_panics_and_each_reads_back() {
    let seeds = (0..200).chain(env("BLOCKS_SIM_SEED"));
    let bad: Vec<String> = seeds
        .filter_map(|s| exprs(s).err().map(|e| format!("seed {s}: {e}")))
        .collect();
    assert!(bad.is_empty(), "{}", bad.join("\n"));
}

#[test]
fn the_fixed_seeds_converge() {
    let seeds = SEEDS.iter().copied().chain(env("BLOCKS_SIM_SEED"));
    let bad: Vec<String> = seeds
        .filter_map(|s| run(s).err().map(|e| format!("seed {s}: {e}")))
        .collect();
    assert!(bad.is_empty(), "{}", bad.join("\n"));
}

#[test]
#[ignore = "the nightly batch: `just sim [n]`"]
fn random_seeds() {
    let from = env("BLOCKS_SIM_FROM").unwrap_or(1000);
    let n = env("BLOCKS_SIM_N").unwrap_or(500);
    let bad: Vec<String> = (from..from + n)
        .filter_map(|s| {
            run(s).and_then(|()| exprs(s)).err().map(|e| {
                format!("seed {s}: {e}\n  replay: BLOCKS_SIM_SEED={s} cargo test -p blocks --test sim; then add {s} to SEEDS")
            })
        })
        .collect();
    assert!(bad.is_empty(), "{} of {n} seeds failed:\n{}", bad.len(), bad.join("\n"));
}
