import Foundation

private let named: [(String, Nudge)] = [
    ("Move up", Nudge(.up)), ("Move down", Nudge(.down)), ("Move to top", Nudge(.up, big: true)),
    ("Move to bottom", Nudge(.down, big: true)),
]

private func moved(_ ids: [String], _ id: String, to: Int) -> [String]? {
    guard ids.contains(id) else { return nil }
    var out = ids.filter { $0 != id }
    out.insert(id, at: min(max(to, 0), out.count))
    return out
}

extension List: Rules {
    private var order: [String] { rows.compactMap { (try? JSONValue($0))?.id } }

    private func row(_ id: String) -> Row? {
        rows.lazy.compactMap { if case .row(let r) = $0, r.id == id { r } else { nil } }.first
    }

    /// A list's reorder rules, as the crate's: a grab is a row id, a reach a number of places.
    public func word(_ grab: String) -> Word? { reorder != nil && row(grab)?.handle == true ? .reorder : nil }

    public func start(_ grab: String) -> [String]? { word(grab).map { _ in order } }

    public func candidate(_ grab: String, _ reach: Int) -> [String]? {
        guard let ids = start(grab), let at = ids.firstIndex(of: grab) else { return nil }
        return moved(ids, grab, to: at + reach)
    }

    public func nudge(_ grab: String, from: [String], by: Nudge) -> [String]? {
        guard word(grab) != nil, let at = from.firstIndex(of: grab) else { return nil }
        let last = from.count - 1
        switch by.dir {
        case .up: return at == 0 ? nil : moved(from, grab, to: by.big ? 0 : at - 1)
        case .down: return at == last ? nil : moved(from, grab, to: by.big ? last : at + 1)
        case .left, .right: return nil
        }
    }

    public func steps(_ grab: String) -> [(String, Nudge)] {
        guard let s = start(grab) else { return [] }
        return named.filter { nudge(grab, from: s, by: $0.1) != nil }
    }

    public func says(_ grab: String, _ change: [String]) -> String {
        "\(row(grab)?.title ?? grab), \((change.firstIndex(of: grab) ?? -1) + 1) of \(change.count)"
    }
}
