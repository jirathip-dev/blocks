pub fn report(toolkit: &str, case: &str, size: (u32, u32), ms: &[f64]) {
    let mut sorted = ms.to_vec();
    sorted.sort_by(f64::total_cmp);
    let at = |q: f64| {
        let i = ((sorted.len().saturating_sub(1)) as f64 * q).round() as usize;
        sorted.get(i).copied().unwrap_or(0.0)
    };
    let over = sorted.iter().filter(|m| **m > 1000.0 / 60.0).count();
    println!(
        "{{\"toolkit\":\"{toolkit}\",\"case\":\"{case}\",\"size\":\"{}x{}\",\"frames\":{},\"median_ms\":{:.3},\"p95_ms\":{:.3},\"max_ms\":{:.3},\"over_16_7_ms\":{over}}}",
        size.0,
        size.1,
        sorted.len(),
        at(0.5),
        at(0.95),
        at(1.0),
    );
}

pub fn size(arg: Option<&str>) -> (u32, u32) {
    arg.and_then(|s| s.split_once('x'))
        .and_then(|(w, h)| Some((w.parse().ok()?, h.parse().ok()?)))
        .unwrap_or((1440, 900))
}
