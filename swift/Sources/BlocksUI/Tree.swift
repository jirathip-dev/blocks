import Blocks
import SwiftUI

/// A drawn block as the harness collects it: its tree node's fields, its bounds and the action a tap sends.
package struct DrawnBlock {
    package let kind: String
    package let id: String?
    package let variant: String?
    package let native: Bool
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
    private static let variants = ["row": "style", "card": "kind", "button": "style", "text": "style", "images": "size"]
    private static let gaps: Set = ["composer", "prose", "hero", "media", "nav", "island"]
    @Environment(\.reportsBlocks) private var reports
    @Environment(\.appBlocks) private var appBlocks
    internal let block: JSONValue

    @ViewBuilder
    internal func body(content: Content) -> some View {
        if reports {
            let type = block.type
            let native = AppBlocks.isCore(type) ? !Self.gaps.contains(type) : appBlocks?.views[type] != nil
            let variant = Self.variants[type].flatMap { block.string($0) }.flatMap { $0.isEmpty ? nil : $0 }
            let id = block.id.flatMap { $0.isEmpty ? nil : $0 }
            let tap = BlockAction(action: nil, source: block, values: block.fieldValues)
            content.transformAnchorPreference(key: DrawnBlocks.self, value: .bounds) { drawn, bounds in
                drawn = [
                    DrawnBlock(
                        kind: type, id: id, variant: variant, native: native, bounds: bounds, tap: tap,
                        children: drawn)
                ]
            }
        } else {
            content
        }
    }
}
