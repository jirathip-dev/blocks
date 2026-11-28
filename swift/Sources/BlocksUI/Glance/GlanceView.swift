import Blocks
import SwiftUI

/// One form of a glance, drawn into the box it is given; it draws no ground.
public struct GlanceView: View {
    private let block: Glance
    private let form: GlanceForm

    public init(_ block: Glance, _ form: GlanceForm) {
        (self.block, self.form) = (block, form)
    }

    public var body: some View {
        let drawn = block.drawn(form)
        Group {
            switch form {
            case .leading, .trailing: SideForm(drawn: drawn, trailing: form == .trailing)
            case .expanded, .medium: PanelForm(drawn: drawn, glance: block.id)
            case .small: SmallForm(drawn: drawn)
            }
        }
        .environment(\.glanceForm, form)
    }
}

extension EnvironmentValues {
    /// The form being drawn, for an app's own figure view to size itself; nil outside a glance.
    @Entry public var glanceForm: GlanceForm?
}
