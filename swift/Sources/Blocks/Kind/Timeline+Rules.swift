import Foundation

/// What a timeline's gesture grabs, as the crate's `BarGrab`: a bar's part, or a row to draw on.
public enum BarGrab: Equatable, Sendable {
    /// The part of a bar a grab holds: its body moves it, an end stretches it.
    public enum Part: String, Sendable { case body, start, end }
    case bar(String, Part)
    case row(String)
}

/// A reach in whole days, as the crate's `Days`; a draw's starts at `from`, else at the row's first free day.
public struct Days: Equatable, Sendable {
    public let days: Int
    public let from: String?

    /// A reach of `days`, from `from` for a draw.
    public init(_ days: Int, from: String? = nil) {
        self.days = days
        self.from = from
    }
}

private let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

private let named: [(BarGrab.Part, String, Nudge)] = [
    (.body, "One day earlier", Nudge(.left)), (.body, "One day later", Nudge(.right)),
    (.body, "One week earlier", Nudge(.left, big: true)), (.body, "One week later", Nudge(.right, big: true)),
    (.start, "Start one day earlier", Nudge(.left)), (.start, "Start one day later", Nudge(.right)),
    (.end, "End one day earlier", Nudge(.left)), (.end, "End one day later", Nudge(.right)),
]

/// A day number as its year, month (1 to 12) and day of the month.
public func civil(_ n: Int) -> (year: Int, month: Int, day: Int) {
    let z = n + 719_468
    let era = (z >= 0 ? z : z - 146_096) / 146_097
    let doe = z - era * 146_097
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    let mp = (5 * doy + 2) / 153
    let m = mp < 10 ? mp + 3 : mp - 9
    return (yoe + era * 400 + (m <= 2 ? 1 : 0), m, doy - (153 * mp + 2) / 5 + 1)
}

/// A day number as its ISO day.
public func isoDay(_ n: Int) -> String {
    let (y, m, d) = civil(n)
    return String(format: "%04d-%02d-%02d", y, m, d)
}

/// An ISO day as a day number from 1970-01-01; nil unless it is a real `YYYY-MM-DD`.
public func dayNumber(_ s: String) -> Int? {
    let p = s.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return nil }
    let y = p[1] <= 2 ? p[0] - 1 : p[0]
    let era = (y >= 0 ? y : y - 399) / 400
    let yoe = y - era * 400
    let doy = (153 * ((p[1] + 9) % 12) + 2) / 5 + p[2] - 1
    let n = era * 146_097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719_468
    return isoDay(n) == s ? n : nil
}

/// The words for a span of days: "6 Dec to 8 Dec, 3 days".
public func dayWords(_ start: String, _ end: String) -> String {
    guard let a = dayNumber(start), let b = dayNumber(end) else { return "\(start) to \(end)" }
    let short = { (n: Int) in "\(civil(n).day) \(months[civil(n).month - 1])" }
    let k = b - a + 1
    return "\(a == b ? short(a) : "\(short(a)) to \(short(b))"), \(k) \(k == 1 ? "day" : "days")"
}

private func covers(_ b: TimeBar, _ a: Int, _ z: Int) -> Bool {
    guard let s = dayNumber(b.start), let e = dayNumber(b.end) else { return false }
    return s <= z && e >= a
}

extension Timeline: Rules {
    private var range: (Int, Int)? { dayNumber(from).flatMap { f in dayNumber(to).map { (f, $0) } } }

    private func track(_ id: String) -> TimeRow? { tracks.first { $0.id == id } }

    private func bar(_ id: String) -> (TimeRow, TimeBar)? {
        for r in tracks { if let b = r.bars.first(where: { $0.id == id }) { return (r, b) } }
        return nil
    }

    /// The first day of `r` no bar covers; nil when every day is taken.
    public func firstFree(_ r: TimeRow) -> Int? {
        guard let (f, t) = range, f <= t else { return nil }
        return (f...t).first { d in !r.bars.contains { covers($0, d, d) } }
    }

