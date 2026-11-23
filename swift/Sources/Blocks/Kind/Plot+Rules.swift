import Foundation

/// A tick, as the crate's `PlotTick`: where it sits on its axis, its text, and whether its step is odd.
public struct PlotTick: Codable, Equatable, Sendable {
    public let at: Double
    public let text: String
    public let odd: Bool
}

/// What every renderer draws of a plot, as the crate's `PlotDrawn`: both ranges, their ticks, each series' points to join and latest value, the target's text.
public struct PlotDrawn: Codable, Equatable, Sendable {
    public let x: [Double]
    public let y: [Double]
    public let xTicks: [PlotTick]
    public let yTicks: [PlotTick]
    public let lines: [[Int]]
    public let last: [String]
    public let band: String?
}

private let timeSteps: [Double] = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200]

private func step(_ span: Double, _ most: Double, _ time: Bool) -> Double {
    guard time else { return nice(span / most) }
    return timeSteps.first { span / $0 <= most } ?? 3600 * (span / most / 3600).rounded(.up)
}

private func signed(_ v: Double, _ d: Int) -> String {
    let s = fixed(abs(v), d)
    return v < 0 && s.contains(where: { $0.isNumber && $0 != "0" }) ? "-" + s : s
}

private func clock(_ v: Double, _ hours: Bool) -> String {
    let t = (abs(v) + 0.5).rounded(.down)
    let h = Int((t / 3600).rounded(.down)), m = Int((t.truncatingRemainder(dividingBy: 3600) / 60).rounded(.down))
    let s = Int(t.truncatingRemainder(dividingBy: 60))
    let two = { (n: Int) in n < 10 ? "0\(n)" : "\(n)" }
    let sign = v < 0 && t > 0 ? "-" : ""
    return hours ? "\(sign)\(h):\(two(m)):\(two(s))" : "\(sign)\(h * 60 + m):\(two(s))"
}

private func ticks(_ lo: Double, _ hi: Double, _ st: Double, _ time: Bool) -> [PlotTick] {
    var out: [PlotTick] = []
    var k = (lo / st - 1e-9).rounded(.up)
    while k * st <= hi + 1e-9 {
        let v = k * st
        out.append(PlotTick(at: v, text: time ? clock(v, hi >= 3600) : signed(v, decimals(st)), odd: abs(k.truncatingRemainder(dividingBy: 2)) > 0.5))
        k += 1
    }
    return out
}

private func shown(_ v: Double) -> String { signed(v, min(decimals(v), 2)) }
private func unit(_ text: String, _ u: String) -> String { u.isEmpty ? text : "\(text) \(u)" }

private func first(_ xs: [Double], _ below: (Double) -> Bool) -> Int {
    var (lo, hi) = (0, xs.count)
    while lo < hi {
        let mid = (lo + hi) / 2
        if below(xs[mid]) { lo = mid + 1 } else { hi = mid }
    }
    return lo
}

extension Plot {
    /// The `points` op on this plot, as the crate's `Plot::grow`: drops `drop` points from the named series' front, then adds `x` and `y`; false when it does not fit.
    public mutating func grow(_ op: OpPoints) -> Bool {
        let drop = op.drop ?? 0
        guard let i = series.firstIndex(where: { $0.name == op.series }), drop >= 0, drop <= series[i].x.count,
            op.x.count == op.y.count
        else { return false }
        series[i].x.removeFirst(min(drop, series[i].x.count))
        series[i].y.removeFirst(min(drop, series[i].y.count))
        series[i].x += op.x
        series[i].y += op.y
        return true
    }

    private var xRange: (Double, Double) {
        let held = series.filter { !$0.x.isEmpty }
        let start = held.compactMap(\.x.first).min() ?? .greatestFiniteMagnitude
        let newest = held.compactMap(\.x.last).max() ?? -.greatestFiniteMagnitude
        var (lo, hi): (Double, Double)
        if start > newest {
            (lo, hi) = (0, window ?? 1)
        } else if let w = window {
            (lo, hi) = newest - w < start ? (start, start + w) : (newest - w, newest)
        } else {
            (lo, hi) = (start, newest)
        }
        lo = x?.min ?? lo
        hi = x?.max ?? hi
        return (lo, hi > lo ? hi : lo + 1)
    }

    private static func line(_ s: Trace, _ lo: Double, _ hi: Double) -> [Int] {
        let n = min(s.x.count, s.y.count)
        let a = min(first(s.x) { $0 < lo }, n), b = min(first(s.x) { $0 <= hi }, n)
        let (from, to) = (max(a - 1, 0), min(b + 1, n))
        guard to - from > 2000 else { return from < to ? Array(from..<to) : [] }
        var out: [Int] = []
        var (c, a0, lo0, hi0, z) = (-1.0, 0, 0, 0, 0)
        let add = { (i: Int) in if out.last != i { out.append(i) } }
        let flush = {
            guard c >= 0 else { return }
            add(a0)
            add(min(lo0, hi0))
            add(max(lo0, hi0))
            add(z)
        }
        for i in from..<to {
            let at = min(499, max(0, ((s.x[i] - lo) / (hi - lo) * 500).rounded(.down)))
            if abs(c - at) < 0.5 {
                if s.y[i] < s.y[lo0] { lo0 = i }
                if s.y[i] > s.y[hi0] { hi0 = i }
                z = i
            } else {
                flush()
                (c, a0, lo0, hi0, z) = (at, i, i, i, i)
            }
        }
        flush()
        return out
    }

    private func yRange(_ lines: [[Int]], _ time: Bool) -> ((Double, Double), Double) {
        var (l, h) = (Double.infinity, -Double.infinity)
        let see = { (v: Double) in (l, h) = (Swift.min(l, v), Swift.max(h, v)) }
        for (s, line) in zip(series, lines) { for j in line { see(s.y[j]) } }
        if let t = target { [t.min, t.max].forEach(see) }
        if let p = peak { see(p.y) }
        var (lo, hi) = (0.0, 1.0)
        if l <= h {
            let st = step(h > l ? h - l : 1, 4, time)
            (lo, hi) = ((l / st).rounded(.down) * st, (h / st).rounded(.up) * st)
            if !(hi > lo) { hi = lo + st }
        }
        let (fixedLo, fixedHi) = (y?.min, y?.max)
        lo = fixedLo ?? lo
        hi = fixedHi ?? hi
        if !(hi > lo) { hi = lo + 1 }
        let st = step(hi - lo, 4, time)
        return ((fixedLo != nil ? lo : (lo / st).rounded(.down) * st, fixedHi != nil ? hi : (hi / st).rounded(.up) * st), st)
    }

    /// What every renderer draws, as the crate's `Plot::drawn`.
    public var drawn: PlotDrawn {
        let (xt, yt) = (x?.scale == .time, y?.scale == .time)
        let (xlo, xhi) = xRange
        let lines = series.map { Self.line($0, xlo, xhi) }
        let ((ylo, yhi), ys) = yRange(lines, yt)
        let u = y?.unit ?? ""
        return PlotDrawn(
            x: [xlo, xhi], y: [ylo, yhi], xTicks: ticks(xlo, xhi, step(xhi - xlo, 6, xt), xt), yTicks: ticks(ylo, yhi, ys, yt),
            lines: lines, last: series.map { s in s.y.last.map { unit(shown($0), u) } ?? "" },
            band: target.map { unit("\(shown($0.min))–\(shown($0.max))", u) })
    }
}
