import Blocks

extension Run {
    mutating func gesture(_ g: StepGesture) throws {
        let block = try? Self.find(try JSONValue(screen), g.id)?.decode(Block.self)
        let ways = Self.gestured(block, g).map { Self.sent(key, g.id, $0) }
        if ways.isEmpty { out.dropped.append("gesture \(g.via.rawValue) \(g.id)") } else { out.sent += ways }
    }

    private static func gestured(_ block: Block?, _ g: StepGesture) -> [(Blocks.Gesture, JSONValue)] {
        switch block {
        case .list(let l)?:
            guard let reorder = l.reorder, let grab = g.grab.string else { return [] }
            return ways(l, grab, g).map { (reorder, .array($0.map(JSONValue.string))) }
        case .media(let m)?:
            guard let grab = MarkGrab(g.grab), let gesture = m.gesture(grab) else { return [] }
            return ways(m, grab, g).map { (gesture, $0.value) }
        case .table(let t)?: return grid(t, g)
        case .timeline(let t)?: return timed(t, g)
        default: return []
        }
    }

    private static func grid(_ t: Blocks.Table, _ g: StepGesture) -> [(Blocks.Gesture, JSONValue)] {
        if let id = g.grab.string, let reorder = t.reorder { return ways(t, .row(id), g).map { (reorder, $0.json) } }
        let cell = GridGrab.cell(row: g.grab.string("row") ?? "", column: g.grab.string("column") ?? "")
        guard let edit = t.edit, g.via != .pointer, var d = Driven(t, cell), let text = g.reach.first?.string else { return [] }
        d.on(.press)
        d.reach(.text(text))
        guard case .send(let c)? = d.on(.release) else { return [] }
        return [(edit, c.json)]
    }

    private static func timed(_ t: Timeline, _ g: StepGesture) -> [(Blocks.Gesture, JSONValue)] {
        let part = g.grab.string("part").flatMap(BarGrab.Part.init(rawValue:))
        let (grab, gesture): (BarGrab?, Blocks.Gesture?) =
            if let row = g.grab.string("row") { (.row(row), t.draw) } else if let bar = g.grab.string("bar"), let part {
                (.bar(bar, part), part == .body ? t.move : t.stretch)
            } else { (nil, nil) }
        guard let grab, let gesture else { return [] }
        return ways(t, grab, g).compactMap { span in (try? JSONValue(span)).map { (gesture, $0) } }
    }

    private static func ways<R: Rules>(_ rules: R, _ grab: R.Grab, _ g: StepGesture) -> [R.Change] {
        guard var d = Driven(rules, grab) else { return [] }
        switch g.via {
        case .keys:
            d.on(.press)
            for r in g.reach {
                if let dir = r.string("dir").flatMap(Nudge.Dir.init(rawValue:)) { d.nudge(Nudge(dir, big: r["big"]?.bool ?? false)) }
            }
            guard case .send(let c)? = d.on(.release) else { return [] }
            return [c]
        case .action:
            let steps = rules.steps(grab)
            return g.reach.compactMap { name in
                guard var one = Driven(rules, grab), let n = steps.first(where: { $0.0 == name.string })?.1,
                    case .send(let c)? = one.named(n)
                else { return nil }
                return c
            }
        default: return []
        }
    }

    private static func sent(_ screen: String, _ id: String, _ way: (Blocks.Gesture, JSONValue)) -> JSONValue {
        .object([
            "screen": .string(screen), "action": .string(way.0.action), "block": .string(id),
            "values": .object([way.0.name: way.1]),
        ])
    }
}
