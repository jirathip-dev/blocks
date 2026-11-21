import Blocks
import SwiftUI

internal struct LaneStage: View {
    @Environment(\.look) private var look
    @Environment(\.appBlocks) private var appBlocks
    internal let block: Blocks.Scene

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 8) {
            if let label = block.label {
                Text(look.label(.section, label)).ui(12, .regular, look).foregroundStyle(palette.mute)
            }
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(Array((block.lanes ?? []).enumerated()), id: \.offset) { _, lane in
                        ActButton(source: Source(tap: lane.tap)) {
                            HStack(spacing: 6) {
                                if let figure = appBlocks?.figure, let json = try? JSONValue(lane) {
                                    figure(json)
                                } else {
                                    Circle().fill(palette.tone(lane.state.rawValue) ?? palette.mute)
                                        .frame(width: 8, height: 8)
                                }
                                Text(lane.title).ui(13, .semibold, look).lineLimit(1)
                                Text(lane.state.rawValue).ui(11, .regular, look).foregroundStyle(palette.mute)
                            }
                            .foregroundStyle(palette.foreground).padding(.horizontal, 10).padding(.vertical, 6)
                            .chip(look)
                        }
                        .accessibilityLabel("\(lane.title), \(lane.state.rawValue)")
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }
}
