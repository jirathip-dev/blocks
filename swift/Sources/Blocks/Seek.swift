/// A list or table a search filters: the search's name and text, and how many of its rows hit, of how many.
public struct Seek: Equatable, Sendable {
    public let name: String
    public let q: String
    public let n: Int
    public let m: Int
}

/// Whether `text` holds every word of `q`, in any case: the rule a search's `filters` keeps a row by.
public func hits(_ text: String, _ q: String) -> Bool {
    let t = text.lowercased()
    return q.lowercased().split(whereSeparator: \.isWhitespace).allSatisfy { t.contains($0) }
}

/// The text a row is matched on: a table row's cells, else a row's title, subtitle and value.
public func said(_ row: JSONValue) -> String {
    func text(_ v: JSONValue?) -> String {
        switch v {
        case .string(let s): s
        case .number(let n): n.rounded() == n ? String(Int(n)) : String(n)
        case .object: text(v?["text"])
        default: ""
        }
    }
    let cells = row["cells"]?.fields
    let parts = cells.map { Array($0.values) } ?? [row["title"], row["subtitle"], row["value"]].compactMap { $0 }
    return parts.map(text).joined(separator: " ")
}

/// Each list or table a search on `screen` filters, by its id, with the search's text in `state`.
public func seeks(_ screen: JSONValue, state: BlockState) -> [String: Seek] {
    var rows: [String: [JSONValue]] = [:]
    var aims: [(String, String)] = []
    func walk(_ v: JSONValue) {
        if ["list", "table"].contains(v.type), let id = v.id { rows[id] = v.list("rows") }
        if ["form", "config"].contains(v.type) {
            for f in v.list("fields") where f.type == "search" {
                if let name = f.string("name"), let id = f.string("filters") { aims.append((name, id)) }
            }
        }
        v.list("blocks").forEach(walk)
    }
    walk(screen)
    var out: [String: Seek] = [:]
    for (name, id) in aims {
        let all = (rows[id] ?? []).filter { $0["group"]?.bool != true }
        let q = state[name]?.json.string ?? ""
        out[id] = Seek(name: name, q: q, n: all.filter { hits(said($0), q) }.count, m: all.count)
    }
    return out
}
