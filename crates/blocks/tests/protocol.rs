use std::path::Path;

use blocks::{Answer, Block, Frame, Have, Hello, MediaType, Mirror, Outdated, Synced, Toast, Tone, Undo};
use serde_json::Value;

fn took<T: std::fmt::Debug>(t: T) -> Value {
    Value::String(format!("{t:?}").to_lowercase())
}

fn run(case: &Value) -> Result<(), String> {
    let v = u8::try_from(case["v"].as_u64().unwrap()).unwrap();
    let mut m = Mirror::new(v);
    for (i, step) in case["steps"].as_array().unwrap().iter().enumerate() {
        let at = |what: &str, got: Value, want: &Value| {
            if &got == want {
                Ok(())
            } else {
                Err(format!("step {i}: {what} {got}, want {want}"))
            }
        };
        if let Some(h) = step.get("hello") {
            let h: Hello = serde_json::from_value(h.clone()).unwrap();
            let out = m.hello(&h).err().map(|o| serde_json::to_value(o).unwrap());
            at("outdated", out.unwrap_or(Value::Null), &step["outdated"])?;
        } else if let Some(k) = step.get("open") {
            m.open(k.as_str().unwrap());
        } else if let Some(k) = step.get("close") {
            m.close(k.as_str().unwrap());
        } else if let Some(want) = step.get("have") {
            at("have", serde_json::to_value(m.have()).unwrap(), want)?;
        } else if let Some(f) = step.get("frame") {
            let f: Frame = serde_json::from_value(f.clone()).unwrap();
            at("took", took(m.frame(f)), &step["took"])?;
        } else if let Some(s) = step.get("synced") {
            let sent: Vec<Have> = serde_json::from_value(step["sent"].clone()).unwrap();
            let s: Synced = serde_json::from_value(s.clone()).unwrap();
            let got = m.synced(&sent, s).into_iter().map(took).collect();
            at("took", Value::Array(got), &step["took"])?;
        } else {
            return Err(format!("step {i}: no such step {step}"));
        }
    }
    for (k, want) in case["screens"].as_object().unwrap() {
        let want: Option<Block> = serde_json::from_value(want.clone()).unwrap();
        if m.screen(k) != want.as_ref() {
            return Err(format!("screen {k}: {:?}, want {want:?}", m.screen(k)));
        }
    }
    Ok(())
}

#[test]
fn the_mirror_runs_every_protocol_fixture() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/protocol");
    let mut n = 0;
    let mut bad = vec![];
    for e in std::fs::read_dir(dir).unwrap() {
        let p = e.unwrap().path();
        let case: Value = serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap();
        n += 1;
        if let Err(e) = run(&case) {
            bad.push(format!("{}: {e}", p.display()));
        }
    }
    assert!(n >= 8, "only {n} protocol fixtures");
    assert!(bad.is_empty(), "{}", bad.join("\n"));
}

#[test]
fn a_media_type_runs_at_the_lower_version_and_refuses_one_more_than_one_apart() {
    let pick = |s: &str| MediaType::pick(s).map(|m| m.to_string());
    let (v1, v2) = (
        Ok("application/vnd.blocks+json;v=1".to_string()),
        Ok("application/vnd.blocks+json;v=2".to_string()),
    );
    assert_eq!(pick("application/vnd.blocks+json;v=1"), v1);
    assert_eq!(pick("text/html, application/vnd.blocks+json; v=2"), v2);
    assert_eq!(pick("application/vnd.blocks+json; v=3"), v2);
    assert_eq!(pick("application/json"), v2);
    assert_eq!(pick(""), v2);
    assert_eq!(pick("application/vnd.blocks+json;v=4"), Err(Outdated::Server));
    assert_eq!(pick("application/vnd.blocks+json;v=0"), Err(Outdated::App));
    assert_eq!(
        pick("application/vnd.blocks+json;v=4, application/vnd.blocks+json;v=1"),
        v1
    );
    let m = MediaType::pick("application/vnd.blocks+json;v=1").unwrap();
    let hello = Hello {
        v: 1,
        sid: "s".into(),
        epoch: "e".into(),
        keys: 16,
    };
    let bytes = m.write(&hello).unwrap();
    assert_eq!(m.read::<Hello>(&bytes).unwrap(), hello);
    assert!(m.read::<Hello>(b"{\"v\": 1}").is_err());
    assert_eq!(Outdated::App.to_string(), "update the app");
}

#[test]
fn an_answers_toast_is_an_object_at_v2_and_its_plain_text_one_version_behind() {
    let undo = Undo {
        action: "unarchive".into(),
        ..Undo::default()
    };
    let answer = |title: &str| Answer {
        toast: Some(Toast::new(title).tone(Tone::Ok).undo(undo.clone())),
        close: true,
        ..Answer::default()
    };
    let at = |v: &str, a: &Answer| {
        let m = MediaType::pick(&format!("application/vnd.blocks+json;v={v}")).unwrap();
        serde_json::from_slice::<Value>(&m.write(a).unwrap()).unwrap()
    };
    let now = at("2", &answer("Archived 3 orders"));
    assert_eq!(
        serde_json::from_value::<Answer>(now.clone()).unwrap(),
        answer("Archived 3 orders")
    );
    assert_eq!(now["toast"]["undo"]["action"], "unarchive");
    let old = at("1", &answer("Archived 3 orders"));
    assert_eq!(
        old,
        serde_json::from_str::<Value>(r#"{"toast": "Archived 3 orders", "close": true}"#).unwrap()
    );
    assert_eq!(at("1", &answer(""))["toast"], "Done");
    assert_eq!(at("1", &Answer::default()), Value::Object(serde_json::Map::new()));
}
