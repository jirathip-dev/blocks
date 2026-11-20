import Blocks

extension SecretField: FieldKind {
    internal var start: JSONValue? { nil }
    internal var edit: FieldEdit { .type(secure: true, hint: nil, number: false) }

    internal func shown(_ value: JSONValue?, edited: Bool) -> String {
        edited ? "••••••••" : set == true ? "set ✓" : ""
    }
}
