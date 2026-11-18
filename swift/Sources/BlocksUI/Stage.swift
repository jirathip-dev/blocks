import Blocks
import SwiftUI

internal struct LaneStage: View {
    @Environment(\.look) private var look
    internal let block: JSONValue

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 8) {
            if let label = block.string("label") {
                Text(look.label(.section, label)).ui(12, .regular, look).foregroundStyle(palette.mute)
            }
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(Array(block.list("lanes").enumerated()), id: \.offset) { _, lane in
                        ActButton(source: lane) {
                            HStack(spacing: 6) {
                                Circle().fill(palette.tone(lane.string("state")) ?? palette.mute)
                                    .frame(width: 8, height: 8)
                                Text(lane.string("title") ?? "").ui(13, .semibold, look).lineLimit(1)
                                Text(lane.string("state") ?? "").ui(11, .regular, look).foregroundStyle(palette.mute)
                            }
                            .foregroundStyle(palette.foreground).padding(.horizontal, 10).padding(.vertical, 6)
                            .chip(look)
                        }
                        .accessibilityLabel("\(lane.string("title") ?? ""), \(lane.string("state") ?? "")")
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }
}
