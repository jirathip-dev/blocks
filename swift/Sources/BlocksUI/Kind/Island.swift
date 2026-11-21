import Blocks
import SwiftUI

internal struct IslandBlock: View {
    @Environment(\.islands) private var islands
    @Environment(\.heard) private var heard
    @Environment(\.act) private var act
    internal let block: Island

    internal var body: some View {
        if let draw = islands[block.name] {
            draw(.object(block.props ?? [:])) { name, values in
                let named = block.events?.contains(name) == true
                heard?(block.id ?? "", name, named ? values : nil)
                if named { act(BlockAction(action: name, values: values)) }
            }
        } else {
            FallbackRow(fallback: block.fallback)
        }
    }
}