    private func fits(_ grab: BarGrab, _ a: Int, _ b: Int) -> DaySpan? {
        guard let (f, t) = range, a <= b else { return nil }
        switch grab {
        case .row(let row):
            guard let r = track(row), a >= f, b <= t, !r.bars.contains(where: { covers($0, a, b) }) else { return nil }
            return DaySpan(end: isoDay(b), id: nil, row: row, start: isoDay(a))
        case .bar(let id, _):
            guard let (r, x) = bar(id), let s = dayNumber(x.start), let e = dayNumber(x.end) else { return nil }
            let past = (a != s && a < f) || (b != e && b > t)
            let onto = r.bars.contains { $0.id != id && $0.fixed == true && covers($0, a, b) }
            return past || onto ? nil : DaySpan(end: isoDay(b), id: id, row: nil, start: isoDay(a))
        }
    }

    private func edit(_ grab: BarGrab, _ from: DaySpan, _ by: Int) -> DaySpan? {
        guard let a = dayNumber(from.start), let b = dayNumber(from.end) else { return nil }
        switch grab {
        case .row: return by >= 0 ? fits(grab, a, a + by) : fits(grab, a + by, a)
        case .bar(_, .body): return fits(grab, a + by, b + by)
        case .bar(_, .start): return fits(grab, min(a + by, b), b)
        case .bar(_, .end): return fits(grab, a, max(b + by, a))
        }
    }

    /// A timeline's rules, as the crate's: a grab is a bar's part or a row, a reach whole days.
    public func word(_ grab: BarGrab) -> Word? {
        switch grab {
        case .row(let row):
            return draw != nil && track(row).flatMap(firstFree) != nil ? .draw : nil
        case .bar(let id, let part):
            guard let (_, x) = bar(id), x.fixed != true, dayNumber(x.start) != nil, dayNumber(x.end) != nil else { return nil }
            return part == .body ? (move != nil ? .move : nil) : (stretch != nil ? .stretch : nil)
        }
    }

    public func start(_ grab: BarGrab) -> DaySpan? {
        guard word(grab) != nil else { return nil }
        switch grab {
        case .bar(let id, _): return bar(id).map { DaySpan(end: $0.1.end, id: $0.1.id, row: nil, start: $0.1.start) }
        case .row(let row): return track(row).flatMap(firstFree).map { DaySpan(end: isoDay($0), id: nil, row: nil, start: isoDay($0)) }
        }
    }

    public func candidate(_ grab: BarGrab, _ reach: Days) -> DaySpan? {
        guard let s = start(grab) else { return nil }
        if case .row = grab, let f = reach.from { return edit(grab, DaySpan(end: f, id: nil, row: nil, start: f), reach.days) }
        return edit(grab, s, reach.days)
    }

    public func nudge(_ grab: BarGrab, from: DaySpan, by: Nudge) -> DaySpan? {
        let step = by.big ? 7 : 1
        let n: Int
        switch by.dir {
        case .left: n = -step
        case .right: n = step
        case .up, .down: return nil
        }
        let next: DaySpan?
        switch grab {
        case .row where from.row == nil: next = edit(grab, from, min(abs(n) - 1, 6))
        case .row:
            guard let a = dayNumber(from.start), let b = dayNumber(from.end) else { return nil }
            next = fits(grab, a, max(b + n, a))
        case .bar: next = edit(grab, from, n)
        }
        return next == from ? nil : next
    }

    public func steps(_ grab: BarGrab) -> [(String, Nudge)] {
        guard let s = start(grab) else { return [] }
        switch grab {
        case .row: return [("Add a bar", Nudge(.right))]
        case .bar(_, let part):
            return named.filter { $0.0 == part && nudge(grab, from: s, by: $0.2) != nil }.map { ($0.1, $0.2) }
        }
    }

    public func says(_ grab: BarGrab, _ change: DaySpan) -> String { dayWords(change.start, change.end) }
}
