use std::path::{Path, PathBuf};

use blocks::{ApplyError, Block, Frame, Op, Replica};
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
            return serde_json::to_value(serde_json::from_value::<Frame>(v.clone()).map_err(e)?).map_err(e)
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
    let ops = serde_json::json!({"type": "array", "items": {"$ref": "#/$defs/Op"}});
    match v {
        Value::Array(items) => items.iter().try_for_each(|x| valid(s, x)),
        Value::Object(o) if o.contains_key("type") => check(s, &block, v, "block"),
        Value::Object(o) if o.contains_key("seq") => check(s, s, v, "frame"),
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
        assert!(serde_json::from_value::<Frame>(v).is_err(), "the types take {why}");
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
    let frames: Vec<Frame> =
        serde_json::from_value(read(&root().join("fixtures/screens/cooee/screen-tests-insert.json"))).unwrap();
    let mut replica = Replica::default();
    for f in &frames {
        replica.receive(f).unwrap();
    }
    let screen = serde_json::to_value(replica.screen.unwrap()).unwrap();
    let ids: Vec<&str> = screen["blocks"][0]["rows"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r["id"].as_str().unwrap())
        .collect();
    assert_eq!(ids, ["d", "a", "e", "b", "c"]);
}

#[test]
fn an_op_from_a_newer_server_drops_its_frame_and_asks_for_the_whole_screen() {
    let frames: Vec<Frame> =
        serde_json::from_value(read(&root().join("fixtures/screens/cooee/screen-tests-insert.json"))).unwrap();
    let mut replica = Replica::default();
    replica.receive(&frames[0]).unwrap();
    let before = replica.clone();
    let later: Frame =
        serde_json::from_str(r#"{"seq": 2, "ops": [{"op": "remove", "id": "a"}, {"op": "fold", "id": "l"}]}"#).unwrap();
    assert_eq!(later.ops[1], Op::Unknown);
    assert_eq!(replica.receive(&later), Err(ApplyError::Unknown));
    assert_eq!(replica, before);
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
    let frames: Vec<Frame> = serde_json::from_value(read(&dir.join("screens-as-data-queue-stream.json"))).unwrap();
    for f in &frames {
        blocks::apply(&mut screen, &f.ops).unwrap();
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
