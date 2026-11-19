import Blocks
import SwiftUI

internal struct StatBlock: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    internal let block: Stat

    internal var body: some View {
        HStack(spacing: look.tiles?.seam ?? 10) {
            if let items = block.items {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    tile(item.label, item.value, item.tone, item.unit, item.spark)
                }
            } else {
                tile(block.label, block.value, block.tone, block.unit, block.spark)
            }
        }
    }

    private func tile(_ label: String?, _ value: Shown?, _ tone: Tone?, _ unit: String?, _ spark: [Double]?)
        -> some View
    {
        let palette = look.palette
        return VStack(alignment: .leading, spacing: 4) {
            Text(label ?? "").ui(12, .regular, look).foregroundStyle(palette.mute)
                .fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                RelativeValue { value?.text(at: $0, behaved.view.values) ?? "" }.ui(22, .semibold, look)
                    .foregroundStyle(palette.tone(tone?.rawValue) ?? palette.foreground)
                    .fixedSize(horizontal: false, vertical: true)
                if let unit { Text(unit).ui(13, .regular, look).foregroundStyle(palette.mute) }
            }
            if let spark, !spark.isEmpty {
                Sparkline(points: spark).frame(height: 22)
            }
        }
        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
        .surface(look, radius: 16)
    }
}

internal struct Sparkline: View {
    @Environment(\.look) private var look
    internal let points: [Double]

    internal var body: some View {
        GeometryReader { size in
            let low = points.min() ?? 0
            let span = max((points.max() ?? 0) - low, 1)
            let step = size.size.width / CGFloat(max(points.count - 1, 1))
            Path { path in
                for (index, point) in points.enumerated() {
                    let point = CGPoint(x: CGFloat(index) * step, y: size.size.height * (1 - (point - low) / span))
                    if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
                }
            }
            .stroke(look.palette.lead, lineWidth: 1.5)
        }
    }
}
