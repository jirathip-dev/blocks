import Foundation

/// A surface a glance is drawn on: the closed island's two sides, the opened island, the two widgets.
public enum GlanceForm: String, CaseIterable, Sendable {
    case leading, trailing, expanded, small, medium
}

/// What one form of a glance draws, after the fallback and its budget.
public struct GlanceDrawn: Equatable, Sendable {
    public var figure: Figure?
    public var mark = false
    public var title: String?
    public var subtitle: String?
    public var value: Shown?
    public var tone: Tone?
    public var line: String?
    public var rows: [GlanceRow] = []
    public var foot: String?
    public var acts: [Act] = []
}

extension Glance: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(title)
    }
}

extension Glance {
    /// What `form` draws: its own part, else the head and a sibling's, cut to the form's budget.
    public func drawn(_ form: GlanceForm) -> GlanceDrawn {
        switch form {
        case .leading:
            guard let leading else { return GlanceDrawn(figure: figure, mark: figure == nil, tone: tone) }
            return GlanceDrawn(figure: leading.figure, value: leading.text, tone: leading.tone)
        case .trailing:
            guard let trailing else { return GlanceDrawn(value: value, tone: tone) }
            return GlanceDrawn(figure: trailing.figure, value: trailing.text, tone: trailing.tone)
        case .expanded: return roomy(expanded ?? medium, subtitle: subtitle, acts: 2)
        case .medium: return roomy(medium ?? expanded, subtitle: subtitle, acts: 1)
        case .small: return roomy(small ?? medium ?? expanded, subtitle: nil, acts: 0)
        }
    }

    private func roomy(_ body: GlanceBody?, subtitle: String?, acts: Int) -> GlanceDrawn {
        let rows = Array((body?.rows ?? []).prefix(2))
        return GlanceDrawn(
            figure: figure, title: title, subtitle: subtitle, value: value, tone: tone,
            line: rows.isEmpty ? body?.line : nil, rows: rows, foot: body?.foot, acts: Array((body?.acts ?? []).prefix(acts)))
    }
}

extension Block {
    /// The glance of this id in a screen.
    public func glance(_ id: String) -> Glance? {
        var walked = self
        var found: Glance?
        _ = try? walked.edit(id) { if case .glance(let glance) = $0 { found = glance } }
        return found
    }
}
