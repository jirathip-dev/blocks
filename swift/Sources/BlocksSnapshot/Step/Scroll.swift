import Blocks

extension Run {
    mutating func scroll(_ on: StepOn) {
        out.dropped.append("scroll \(on.id)")
    }
}
