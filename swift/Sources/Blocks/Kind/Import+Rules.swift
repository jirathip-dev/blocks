import Foundation

/// A file to import as read: its header, and each row with its spreadsheet row number.
public struct SheetBook: Equatable, Sendable {
    public var head: [String]
    public var rows: [(n: Int, cells: [String])]
    public var encoding: String

    public static func == (a: Self, b: Self) -> Bool {
        a.head == b.head && a.encoding == b.encoding && a.rows.map(\.n) == b.rows.map(\.n) && a.rows.map(\.cells) == b.rows.map(\.cells)
    }
}

/// One row as the import's columns read it: its typed values and the reason each wrong cell is wrong.
public struct ImportRow: Equatable, Sendable {
    public let n: Int
    public var cells: [String: String] = [:]
    public var values: [String: JSONValue] = [:]
    public var bad: [String: String] = [:]
}

/// The word `key` of the import kind, its `{name}`s filled from `values`.
public func importWord(_ key: String, _ values: [String: String] = [:], thai: Bool = false) -> String {
    let w = fieldWords[key].map { thai ? $0.th : $0.en } ?? key
    return values.reduce(w) { $0.replacingOccurrences(of: "{\($1.key)}", with: $1.value) }
}

private func u16(_ b: [UInt8], _ i: Int) -> Int { i + 1 < b.count ? Int(b[i]) | Int(b[i + 1]) << 8 : 0 }
private func u32(_ b: [UInt8], _ i: Int) -> Int { u16(b, i) | u16(b, i + 2) << 16 }

private func unzip(_ b: [UInt8]) -> [String: Data]? {
    guard var end = Optional(b.count - 22), end >= 0 else { return nil }
    while end >= 0 && u32(b, end) != 0x0605_4b50 { end -= 1 }
    guard end >= 0 else { return nil }
    var out: [String: Data] = [:], i = u32(b, end + 16)
    for _ in 0..<u16(b, end + 10) {
        guard u32(b, i) == 0x0201_4b50 else { return nil }
        let method = u16(b, i + 10), size = u32(b, i + 20), len = u16(b, i + 28), at = u32(b, i + 42)
        let start = at + 30 + u16(b, at + 26) + u16(b, at + 28)
        guard i + 46 + len <= b.count, start + size <= b.count else { return nil }
        let name = String(decoding: b[(i + 46)..<(i + 46 + len)], as: UTF8.self), raw = Data(b[start..<(start + size)])
        out[name] = method == 8 ? (try? (raw as NSData).decompressed(using: .zlib) as Data) : method == 0 ? raw : nil
        i += 46 + len + u16(b, i + 30) + u16(b, i + 32)
    }
    return out
}

