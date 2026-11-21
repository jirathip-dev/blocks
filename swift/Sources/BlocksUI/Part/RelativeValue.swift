import Blocks
import SwiftUI

/// A text redrawn each minute from the time now, such as an age or a countdown.
public struct RelativeValue: View {
    private let text: (Date) -> String

    public init(text: @escaping (Date) -> String) {
        self.text = text
    }

    public var body: some View {
        TimelineView(.everyMinute) { context in Text(text(context.date)) }
    }
}

extension Shown {
    internal func text(at now: Date, _ values: [String: String]) -> String {
        switch self {
        case .string(let string): string
        case .number(let number): number.formatted()
        case .bound(let bound): values[bound.get] ?? ""
        case .time(let time): Relative.text(since: time.since, until: time.until, label: time.label, at: now)
        }
    }
}

extension Relative {
    internal static func text(since: String?, until: String? = nil, label: String? = nil, at now: Date) -> String {
        if let label, let until = until?.date {
            let left = max(0, Int((until.timeIntervalSince(now) / 60).rounded()))
            return label.replacingOccurrences(of: "{rel}", with: "\(left)m")
        }
        if let since = since?.date {
            let age = now.timeIntervalSince(since)
            return label.map { $0.replacingOccurrences(of: "{}", with: aged(age)) } ?? text(age)
        }
        return until?.date.map { text($0.timeIntervalSince(now)) } ?? ""
    }

    private static func aged(_ seconds: TimeInterval) -> String {
        let s = Int(max(0, seconds))
        if s < 120 { return "\(s)s" }
        if s < 7200 { return "\(s / 60)m" }
        if s < 172_800 { return "\(s / 3600)h" }
        return "\(s / 86400)d"
    }
}

extension String {
    internal var date: Date? { try? Date(self, strategy: .iso8601) }
}
