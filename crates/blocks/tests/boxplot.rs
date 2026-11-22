use blocks::{Block, Built, Fault, Screen};
use serde_json::{json, Value};

fn faults(boxes: &Value) -> Vec<Fault> {
    let v = json!({"type": "boxplot", "id": "p", "title": "Peak force", "axis": "Force", "boxes": boxes});
    Built::new(v).check(&[])
}

fn shape(why: &str) -> Vec<Fault> {
    vec![Fault::Shape {
        kind: "boxplot".into(),
        why: why.into(),
    }]
}

fn five(name: &str, v: [f64; 5]) -> Value {
    json!({"name": name, "min": v[0], "q1": v[1], "median": v[2], "q3": v[3], "max": v[4]})
}

#[test]
fn a_box_out_of_order_fails_its_check_naming_the_box_and_values() {
    let order = "a box needs min ≤ q1 ≤ median ≤ q3 ≤ max";
    let cases = [
        ([30.0, 28.0, 33.0, 36.0, 41.0], "min 30.0 is over the q1 28.0"),
        ([25.8, 38.1, 35.6, 39.0, 43.0], "q1 38.1 is over the median 35.6"),
        ([25.8, 30.4, 37.0, 36.0, 41.2], "median 37.0 is over the q3 36.0"),
        ([25.8, 30.4, 33.1, 42.0, 41.2], "q3 42.0 is over the max 41.2"),
    ];
    for (v, why) in cases {
        assert_eq!(
            faults(&json!([five("Right", v)])),
            shape(&format!("Right: {why}; {order}"))
        );
    }
}

#[test]
fn equal_values_and_outliers_beyond_the_whiskers_pass() {
    let mut beyond = five("Left", [25.8, 30.4, 33.1, 36.0, 41.2]);
    beyond["outliers"] = json!([18.0, 47.5]);
    let boxes = json!([
        five("one rep", [31.0; 5]),
        five("median on Q1", [27.0, 30.0, 30.0, 34.0, 38.0]),
        beyond
    ]);
    assert_eq!(faults(&boxes), vec![]);
}

#[test]
fn an_outlier_within_the_whiskers_or_two_boxes_of_one_name_fail_the_check() {
    let mut inside = five("Left", [25.8, 30.4, 33.1, 36.0, 41.2]);
    inside["outliers"] = json!([18.0, 33.0]);
    assert_eq!(
        faults(&json!([inside])),
        shape("Left: outlier 33.0 is inside min 25.8 to max 41.2; an outlier lies beyond the whiskers")
    );
    let left = five("Left", [25.8, 30.4, 33.1, 36.0, 41.2]);
    assert_eq!(
        faults(&json!([left, left])),
        shape("a box plot with two boxes named Left")
    );
}

#[test]
fn the_sample_has_its_axis_its_spoken_column_and_a_fallback_of_each_median() {
    let hands = blocks::samples().into_iter().find(|(k, _)| *k == "boxplot").unwrap().1;
    let Block::Boxplot(p) = &hands else { panic!("{hands:?}") };
    assert_eq!(p.axis(), Some((10.0, 50.0, 10.0)));
    assert_eq!(
        p.says(&p.boxes[1]),
        "Right: median 35.6 kg, quartiles 32.9 to 38.1, range 28.2 to 43.0, 1 outlier: 21.4"
    );
    let built = Built::of(&Screen::new().id("s").blocks(vec![hands]));
    let fallback = &built.value()["blocks"][0]["fallback"];
    assert_eq!(fallback["title"], "Peak force per hand");
    assert_eq!(fallback["subtitle"], "Left median 33.1 kg, Right median 35.6 kg");
    assert_eq!(built.check(&[]), vec![]);
}
