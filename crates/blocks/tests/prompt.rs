use blocks::catalog::Catalog;
use blocks::model::prompt;
use blocks::Block;

fn catalog(name: &str) -> Catalog {
    let path = format!(
        "{}/../../fixtures/evals/catalogs/{name}.json",
        env!("CARGO_MANIFEST_DIR")
    );
    Catalog::read(&std::fs::read_to_string(path).unwrap()).unwrap()
}

fn near(text: &str, measured: usize) {
    let n = text.chars().count();
    assert!(
        n.abs_diff(measured) * 10 <= measured,
        "{n} characters, measured {measured}:\n{text}"
    );
}

#[test]
fn the_prompt_stays_near_the_measured_sizes() {
    near(&prompt(&catalog("say")), 1915);
    near(&prompt(&catalog("ask")), 3394);
    let kinds: Vec<String> = Block::KINDS
        .iter()
        .map(|k| format!("{k:?}: {{\"actions\": [\"a\", \"b\"]}}"))
        .collect();
    let all = Catalog::read(&format!("{{\"name\": \"all\", \"kinds\": {{{}}}}}", kinds.join(", "))).unwrap();
    near(&prompt(&all), 14336);
}

#[test]
fn the_prompt_holds_the_catalogs_kinds_sends_inputs_and_links() {
    let ask = prompt(&catalog("ask"));
    assert!(
        ask.contains("{type: \"button\", label: string, action?: string, confirm?: Confirm,"),
        "{ask}"
    );
    assert!(ask.contains(" sends: \"pick\" | \"open-plan\"\n"), "{ask}");
    assert!(
        ask.contains("\nField = PickerField | TextField | ToggleField\n"),
        "{ask}"
    );
    assert!(ask.contains("\nTextField = {type: \"text\", name: string,"), "{ask}");
    assert!(
        ask.contains("A link may start with: https://. No file is loaded."),
        "{ask}"
    );
    assert!(!ask.contains("{type: \"screen\""), "{ask}");
    assert!(!ask.contains("SecretField"), "{ask}");
    let say = prompt(&catalog("say"));
    assert!(
        say.contains("{type: \"row\", badge?: Label, subtitle?: Toned, title?: string, value?: Shown}"),
        "{say}"
    );
    assert!(!say.contains(" sends: "), "{say}");
}

#[test]
fn a_kind_with_no_actions_is_offered_no_field_that_sends() {
    let c = Catalog::read(r#"{"name": "n", "kinds": {"button": {}}, "media": ["https://img.example/"]}"#).unwrap();
    let text = prompt(&c);
    assert!(text.contains("{type: \"button\", label: string, "), "{text}");
    assert!(!text.contains("action?:"), "{text}");
    assert!(
        text.contains("Write no link. A file may start with: https://img.example/."),
        "{text}"
    );
}

#[test]
fn the_same_catalog_gives_the_same_bytes_and_ends_with_its_example() {
    let a = r#"{"name": "x", "kinds": {"prose": {}, "button": {"actions": ["pick"]}},
        "example": {"blocks": [{"type": "button", "label": "Pro", "action": "pick"}]}}"#;
    let b = r#"{"example": {"blocks": [{"action": "pick", "label": "Pro", "type": "button"}]},
        "kinds": {"button": {"actions": ["pick"]}, "prose": {}}, "name": "x"}"#;
    let text = prompt(&Catalog::read(a).unwrap());
    assert_eq!(text, prompt(&Catalog::read(b).unwrap()));
    assert!(
        text.ends_with("\nFor example:\n{\"blocks\":[{\"action\":\"pick\",\"label\":\"Pro\",\"type\":\"button\"}]}\n"),
        "{text}"
    );
}
