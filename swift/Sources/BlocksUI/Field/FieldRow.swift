import Blocks

/// How a row edits its field: a tap flips it, an alert types it, a dialog picks one of its options, it searches, it lists files, or it scans pages.
internal enum FieldEdit {
    case flip
    case type(secure: Bool, hint: String?, number: Bool)
    case pick([String])
    case search(SearchField)
    #if !os(watchOS)
        case files(UploadField)
        case scan(ScanField)
    #endif
}

/// What one field type gives the row every type shares: its own parts, its start value, its edit and its shown text.
internal protocol FieldKind {
    var name: String { get }
    var label: String? { get }
    var doc: String? { get }
    var was: String? { get }
    var error: String? { get }
    var enabled: Expr? { get }
    var start: JSONValue? { get }
    var edit: FieldEdit { get }
    func shown(_ value: JSONValue?, edited: Bool) -> String
}

extension FieldKind {
    internal func shown(_ value: JSONValue?, edited: Bool) -> String {
        value?.string ?? value?.number?.formatted() ?? ""
    }
}

extension Field {
    internal var kind: any FieldKind {
        switch self {
        case .text(let f): f
        case .toggle(let f): f
        case .picker(let f): f
        case .secret(let f): f
        case .search(let f): f
        #if os(watchOS)
            case .upload(let f): PlainField(json: (try? JSONValue(f)) ?? .null)
            case .scan(let f): PlainField(json: (try? JSONValue(f)) ?? .null)
        #else
            case .upload(let f): f
            case .scan(let f): f
        #endif
        case .otherField(let v): PlainField(json: v)
        }
    }
}

/// A field of a type this renderer has no view for: drawn as a one-line text input.
internal struct PlainField: FieldKind {
    internal let json: JSONValue
    internal var name: String { json.string("name") ?? "" }
    internal var label: String? { json.string("label") }
    internal var doc: String? { json.string("doc") }
    internal var was: String? { json.string("was") }
    internal var error: String? { json.string("error") }
    internal var enabled: Expr? { try? json["enabled"]?.decode(Expr.self) }
    internal var start: JSONValue? { json["value"] }
    internal var edit: FieldEdit { .type(secure: false, hint: json.string("placeholder"), number: false) }

    internal func shown(_ value: JSONValue?, edited: Bool) -> String {
        value?.string ?? value?.number?.formatted() ?? json.string("placeholder") ?? ""
    }
}
