import Blocks
import SwiftUI

internal struct SidebarBlock: View {
    internal let block: Sidebar

    internal var body: some View {
        FallbackRow(fallback: JSONValue.object(["title": .string(block.label)]))
    }
}
