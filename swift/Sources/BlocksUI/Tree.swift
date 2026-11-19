import Blocks
import SwiftUI

/// A drawn block as the harness collects it: its tree node's fields, its bounds and the action a tap sends.
package struct DrawnBlock {
    package let kind: String
    package let id: String?
    package let variant: String?
    package let native: Bool
    package let hidden: Bool
    package let bounds: Anchor<CGRect>
    package let tap: BlockAction?
    package let children: [DrawnBlock]
}

package struct DrawnBlocks: PreferenceKey {
    package static var defaultValue: [DrawnBlock] { [] }

    package static func reduce(value: inout [DrawnBlock], nextValue: () -> [DrawnBlock]) {
        value.append(contentsOf: nextValue())
    }
}

extension View {
    /// Reports every block drawn under it as `DrawnBlocks`, for the harness.
    package func reportsBlocks() -> some View { environment(\.reportsBlocks, true) }
}

extension EnvironmentValues {
    @Entry internal var reportsBlocks = false
}

internal struct Reported: ViewModifier {
    private static let gaps: Set = ["composer", "prose", "hero", "media", "nav", "island"]
    @Environment(\.reportsBlocks) private var reports
    @Environment(\.appBlocks) private var appBlocks
    internal let block: Block
    internal var hidden = false

    @ViewBuilder
    internal func body(content: Content) -> some View {
        if reports {
            let head = block.head
            let core = AppBlocks.isCore(head.type)
            let native = core ? !Self.gaps.contains(head.type) : appBlocks?.views[head.type] != nil
            let variant = head.variant.flatMap { $0.isEmpty ? nil : $0 }
            let id = head.id.flatMap { $0.isEmpty ? nil : $0 }
            let tap = head.source.sent(block.submit, values: block.fieldValues)
            content.transformAnchorPreference(key: DrawnBlocks.self, value: .bounds) { drawn, bounds in
                drawn = [
                    DrawnBlock(
                        kind: head.type, id: id, variant: variant, native: native, hidden: hidden, bounds: bounds,
                        tap: tap,
                        children: drawn)
                ]
            }
        } else {
            content
        }
    }
}

extension Block {
    internal var type: String { head.type }
    internal var id: String? { head.id }

    fileprivate var head: (type: String, id: String?, variant: String?, source: Source) {
        switch self {
        case .screen(let b): ("screen", b.id, nil, Source())
        case .sheet(let b): ("sheet", b.id, nil, Source())
        case .section(let b): ("section", b.id, nil, Source())
        case .list(let b): ("list", b.id, nil, Source())
        case .row(let b): ("row", b.id, b.style?.rawValue, Source(tap: b.tap))
        case .card(let b): ("card", b.id, b.kind?.rawValue, Source(tap: b.tap))
        case .choice(let b): ("choice", b.id, nil, Source(action: b.action, values: b.values))
        case .form(let b): ("form", b.id, nil, Source(action: b.action))
        case .config(let b): ("config", b.id, nil, Source(action: b.action))
        case .secret(let b): ("secret", b.id, nil, Source(action: b.action, values: b.values))
        case .run(let b): ("run", b.id, nil, Source(action: b.action))
        case .button(let b): ("button", b.id, b.style?.rawValue, Source(action: b.action, tap: b.tap, values: b.values))
        case .chips(let b): ("chips", b.id, nil, Source(action: b.action))
        case .stat(let b): ("stat", b.id, nil, Source())
        case .text(let b): ("text", b.id, b.style?.rawValue, Source())
        case .images(let b): ("images", b.id, b.size?.rawValue, Source())
        case .web(let b): ("web", b.id, nil, Source())
        case .diff(let b): ("diff", b.id, nil, Source())
        case .editor(let b): ("editor", b.id, nil, Source(action: b.action))
        case .scene(let b): ("scene", b.id, nil, Source())
        case .diagram(let b): ("diagram", b.id, nil, Source())
        case .composer(let b): ("composer", b.id, nil, Source(action: b.action, values: b.values))
        case .prose(let b): ("prose", b.id, nil, Source())
        case .hero(let b): ("hero", b.id, nil, Source())
        case .media(let b): ("media", b.id, nil, Source())
        case .nav(let b): ("nav", b.id, nil, Source())
        case .island(let b): ("island", b.id, nil, Source())
        case .appBlock(let b):
            (
                b.type, b.id, nil,
                Source(action: b.string("action"), tap: try? b["tap"]?.decode(Tap.self), values: b["values"]?.fields)
            )
        }
    }

    fileprivate var submit: String? {
        switch self {
        case .form(let form), .config(let form): form.submit?.action
        default: nil
        }
    }

    internal var fieldValues: [String: JSONValue] {
        switch self {
        case .form(let form), .config(let form): form.fieldValues
        case .screen(let b): (b.blocks ?? []).fieldValues
        case .sheet(let b): b.blocks.fieldValues
        case .section(let b): b.blocks.fieldValues
        case .card(let b): (b.blocks ?? []).fieldValues
        default: [:]
        }
    }
}

extension [Block] {
    internal var fieldValues: [String: JSONValue] {
        reduce(into: [:]) { values, block in values.merge(block.fieldValues) { old, _ in old } }
    }
}

extension Blocks.Form {
    internal var fieldValues: [String: JSONValue] {
        fields.reduce(into: [:]) { values, field in
            if let value = field.value { values[field.name] = value.json }
        }
    }
}

extension FieldValue {
    internal var json: JSONValue {
        switch self {
        case .string(let string): .string(string)
        case .number(let number): .number(number)
        case .bool(let bool): .bool(bool)
        }
    }
}
