use std::collections::BTreeSet;
use std::path::Path;

use blocks::expr::{eval, Expr, Lit, State};
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
struct Case {
    expr: Value,
    want: Lit,
}

#[derive(Deserialize)]
struct File {
    state: State,
    cases: Vec<Case>,
}

fn ops(v: &Value, out: &mut BTreeSet<String>) {
    match v {
        Value::Object(o) => {
            out.extend(o.keys().cloned());
            o.values().for_each(|x| ops(x, out));
        }
        Value::Array(a) => a.iter().for_each(|x| ops(x, out)),
        _ => {
            out.insert("lit".into());
        }
    }
}

#[test]
fn eval_gives_every_fixtures_behave_case_its_value() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/behave");
    let (mut bad, mut seen, mut n) = (vec![], BTreeSet::new(), 0);
    for e in std::fs::read_dir(&dir).unwrap() {
        let p = e.unwrap().path();
        let file: File = serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap();
        for c in file.cases {
            n += 1;
            ops(&c.expr, &mut seen);
            let expr: Expr = serde_json::from_value(c.expr.clone()).unwrap();
            assert_eq!(
                serde_json::to_value(&expr).unwrap(),
                c.expr,
                "{} does not round-trip",
                c.expr
            );
            let got = eval(&expr, &file.state);
            if got != c.want {
                bad.push(format!("{}: {} gave {got:?}, not {:?}", p.display(), c.expr, c.want));
            }
        }
    }
    assert!(n >= 50, "only {n} cases");
    assert!(bad.is_empty(), "{}", bad.join("\n"));
    let every = [
        "get", "not", "all", "any", "eq", "lt", "len", "has", "is", "add", "sub", "cat", "pick", "lit", "fold",
    ];
    let missing: Vec<&str> = every.into_iter().filter(|k| !seen.contains(*k)).collect();
    assert!(missing.is_empty(), "no case uses {missing:?}");
}
