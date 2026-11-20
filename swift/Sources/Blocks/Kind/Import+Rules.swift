import Foundation

extension Import {
    /// The server's read when it is of the file with `id`.
    public func read(of id: String) -> ImportSheet? { sheet?.file.id == id ? sheet : nil }

    /// The rows left out: the ones the app refused at import, then the server's bad rows.
    public var bad: [ImportRow] { sheet == nil ? [] : (refused ?? []) + (sheet?.bad ?? []) }

    /// How many rows an import takes: the file's rows but the bad ones.
    public var good: Int { max(0, Int(sheet?.file.rows ?? 0) - bad.count) }

    /// The first required column the server's match leaves without a header.
    public var missing: ImportColumn? { columns.first { $0.required == true && (sheet?.map[$0.key] ?? "").isEmpty } }

    /// What the read and the import send: the file's id, its sheet and the match; the same file sends the same values.
    public func values(file: String) -> [String: JSONValue] {
        let ours = read(of: file)
        return [
            "file": .string(file), "sheet": ours?.file.sheet.map(JSONValue.string) ?? .null,
            "map": .object((ours?.map ?? [:]).mapValues(JSONValue.string)),
        ]
    }
}
