use std::path::{Path, PathBuf};

use blocks::{apply, Block, Built, Fault, OldFrame, Op};
use serde_json::Value;

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read(path: &Path) -> Value {
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

fn fixtures() -> Vec<(String, Value)> {
    let mut out = vec![];
    for app in ["cooee", "drover"] {
        let dir = root().join("fixtures/screens").join(app);
        for e in std::fs::read_dir(&dir).unwrap() {
            let p = e.unwrap().path();
            out.push((format!("{app}/{}", p.file_name().unwrap().to_string_lossy()), read(&p)));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

fn again(v: &Value) -> Result<Value, String> {
    let e = |e: serde_json::Error| e.to_string();
    let mut out = v.clone();
    match (v, &mut out) {
        (Value::Array(items), _) => return items.iter().map(again).collect::<Result<_, _>>().map(Value::Array),
        (Value::Object(o), _) if o.contains_key("type") => {
            return serde_json::to_value(serde_json::from_value::<Block>(v.clone()).map_err(e)?).map_err(e)
        }
        (Value::Object(o), _) if o.contains_key("seq") => {
            return serde_json::to_value(serde_json::from_value::<OldFrame>(v.clone()).map_err(e)?).map_err(e)
        }
        (Value::Object(o), Value::Object(w)) if o.contains_key("ops") => {
            let ops: Vec<Op> = serde_json::from_value(o["ops"].clone()).map_err(e)?;
            w.insert("ops".into(), serde_json::to_value(ops).map_err(e)?);
        }
        (Value::Object(o), Value::Object(w)) if o.contains_key("block") => {
            w.insert("block".into(), again(&o["block"])?);
        }
        _ => return Err(format!("neither a block, a frame nor ops: {v}")),
    }
    Ok(out)
}

#[test]
fn every_fixture_parses_into_the_types_and_serializes_back_equal() {
    let all = fixtures();
    assert!(all.len() >= 40, "only {} fixtures", all.len());
    let bad: Vec<String> = all
        .iter()
        .filter_map(|(name, v)| match again(v) {
            Ok(w) if &w == v => None,
            Ok(w) => Some(format!("{name}: serialized back as {w}")),
            Err(e) => Some(format!("{name}: {e}")),
        })
        .collect();
    assert!(bad.is_empty(), "{}", bad.join("\n"));
}

fn schema() -> Value {
    read(&root().join("schema/blocks.schema.json"))
}

fn kind(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(n) if n.is_i64() || n.is_u64() => "integer",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn check(root: &Value, s: &Value, v: &Value, at: &str) -> Result<(), String> {
    let fail = |why: String| Err(format!("{at}: {why}"));
    let o = match s {
        Value::Bool(true) => return Ok(()),
        Value::Object(o) => o,
        _ => return fail(format!("schema {s}")),
    };
    if let Some(r) = o.get("$ref").and_then(Value::as_str) {
        let def = root.pointer(r.trim_start_matches('#')).ok_or(format!("no {r}"))?;
        check(root, def, v, at)?;
    }
    if let Some(t) = o.get("type") {
        let ts: Vec<&str> = t.as_array().map_or_else(
            || vec![t.as_str().unwrap()],
            |a| a.iter().map(|x| x.as_str().unwrap()).collect(),
        );
        let k = kind(v);
        let fits = ts.contains(&k) || (k == "integer" && ts.contains(&"number"));
        if !fits {
            return fail(format!("{k} where {ts:?} is due"));
        }
    }
    if o.get("const").is_some_and(|c| c != v) {
        return fail(format!("{v} is not {}", o["const"]));
    }
    if o.get("enum").and_then(Value::as_array).is_some_and(|e| !e.contains(v)) {
        return fail(format!("{v} is not one of {}", o["enum"]));
    }
    if let Some(n) = v.as_f64() {
        if o.get("minimum").and_then(Value::as_f64).is_some_and(|m| n < m)
            || o.get("maximum").and_then(Value::as_f64).is_some_and(|m| n > m)
        {
            return fail(format!("{n} is out of range"));
        }
    }
    if let Value::Object(fields) = v {
        let props = o.get("properties").and_then(Value::as_object);
        for r in o.get("required").and_then(Value::as_array).into_iter().flatten() {
            if !fields.contains_key(r.as_str().unwrap()) {
                return fail(format!("no `{}`", r.as_str().unwrap()));
            }
        }
        for (k, x) in fields {
            match (props.and_then(|p| p.get(k)), o.get("additionalProperties")) {
                (Some(p), _) | (None, Some(p)) => check(root, p, x, &format!("{at}.{k}"))?,
                (None, None) => {}
            }
        }
    }
    if let (Value::Array(items), Some(each)) = (v, o.get("items")) {
        for (i, x) in items.iter().enumerate() {
            check(root, each, x, &format!("{at}[{i}]"))?;
        }
    }
    for x in o.get("allOf").and_then(Value::as_array).into_iter().flatten() {
        check(root, x, v, at)?;
    }
    let fits = |key: &str| {
        o.get(key)
            .and_then(Value::as_array)
            .map(|a| a.iter().filter(|x| check(root, x, v, at).is_ok()).count())
    };
    if fits("anyOf") == Some(0) {
        return fail(format!("fits none of anyOf: {v}"));
    }
    if fits("oneOf").is_some_and(|n| n != 1) {
        return fail(format!("fits {} of oneOf: {v}", fits("oneOf").unwrap()));
    }
    if o.get("not").is_some_and(|n| check(root, n, v, at).is_ok()) {
        return fail(format!("{v} fits `not`"));
    }
    Ok(())
}

fn valid(s: &Value, v: &Value) -> Result<(), String> {
    let block = serde_json::json!({"$ref": "#/$defs/Block"});
    let frame = serde_json::json!({"$ref": "#/$defs/OldFrame"});
    let ops = serde_json::json!({"type": "array", "items": {"$ref": "#/$defs/Op"}});
    match v {
        Value::Array(items) => items.iter().try_for_each(|x| valid(s, x)),
        Value::Object(o) if o.contains_key("type") => check(s, &block, v, "block"),
        Value::Object(o) if o.contains_key("seq") => check(s, &frame, v, "frame"),
        Value::Object(o) if o.contains_key("ops") => check(s, &ops, &o["ops"], "ops"),
        Value::Object(o) if o.contains_key("block") => check(s, &block, &o["block"], "block"),
        _ => Err(format!("neither a block, a frame nor ops: {v}")),
    }
}

fn every(v: &Value, out: &mut Vec<Value>) {
    out.push(v.clone());
    match v {
        Value::Array(a) => a.iter().for_each(|x| every(x, out)),
        Value::Object(o) => o.values().for_each(|x| every(x, out)),
        _ => {}
    }
}

#[test]
fn the_generated_schema_validates_every_fixture() {
    let s = schema();
    let all = fixtures();
    let bad: Vec<String> = all
        .iter()
        .filter_map(|(name, v)| valid(&s, v).err().map(|e| format!("{name}: {e}")))
        .collect();
    assert!(bad.is_empty(), "{}", bad.join("\n"));
    let mut seen = vec![];
    for (_, v) in &all {
        every(v, &mut seen);
    }
    let has = |f: &dyn Fn(&Value) -> bool| seen.iter().any(f);
    assert!(has(&|v| v["type"] == "composer"), "no composer block");
    assert!(has(&|v| v["op"] == "dot"), "no dot op");
    assert!(
        has(&|v| v["op"] == "insert" && v.get("before").is_some()),
        "no insert before"
    );
    assert!(
        has(&|v| v["op"] == "insert" && v.get("after").is_some()),
        "no insert after"
    );
}

#[test]
fn the_schema_and_the_types_refuse_a_core_kind_of_the_wrong_shape() {
    let s = schema();
    for (bad, why) in [
        (r#"{"type": "row", "id": "a"}"#, "a row with no title"),
        (r#"{"type": "composer", "id": "say"}"#, "a composer with no action"),
        (
            r#"{"type": "web", "src": "/x", "height": "tall"}"#,
            "a web block whose height is no number",
        ),
    ] {
        let v: Value = serde_json::from_str(bad).unwrap();
        assert!(valid(&s, &v).is_err(), "the schema takes {why}");
        assert!(serde_json::from_value::<Block>(v).is_err(), "the types take {why}");
    }
    for (bad, why) in [
        (
            r#"{"seq": 1, "ops": [{"op": "insert", "block": {"type": "row", "title": "a"}}]}"#,
            "an insert with no `into`",
        ),
        (
            r#"{"seq": 1, "ops": [{"op": "dot", "on": "yes"}]}"#,
            "a dot that is no switch",
        ),
    ] {
        let v: Value = serde_json::from_str(bad).unwrap();
        assert!(valid(&s, &v).is_err(), "the schema takes {why}");
        assert!(serde_json::from_value::<OldFrame>(v).is_err(), "the types take {why}");
    }
    let app: Value = serde_json::from_str(r#"{"type": "herd", "weather": {"sky": "clear"}}"#).unwrap();
    assert!(valid(&s, &app).is_ok());
    assert_eq!(
        serde_json::to_value(serde_json::from_value::<Block>(app.clone()).unwrap()).unwrap(),
        app
    );
}

#[test]
fn an_insert_lands_before_then_after_then_at_the_end_as_cooee_draws_it() {
    let frames: Vec<OldFrame> =
        serde_json::from_value(read(&root().join("fixtures/screens/cooee/screen-tests-insert.json"))).unwrap();
    let mut screen: Block = serde_json::from_str(r#"{"type": "screen", "title": ""}"#).unwrap();
    for f in &frames {
        apply(&mut screen, &f.ops).unwrap();
    }
    let screen = serde_json::to_value(screen).unwrap();
    let ids: Vec<&str> = screen["blocks"][0]["rows"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r["id"].as_str().unwrap())
        .collect();
    assert_eq!(ids, ["d", "a", "e", "b", "c"]);
}

fn find<'a>(v: &'a Value, id: &str) -> Option<&'a Value> {
    if v["id"] == id {
        return Some(v);
    }
    match v {
        Value::Array(a) => a.iter().find_map(|x| find(x, id)),
        Value::Object(o) => o.values().find_map(|x| find(x, id)),
        _ => None,
    }
}

#[test]
fn the_queue_stream_patches_the_queue_by_id_as_cooee_reads_it() {
    let dir = root().join("fixtures/screens/cooee");
    let mut screen: Block = serde_json::from_value(read(&dir.join("screens-as-data-queue.json"))).unwrap();
    let frames: Vec<OldFrame> = serde_json::from_value(read(&dir.join("screens-as-data-queue-stream.json"))).unwrap();
    for f in &frames {
        apply(&mut screen, &f.ops).unwrap();
    }
    let root = serde_json::to_value(&screen).unwrap();
    let q722 = find(&root, "q-722").unwrap();
    assert_eq!(q722["badge"]["text"], "review 1");
    assert_eq!(q722["subtitle"], "impl ✓ · review 1 ▸ herdsman-rev-722 · mini");
    assert!(q722.get("tap").is_some());
    assert!(find(&root, "q-708").is_none());
    assert_eq!(find(&root, "done-today").unwrap()["value"], "7");
    assert_eq!(find(&root, "q-456").unwrap()["badge"]["text"], "impl");
    assert!(find(&root, "q-456").unwrap().get("swipe").is_none());
    assert_eq!(find(&root, "q-686").unwrap()["subtitle"]["tone"], "warn");
    assert_eq!(
        (root["type"].as_str(), root["title"].as_str()),
        (Some("screen"), Some("Queue"))
    );
}

fn blocks_in(v: &Value, out: &mut Vec<Value>) {
    match v {
        Value::Array(a) => a.iter().for_each(|x| blocks_in(x, out)),
        Value::Object(o) if o.contains_key("type") => out.push(v.clone()),
        Value::Object(o) => {
            for op in o.get("ops").and_then(Value::as_array).into_iter().flatten() {
                out.extend(
                    op.get("screen")
                        .or(op.get("block"))
                        .filter(|b| b.get("type").is_some())
                        .cloned(),
                );
            }
            out.extend(o.get("block").filter(|b| b.get("type").is_some()).cloned());
        }
        _ => {}
    }
}

const COOEE: &[&str] = &[
    "pinned",
    "chats",
    "account",
    "group",
    "step",
    "spacer",
    "mark",
    "ways",
    "header",
    "scanner",
    "found",
    "buttons",
    "nearby",
    "address",
    "symbol",
    "word",
    "countdown",
    "avatars",
    "terminal",
    "workflow",
    "routines",
    "places",
    "skills",
    "memory",
    "edit",
    "confirm",
];

fn herd_scene(name: &str, f: &Fault) -> bool {
    let field = |x: &str| matches!(f, Fault::Extra { kind, field } if kind == "scene" && field == x);
    name == "drover/herd.json" && (field("weather") || field("repos"))
}

#[test]
fn every_golden_parses_with_no_fault() {
    let (mut bad, mut seen, mut herd) = (vec![], 0, 0);
    for (name, v) in fixtures() {
        let app = if name.starts_with("cooee/") { COOEE } else { &[] };
        let mut found = vec![];
        blocks_in(&v, &mut found);
        seen += found.len();
        for b in found {
            for f in Built::new(b).check(app) {
                match f {
                    _ if herd_scene(&name, &f) => herd += 1,
                    Fault::Shape { .. }
                    | Fault::Extra { .. }
                    | Fault::Unknown { .. }
                    | Fault::Twice { .. }
                    | Fault::ActTwice { .. } => {
                        bad.push(format!("{name}: {f:?}"));
                    }
                    _ => {}
                }
            }
        }
    }
    assert!(seen >= 40, "only {seen} blocks in the goldens");
    assert!(bad.is_empty(), "{}", bad.join("\n"));
    assert_eq!(
        herd, 2,
        "drover's herd scene: its own shape, drover's app kind `herd` once it moves"
    );
}

const KINDS_28: [&str; 28] = [
    "screen", "sheet", "section", "list", "row", "card", "choice", "form", "config", "secret", "run", "button",
    "chips", "stat", "text", "images", "web", "diff", "editor", "scene", "diagram", "composer", "prose", "hero",
    "media", "nav", "island", "steps",
];

#[test]
fn the_28_kinds_each_have_a_typed_sample_that_is_its_fixture() {
    let mut kinds: Vec<&str> = Block::KINDS.iter().copied().chain(["island"]).collect();
    kinds.sort_unstable();
    kinds.dedup();
    let mut want = KINDS_28.to_vec();
    want.sort_unstable();
    assert_eq!(kinds, want);
    let samples = blocks::samples();
    let named: Vec<&str> = samples.iter().map(|(k, _)| *k).collect();
    assert_eq!(named, Block::KINDS);
    let dir = root().join("fixtures/blocks");
    assert_eq!(std::fs::read_dir(&dir).unwrap().count(), Block::KINDS.len());
    let s = schema();
    for (kind, b) in samples {
        let file = read(&dir.join(format!("{kind}.json")));
        assert_eq!(
            file,
            serde_json::to_value(&b).unwrap(),
            "fixtures/blocks/{kind}.json: rerun `just gen`"
        );
        assert_eq!(file["type"], kind);
        assert_eq!(serde_json::from_value::<Block>(file.clone()).unwrap(), b);
        valid(&s, &file).unwrap_or_else(|e| panic!("{kind}: {e}"));
        assert_eq!(Built::new(file).check(&[]), vec![], "{kind}");
    }
}

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap()
}

#[test]
fn built_of_writes_a_fallback_for_each_kind_a_client_may_not_draw() {
    let card = Block::Card(Box::new(blocks::Card::new().id("c").title("q1").subtitle("waiting")));
    let row = Block::Row(Box::new(blocks::Row::new("Build").id("r")));
    let media = Block::Media(Box::new(blocks::Media::new("/a.png", "a chart", 4_u32, 3_u32).id("m")));
    let screen = blocks::Screen::new()
        .id("s")
        .title("Home")
        .blocks(vec![card, row, media]);
    let built = Built::of(&screen);
    let v = built.value();
    assert_eq!(v["fallback"]["title"], "Home");
    assert_eq!(
        v["blocks"][0]["fallback"],
        parse(r#"{"title": "q1", "subtitle": "waiting"}"#)
    );
    assert!(v["blocks"][1].get("fallback").is_none(), "a row is drawn as itself");
    assert_eq!(v["blocks"][2]["fallback"]["title"], "/a.png");
    assert_eq!(built.check(&[]), vec![]);
}

#[test]
fn check_finds_each_fault() {
    let screen = parse(
        r#"{"type": "screen", "id": "s", "state": {"email": ""}, "blocks": [
            {"type": "row", "id": "a", "title": "one", "colour": "red"},
            {"type": "row", "id": "a", "title": "two"},
            {"type": "row", "id": "b"},
            {"type": "text", "id": "", "markdown": "x", "show": {"get": "nope"}},
            {"type": "gauge", "id": "g"},
            {"type": "herd", "id": "h"},
            {"type": "island", "name": "x-map", "fallback": {"title": ""}},
            {"type": "form", "id": "f", "fields": [{"type": "text", "name": "email"}]}
        ]}"#,
    );
    let mut got = Built::new(screen).check(&["herd", "row"]);
    got.sort_by_key(|f| format!("{f:?}"));
    let s = String::from;
    let shape = got.iter().find(|f| matches!(f, Fault::Shape { .. })).cloned();
    assert!(
        matches!(&shape, Some(Fault::Shape { kind, .. }) if kind == "row"),
        "{got:?}"
    );
    let mut want = vec![
        Fault::Twice {
            id: s("a"),
            at: [s("/blocks/0"), s("/blocks/1")],
        },
        Fault::Unnamed { kind: s("text") },
        Fault::Unnamed { kind: s("island") },
        Fault::Unknown { kind: s("gauge") },
        Fault::Extra {
            kind: s("row"),
            field: s("colour"),
        },
        Fault::Clash { kind: s("row") },
        Fault::Bare {
            kind: s("herd"),
            id: s("h"),
        },
        Fault::Bare {
            kind: s("island"),
            id: s(""),
        },
        Fault::State { key: s("email") },
        Fault::State { key: s("nope") },
        shape.unwrap(),
    ];
    want.sort_by_key(|f| format!("{f:?}"));
    assert_eq!(got, want);
}

#[test]
fn apply_of_the_diff_is_the_new_screen_for_every_pair_of_goldens() {
    let mut screens = vec![];
    for (_, v) in fixtures() {
        let mut found = vec![];
        blocks_in(&v, &mut found);
        screens.extend(found.into_iter().filter(|b| b["type"] == "screen"));
    }
    let screens: Vec<Block> = screens
        .into_iter()
        .map(|v| serde_json::from_value(v).unwrap())
        .collect();
    assert!(screens.len() >= 20, "only {} screens", screens.len());
    for a in &screens {
        for b in &screens {
            let mut got = a.clone();
            blocks::apply(&mut got, &blocks::diff(a, b)).unwrap();
            assert_eq!(&got, b);
        }
    }
}

#[test]
fn an_action_and_its_answer_travel_as_both_apps_send_them() {
    let action = parse(r#"{"screen": "queue", "block": "q-1", "action": "approve", "values": {"n": 1}}"#);
    let a: blocks::Action = serde_json::from_value(action.clone()).unwrap();
    assert_eq!((a.screen.as_str(), a.values["n"].as_u64()), ("queue", Some(1)));
    assert_eq!(serde_json::to_value(&a).unwrap(), action);
    let answer = parse(r#"{"ops": [{"op": "remove", "id": "a"}], "toast": "Approved", "close": true}"#);
    let got: blocks::Answer = serde_json::from_value(answer.clone()).unwrap();
    assert_eq!(got.ops, vec![Op::Remove { id: "a".into() }]);
    assert_eq!(serde_json::to_value(&got).unwrap(), answer);
    let s = schema();
    for (def, v) in [("Action", &action), ("Answer", &answer)] {
        check(&s, &parse(&format!(r##"{{"$ref": "#/$defs/{def}"}}"##)), v, def).unwrap();
    }
}

#[test]
fn check_refuses_an_id_twice_and_names_both_paths() {
    let screen = parse(
        r#"{"type": "screen", "id": "s", "blocks": [
            {"type": "section", "id": "sec", "blocks": [
                {"type": "list", "id": "l", "rows": [
                    {"type": "row", "id": "sec", "title": "a", "tap": {"action": "open"}},
                    {"type": "row", "id": "r2", "title": "b", "tap": {"action": "open"}}
                ]}
            ]},
            {"type": "card", "id": "c", "title": "c", "buttons": [
                {"type": "button", "label": "yes", "action": "pick"},
                {"type": "button", "label": "no", "action": "pick"}
            ]}
        ]}"#,
    );
    let s = String::from;
    assert_eq!(
        Built::new(screen).check(&[]),
        vec![
            Fault::Twice {
                id: s("sec"),
                at: [s("/blocks/0"), s("/blocks/0/blocks/0/rows/0")],
            },
            Fault::ActTwice {
                block: s("c"),
                action: s("pick"),
                at: [s("/blocks/1/buttons/0"), s("/blocks/1/buttons/1")],
            },
        ]
    );
}

const LONG: &str = "A much longer text than this kind's sample, one that keeps going well past the width of a phone so it has to wrap, then an unbroken token: blocks-stress-fixtures-long-text-without-any-break-in-it";
const MANY: usize = 200;
const VARIANTS: [&str; 3] = ["long", "empty", "many"];

fn stretch(v: &mut Value, keys: &[&str]) {
    match v {
        Value::Object(o) => o.iter_mut().for_each(|(k, x)| match x {
            Value::String(s) if keys.contains(&k.as_str()) => *s = LONG.into(),
            Value::Array(a) if keys.contains(&k.as_str()) && a.iter().all(Value::is_string) => {
                for s in a {
                    *s = Value::String(format!("{}{LONG}", &s.as_str().unwrap()[..1]));
                }
            }
            _ => stretch(x, keys),
        }),
        Value::Array(a) => a.iter_mut().for_each(|x| stretch(x, keys)),
        _ => {}
    }
}

fn mark(v: &mut Value, n: usize) {
    match v {
        Value::Object(o) => o.iter_mut().for_each(|(k, x)| match x {
            Value::String(s) if ["id", "name", "value"].contains(&k.as_str()) => s.push_str(&format!("-{n}")),
            _ => mark(x, n),
        }),
        Value::Array(a) => a.iter_mut().for_each(|x| mark(x, n)),
        _ => {}
    }
}

fn stress_rows(table: &Value, kinds: &[&str]) -> Result<(), String> {
    let rows = table.as_object().ok_or("fixtures/stress/table.json is no object")?;
    let mut bad: Vec<String> = kinds
        .iter()
        .filter(|k| !rows.contains_key(**k))
        .map(|k| format!("{k}: no row in fixtures/stress/table.json"))
        .collect();
    for (k, row) in rows {
        if !kinds.contains(&k.as_str()) {
            bad.push(format!("{k}: a row for no kind"));
        }
        let some = VARIANTS.iter().filter(|v| row.get(**v).is_some()).count();
        if some < VARIANTS.len() && row["why"].as_str().is_none_or(str::is_empty) {
            bad.push(format!("{k}: a variant left out with no why"));
        }
    }
    if bad.is_empty() {
        Ok(())
    } else {
        Err(bad.join("\n"))
    }
}

fn stress(table: &Value) -> Vec<(String, Value)> {
    let mut out = vec![];
    for (kind, b) in blocks::samples() {
        let row = &table[kind];
        let sample = serde_json::to_value(b).unwrap();
        if let Some(keys) = row["long"].as_array() {
            let keys: Vec<&str> = keys.iter().map(|k| k.as_str().unwrap()).collect();
            let mut v = sample.clone();
            stretch(&mut v, &keys);
            assert_ne!(v, sample, "{kind}: long changes no text");
            out.push((format!("{kind}-long"), v));
        }
        if let Some(key) = row["empty"].as_str() {
            let mut v = sample.clone();
            v[key] = Value::Array(vec![]);
            out.push((format!("{kind}-empty"), v));
        }
        if let Some(key) = row["many"].as_str() {
            let items = sample[key].as_array().unwrap();
            let mut v = sample.clone();
            v[key] = (0..MANY)
                .map(|n| {
                    let mut x = items[n % items.len()].clone();
                    mark(&mut x, n);
                    x
                })
                .collect();
            out.push((format!("{kind}-many"), v));
        }
    }
    out
}

#[test]
fn every_kind_has_a_stress_row_and_each_variant_is_its_file_and_valid() {
    let dir = root().join("fixtures/stress");
    let table = read(&dir.join("table.json"));
    stress_rows(&table, Block::KINDS).unwrap();
    let want = stress(&table);
    if std::env::var_os("BLOCKS_GEN").is_some() {
        for e in std::fs::read_dir(&dir).unwrap() {
            let p = e.unwrap().path();
            if p.file_name().unwrap() != "table.json" {
                std::fs::remove_file(p).unwrap();
            }
        }
        for (name, v) in &want {
            std::fs::write(
                dir.join(format!("{name}.json")),
                serde_json::to_string_pretty(v).unwrap() + "\n",
            )
            .unwrap();
        }
    }
    let mut files: Vec<String> = std::fs::read_dir(&dir)
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    files.sort();
    let mut names: Vec<String> = want
        .iter()
        .map(|(n, _)| format!("{n}.json"))
        .chain(["table.json".into()])
        .collect();
    names.sort();
    assert_eq!(files, names, "fixtures/stress: run `just gen`");
    let s = schema();
    for (name, v) in want {
        assert_eq!(
            read(&dir.join(format!("{name}.json"))),
            v,
            "fixtures/stress/{name}.json: run `just gen`"
        );
        valid(&s, &v).unwrap_or_else(|e| panic!("{name}: {e}"));
        serde_json::from_value::<Block>(v.clone()).unwrap_or_else(|e| panic!("{name}: {e}"));
        assert_eq!(Built::new(v).check(&[]), vec![], "{name}");
    }
}

#[test]
fn a_kind_with_no_stress_row_or_no_why_fails_the_table_check() {
    let table = read(&root().join("fixtures/stress/table.json"));
    let kinds: Vec<&str> = Block::KINDS.iter().copied().chain(["gauge"]).collect();
    assert_eq!(
        stress_rows(&table, &kinds),
        Err("gauge: no row in fixtures/stress/table.json".into())
    );
    let mut quiet = table.clone();
    quiet["secret"].as_object_mut().unwrap().remove("why");
    assert_eq!(
        stress_rows(&quiet, Block::KINDS),
        Err("secret: a variant left out with no why".into())
    );
}

#[test]
fn a_stepper_must_name_its_current_step_or_be_done_and_never_carry_bars() {
    let steps = r#"[{"id": "a", "label": "Stop"}, {"id": "b", "label": "Lines"}]"#;
    let faults = |extra: &str| {
        let b = format!(r#"{{"type": "steps", "id": "x", "steps": {steps}{extra}}}"#);
        let got = Built::new(parse(&format!(r#"{{"type": "screen", "id": "s", "blocks": [{b}]}}"#))).check(&[]);
        got.into_iter()
            .map(|f| match f {
                Fault::Shape { kind, why } => format!("{kind}: {why}"),
                f => format!("{f:?}"),
            })
            .collect::<Vec<_>>()
    };
    assert_eq!(faults(r#", "current": "b""#), Vec::<String>::new());
    assert_eq!(faults(r#", "done": true"#), Vec::<String>::new());
    assert_eq!(faults(""), ["steps: a stepper with neither a current step nor done"]);
    assert_eq!(
        faults(r#", "done": false"#),
        ["steps: a stepper with neither a current step nor done"]
    );
    assert_eq!(
        faults(r#", "current": "z""#),
        ["steps: a stepper whose current names no step"]
    );
    assert_eq!(
        faults(r#", "current": "a", "done": true"#),
        ["steps: a stepper both done and at a current step"]
    );
    assert_eq!(
        faults(r#", "current": "a", "bars": []"#),
        ["steps: a steps block with both steps and bars"]
    );
    let empty = parse(r#"{"type": "screen", "id": "s", "blocks": [{"type": "steps", "id": "x", "steps": []}]}"#);
    assert_eq!(Built::new(empty).check(&[]), vec![]);
}
