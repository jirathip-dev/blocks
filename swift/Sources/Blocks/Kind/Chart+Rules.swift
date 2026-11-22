import Foundation

/// What a chart's move grabs, as the crate's `PointGrab`: one point, by its series' name and its x.
public struct PointGrab: Equatable, Sendable {
    public let series: String
    public let at: String

    /// The point of `series` at `at`.
    public init(_ series: String, at: String) {
        self.series = series
        self.at = at
    }
}

/// A reach in whole steps of the grabbed series, as the crate's `PointReach`; up is more.
public struct PointReach: Equatable, Sendable {
    public let steps: Int

    /// A reach of `steps`.
    public init(_ steps: Int) { self.steps = steps }
}

private func round(_ v: Double) -> Double { (v + 0.5).rounded(.down) }

private func nice(_ v: Double) -> Double {
    guard v > 0 else { return 1 }
    let p = pow(10, log10(v).rounded(.down))
    return p * ([1, 2, 2.5, 5].first { v / p <= $0 } ?? 10)
}

private func decimals(_ x: Double) -> Int {
    (0..<6).first { d in
        let v = x * pow(10, Double(d))
        return abs(v - round(v)) < 1e-6
    } ?? 6
}

private func fixed(_ v: Double, _ d: Int) -> String {
    let p = pow(10, Double(d)), n = round(v * p), whole = (n / p).rounded(.down)
    let digits = String(Int(whole))
    var out = ""
    for (i, c) in digits.enumerated() {
        if i > 0, (digits.count - i) % 3 == 0 { out.append(",") }
        out.append(c)
    }
    guard d > 0 else { return out }
    let frac = String(Int(n - whole * p))
    return out + "." + String(repeating: "0", count: max(0, d - frac.count)) + frac
}

extension Chart: Rules {
    /// Whether a series is drawn as a line, as the crate's `Chart::is_line`.
    public func isLine(_ s: Series) -> Bool { chart == .line || (chart == .combo && s.as == .line) }

    /// The value axis, bottom and top, as the crate's `Chart::axis`: a line's spans its values, the others start at zero.
    public var axis: (lo: Double, hi: Double) {
        let all = series.flatMap(\.values)
        if chart == .line {
            guard let lo = all.min(), let hi = all.max() else { return (0, 1) }
            let step = nice(hi > lo ? (hi - lo) / 2 : max(abs(hi), 1) / 2)
            let low = (lo / step).rounded(.down) * step
            var top = max((hi / step).rounded(.up) * step, low + step)
            if Int(((top - low) / step).rounded()) % 2 == 1 { top += step }
            return (low, top)
        }
        let at = { (s: Series, i: Int) in s.values.indices.contains(i) ? s.values[i] : nil }
        let top = x.indices.map { i in
            let bars = series.filter { !isLine($0) }.compactMap { at($0, i) }
            let lines = series.filter(isLine).compactMap { at($0, i) }
            return lines.reduce(chart != .bar ? bars.reduce(0, +) : bars.reduce(0, max), max)
        }
        .reduce(0, max)
        return (0, nice(top * 1.04))
    }

    /// The step a series' point moves by, as the crate's `Chart::step`: its `step`, else what the format shows.
    public func step(_ s: Series) -> Double {
        if let v = s.step, v > 0 { return v }
        return format == .thbM ? 1e5 : format == .percent ? 0.1 : 1
    }

    /// A value at its series' step precision, as the crate's `Chart::shown`: ฿1.35M for a 50K step.
    public func shown(_ s: Series, _ v: Double) -> String {
        let a = abs(v), st = step(s)
        let body =
            switch format {
            case .thbM where a >= 1e6: "฿" + fixed(a / 1e6, max(1, decimals(st / 1e6))) + "M"
            case .thbM where a >= 1e3: "฿" + fixed(a / 1e3, decimals(st / 1e3)) + "K"
            case .thbM, .thb: "฿" + fixed(a, decimals(st))
            case .percent: fixed(a, decimals(st)) + "%"
            default: fixed(a, decimals(st))
            }
        return (v < 0 ? "-" : "") + body
    }

    private func point(_ g: PointGrab) -> (Series, Double)? {
        guard let i = x.firstIndex(of: g.at), let s = series.first(where: { $0.name == g.series }), s.values.indices.contains(i)
        else { return nil }
        return (s, s.values[i])
    }

    private func moved(_ g: PointGrab, _ from: Double, _ by: Int) -> PointMove? {
        guard let (s, _) = point(g) else { return nil }
        let st = step(s), (lo, hi) = axis, k = pow(10, Double(decimals(st)))
        let n = min((hi / st + 1e-9).rounded(.down), max((lo / st - 1e-9).rounded(.up), round(from / st) + Double(by)))
        return PointMove(at: g.at, series: g.series, y: round(n * st * k) / k)
    }

    /// A chart's rules, as the crate's: a grab is a point, a reach whole steps of its series.
    public func word(_ grab: PointGrab) -> Word? {
        guard let (s, _) = point(grab), move != nil, s.fixed != true, [.line, .bar, .combo].contains(chart) else { return nil }
        return .move
    }

    public func start(_ grab: PointGrab) -> PointMove? {
        guard word(grab) != nil, let (_, v) = point(grab) else { return nil }
        return PointMove(at: grab.at, series: grab.series, y: v)
    }

    public func candidate(_ grab: PointGrab, _ reach: PointReach) -> PointMove? {
        guard let s = start(grab) else { return nil }
        return reach.steps == 0 ? s : moved(grab, s.y, reach.steps)
    }

    public func nudge(_ grab: PointGrab, from: PointMove, by: Nudge) -> PointMove? {
        guard word(grab) != nil, by.dir == .up || by.dir == .down else { return nil }
        let next = moved(grab, from.y, (by.dir == .up ? 1 : -1) * (by.big ? 10 : 1))
        return next?.y == from.y ? nil : next
    }

    public func steps(_ grab: PointGrab) -> [(String, Nudge)] {
        guard let s = start(grab) else { return [] }
        return [("Raise", Nudge(.up)), ("Lower", Nudge(.down))].filter { nudge(grab, from: s, by: $0.1) != nil }
    }

    public func says(_ grab: PointGrab, _ change: PointMove) -> String {
        guard let (s, _) = point(grab) else { return "\(change.y)" }
        return "\(s.name): \(shown(s, change.y))"
    }
}
