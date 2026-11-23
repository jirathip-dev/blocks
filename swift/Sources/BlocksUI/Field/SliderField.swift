import Blocks
import SwiftUI

extension SliderField: FieldKind {
    internal var start: JSONValue? { .number(value ?? min) }
    internal var edit: FieldEdit { .slide(self) }

    /// The label over the thumb at `n`: the number with only the places it needs, then a no-break space and the unit.
    package func said(_ n: Double) -> String {
        let r = (n * 1e6).rounded() / 1e6
        let t = r == r.rounded() && abs(r) < 1e15 ? String(Int(r)) : String(r)
        return unit.flatMap { $0.isEmpty ? nil : "\(t)\u{a0}\($0)" } ?? t
    }

    /// `n` held to the track and on its steps.
    package func snapped(_ n: Double) -> Double {
        let step = self.step ?? 1
        let on = step > 0 ? ((n - min) / step).rounded() * step + min : n
        return Swift.min(max, Swift.max(min, on))
    }

    internal func along(_ n: Double) -> Double {
        max > min ? Swift.min(1, Swift.max(0, (n - min) / (max - min))) : 0
    }
}

internal struct SliderRow: View {
    @Environment(\.look) private var look
    @Environment(\.behaved) private var behaved
    @Environment(\.edit) private var edit
    @State private var moving: Double?
    @State private var pressed = false
    internal let field: SliderField
    @Binding internal var edits: [String: JSONValue]

    private var now: Double {
        let held = behaved.edited.contains(field.name) ? behaved.state[field.name]?.json.number : nil
        return moving ?? edits[field.name]?.number ?? held ?? field.value ?? field.min
    }

    internal var body: some View {
        let palette = look.palette
        let (n, off) = (now, behaved.view.disabled.contains(field.name))
        let (ink, at) = (off ? palette.mute : palette.lead, field.along(now))
        VStack(alignment: .leading, spacing: Scale.gap) {
            Text(field.label ?? field.name).ui(Scale.cell, .regular, look).foregroundStyle(palette.mute)
            if let doc = field.doc { Text(doc).ui(Scale.count, .regular, look).foregroundStyle(palette.mute) }
            GeometryReader { g in
                let width = g.size.width
                ZStack(alignment: .leading) {
                    Color.clear
                    Text(field.said(n)).ui(Scale.cell, pressed ? .semibold : .regular, look).fixedSize()
                        .foregroundStyle(off ? palette.mute : palette.foreground)
                        .alignmentGuide(.leading) { d in -(width - d.width) * at }
                }
            }
            .frame(height: Scale.glyph + Scale.pad)
            GeometryReader { g in
                let wide = Swift.max(g.size.width - Scale.glyph, 1)
                ZStack(alignment: .leading) {
                    Rectangle().fill(palette.edge).frame(height: Scale.pad)
                    Rectangle().fill(ink).frame(width: wide * at + Scale.glyph / 2, height: Scale.pad)
                    Rectangle().fill(ink).frame(width: Scale.glyph, height: Scale.glyph).offset(x: wide * at)
                }
                .frame(maxHeight: .infinity).accessibilityHidden(true)
            }
            .overlay { thumb(n).opacity(0.02) }
            .frame(height: Scale.glyph)
            HStack {
                Text(field.said(field.min))
                Spacer()
                Text(field.said(field.max))
            }
            .ui(Scale.count, .regular, look).foregroundStyle(palette.mute)
            if let error = field.error { Text(error).ui(Scale.count, .regular, look).foregroundStyle(palette.red) }
        }
        .disabled(off)
    }

    private func thumb(_ n: Double) -> some View {
        let step = (field.step ?? 0) > 0 ? field.step ?? 1 : 1
        let held = Binding { n } set: { v in if pressed { moving = v } else { set(field.snapped(v)) } }
        return Slider(value: held, in: field.min...Swift.max(field.min, field.max), step: step) { on in
            pressed = on
            if !on, let m = moving { set(m) }
            if !on { moving = nil }
        }
        .accessibilityLabel(field.label ?? field.name).accessibilityValue(field.said(n))
    }

    private func set(_ n: Double) {
        edits[field.name] = .number(n)
        edit([field.name: Lit(.number(n))])
    }
}
