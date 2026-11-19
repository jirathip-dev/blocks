mod support;

use blocks::expr::{eval, Expr, Lit, Match, Pattern, State};
use blocks::{apply, diff, Replica, Stream};
use serde_json::Number;
use support::{mutate, screen, Rng};

const SEEDS: &[u64] = &[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

fn env(key: &str) -> Option<u64> {
    std::env::var(key).ok()?.parse().ok()
}

fn run(seed: u64) -> Result<(), String> {
    let mut rng = Rng::new(seed);
    let rows = rng.below(30);
    let first = screen(&mut rng, rows, 6);
    let mut truth = first.clone();
    let mut stream = Stream::new(first, rng.below(8));
    let mut replica = Replica::default();
    let (mut connected, mut fresh) = (false, 0);
    for step in 0..300 {
        match rng.below(10) {
            0 => connected = false,
            1 | 2 if !connected => {
                let from = if rng.below(3) == 0 { None } else { replica.seq };
                for f in stream.resume(from) {
                    replica
                        .receive(&f)
                        .map_err(|e| format!("step {step}: resume from {from:?}: {e}"))?;
                }
                connected = true;
            }
            _ => {
                let edits = 1 + rng.below(6);
                let next = mutate(&mut rng, &truth, &mut fresh, edits);
                let mut applied = truth.clone();
                apply(&mut applied, &diff(&truth, &next)).map_err(|e| format!("step {step}: diff/apply: {e}"))?;
                if applied != next {
                    return Err(format!("step {step}: apply(diff(a, b), a) is not b"));
                }
                let frame = stream.push(next.clone());
                truth = next;
                if connected {
                    replica
                        .receive(&frame)
                        .map_err(|e| format!("step {step}: live frame: {e}"))?;
                }
            }
        }
    }
    for f in stream.resume(replica.seq) {
        replica.receive(&f).map_err(|e| format!("final resume: {e}"))?;
    }
    if replica.screen.as_ref() != Some(&truth) {
        return Err("the replica did not converge to the stream's screen".into());
    }
    Ok(())
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
