mod support;

use std::collections::{BTreeMap, VecDeque};

use blocks::expr::{eval, Expr, Lit, Match, Pattern, State};
use blocks::{apply, diff, Block, Built, Frame, Have, Hello, Mirror, Put, Shelf, Synced, Took};
use serde_json::{json, Number, Value};
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
    steps: Vec<Value>,
}

fn took(t: Took) -> Value {
    Value::String(format!("{t:?}").to_lowercase())
}

impl Net {
    fn ask(&mut self, have: Vec<Have>) -> Result<(), String> {
        let keys = have
            .iter()
            .map(|h| self.shelf.state(&0, &h.k, h.rev).map_err(|e| e.to_string()))
            .collect::<Result<_, _>>()?;
        self.steps.push(json!({ "have": have }));
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
        self.steps.push(json!({"hello": h, "outdated": null}));
        self.ask(m.have())
    }

    fn take(&mut self, m: &mut Mirror, msg: Msg) -> Result<(), String> {
        let took = match msg {
            Msg::Frame(f) => {
                let t = m.frame(f.clone());
                self.steps.push(json!({"frame": f, "took": took(t)}));
                vec![t]
            }
            Msg::Reply(sent, s) => {
                let t = m.synced(&sent, s.clone());
                let all: Vec<Value> = t.iter().copied().map(took).collect();
                self.steps.push(json!({"sent": sent, "synced": s, "took": all}));
                t
            }
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

fn sound(b: &Block) -> Result<(), String> {
    let faults = Built::new(serde_json::to_value(b).map_err(|e| e.to_string())?).check(&[]);
    faults
        .is_empty()
        .then_some(())
        .ok_or(format!("the sim made an unfit screen: {faults:?}"))
}

fn run(seed: u64, steps: usize) -> Result<Value, String> {
    let mut rng = Rng::new(seed);
    let rows = rng.below(30);
    let mut truth = screen(&mut rng, rows, 6);
    sound(&truth)?;
    let mut net = Net {
        shelf: Shelf::default(),
        epoch: 0,
        seen: BTreeMap::from([(1, truth.clone())]),
        wire: VecDeque::new(),
        steps: vec![json!({ "open": K })],
    };
    net.shelf.put(&0, K, &truth).map_err(|e| e.to_string())?;
    let mut m = Mirror::default();
    m.open(K);
    net.hello(&mut m)?;
    let mut fresh = 0;
    for step in 0..steps {
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
                sound(&later).map_err(at)?;
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
            let why = format!("generated by `just gen` from seed {seed} of SEEDS in crates/blocks/tests/sim.rs");
            return Ok(json!({"why": why, "v": 1, "steps": net.steps, "screens": { K: truth }}));
        }
        net.ask(m.have())?;
    }
    Err("the mirror did not converge to the shelf's screen".into())
}

fn lit(rng: &mut Rng) -> Lit {
    let nums = [
        0.0,
        -1.0,
        0.5,
        3.0,
        1e308,
        -1e308,
        f64::MIN_POSITIVE,
        1e16,
        1e21,
        1e-5,
        1e-7,
    ];
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
    match rng.below(16) {
        0 => Expr::Get(key(rng)),
        1 => Expr::Not(Box::new(e(rng))),
        2 => Expr::Mul(Box::new([e(rng), e(rng)])),
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
        15 => Expr::Div(Box::new([e(rng), e(rng)])),
        14 => Expr::Unknown(serde_json::Map::from_iter([(
            "fold".into(),
            serde_json::Value::from(1),
        )])),
        _ => Expr::Lit(lit(rng)),
    }
}

fn exprs(seed: u64) -> Result<Vec<Value>, String> {
    let mut rng = Rng::new(seed);
    let state: State = (0..4).map(|i| (format!("k{i}"), lit(&mut rng))).collect();
    let mut cases = vec![];
    for _ in 0..50 {
        let depth = 1 + rng.below(6);
        let e = expr(&mut rng, depth);
        let want = eval(&e, &state);
        let read = serde_json::from_str::<Lit>(&serde_json::to_string(&want).unwrap()).unwrap();
        if read == want {
            cases.push(json!({"state": state, "expr": e, "want": want}));
        }
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
    Ok(cases)
}

fn pick<'a>(rng: &mut Rng, xs: &[&'a str]) -> &'a str {
    xs[rng.below(xs.len())]
}

fn tree(rng: &mut Rng) -> Value {
    let rows: Vec<Value> = (0..rng.below(4))
        .map(|i| json!({"type": "row", "id": format!("l{i}"), "title": format!("row {i}")}))
        .collect();
    let buttons: Vec<Value> = (0..rng.below(3))
        .map(|i| json!({"type": "button", "id": format!("b{i}"), "label": format!("go {i}")}))
        .collect();
    let mut blocks = vec![
        json!({"type": "list", "id": "l", "rows": rows}),
        json!({"type": "card", "id": "c", "title": "card", "buttons": buttons}),
    ];
    blocks
        .extend((0..rng.below(4)).map(|i| json!({"type": "text", "id": format!("r{i}"), "markdown": format!("t{i}")})));
    json!({"type": "screen", "id": "s", "title": "sim", "blocks": blocks})
}

