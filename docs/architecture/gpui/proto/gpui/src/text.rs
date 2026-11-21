use std::collections::BTreeMap;

use blocks::{Shown, Time};

pub fn shown(v: &Shown, values: &BTreeMap<String, String>, now: f64) -> String {
    match v {
        Shown::Text(s) => s.clone(),
        Shown::Number(n) => n.to_string(),
        Shown::Get(b) => values.get(&b.get).cloned().unwrap_or_default(),
        Shown::Time(t) => age(t, now),
    }
}

pub fn age(t: &Time, now: f64) -> String {
    let label = t.label.as_deref().unwrap_or_default();
    if let Some(until) = &t.until {
        let left = unix(until).map_or(0.0, |u| ((u - now) / 60.0).round().max(0.0));
        return label.replace("{rel}", &format!("{left:.0}m"));
    }
    let Some(since) = t.since.as_deref().and_then(unix) else {
        return label.into();
    };
    let s = (now - since).max(0.0);
    let per = |d: f64| (s / d).floor();
    if t.label.is_some() {
        let a = match s {
            s if s < 120.0 => format!("{:.0}s", per(1.0)),
            s if s < 7200.0 => format!("{:.0}m", per(60.0)),
            s if s < 172_800.0 => format!("{:.0}h", per(3600.0)),
            _ => format!("{:.0}d", per(86400.0)),
        };
        return label.replace("{}", &a);
    }
    match s {
        s if s < 60.0 => "now".into(),
        s if s < 3600.0 => format!("{:.0}m", per(60.0)),
        s if s < 86400.0 => format!("{:.0}h {:.0}m", per(3600.0), per(60.0) % 60.0),
        _ => format!("{:.0}d", per(86400.0)),
    }
}

fn unix(s: &str) -> Option<f64> {
    let (date, time) = s.split_once('T')?;
    let mut d = date.splitn(3, '-').map(str::parse::<i32>);
    let (y, m, day) = (d.next()?.ok()?, d.next()?.ok()?, d.next()?.ok()?);
    let mut t = time.trim_end_matches('Z').splitn(3, ':').map(str::parse::<f64>);
    let (h, min) = (t.next()?.ok()?, t.next()?.ok()?);
    let sec = t.next().transpose().ok()?.unwrap_or(0.0);
    Some(f64::from(days(y, m, day)) * 86400.0 + h * 3600.0 + min * 60.0 + sec)
}

fn days(y: i32, m: i32, d: i32) -> i32 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (m + 9).rem_euclid(12) + 2) / 5 + d - 1;
    era * 146_097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719_468
}
