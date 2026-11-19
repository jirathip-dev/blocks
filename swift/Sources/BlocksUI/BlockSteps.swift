import Blocks
import SwiftUI

internal struct StepsBlock: View {
    @Environment(\.look) private var look
    internal let block: Steps

    internal var body: some View {
        let steps = block.steps ?? []
        let bars = block.bars ?? []
        if !steps.isEmpty, let at = place(steps) {
            tile { stepper(steps, at) }
        } else if steps.isEmpty, !bars.isEmpty {
            tile { VStack(spacing: 12) { ForEach(Array(bars.enumerated()), id: \.offset) { _, bar in meter(bar) } } }
        } else {
            if let fallback = block.fallback {
                FallbackRow(fallback: fallback)
            } else {
                FallbackRow(fallback: JSONValue.object(["title": .string(block.title ?? "steps")]))
            }
        }
    }

    private func place(_ steps: [Stage]) -> Int? {
        guard let current = block.current else { return block.done == true ? steps.count : nil }
        return steps.firstIndex { $0.id == current }
    }

    private func tile(@ViewBuilder _ content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title = block.title {
                Text(look.label(.section, title)).ui(12, .regular, look).foregroundStyle(look.palette.mute)
            }
            content()
        }
        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
        .surface(look, radius: 16)
    }

    @ViewBuilder private func stepper(_ steps: [Stage], _ at: Int) -> some View {
        if steps.count >= 5 {
            ViewThatFits(in: .horizontal) {
                line(steps, at, names: true).frame(minWidth: 600)
                VStack(alignment: .leading, spacing: 4) {
                    line(steps, at, names: false)
                    summary(steps, at)
                }
            }
        } else {
            line(steps, at, names: true)
        }
    }

    private func line(_ steps: [Stage], _ at: Int, names: Bool) -> some View {
        HStack(alignment: .top, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                cell(step, index, steps.count, at, names: names)
            }
        }
    }

    @ViewBuilder private func cell(_ step: Stage, _ index: Int, _ count: Int, _ at: Int, names: Bool) -> some View {
        let palette = look.palette
        let done = index < at
        let word = done ? "done" : index == at ? "current" : "to do"
        let sub = step.sub ?? (index == at ? "step \(index + 1) of \(count)" : nil)
        let content = VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 8) {
                marker(index, at)
                if index < count - 1 {
                    Rectangle().fill(done ? palette.lead : palette.edge).frame(height: done ? 2 : 1)
                }
            }
            .accessibilityHidden(true)
            if names {
                Text(step.label).ui(13, index == at ? .bold : .regular, look).lineLimit(1)
                    .foregroundStyle(index > at ? palette.mute : done && step.tap != nil ? palette.link : palette.foreground)
                    .underline(done && step.tap != nil)
                if let sub, index == at || count < 5 {
                    Text(sub).ui(11, .regular, look).lineLimit(1).foregroundStyle(index == at ? palette.foreground : palette.mute)
                }
            }
        }
        .padding(.trailing, names ? 12 : 4).frame(minHeight: 44, alignment: .top)
        .frame(maxWidth: index < count - 1 ? .infinity : nil, alignment: .leading)
        let name = "\(step.label), step \(index + 1) of \(count), \(word)"
        if done, let tap = step.tap {
            ActButton(source: Source(tap: tap)) { content.contentShape(Rectangle()) }.accessibilityLabel(name)
        } else {
            content.accessibilityElement(children: .ignore).accessibilityLabel(name)
                .accessibilityAddTraits(index == at ? .isSelected : [])
        }
    }

    private func marker(_ index: Int, _ at: Int) -> some View {
        let palette = look.palette
        let done = index < at
        let now = index == at
        return Text(done ? "✓" : "\(index + 1)").ui(11, .semibold, look).monospacedDigit()
            .foregroundStyle(done ? palette.background : now ? palette.foreground : palette.mute)
            .frame(width: 22, height: 22)
            .background(done ? palette.lead : palette.background)
            .overlay(Rectangle().strokeBorder(done || now ? palette.lead : palette.edge, lineWidth: now ? 2 : 1))
    }

    private func summary(_ steps: [Stage], _ at: Int) -> some View {
        let current = at < steps.count ? steps[at] : nil
        let more = current.map { "step \(at + 1) of \(steps.count)" + ($0.sub.map { " · \($0)" } ?? "") }
        return HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(current?.label ?? "All done").ui(13, .bold, look).lineLimit(1)
            Text(more ?? "\(steps.count) of \(steps.count)").ui(11, .regular, look).foregroundStyle(look.palette.mute)
        }
        .accessibilityHidden(true)
    }

    private func meter(_ bar: Bar) -> some View {
        let palette = look.palette
        let value = min(Int(bar.value), 100)
        let tone = palette.tone(bar.tone?.rawValue)
        let loud = ["warn", "needs", "bad", "fail"].contains(bar.tone?.rawValue ?? "")
        return VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(bar.label).ui(13, .regular, look).lineLimit(1)
                Spacer(minLength: 12)
                Text("\(value)%").ui(13, value == 0 ? .medium : .bold, look).monospacedDigit()
                    .foregroundStyle(value == 0 ? palette.mute : tone ?? palette.foreground)
            }
            GeometryReader { size in
                let fill = size.size.width * CGFloat(value) / 100
                ZStack(alignment: .leading) {
                    Rectangle().fill(palette.line)
                    Rectangle().fill(palette.lead).frame(width: fill)
                    if let tone { Rectangle().fill(tone).frame(width: 3, height: 14).offset(x: max(fill - 3, 0)) }
                }
            }
            .frame(height: 8)
            if let sub = bar.sub {
                Text(sub).ui(11, .regular, look).lineLimit(1).foregroundStyle(loud ? tone ?? palette.mute : palette.mute)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(bar.label)
        .accessibilityValue(bar.sub.map { "\(value)%, \($0)" } ?? "\(value)%")
    }
}
