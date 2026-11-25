import AppIntents
import Blocks
import BlocksUI
import Foundation
import SwiftUI

/// One form of a glance drawn in its box: the PNG, and the faults of what drew outside the box or nothing in it.
public struct FormShot: Sendable {
    public let png: Data
    public let faults: [String]
}

private struct Sent: AppIntent {
    static let title: LocalizedStringResource = "Sent"

    func perform() async throws -> some IntentResult { .result() }
}

extension Snapshot {
    private static let margin: CGFloat = 12

    /// Draws `form` of `block` in its box with a margin round it on the look's page; every act is runnable.
    public static func form(_ block: Glance, _ form: GlanceForm, look: Look) -> FormShot {
        let box = form.box
        let view = GlanceView(block, form).frame(width: box.width, height: box.height)
            .glanceTaps(link: { _ in URL(string: "blocks://tap") }, intent: { _ in Sent() })
            .padding(margin).background(look.palette.background).environment(\.look, look)
            .environment(\.colorScheme, look.palette.dark ? .dark : .light)
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let image = renderer.cgImage else { return FormShot(png: Data(), faults: ["\(form.rawValue): not drawn"]) }
        let drawn = Self.png(image)
        guard let at = Pixels(drawn, scale: 2) else { return FormShot(png: drawn, faults: ["\(form.rawValue): no PNG"]) }
        let ground = rgb(look.palette.background)
        let inside = CGRect(x: margin, y: margin, width: box.width, height: box.height)
        var (outside, inked) = ([CGPoint](), false)
        for y in stride(from: 0, to: box.height + 2 * margin, by: 0.5) {
            for x in stride(from: 0, to: box.width + 2 * margin, by: 0.5) {
                let got = at.rgb(x, y)
                guard got.count == 3, !zip(got, ground).allSatisfy({ abs($0 - $1) <= 8 }) else { continue }
                if inside.contains(CGPoint(x: x, y: y)) { inked = true } else { outside.append(CGPoint(x: x, y: y)) }
            }
        }
        var faults = outside.first.map { ["\(form.rawValue): ink outside its box at \($0.x - margin),\($0.y - margin)"] } ?? []
        if !inked { faults.append("\(form.rawValue): nothing drawn in its box") }
        return FormShot(png: drawn, faults: faults)
    }
}
