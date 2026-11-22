import Blocks

extension Run {
    mutating func answer(_ answer: Blocks.Answer) throws {
        try screen.apply(answer.ops ?? [])
        redraw()
    }
}