fn op(rng: &mut Rng, fresh: &mut usize) -> Value {
    let ids = ["s", "l", "c", "l0", "l1", "b0", "r0", "r1", "zz"];
    let lists = ["s", "l", "c", "s", "l", "c", "r0", "zz"];
    let text = |rng: &mut Rng| pick(rng, &["", "x", "👍🏽", "a b"]).to_string();
    let mut child = |rng: &mut Rng| {
        *fresh += 1;
        let id = format!("n{fresh}");
        match rng.below(3) {
            0 => json!({"type": "row", "id": id, "title": text(rng)}),
            1 => json!({"type": "button", "id": id, "label": text(rng)}),
            _ => json!({"type": "text", "id": id, "markdown": text(rng)}),
        }
    };
    let mut o = match rng.below(9) {
        0 | 1 => {
            let id = pick(rng, &["s", "c", "l0", "l1", "b0", "b1", "r0", "r1", "zz"]);
            let field = match id.chars().next() {
                Some('s') => "title",
                Some('b') => "label",
                Some('r') => "markdown",
                _ => pick(rng, &["title", "subtitle"]),
            };
            let to = if field == "subtitle" && rng.below(2) == 0 {
                Value::Null
            } else {
                text(rng).into()
            };
            json!({"op": "merge", "id": id, "fields": {field: to}})
        }
        2 | 3 => json!({"op": "insert", "into": pick(rng, &lists), "block": child(rng)}),
        4 => json!({"op": "move", "id": pick(rng, &ids), "into": pick(rng, &lists)}),
        5 => json!({"op": "remove", "id": pick(rng, &ids)}),
        6 => json!({"op": "replace", "id": pick(rng, &ids), "block": child(rng)}),
        7 => json!({"op": pick(rng, &["badge", "dot", "fly"]), "count": 2, "on": true}),
        _ => json!({"op": "screen", "screen": tree(rng)}),
    };
    for k in ["before", "after"] {
        if matches!(o["op"].as_str(), Some("insert" | "move")) && rng.below(3) == 0 {
            o[k] = pick(rng, &ids).into();
        }
    }
    o
}

fn applied(screen: &Value, ops: &Value) -> Value {
    let mut b: Block = serde_json::from_value(screen.clone()).unwrap();
    let ops: Vec<blocks::Op> = serde_json::from_value(ops.clone()).unwrap();
    apply(&mut b, &ops).map_or(Value::Null, |()| serde_json::to_value(&b).unwrap())
}

fn viewed(screen: &Value, state: &Value) -> Value {
    let state: State = serde_json::from_value(state.clone()).unwrap();
    serde_json::to_value(blocks::behave::view(&Built::new(screen.clone()), &state)).unwrap()
}

fn evaluated(e: &Value, state: &Value) -> Value {
    let state: State = serde_json::from_value(state.clone()).unwrap();
    serde_json::to_value(eval(&serde_json::from_value(e.clone()).unwrap(), &state)).unwrap()
}

fn cases(seed: u64) -> Vec<Value> {
    let mut rng = Rng::new(seed);
    let state: State = (0..4).map(|i| (format!("k{i}"), lit(&mut rng))).collect();
    let state = serde_json::to_value(state).unwrap();
    let mut out = vec![];
    let mut fresh = 0;
    for _ in 0..4 {
        let screen = tree(&mut rng);
        let ops: Value = (0..=rng.below(4)).map(|_| op(&mut rng, &mut fresh)).collect();
        let after = applied(&screen, &ops);
        out.push(json!({"seed": seed, "screen": screen, "ops": ops, "after": after}));
    }
    for _ in 0..10 {
        let depth = 1 + rng.below(5);
        let e = serde_json::to_value(expr(&mut rng, depth)).unwrap();
        let value = evaluated(&e, &state);
        out.push(json!({"seed": seed, "state": state, "expr": e, "value": value}));
    }
    let mut e = || serde_json::to_value(expr(&mut rng, 3)).unwrap();
    let screen = json!({"type": "screen", "id": "s", "blocks": [
        {"type": "text", "id": "t", "markdown": "x", "show": e()},
        {"type": "button", "id": "b", "label": "x", "enabled": e()},
        {"type": "form", "id": "f", "fields": [{"type": "text", "name": "k1", "show": e(), "enabled": e(),
            "checks": [{"ok": e(), "say": "no"}, {"ok": {"lt": [{"len": {"get": "k1"}}, e()]}, "say": "long"}]}]}
    ]});
    let view = viewed(&screen, &state);
    out.push(json!({"seed": seed, "state": state, "screen": screen, "view": view}));
    out
}

