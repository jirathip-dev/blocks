import Blocks
import SwiftUI

/// The tile look: square tiles on seams over a dot grid, and the build-up; `default` is the generated `blocksDefaultStyle`.
public struct Tiles: Sendable, Equatable {
    public static let `default` = Tiles(tokens: blocksDefaultStyle)

    public var radius: CGFloat
    public var seam: CGFloat
    public var dotSize: CGFloat
    public var dotGap: CGFloat
    public var dot: String
    public var settle: Double
    public var rise: CGFloat
    public var stagger: Double
    public var build: Double
    public var enter: Double
    public var ease: [Double]

    /// The tile look from CSS-style tokens: lengths in `px`, times in `ms`, `--dot` a `var(--token)`.
    public init(tokens: [String: String]) {
        func number(_ key: String) -> Double { Double(tokens[key]?.trimmingCharacters(in: .letters) ?? "") ?? 0 }
        radius = number("--radius")
        seam = number("--seam")
        dotSize = number("--dot-size")
        dotGap = number("--dot-gap")
        dot = (tokens["--dot"] ?? "").replacingOccurrences(of: "var(", with: "").replacingOccurrences(of: ")", with: "")
        settle = number("--settle") / 1000
        rise = number("--rise")
        stagger = number("--stagger") / 1000
        build = number("--build") / 1000
        enter = number("--enter") / 1000
        ease = (tokens["--ease"] ?? "").split { !"0123456789.".contains($0) }.compactMap { Double($0) }
    }

    /// When each of `count` tiles on the first screen starts to settle, in reading order.
    public func starts(_ count: Int) -> [Double] {
        let step = min(stagger, build / Double(max(1, count - 1)))
        return (0..<count).map { Double($0) * step }
    }

    internal func curve(_ duration: Double) -> Animation {
        ease.count == 4
            ? .timingCurve(ease[0], ease[1], ease[2], ease[3], duration: duration) : .easeOut(duration: duration)
    }
}

extension Look {
    /// Whether a screen's first load plays the build-up: tiles on, not still, motion above 0 and not reduced.
    public func buildsUp(reduceMotion: Bool) -> Bool { tiles != nil && !still && !reduceMotion && motion > 0 }
}

extension Palette {
    internal func token(_ name: String) -> Color {
        switch name {
        case "--line": line
        case "--mute": mute
        case "--card": card
        default: edge
        }
    }
}

internal struct DotGrid: View {
    internal let tiles: Tiles
    internal let color: Color

    internal var body: some View {
        Canvas { context, size in
            guard tiles.dotGap > 0 else { return }
            let end = tiles.dotGap - tiles.dotSize
            for x in stride(from: end, to: size.width, by: tiles.dotGap) {
                for y in stride(from: end, to: size.height, by: tiles.dotGap) {
                    context.fill(Path(CGRect(x: x, y: y, width: tiles.dotSize, height: tiles.dotSize)), with: .color(color))
                }
            }
        }
    }
}

internal struct TileSlots: PreferenceKey {
    internal static var defaultValue: [UUID: Anchor<CGRect>] { [:] }

    internal static func reduce(value: inout [UUID: Anchor<CGRect>], nextValue: () -> [UUID: Anchor<CGRect>]) {
        value.merge(nextValue()) { $1 }
    }
}

internal struct Settling: Equatable {
    internal var starts: [UUID: Double] = [:]
    internal var on = false
}

extension EnvironmentValues {
    @Entry internal var settling: Settling?
}

internal struct BuildsUp: ViewModifier {
    @Environment(\.look) private var look
    @Environment(\.accessibilityReduceMotion) private var reduce
    @State private var settling = Settling()

    internal func body(content: Content) -> some View {
        if let tiles = look.tiles, look.buildsUp(reduceMotion: reduce) {
            content.environment(\.settling, settling).overlayPreferenceValue(TileSlots.self) { slots in
                GeometryReader { proxy in
                    Color.clear.onAppear {
                        guard settling.starts.isEmpty else { return }
                        let seen = slots.map { ($0.key, proxy[$0.value]) }.filter { $0.1.minY < proxy.size.height }
                            .sorted { ($0.1.minY, $0.1.minX) < ($1.1.minY, $1.1.minX) }
                        settling.starts = Dictionary(
                            uniqueKeysWithValues: zip(seen.map(\.0), tiles.starts(seen.count).map { $0 * look.motion }))
                        Task { @MainActor in settling.on = true }
                    }
                }
            }
        } else {
            content
        }
    }
}

internal struct Settles: ViewModifier {
    @Environment(\.look) private var look
    @Environment(\.settling) private var settling
    @State private var key = UUID()
    @State private var late = false
    internal let tiles: Tiles

    internal func body(content: Content) -> some View {
        let start = settling?.starts[key]
        let waiting = start != nil && settling?.on != true
        content.anchorPreference(key: TileSlots.self, value: .bounds) { [key: $0] }
            .opacity(waiting || late ? 0 : 1).offset(y: waiting ? tiles.rise : 0)
            .animation(start.map { tiles.curve(tiles.settle * look.motion).delay($0) }, value: waiting)
            .animation(tiles.curve(tiles.enter * look.motion), value: late)
            .onAppear {
                guard settling?.on == true, start == nil else { return }
                late = true
                Task { @MainActor in late = false }
            }
    }
}
