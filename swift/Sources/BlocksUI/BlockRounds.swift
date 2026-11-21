import Blocks
import SwiftUI

extension Palette {
    internal func round(_ state: LaneState) -> Color {
        switch state {
        case .done, .merged: green
        case .fail, .needs: red
        case .working: amber
        default: mute
        }
    }
}

private struct Rail: Shape {
    fileprivate func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        }
    }
}

internal struct RoundsView: View {
    @Environment(\.look) private var look
    internal let rounds: [Round]

    internal var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(ChildKey.keyed(rounds) { $0.id }, id: \.key) { child in
                RoundView(round: child.item, current: child.index == rounds.count - 1)
            }
        }
        .padding(.leading, 22).padding(.trailing, 12).padding(.bottom, 12)
        .background(alignment: .leading) {
            Rail().stroke(look.palette.edge, style: StrokeStyle(lineWidth: 1.5, dash: look.outline ? [4, 3] : []))
                .frame(width: 20).padding(.leading, 22).padding(.vertical, 12)
        }
    }
}

internal struct RoundView: View {
    @Environment(\.look) private var look
    internal let round: Round
    internal let current: Bool

    private var state: LaneState { round.state }

    internal var body: some View {
        HStack(alignment: .top, spacing: 10) {
            marker.frame(width: 20, height: 34)
            VStack(alignment: .leading, spacing: 6) {
                if current || round.tap == nil { line } else { ActButton(source: Source(tap: round.tap)) { line } }
                if current { RoundBody(round: round, state: state) }
            }
        }
    }

    @ViewBuilder private var marker: some View {
        let tint = look.palette.round(state)
        let glyphs: [LaneState: String] = [.done: "+", .fail: "x", .working: ">", .needs: "!"]
        Mark(text: glyphs[state] ?? "-", size: 15) {
            Circle().fill(tint).frame(width: current ? 14 : 10, height: current ? 14 : 10)
        }
        .foregroundStyle(tint)
    }

    private var line: some View {
        let palette = look.palette
        return HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(round.name).ui(15, .semibold, look).lineLimit(1).layoutPriority(1)
            Text(round.summary ?? "").ui(13, .regular, look).foregroundStyle(palette.round(state))
                .lineLimit(1)
            Spacer(minLength: 4)
            if let since = round.since {
                RelativeValue { Relative.text(since: since, at: $0) }.ui(13, .regular, look)
                    .foregroundStyle(palette.mute)
            }
            if !current && round.tap != nil {
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold)).foregroundStyle(palette.mute)
            }
        }
        .frame(minHeight: 34).contentShape(.rect)
    }
}

internal struct RoundBody: View {
    @Environment(\.look) private var look
    internal let round: Round
    internal let state: LaneState

    internal var body: some View {
        let palette = look.palette
        VStack(alignment: .leading, spacing: 10) {
            if let lane = round.lane { self.lane(lane) }
            if let blocks = round.blocks, !blocks.isEmpty { BlockStack(blocks: blocks) }
            if let links = round.links, !links.isEmpty { self.links(links) }
        }
        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
        .overlay(
            RoundedRectangle(cornerRadius: look.radius(14, least: 4))
                .stroke(state == .needs ? palette.red.opacity(0.7) : palette.edge, lineWidth: 1)
        )
    }

    private func lane(_ lane: RoundLane) -> some View {
        let palette = look.palette
        let head = [lane.name, lane.harness, lane.model, lane.host].compactMap(\.self).joined(separator: " · ")
        let lines = lane.lines ?? []
        return VStack(alignment: .leading, spacing: 4) {
            Text(head).ui(13, .regular, look).foregroundStyle(palette.mute)
            ForEach(Array(lines.enumerated()), id: \.offset) { index, text in
                let live = state == .working && index == lines.count - 1
                Text(live ? "▍ \(text)" : text).font(.system(size: 13, design: .monospaced)).lineLimit(1)
                    .foregroundStyle(live ? palette.amber : palette.mute)
            }
        }
    }

    private func links(_ links: [Blocks.Link]) -> some View {
        HStack(spacing: 8) {
            ForEach(Array(links.enumerated()), id: \.offset) { _, link in LinkChip(link: link) }
        }
    }
}

internal struct LinkChip: View {
    internal let link: Blocks.Link

    internal var body: some View {
        ActButton(source: Source(tap: link.tap)) {
            Text("\(link.label) ›").modifier(OutlineChip())
        }
    }
}

internal struct OutlineChip: ViewModifier {
    @Environment(\.look) private var look

    internal func body(content: Content) -> some View {
        content.ui(14, .medium, look).foregroundStyle(look.palette.link).padding(.horizontal, 12).frame(height: 32)
            .overlay(RoundedRectangle(cornerRadius: look.radius(16, least: 4)).stroke(look.palette.edge, lineWidth: 1))
    }
}
