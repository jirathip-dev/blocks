import Foundation

/// The gesture words, as the crate's `gesture::Word`: each is the name of a field on the kinds that take it.
public enum Word: String, CaseIterable, Sendable {
    case reorder, move, stretch, edit, draw, remove

    /// Every word, as the field names a block declares its gestures under.
    public static let all = allCases.map(\.rawValue)
}

/// Where one item's gesture is, as the crate's `gesture::Phase`.
public enum Phase<C: Equatable>: Equatable {
    case idle, pressed, dragging, previewing(C), sent(C), confirmed, refused(String)
}

/// What happens to it, as the crate's `gesture::Event`.
public enum GestureEvent<C: Equatable>: Equatable {
    case press, move(C?), release, cancel, answer(ok: Bool, why: String?), settled
}

/// What the renderer must do after a step, besides drawing the phase.
public enum Effect<C: Equatable>: Equatable {
    case tap, send(C)
}

/// A nudge by a key or a named accessibility action; `big` is Shift's.
public struct Nudge: Equatable, Sendable {
    /// The direction a nudge goes.
    public enum Dir: String, Sendable { case left, right, up, down }
    public let dir: Dir
    public let big: Bool

    /// A nudge one way, or to the end with `big`.
    public init(_ dir: Dir, big: Bool = false) {
        self.dir = dir
        self.big = big
    }
}

/// What a kind that takes gestures answers, as the crate's `gesture::Rules`; no pixels, no time.
public protocol Rules {
    associatedtype Grab
    associatedtype Reach
    associatedtype Change: Equatable

    func word(_ grab: Grab) -> Word?
    func start(_ grab: Grab) -> Change?
    func candidate(_ grab: Grab, _ reach: Reach) -> Change?
    func nudge(_ grab: Grab, from: Change, by: Nudge) -> Change?
    func steps(_ grab: Grab) -> [(String, Nudge)]
    func says(_ grab: Grab, _ change: Change) -> String
}

/// One step, as the crate's `gesture::step`: total, no clock, no I/O. `start` is the item as the data has it.
public func step<C>(_ phase: Phase<C>, _ event: GestureEvent<C>, start: C) -> (Phase<C>, Effect<C>?) {
    switch (phase, event) {
    case (.idle, .press): return (.pressed, nil)
    case (.pressed, .release): return (.idle, .tap)
    case (.pressed, .move(let c)), (.dragging, .move(let c)), (.previewing, .move(let c)):
        return (c.map { .previewing($0) } ?? .dragging, nil)
    case (.pressed, .cancel), (.dragging, .cancel), (.previewing, .cancel), (.dragging, .release): return (.idle, nil)
    case (.previewing(let c), .release): return c == start ? (.idle, nil) : (.sent(c), .send(c))
    case (.sent, .answer(let ok, let why)): return (ok ? .confirmed : .refused(why ?? ""), nil)
    case (.confirmed, .settled), (.refused, .settled): return (.idle, nil)
    default: return (phase, nil)
    }
}

/// One grabbed item as a driver runs it: the machine fed by a kind's rules, from the item as the data has it.
public struct Driven<R: Rules> {
    public let rules: R
    public let grab: R.Grab
    public let start: R.Change
    public private(set) var phase: Phase<R.Change> = .idle

    /// A driver for `grab`; none when the block does not allow its gesture.
    public init?(_ rules: R, _ grab: R.Grab) {
        guard rules.word(grab) != nil, let start = rules.start(grab) else { return nil }
        (self.rules, self.grab, self.start) = (rules, grab, start)
    }

    /// The candidate drawn now: previewed or sent.
    public var candidate: R.Change? {
        switch phase {
        case .previewing(let c), .sent(let c): c
        default: nil
        }
    }

    /// Steps the machine with `event`.
    @discardableResult
    public mutating func on(_ event: GestureEvent<R.Change>) -> Effect<R.Change>? {
        let (next, effect) = step(phase, event, start: start)
        phase = next
        return effect
    }

    /// A pointer's reach: the candidate for it, or none where no result is allowed.
    public mutating func reach(_ r: R.Reach) { on(.move(rules.candidate(grab, r))) }

    /// A key's nudge from the candidate, or from the start; at an end nothing moves.
    public mutating func nudge(_ n: Nudge) {
        if let c = rules.nudge(grab, from: candidate ?? start, by: n) { on(.move(c)) }
    }

    /// A named accessibility action: press, one nudge and release, as one whole gesture.
    public mutating func named(_ n: Nudge) -> Effect<R.Change>? {
        on(.press)
        nudge(n)
        return phase == .pressed ? on(.cancel) : on(.release)
    }
}
