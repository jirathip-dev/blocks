use std::collections::BTreeSet;
use std::path::Path;

use blocks::behave::{start, view, View};
use blocks::expr::{eval, Expr, Lit, State};
use blocks::Built;
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
struct Case {
    expr: Value,
    want: Lit,
    #[serde(default)]
    state: Option<State>,
}

#[derive(Deserialize)]
struct File {
    state: State,
    cases: Vec<Case>,
    #[serde(default)]
    screen: Option<Value>,
    #[serde(default)]
    view: Option<View>,
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
        if let (Some(screen), Some(want)) = (&file.screen, &file.view) {
            let got = view(&Built::new(screen.clone()), &file.state);
            if &got != want {
                bad.push(format!("{}: view gave {got:?}, not {want:?}", p.display()));
            }
        }
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
            let got = eval(&expr, c.state.as_ref().unwrap_or(&file.state));
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

fn screen() -> Built {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/behave/view.json");
    let file: File = serde_json::from_str(&std::fs::read_to_string(dir).unwrap()).unwrap();
    Built::new(file.screen.unwrap())
}

#[test]
fn start_takes_the_screen_state_each_field_value_and_the_first_chip() {
    let s = start(&screen());
    assert_eq!(s.get("more"), Some(&Lit::Bool(false)));
    assert_eq!(s.get("plan"), Some(&Lit::Str("free".into())));
    assert_eq!(s.get("email"), Some(&Lit::Null));
    let v = view(&screen(), &s);
    assert_eq!(v.says.get("email").map(String::as_str), Some("Enter an email"));
}

#[test]
fn site_writes_hidden_required_type_and_maxlength_from_the_start_state() {
    let html = blocks::site::fragment(&screen(), "/act");
    for want in [
        r#"data-id="plans" hidden="""#,
        r#"data-id="box" hidden="""#,
        r#"<label class="fd" hidden=""><span class="fl"><span class="fk">seats"#,
        r#"name="email" form="b-f1" type="email" autocomplete="off" required="""#,
        r#"name="name" form="b-f1" type="text" autocomplete="off" maxlength="20""#,
    ] {
        assert!(html.contains(want), "no {want} in {html}");
    }
    assert!(
        !html.contains(r#"data-id="later" hidden="""#),
        "an unknown operation hid a block"
    );
}