fn differs(c: &Value) -> Option<Value> {
    let (got, want) = if let Some(ops) = c.get("ops") {
        (applied(&c["screen"], ops), &c["after"])
    } else if let Some(e) = c.get("expr") {
        (evaluated(e, &c["state"]), &c["value"])
    } else {
        (viewed(&c["screen"], &c["state"]), &c["view"])
    };
    (&got != want).then_some(got)
}

fn shortest(corpus: &Value) -> Option<String> {
    let cases = corpus["cases"].as_array().unwrap();
    let bad: Vec<(String, Value)> = cases
        .iter()
        .filter_map(|c| differs(c).map(|got| (c.to_string(), got)))
        .collect();
    let (case, got) = bad.iter().min_by_key(|(c, _)| c.len())?;
    let seed = serde_json::from_str::<Value>(case).unwrap()["seed"].clone();
    Some(format!(
        "{} of {} cases differ; the shortest, seed {seed}: {case}\n  gave {got}",
        bad.len(),
        cases.len()
    ))
}

fn corpus_path() -> std::path::PathBuf {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    root.join(std::env::var("BLOCKS_SIM_CORPUS").unwrap_or_else(|_| "target/sim-corpus.json".into()))
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
        .filter_map(|s| run(s, 300).err().map(|e| format!("seed {s}: {e}")))
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
            run(s, 300).and_then(|_| exprs(s)).err().map(|e| {
                format!("seed {s}: {e}\n  replay: BLOCKS_SIM_SEED={s} cargo test -p blocks --test sim; then add {s} to SEEDS")
            })
        })
        .collect();
    assert!(bad.is_empty(), "{} of {n} seeds failed:\n{}", bad.len(), bad.join("\n"));
}

#[test]
fn the_forced_mismatch_corpus_names_its_shortest_differing_seed() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/sim/mismatch.json");
    let corpus: Value = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let out = shortest(&corpus).expect("the forced mismatches went unseen");
    assert!(out.starts_with("3 of 4 cases differ; the shortest, seed 7:"), "{out}");
}

#[test]
#[ignore = "the nightly corpus: `just sim [n]` writes it, then the TS and Swift runners read it"]
fn corpus() {
    let from = env("BLOCKS_SIM_FROM").unwrap_or(1000);
    let n = env("BLOCKS_SIM_N").unwrap_or(500);
    let cases: Vec<Value> = (from..from + n).flat_map(cases).collect();
    let path = corpus_path();
    std::fs::create_dir_all(path.parent().unwrap()).unwrap();
    std::fs::write(&path, json!({"from": from, "n": n, "cases": cases}).to_string()).unwrap();
    let back: Value = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
    assert_eq!(shortest(&back), None);
}

fn lines(v: &Value) -> String {
    let field = |(k, v): (&String, &Value)| match v {
        Value::Array(xs) => {
            let xs: Vec<String> = xs.iter().map(|x| format!("    {x}")).collect();
            format!("  {}: [\n{}\n  ]", Value::from(k.as_str()), xs.join(",\n"))
        }
        _ => format!("  {}: {v}", Value::from(k.as_str())),
    };
    let fields: Vec<String> = v.as_object().unwrap().iter().map(field).collect();
    format!("{{\n{}\n}}\n", fields.join(",\n"))
}

fn fixtures() -> BTreeMap<std::path::PathBuf, String> {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures");
    let mut out: BTreeMap<_, _> = SEEDS
        .iter()
        .map(|&s| {
            let fixture = run(s, 60).unwrap();
            (root.join(format!("protocol/sim-{s}.json")), fixture)
        })
        .collect();
    let cases: Vec<Value> = (0..200).flat_map(|s| exprs(s).unwrap().into_iter().take(5)).collect();
    out.insert(root.join("behave/sim.json"), json!({"state": {}, "cases": cases}));
    out.into_iter().map(|(p, v)| (p, lines(&v))).collect()
}

#[test]
fn the_generated_fixtures_are_the_fixed_seeds_and_expressions() {
    let want = fixtures();
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/protocol");
    let sims = || {
        let all = std::fs::read_dir(&dir).unwrap().map(|e| e.unwrap().path());
        all.filter(|p| p.file_name().unwrap().to_str().unwrap().starts_with("sim-"))
            .collect::<Vec<_>>()
    };
    if std::env::var_os("BLOCKS_GEN").is_some() {
        for p in sims() {
            std::fs::remove_file(p).unwrap();
        }
        for (p, s) in &want {
            std::fs::write(p, s).unwrap();
        }
    }
    let stale: Vec<_> = sims().into_iter().filter(|p| !want.contains_key(p)).collect();
    assert!(stale.is_empty(), "{stale:?} are no seed in SEEDS: run `just gen`");
    for (p, s) in &want {
        let got = std::fs::read_to_string(p).unwrap_or_default();
        assert!(&got == s, "{} is not what the sim gives: run `just gen`", p.display());
    }
}
