import Blocks
import SwiftUI

internal enum GlanceScale {
    static let sideWide: CGFloat = 60
    static let sideHigh: CGFloat = 24
    static let panelWide: CGFloat = 340
    static let panelHigh: CGFloat = 140
    static let mediumWide: CGFloat = 289
    static let widgetHigh: CGFloat = 116
    static let side: CGFloat = 16
    static let head: CGFloat = 26
    static let row: CGFloat = 14
    static let title = Token.fs
    static let text = Scale.meta
    static let meta = Scale.count
    static let big: CGFloat = 26
    static let gap = Scale.pad
    static let air = Scale.gap
    static let tight: CGFloat = 2
    static let dot = Scale.gap
    static let act = Token.s2
    static let actHigh: CGFloat = 24
}

extension GlanceForm {
    /// The box the harness draws this form in: the smallest a supported device hands out.
    public var box: CGSize {
        switch self {
        case .leading, .trailing: CGSize(width: GlanceScale.sideWide, height: GlanceScale.sideHigh)
        case .expanded: CGSize(width: GlanceScale.panelWide, height: GlanceScale.panelHigh)
        case .medium: CGSize(width: GlanceScale.mediumWide, height: GlanceScale.widgetHigh)
        case .small: CGSize(width: GlanceScale.widgetHigh, height: GlanceScale.widgetHigh)
        }
    }
}
