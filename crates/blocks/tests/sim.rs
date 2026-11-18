mod support;

use blocks::{apply, diff, Replica, Stream};
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
    if replica.screen != truth {
        return Err("the replica did not converge to the stream's screen".into());
    }
    Ok(())
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
            run(s).err().map(|e| {
                format!("seed {s}: {e}\n  replay: BLOCKS_SIM_SEED={s} cargo test -p blocks --test sim; then add {s} to SEEDS")
            })
        })
        .collect();
    assert!(bad.is_empty(), "{} of {n} seeds failed:\n{}", bad.len(), bad.join("\n"));
}
