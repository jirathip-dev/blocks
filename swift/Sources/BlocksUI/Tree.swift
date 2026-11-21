import Blocks
import SwiftUI

/// A drawn block as the harness collects it: its tree node's fields, its bounds and the action a tap sends.
package struct DrawnBlock {
    package let kind: String
    package let id: String?
    package let variant: String?
    package let native: Bool
    package let hidden: Bool
    package let role: String
    package let name: String
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
    private static let gaps: Set = ["composer", "prose", "hero", "media", "nav"]
    @Environment(\.reportsBlocks) private var reports
    @Environment(\.appBlocks) private var appBlocks
    @Environment(\.islands) private var islands
    internal let block: Block
    internal var hidden = false

    @ViewBuilder
    internal func body(content: Content) -> some View {
        let (role, name) = block.a11y
        let shown = Group {
            if role == "button" || role == "link" {
                content.accessibilityElement(children: .combine).accessibilityAddTraits(role == "link" ? .isLink : .isButton)
            } else {
                content.accessibilityElement(children: .contain)
            }
        }
        .accessibilityLabel(Text(name)).accessibilityHidden(hidden)
        if reports {
            let head = block.head
            let core = AppBlocks.isCore(head.type)
            let native =
                if case .island(let island) = block { islands[island.name] != nil } else {
                    core ? !Self.gaps.contains(head.type) : appBlocks?.views[head.type] != nil
                }
            let variant = head.variant.flatMap { $0.isEmpty ? nil : $0 }
            let id = head.id.flatMap { $0.isEmpty ? nil : $0 }
            let tap = head.source.sent(block.submit, values: block.fieldValues)
            shown.transformAnchorPreference(key: DrawnBlocks.self, value: .bounds) { drawn, bounds in
                drawn = [
                    DrawnBlock(
                        kind: head.type, id: id, variant: variant, native: native, hidden: hidden, role: role, name: name,
                        bounds: bounds, tap: tap, children: drawn)
                ]
            }
        } else {
            shown
        }
    }
}

extension Block {
    internal var type: String { head.type }
    internal var id: String? { head.id }

    fileprivate var head: (type: String, id: String?, variant: String?, source: Source) {
        switch self {
        case .row(let b): ("row", b.id, b.style?.rawValue, Source(tap: b.tap))
        case .card(let b): ("card", b.id, b.kind?.rawValue, Source(tap: b.tap))
        case .choice(let b): ("choice", b.id, nil, Source(action: b.action, values: b.values))
        case .form(let b): ("form", b.id, nil, Source(action: b.action))
        case .config(let b): ("config", b.id, nil, Source(action: b.action))
        case .secret(let b): ("secret", b.id, nil, Source(action: b.action, values: b.values))
        case .run(let b): ("run", b.id, nil, Source(action: b.action))
        case .button(let b): ("button", b.id, b.style?.rawValue, Source(action: b.action, tap: b.tap, values: b.values))
        case .chips(let b): ("chips", b.id, nil, Source(action: b.action))
        case .text(let b): ("text", b.id, b.style?.rawValue, Source())
        case .images(let b): ("images", b.id, b.size?.rawValue, Source())
        case .editor(let b): ("editor", b.id, nil, Source(action: b.action))
        case .composer(let b): ("composer", b.id, nil, Source(action: b.action, values: b.values))
        case .lines(let b): ("lines", b.id, nil, Source(action: b.action))
        case .message(let b): ("message", b.id, b.role.rawValue, Source())
        case .tool(let b): ("tool", b.id, b.state.rawValue, Source())
        case .modal(let b): ("modal", b.id, b.variant?.rawValue, Source())
        case .sheet(let b): ("sheet", b.id, b.variant?.rawValue, Source())
        case .appBlock(let b):
            (
                b.type, b.id, nil,
                Source(action: b.string("action"), tap: try? b["tap"]?.decode(Tap.self), values: b["values"]?.fields)
            )
        default: (typeAndID.type, typeAndID.id, nil, Source())
        }
    }

    private static let roles = ["modal": "dialog", "sheet": "dialog", "section": "region", "form": "form", "config": "form", "nav": "navigation", "chart": "figure", "toast": "status", "message": "article"]
    private static let names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"]

    /// The accessible role and name every renderer gives this block's root, as `tree::a11y` in Rust.
    internal var a11y: (role: String, name: String) {
        let head = head
        let role =
            switch self {
            case .button(let b): b.tap?.url == nil ? "button" : "link"
            case .row(let b) where b.tap != nil && (b.rounds ?? []).isEmpty && (b.swipe ?? []).isEmpty:
                b.tap?.url == nil ? "button" : "link"
            case .editor: "button"
            case .modal(let b) where b.variant == .alert, .sheet(let b) where b.variant == .alert: "alertdialog"
            default: Self.roles[head.type] ?? "group"
            }
        let id = head.id.flatMap { $0.isEmpty ? nil : $0 }
        return (role, named.compactMap { $0 }.first { !$0.isEmpty } ?? id ?? head.type)
    }

    private var named: [String?] {
        switch self {
        case .screen(let b): [b.title]
        case .modal(let b), .sheet(let b): [b.title]
        case .section(let b): [b.header]
        case .row(let b): [b.title]
        case .card(let b): [b.title]
        case .choice(let b): [b.question]
        case .secret(let b): [b.label, b.placeholder, b.name]
        case .run(let b): [b.command]
        case .button(let b): [b.label]
        case .chips(let b): [b.name]
        case .stat(let b): [b.label]
        case .diff(let b): [b.file]
        case .editor(let b): [b.name]
        case .scene(let b): [b.label]
        case .diagram(let b): [b.title]
        case .chart(let b): [b.title]
        case .composer(let b): [b.label, b.placeholder]
        case .lines(let b): [b.label, b.name]
        case .hero(let b): [b.title]
        case .media(let b): [b.alt]
        case .island(let b): [b.name]
        case .table(let b): [b.title]
        case .steps(let b): [b.title]
        case .toast(let b): [b.title]
        case .pages(let b): [b.title]
        case .timeline(let b): [b.title]
        case .import(let b): [b.title]
        case .message(let b): [b.name]
        case .tool(let b): [b.name]
        case .appBlock(let b): Self.names.map { b.string($0) }
        default: []
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
        case .modal(let b), .sheet(let b): b.blocks.fieldValues
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
            if let value = field.kind.start { values[field.kind.name] = value }
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

/// Every `block:<id>` and `action:<id>` drawn under a view, in drawn order, for the harness.
package struct DrawnIds: PreferenceKey {
    package static var defaultValue: [String] { [] }

    package static func reduce(value: inout [String], nextValue: () -> [String]) {
        value.append(contentsOf: nextValue())
    }
}

internal struct Identified: ViewModifier {
    @Environment(\.reportsBlocks) private var reports
    internal let id: String?
    internal var action = false

    internal func body(content: Content) -> some View {
        if action { marked(content) } else { marked(content).environment(\.actionBlock, id) }
    }

    @ViewBuilder
    private func marked(_ content: Content) -> some View {
        if let id, !id.isEmpty {
            let name = "\(action ? "action" : "block"):\(id)"
            let marked = Group {
                if action {
                    content.accessibilityIdentifier(name)
                } else {
                    content.accessibilityElement(children: .contain).accessibilityIdentifier(name)
                }
            }
            if reports { marked.transformPreference(DrawnIds.self) { $0.insert(name, at: 0) } } else { marked }
        } else {
            content
        }
    }
}
