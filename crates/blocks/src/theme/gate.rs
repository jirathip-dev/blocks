use std::f64::consts::PI;

use serde::Serialize;

use super::{Fills, Hex, Scheme};

type Rgb = [f64; 3];

/// One check a scheme fails: what is measured, its value and the minimum.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Miss {
    pub what: String,
    pub got: f64,
    pub min: f64,
}

fn lin(c: f64) -> f64 {
    let c = c / 255.0;
    if c <= 0.040_45 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

fn lum([r, g, b]: Rgb) -> f64 {
    0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

fn ratio(a: Rgb, b: Rgb) -> f64 {
    let (x, y) = (lum(a), lum(b));
    (x.max(y) + 0.05) / (x.min(y) + 0.05)
}

fn over([r, g, b]: Rgb, [br, bg, bb]: Rgb, p: f64) -> Rgb {
    let mix = |x: f64, y: f64| x * p + y * (1.0 - p);
    [mix(r, br), mix(g, bg), mix(b, bb)]
}

fn lab(rgb: Rgb) -> Rgb {
    let [r, g, b] = rgb.map(lin);
    let [cx, cy, cz] = [
        [0.4124, 0.3576, 0.1805],
        [0.2126, 0.7152, 0.0722],
        [0.0193, 0.1192, 0.9505],
    ]
    .map(|[x, y, z]| x * r + y * g + z * b);
    let curve = |t: f64| {
        if t > 216.0 / 24389.0 {
            t.cbrt()
        } else {
            (24389.0 / 27.0 * t + 16.0) / 116.0
        }
    };
    let (fx, fy, fz) = (curve(cx / 0.950_47), curve(cy), curve(cz / 1.088_83));
    [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)]
}

fn de(c1: Rgb, c2: Rgb) -> f64 {
    let ([l1, a1, b1], [l2, a2, b2]) = (lab(c1), lab(c2));
    let rad = PI / 180.0;
    let c = f64::midpoint(a1.hypot(b1), a2.hypot(b2));
    let g = 0.5 * (1.0 - (c.powi(7) / (c.powi(7) + 25f64.powi(7))).sqrt());
    let (ap1, ap2) = (a1 * (1.0 + g), a2 * (1.0 + g));
    let (cp1, cp2) = (ap1.hypot(b1), ap2.hypot(b2));
    let h = |b: f64, a: f64| {
        let v = b.atan2(a) / rad;
        if v < 0.0 {
            v + 360.0
        } else {
            v
        }
    };
    let (h1, h2, dl, dc) = (h(b1, ap1), h(b2, ap2), l2 - l1, cp2 - cp1);
    let dh = if cp1 * cp2 == 0.0 {
        0.0
    } else if h2 - h1 > 180.0 {
        h2 - h1 - 360.0
    } else if h2 - h1 < -180.0 {
        h2 - h1 + 360.0
    } else {
        h2 - h1
    };
    let d_h = 2.0 * (cp1 * cp2).sqrt() * (dh * rad / 2.0).sin();
    let (lm, cm) = (f64::midpoint(l1, l2), f64::midpoint(cp1, cp2));
    let hm = if cp1 * cp2 == 0.0 {
        h1 + h2
    } else if (h1 - h2).abs() > 180.0 {
        (h1 + h2 + 360.0) / 2.0
    } else {
        f64::midpoint(h1, h2)
    };
    let t =
        1.0 - 0.17 * ((hm - 30.0) * rad).cos() + 0.24 * (2.0 * hm * rad).cos() + 0.32 * ((3.0 * hm + 6.0) * rad).cos()
            - 0.2 * ((4.0 * hm - 63.0) * rad).cos();
    let sl = 1.0 + 0.015 * (lm - 50.0).powi(2) / (20.0 + (lm - 50.0).powi(2)).sqrt();
    let (sc, sh) = (1.0 + 0.045 * cm, 1.0 + 0.015 * cm * t);
    let rt = -2.0
        * (cm.powi(7) / (cm.powi(7) + 25f64.powi(7))).sqrt()
        * (60.0 * (-((hm - 275.0) / 25.0).powi(2)).exp() * rad).sin();
    ((dl / sl).powi(2) + (dc / sc).powi(2) + (d_h / sh).powi(2) + rt * (dc / sc) * (d_h / sh)).sqrt()
}

/// The contrast gate (text 4.5:1, state colours 3:1, ΔE2000 20 apart) for a style's fills: the misses, empty when it passes.
pub fn gate(s: &Scheme, fills: Fills) -> Vec<Miss> {
    let all = s.tokens.all();
    let c = |k: &str| {
        all.iter()
            .find(|(name, _)| *name == k)
            .map(|(_, v)| Hex::rgb(v))
            .unwrap_or_default()
    };
    let mut checks: Vec<(String, f64, f64)> = Vec::new();
    let (bg, r, a) = (c("--bg"), c("--r"), c("--a"));
    let needs = ("the needs-you card", over(r, bg, 0.15));
    let tints = [
        needs,
        ("a red group header", over(r, bg, 0.12)),
        ("an amber group header", over(a, bg, 0.12)),
    ];
    for b in ["--bg", "--card"] {
        for k in [
            "--fg", "--mute", "--l", "--link", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a",
        ] {
            checks.push((format!("{k} on {b}"), ratio(c(k), c(b)), 4.5));
        }
        for k in ["--g", "--a", "--r"] {
            checks.push((format!("{k} on {b}"), ratio(c(k), c(b)), 3.0));
        }
    }
    checks.push(("--bg on --l".to_owned(), ratio(bg, c("--l")), 4.5));
    if fills == Fills::Solid {
        for k in ["--link", "--g", "--a", "--r", "--p", "--c"] {
            checks.push((format!("--bg on {k}"), ratio(bg, c(k)), 4.5));
        }
    }
    for k in ["--fg", "--mute", "--l"] {
        checks.push((format!("{k} on {}", needs.0), ratio(c(k), needs.1), 4.5));
    }
    for (k, (on, tint)) in ["--r", "--r", "--a"].into_iter().zip(tints) {
        checks.push((format!("{k} on {on}"), ratio(c(k), tint), 3.0));
    }
    let mut pairs = vec![("--g", "--a"), ("--a", "--r"), ("--g", "--r")];
    for x in ["--l", "--link"] {
        pairs.extend(["--g", "--a", "--r"].map(|y| (x, y)));
    }
    for (x, y) in pairs {
        checks.push((format!("ΔE2000 {x} ↔ {y}"), de(c(x), c(y)), 20.0));
    }
    checks
        .into_iter()
        .filter(|(_, got, min)| got < min)
        .map(|(what, got, min)| Miss { what, got, min })
        .collect()
}
