import Blocks

extension Run {
    mutating func frame(_ frame: Blocks.Frame) throws {
        if let new = frame.screen { screen = new } else { try screen.apply(frame.ops ?? []) }
        redraw()
    }
}
