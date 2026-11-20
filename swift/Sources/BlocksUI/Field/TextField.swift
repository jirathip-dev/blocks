import Blocks

extension TextField: FieldKind {
    internal var start: JSONValue? { value?.json }
    internal var edit: FieldEdit { .type(secure: false, hint: placeholder, number: keyboard == .number) }

    internal func shown(_ value: JSONValue?, edited: Bool) -> String {
        value?.string ?? value?.number?.formatted() ?? placeholder ?? ""
    }
}