private func unxml(_ s: String) -> String {
    var out = s
    for (k, v) in [("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""), ("&apos;", "'"), ("&amp;", "&")] { out = out.replacingOccurrences(of: k, with: v) }
    return out
}

private func all(_ pattern: String, _ s: String) -> [[String]] {
    guard let re = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else { return [] }
    let ns = s as NSString
    return re.matches(in: s, range: NSRange(location: 0, length: ns.length)).map { m in
        (0..<m.numberOfRanges).map { m.range(at: $0).location == NSNotFound ? "" : ns.substring(with: m.range(at: $0)) }
    }
}

private func attr(_ tag: String, _ k: String) -> String? { all("\\b\(k)=\"([^\"]*)\"", tag).first?.last }
private func runs(_ x: String) -> String { unxml(all("<t\\b[^>]*>(.*?)</t>", x.replacingOccurrences(of: "<rPh\\b.*?</rPh>", with: "", options: .regularExpression)).map { $0.last ?? "" }.joined()) }

private func xlsx(_ files: [String: Data], _ pick: Int) -> [(n: Int, cells: [String])]? {
    let get = { (p: String) in files[p].map { String(decoding: $0, as: UTF8.self) } ?? "" }
    let rels = Dictionary(all("<Relationship\\b[^>]*>", get("xl/_rels/workbook.xml.rels")).map { (attr($0[0], "Id") ?? "", attr($0[0], "Target") ?? "") }) { a, _ in a }
    let sheets = all("<sheet\\b[^>]*>", get("xl/workbook.xml"))
    guard sheets.indices.contains(pick), var to = rels[attr(sheets[pick][0], "r:id") ?? ""] else { return nil }
    to = to.hasPrefix("/") ? String(to.dropFirst()) : to
    let shared = all("<si>(.*?)</si>", get("xl/sharedStrings.xml")).map { runs($0.last ?? "") }
    let own = Dictionary(all("<numFmt\\b[^>]*>", get("xl/styles.xml")).map { (attr($0[0], "numFmtId") ?? "", attr($0[0], "formatCode") ?? "") }) { a, _ in a }
    let xfs = all("<cellXfs\\b.*?</cellXfs>", get("xl/styles.xml")).first?.first ?? ""
    let dates = all("<xf\\b[^>]*>", xfs).map { x -> Bool in
        let id = Int(attr(x[0], "numFmtId") ?? "0") ?? 0, code = (own[String(id)] ?? "").replacingOccurrences(of: "\"[^\"]*\"|\\[[^\\]]*\\]", with: "", options: .regularExpression)
        return (14...22).contains(id) || (45...47).contains(id) || code.range(of: "[dyDY]", options: .regularExpression) != nil
    }
    let epoch = Date(timeIntervalSince1970: -2_209_161_600), iso = ISO8601DateFormatter()
    iso.formatOptions = [.withFullDate]
    return all("<row\\b([^>]*)>(.*?)</row>", get(to.hasPrefix("xl/") ? to : "xl/\(to)")).map { r in
        var cells: [String] = []
        for c in all("<c\\b([^>]*?)(?:/>|>(.*?)</c>)", r[2]) {
            let t = attr(c[1], "t"), v = unxml(all("<v>(.*?)</v>", c[2]).first?.last ?? "")
            let col = (attr(c[1], "r") ?? "A").unicodeScalars.filter { $0.value >= 65 && $0.value <= 90 }.reduce(0) { $0 * 26 + Int($1.value) - 64 } - 1
            let style = Int(attr(c[1], "s") ?? "0") ?? 0
            let text = t == "s" ? (Int(v).flatMap { shared.indices.contains($0) ? shared[$0] : nil } ?? "")
                : t == "inlineStr" ? runs(c[2]) : t == nil && !v.isEmpty && dates.indices.contains(style) && dates[style]
                ? iso.string(from: epoch.addingTimeInterval((Double(v) ?? 0).rounded(.down) * 86_400)) : v
            while cells.count <= col { cells.append("") }
            cells[col] = text
        }
        return (Int(attr(r[1], "r") ?? "0") ?? 0, cells)
    }
}

private func csv(_ s: String) -> [(n: Int, cells: [String])] {
    let first = s.prefix { $0 != "\n" && $0 != "\r" }
    let sep = [",", ";", "\t"].max { first.components(separatedBy: $0).count < first.components(separatedBy: $1).count } ?? ","
    var out: [(n: Int, cells: [String])] = [], row: [String] = [], cell = "", quoted = false, n = 1, chars = Array(s), i = 0
    while i <= chars.count {
        let c: Character? = i < chars.count ? chars[i] : nil
        if quoted, c == "\"", i + 1 < chars.count, chars[i + 1] == "\"" { cell.append("\""); i += 1 }
        else if c == "\"", quoted || cell.isEmpty { quoted.toggle() }
        else if quoted, let c { cell.append(c) }
        else if let c, String(c) == sep { row.append(cell); cell = "" }
        else if c == nil || c == "\n" || c == "\r" || c == "\r\n" {
            row.append(cell); out.append((n, row)); n += 1; row = []; cell = ""
            if c == "\r", i + 1 < chars.count, chars[i + 1] == "\n" { i += 1 }
        } else if let c { cell.append(c) }
        i += 1
    }
    return out.filter { $0.cells.contains { !$0.isEmpty } }
}

/// Reads sheet `sheet` of an .xlsx, or a .csv; nil with the reason's word key when it cannot.
public func readSheet(name: String, data: Data, sheet: Int = 0) -> (SheetBook?, String?) {
    let b = [UInt8](data)
    if b.starts(with: [0xD0, 0xCF, 0x11, 0xE0]) { return (nil, "imOld") }
    var lines: [(n: Int, cells: [String])], enc = ""
    if b.starts(with: [0x50, 0x4B]) {
        guard let files = unzip(b), let got = xlsx(files, sheet) else { return (nil, "imNotSheet") }
        lines = got
    } else if name.lowercased().hasSuffix(".csv") {
        let thai = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(CFStringEncoding(CFStringEncodings.dosThai.rawValue)))
        let utf = String(bytes: b, encoding: .utf8)
        enc = utf == nil ? "Windows-874" : "UTF-8"
        let s = utf ?? String(bytes: b, encoding: thai) ?? ""
        lines = csv(s.hasPrefix("\u{FEFF}") ? String(s.dropFirst()) : s)
    } else { return (nil, "imNotSheet") }
    guard let at = lines.firstIndex(where: { $0.cells.contains { !$0.trimmingCharacters(in: .whitespaces).isEmpty } }) else { return (nil, "imNoRows") }
    return (SheetBook(head: lines[at].cells.map { $0.trimmingCharacters(in: .whitespaces) }, rows: Array(lines[(at + 1)...]), encoding: enc), nil)
}

private func norm(_ s: String) -> String { s.trimmingCharacters(in: .whitespaces).lowercased().split(separator: " ").joined(separator: " ") }

/// Each column's header index (by label, key or an `also` name), or -1.
public func matchColumns(_ cols: [ImportColumn], _ head: [String]) -> [String: Int] {
    Dictionary(cols.map { c in (c.key, head.firstIndex { h in ([c.label, c.key] + (c.also ?? [])).contains { norm($0) == norm(h) } } ?? -1) }) { a, _ in a }
}

private func typed(_ c: ImportColumn, _ s: String) -> Result<JSONValue, ImportWhy> {
    switch c.type?.rawValue {
    case "number", "money":
        let t = s.replacingOccurrences(of: "[\\s,฿$€£]", with: "", options: .regularExpression)
        guard t.range(of: "^-?\\d+(\\.\\d+)?$", options: .regularExpression) != nil, let d = Double(t) else { return .failure(ImportWhy("imNotNum", ["v": s])) }
        return .success(.number(d))
    case "date":
        let p = s.split(whereSeparator: { "-/.".contains($0) }).compactMap { Int($0) }
        guard p.count == 3 else { return .failure(ImportWhy("imNotDate", ["v": s])) }
        let (y, m, d) = p[0] > 31 ? (p[0], p[1], p[2]) : (p[2], p[1], p[0])
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC") ?? .current
        let parts = DateComponents(year: y > 2400 ? y - 543 : y, month: m, day: d)
        guard parts.isValidDate(in: cal) else { return .failure(ImportWhy("imNotDate", ["v": s])) }
        return .success(.string(String(format: "%04d-%02d-%02d", y > 2400 ? y - 543 : y, m, d)))
    default:
        let one = c.values?.first { norm($0) == norm(s) }
        if c.type?.rawValue == "choice", let vs = c.values, one == nil { return .failure(ImportWhy("imNotOne", ["v": s, "list": vs.joined(separator: ", ")])) }
        return .success(.string(one ?? s))
    }
}

private struct ImportWhy: Error {
    let key: String
    let values: [String: String]
    init(_ key: String, _ values: [String: String]) { self.key = key; self.values = values }
}

/// The rows as the columns read them, with the app's refused rows marked too.
public func checkRows(_ cols: [ImportColumn], _ map: [String: Int], _ book: SheetBook, refused: [Refused] = [], thai: Bool = false) -> [ImportRow] {
    var seen: [String: Int] = [:]
    return book.rows.map { l in
        var r = ImportRow(n: l.n)
        for c in cols {
            let at = map[c.key] ?? -1, s = (at >= 0 && at < l.cells.count ? l.cells[at] : "").trimmingCharacters(in: .whitespaces)
            r.cells[c.key] = s
            guard !s.isEmpty else {
                if c.required == true { r.bad[c.key] = importWord("imReq", thai: thai) }
                continue
            }
            switch typed(c, s) {
            case .success(let v): r.values[c.key] = v
            case .failure(let why): r.bad[c.key] = importWord(why.key, why.values, thai: thai)
            }
            let k = "\(c.key)\n\(norm(s))"
            if c.unique == true, let n = seen[k] { r.bad[c.key] = importWord("imTwice", ["v": s, "n": String(n)], thai: thai) }
            else if c.unique == true { seen[k] = l.n }
        }
        for x in refused where Int(x.row) == l.n { r.bad[x.key] = x.text }
        return r
    }
}
