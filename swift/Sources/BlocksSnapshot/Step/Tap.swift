import Blocks

extension Run {
    mutating func tap(_ on: StepOn) throws {
        let json = try JSONValue(screen)
        let state = Behaviour.state(json, edits: edits)
        let block = Self.find(json, on.id)
        if block?.type == "tool", block?.string("body") != nil {
            opened.formSymmetricDifference([on.id])
            return redraw()
        }
        let names = Set(block?.list("fields").compactMap { $0.string("name") } ?? [])
        let off = Behaviour(json, state: state).disabled.contains(on.id) || picks.waits(names)
        let sets = (try? block?["tap"]?["set"]?.decode([SetState].self)) ?? []
        let set = Behaviour.tap(sets, state: state)
        edits.merge(set) { $1 }
        if !off, let tap = seen.taps[on.id] {
            let typed = edits.filter { names.contains($0.key) }.mapValues(\.json).merging(picks.ids(names)) { $1 }
            out.sent.append(
                .object([
                    "screen": .string(key), "action": .string(tap.action), "block": .string(on.id),
                    "values": .object(tap.values.merging(typed) { $1 }),
                ]))
        } else if off || set.isEmpty {
            out.dropped.append("tap \(on.id)")
        }
        if !off, !set.isEmpty { redraw() }
    }
}
