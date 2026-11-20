import Foundation

extension FileRef {
    /// A file the app's handler answers with: its id, and the name and picture the row shows.
    public init(_ id: String, name: String? = nil, src: String? = nil) { self.init(id: id, name: name, src: src) }
}

/// One file row of an upload field; a refused one never reached the handler.
public struct FileRow: Equatable, Sendable {
    /// Where the file is: held by the app, uploading (0 to 1), failed, or refused for its size or its type.
    public enum State: Equatable, Sendable { case done(FileRef), uploading(Double), failed, refused(size: Bool) }

    public let key: String
    public var name: String
    public var size: UInt64
    public var mime: String
    public var state: State

    public init(key: String, name: String, size: UInt64, mime: String, state: State = .uploading(0)) {
        (self.key, self.name, self.size, self.mime, self.state) = (key, name, size, mime, state)
    }

    public var refused: Bool { if case .refused = state { true } else { false } }
}

/// A field word in English, with each `{key}` filled from `values`.
public func fieldWord(_ key: String, _ values: [String: String] = [:]) -> String {
    values.reduce(fieldWords[key]?.en ?? key) { $0.replacingOccurrences(of: "{\($1.key)}", with: $1.value) }
}

/// A size as the status line draws it: "320 KB", "14.2 MB".
public func sized(_ n: UInt64) -> String {
    let kb = Double(n) / 1024
    return kb >= 1024 ? String(format: "%.1f MB", kb / 1024) : "\(max(1, Int(kb.rounded())))" + " KB"
}

private func takes(_ kind: Accept, _ name: String, _ mime: String) -> Bool {
    let ends = { (tails: [String]) in tails.contains { name.lowercased().hasSuffix($0) } }
    switch kind {
    case .image: return mime.hasPrefix("image/")
    case .pdf: return mime == "application/pdf" || ends([".pdf"])
    case .sheet: return mime == "text/csv" || mime.hasSuffix("spreadsheetml.sheet") || ends([".csv", ".xlsx"])
    default: return mime == kind.rawValue
    }
}

extension UploadField {
    private var kinds: String { (accept ?? []).map { fieldWord($0.rawValue) }.joined(separator: fieldWord("or")) }

    /// The rows the field starts with: each of its `files`, done.
    public var held: [FileRow] {
        (files ?? []).map { FileRow(key: $0.id, name: $0.name ?? $0.id, size: 0, mime: "", state: .done($0)) }
    }

    /// Where a picked file starts: refused for its type or over `mb` before the handler, else uploading.
    public func checked(_ name: String, mime: String, size: UInt64) -> FileRow.State {
        if let kinds = accept, !kinds.isEmpty, !kinds.contains(where: { takes($0, name, mime) }) { return .refused(size: false) }
        if let mb, size > UInt64(mb) * 1_048_576 { return .refused(size: true) }
        return .uploading(0)
    }

    /// The rows after picking `fresh`: a pick drops the refused rows, and without `many` its first file replaces them all.
    public func picked(_ rows: [FileRow], _ fresh: [FileRow]) -> [FileRow] {
        let keep = many == true ? rows.filter { !$0.refused } : []
        return keep + fresh.prefix(many == true ? fresh.count : 1).map { r in
            var r = r
            r.state = checked(r.name, mime: r.mime, size: r.size)
            return r
        }
    }

    /// A row's status line: its size, its progress, failed, or why it was refused.
    public func status(_ r: FileRow) -> String {
        switch r.state {
        case .uploading(let part): fieldWord("uploading", ["p": "\(Int((part * 100).rounded()))"])
        case .failed: "\(fieldWord("failed")) · \(sized(r.size))"
        case .refused(size: true): fieldWord("tooBig", ["size": sized(r.size), "mb": "\(mb ?? 0)"])
        case .refused: fieldWord("onlyType", ["types": kinds])
        case .done: r.size > 0 ? sized(r.size) : ""
        }
    }

    /// The hint beside the pick button: the kinds it takes and the size limit, or that uploads are off.
    public func hint(on: Bool) -> String {
        guard on else { return fieldWord("off") }
        let limit = mb.map { fieldWord(many == true ? "each" : "upTo", ["mb": "\($0)"]) } ?? ""
        return [kinds, limit].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    /// The pick button's word: replace a held file, else add or choose photos or files.
    public func pick(_ rows: [FileRow]) -> String {
        if many != true, rows.contains(where: { !$0.refused }) { return fieldWord("replace") }
        let image = !(accept ?? []).isEmpty && (accept ?? []).allSatisfy { $0 == .image }
        return fieldWord("\(image ? "photo" : "file")\(many == true ? "N" : "1")")
    }
}

extension [FileRow] {
    /// The ids an upload sends: each done file's.
    public var ids: [String] { compactMap { if case .done(let f) = $0.state { f.id } else { nil } } }

    /// Why the form's submit waits, as the line under it says: a file failed or is uploading; nil when none is.
    public var waits: String? {
        if contains(where: { $0.state == .failed }) { return fieldWord("stuck") }
        let up = count { if case .uploading = $0.state { true } else { false } }
        return up > 0 ? fieldWord(up == 1 ? "wait1" : "waitN", ["n": "\(up)"]) : nil
    }
}
