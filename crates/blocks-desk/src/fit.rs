use blocks::tree::{check, Drawn, Node};

fn who(n: &Node) -> String {
    n.id.as_ref()
        .map_or_else(|| n.kind.clone(), |id| format!("{}#{id}", n.kind))
}

fn over(a: [f64; 4], b: [f64; 4]) -> bool {
    let [ax, ay, aw, ah] = a;
    let [bx, by, bw, bh] = b;
    (ax + aw).min(bx + bw) - ax.max(bx) > 0.5 && (ay + ah).min(by + bh) - ay.max(by) > 0.5
}

fn named(n: &Node, at: &str, out: &mut Vec<String>) {
    let here = format!("{at}/{}", who(n));
    if n.role.is_empty() {
        out.push(format!("{here}: has no role"));
    }
    if n.name.is_empty() {
        out.push(format!("{here}: has no name"));
    }
    n.children.iter().for_each(|c| named(c, &here, out));
}

fn fit(n: &Node, width: f64, at: &str, out: &mut Vec<String>) {
    let here = format!("{at}/{}", who(n));
    let [x, _, w, h] = n.rect.unwrap_or_default();
    if !(w > 0.0 && h > 0.0) {
        out.push(format!("{here}: has no size"));
    }
    if x < -0.5 || x + w > width + 0.5 {
        out.push(format!("{here}: leaves the screen's width"));
    }
    let kids: Vec<&Node> = n.children.iter().filter(|c| c.drawn != Drawn::Hidden).collect();
    for (i, a) in kids.iter().enumerate() {
        for b in kids.iter().skip(i + 1) {
            if over(a.rect.unwrap_or_default(), b.rect.unwrap_or_default()) {
                out.push(format!("{here}: {} overlaps {}", who(a), who(b)));
            }
        }
    }
    for c in kids {
        fit(c, width, &here, out);
    }
}

pub(crate) fn faults(got: &Node, want: &Node, width: f64, at: &str) -> Vec<String> {
    let mut out = check(Some(got), want, at);
    named(got, at, &mut out);
    fit(got, width, at, &mut out);
    out
}
