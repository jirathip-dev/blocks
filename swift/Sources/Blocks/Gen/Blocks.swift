public let blocksSchemaVersion = 2

public struct Frame: Codable, Equatable, Sendable {
    public var from: UInt64?
    public var k: String
    public var ops: [Op]?
    public var rev: UInt64
    public var screen: Block?
}

public struct Accessory: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let chevron = Self(rawValue: "chevron")
    public static let none = Self(rawValue: "none")
    public static let all: [Self] = [.chevron, .none]
}

public struct Act: Codable, Equatable, Sendable {
    public var action: String?
    public var confirm: Confirm?
    public var enabled: Expr?
    public var icon: String?
    public var label: String
    public var menu: [Act]?
    public var tap: Tap?
    public var tone: Tone?
    public var values: [String: JSONValue]?
}

public struct Action: Codable, Equatable, Sendable {
    public var action: String
    public var block: String?
    public var screen: String
    public var values: [String: JSONValue]?
}

public struct Align: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let start = Self(rawValue: "start")
    public static let end = Self(rawValue: "end")
    public static let all: [Self] = [.start, .end]
}

public struct Answer: Codable, Equatable, Sendable {
    public var close: Bool?
    public var open: String?
    public var ops: [Op]?
    public var toast: Toast?
}

public struct AppBlock: Codable, Equatable, Sendable {
    public var fallback: Fallback?
    public var id: String?
    public var type: String
}

public struct Bar: Codable, Equatable, Sendable {
    public var label: String
    public var sub: String?
    public var tone: Tone?
    public var value: UInt8
}

public enum Block: Codable, Equatable, Sendable {
    case screen(Screen)
    case sheet(Sheet)
    case section(Section)
    case list(List)
    case row(Row)
    case card(Card)
    case choice(Choice)
    case form(Form)
    case config(Form)
    case secret(Secret)
    case run(Run)
    case button(Button)
    case chips(Chips)
    case stat(Stat)
    case text(Text)
    case images(Images)
    case web(Web)
    case diff(Diff)
    case editor(Editor)
    case scene(Scene)
    case diagram(Diagram)
    case composer(Composer)
    case lines(Lines)
    case prose(Prose)
    case hero(Hero)
    case media(Media)
    case nav(Nav)
    case island(Island)
    case table(Table)
    case steps(Steps)
    case toast(Toast)
    case appBlock(JSONValue)

    private enum Tag: String, CodingKey { case tag = "type" }

    public init(from decoder: any Decoder) throws {
        switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {
        case "screen": self = .screen(try Screen(from: decoder))
        case "sheet": self = .sheet(try Sheet(from: decoder))
        case "section": self = .section(try Section(from: decoder))
        case "list": self = .list(try List(from: decoder))
        case "row": self = .row(try Row(from: decoder))
        case "card": self = .card(try Card(from: decoder))
        case "choice": self = .choice(try Choice(from: decoder))
        case "form": self = .form(try Form(from: decoder))
        case "config": self = .config(try Form(from: decoder))
        case "secret": self = .secret(try Secret(from: decoder))
        case "run": self = .run(try Run(from: decoder))
        case "button": self = .button(try Button(from: decoder))
        case "chips": self = .chips(try Chips(from: decoder))
        case "stat": self = .stat(try Stat(from: decoder))
        case "text": self = .text(try Text(from: decoder))
        case "images": self = .images(try Images(from: decoder))
        case "web": self = .web(try Web(from: decoder))
        case "diff": self = .diff(try Diff(from: decoder))
        case "editor": self = .editor(try Editor(from: decoder))
        case "scene": self = .scene(try Scene(from: decoder))
        case "diagram": self = .diagram(try Diagram(from: decoder))
        case "composer": self = .composer(try Composer(from: decoder))
        case "lines": self = .lines(try Lines(from: decoder))
        case "prose": self = .prose(try Prose(from: decoder))
        case "hero": self = .hero(try Hero(from: decoder))
        case "media": self = .media(try Media(from: decoder))
        case "nav": self = .nav(try Nav(from: decoder))
        case "island": self = .island(try Island(from: decoder))
        case "table": self = .table(try Table(from: decoder))
        case "steps": self = .steps(try Steps(from: decoder))
        case "toast": self = .toast(try Toast(from: decoder))
        default: self = .appBlock(try JSONValue(from: decoder))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .screen(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("screen", forKey: .tag)
        case .sheet(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("sheet", forKey: .tag)
        case .section(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("section", forKey: .tag)
        case .list(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("list", forKey: .tag)
        case .row(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("row", forKey: .tag)
        case .card(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("card", forKey: .tag)
        case .choice(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("choice", forKey: .tag)
        case .form(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("form", forKey: .tag)
        case .config(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("config", forKey: .tag)
        case .secret(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("secret", forKey: .tag)
        case .run(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("run", forKey: .tag)
        case .button(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("button", forKey: .tag)
        case .chips(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("chips", forKey: .tag)
        case .stat(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("stat", forKey: .tag)
        case .text(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("text", forKey: .tag)
        case .images(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("images", forKey: .tag)
        case .web(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("web", forKey: .tag)
        case .diff(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("diff", forKey: .tag)
        case .editor(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("editor", forKey: .tag)
        case .scene(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("scene", forKey: .tag)
        case .diagram(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("diagram", forKey: .tag)
        case .composer(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("composer", forKey: .tag)
        case .lines(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("lines", forKey: .tag)
        case .prose(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("prose", forKey: .tag)
        case .hero(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("hero", forKey: .tag)
        case .media(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("media", forKey: .tag)
        case .nav(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("nav", forKey: .tag)
        case .island(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("island", forKey: .tag)
        case .table(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("table", forKey: .tag)
        case .steps(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("steps", forKey: .tag)
        case .toast(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("toast", forKey: .tag)
        case .appBlock(let v): try v.encode(to: encoder)
        }
    }
}

public struct Bound: Codable, Equatable, Sendable {
    public var get: String
}

public struct BulkAction: Codable, Equatable, Sendable {
    public var action: String
    public var bad: Bool?
    public var label: String
}

public struct Button: Codable, Equatable, Sendable {
    public var action: String?
    public var confirm: Confirm?
    public var enabled: Expr?
    public var id: String?
    public var label: String
    public var show: Expr?
    public var style: ButtonStyle?
    public var tap: Tap?
    public var values: [String: JSONValue]?
}

public struct ButtonStyle: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let primary = Self(rawValue: "primary")
    public static let plain = Self(rawValue: "plain")
    public static let destructive = Self(rawValue: "destructive")
    public static let all: [Self] = [.primary, .plain, .destructive]
}

public struct Bye: Codable, Equatable, Sendable {
    public var why: Why
}

public struct Card: Codable, Equatable, Sendable {
    public var badge: Label?
    public var blocks: [Block]?
    public var buttons: [Block]?
    public var fold: Fold?
    public var id: String?
    public var kind: CardKind?
    public var menu: [Act]?
    public var meta: Shown?
    public var push: Bool?
    public var show: Expr?
    public var subtitle: String?
    public var tap: Tap?
    public var title: String?
    public var tone: Tone?
}

public struct CardKind: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let ask = Self(rawValue: "ask")
    public static let run = Self(rawValue: "run")
    public static let secret = Self(rawValue: "secret")
    public static let config = Self(rawValue: "config")
    public static let proposal = Self(rawValue: "proposal")
    public static let all: [Self] = [.ask, .run, .secret, .config, .proposal]
}

public enum Cell: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case label(Label)

    public init(from decoder: any Decoder) throws {
        if let v = try? String(from: decoder) { self = .string(v) } else if let v = try? Double(from: decoder) { self = .number(v) } else if let v = try? Label(from: decoder) { self = .label(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no Cell")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .string(let v): try v.encode(to: encoder)
        case .number(let v): try v.encode(to: encoder)
        case .label(let v): try v.encode(to: encoder)
        }
    }
}

public struct Check: Codable, Equatable, Sendable {
    public var ok: Expr
    public var say: String
}

public enum Child: Codable, Equatable, Sendable {
    case block(Block)
    case lane(Lane)
    case round(Round)
    case tableRow(TableRow)

    public init(from decoder: any Decoder) throws {
        if let v = try? Block(from: decoder) { self = .block(v) } else if let v = try? Lane(from: decoder) { self = .lane(v) } else if let v = try? Round(from: decoder) { self = .round(v) } else if let v = try? TableRow(from: decoder) { self = .tableRow(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no Child")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .block(let v): try v.encode(to: encoder)
        case .lane(let v): try v.encode(to: encoder)
        case .round(let v): try v.encode(to: encoder)
        case .tableRow(let v): try v.encode(to: encoder)
        }
    }
}

public struct ChipOption: Codable, Equatable, Sendable {
    public var label: String
    public var value: String
}

public struct Chips: Codable, Equatable, Sendable {
    public var action: String?
    public var id: String?
    public var multi: Bool?
    public var name: String
    public var options: [ChipOption]
    public var selected: [String]?
    public var show: Expr?
}

public struct Choice: Codable, Equatable, Sendable {
    public var action: String
    public var `default`: ChoiceDefault?
    public var id: String?
    public var options: [ChoiceOption]
    public var other: Other?
    public var question: String?
    public var recommended: String?
    public var show: Expr?
    public var values: [String: JSONValue]?
}

public struct ChoiceDefault: Codable, Equatable, Sendable {
    public var label: String?
    public var until: String
    public var value: String
}

public struct ChoiceOption: Codable, Equatable, Sendable {
    public var confirm: Confirm?
    public var label: String
    public var value: String
    public var values: [String: JSONValue]?
}

public struct Column: Codable, Equatable, Sendable {
    public var align: Align?
    public var currency: String?
    public var digits: UInt8?
    public var era: Era?
    public var hide: Bool?
    public var id: String
    public var kind: ColumnKind
    public var label: String
    public var max: Double?
    public var phone: PhonePart?
    public var sort: Bool?
    public var tone: Tone?
    public var total: Total?
    public var unit: String?
    public var width: Int?
}

public struct ColumnKind: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let text = Self(rawValue: "text")
    public static let number = Self(rawValue: "number")
    public static let money = Self(rawValue: "money")
    public static let date = Self(rawValue: "date")
    public static let tone = Self(rawValue: "tone")
    public static let bar = Self(rawValue: "bar")
    public static let all: [Self] = [.text, .number, .money, .date, .tone, .bar]
}

public struct Composer: Codable, Equatable, Sendable {
    public var action: String
    public var acts: [String: String]?
    public var chips: [ComposerChip]?
    public var id: String?
    public var label: String?
    public var placeholder: String?
    public var queued: [Queued]?
    public var show: Expr?
    public var values: [String: JSONValue]?
    public var working: Working?
}

public struct ComposerChip: Codable, Equatable, Sendable {
    public var all: [String]
    public var cur: String?
    public var name: String
}

public struct Confirm: Codable, Equatable, Sendable {
    public var destructive: Bool?
    public var message: String?
    public var ok: String?
    public var title: String
}

public struct Diagram: Codable, Equatable, Sendable {
    public var counts: [String: Double]?
    public var id: String?
    public var nodes: [String: Node]?
    public var selected: String?
    public var show: Expr?
    public var source: String
    public var title: String?
}

public struct Diff: Codable, Equatable, Sendable {
    public var file: String
    public var hunks: [Hunk]
    public var id: String?
    public var show: Expr?
    public var summary: String?
}

public struct Editor: Codable, Equatable, Sendable {
    public var action: String
    public var errors: [LineError]?
    public var first: UInt32?
    public var id: String?
    public var name: String
    public var show: Expr?
    public var text: String
}

public struct Era: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let be = Self(rawValue: "be")
    public static let all: [Self] = [.be]
}

public struct ExportFormat: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let csv = Self(rawValue: "csv")
    public static let xlsx = Self(rawValue: "xlsx")
    public static let all: [Self] = [.csv, .xlsx]
}

public indirect enum Expr: Codable, Equatable, Sendable {
    case get(String)
    case not(Expr)
    case all([Expr])
    case `any`([Expr])
    case eq([Expr])
    case lt([Expr])
    case len(Expr)
    case has([Expr])
    case `is`(Match)
    case add([Expr])
    case sub([Expr])
    case mul([Expr])
    case div([Expr])
    case cat([Expr])
    case pick([Expr])
    case lit(Lit)
    case unknown(JSONValue)

    private struct Key: CodingKey {
        let stringValue: String
        var intValue: Int? { nil }
        init(_ s: String) { stringValue = s }
        init?(stringValue: String) { self.init(stringValue) }
        init?(intValue: Int) { nil }
    }

    public init(from decoder: any Decoder) throws {
        if let c = try? decoder.container(keyedBy: Key.self), c.allKeys.count == 1, let k = c.allKeys.first {
            switch k.stringValue {
            case "get": if let v = try? c.decode(String.self, forKey: k) { self = .get(v); return }
            case "not": if let v = try? c.decode(Expr.self, forKey: k) { self = .not(v); return }
            case "all": if let v = try? c.decode([Expr].self, forKey: k) { self = .all(v); return }
            case "any": if let v = try? c.decode([Expr].self, forKey: k) { self = .`any`(v); return }
            case "eq": if let v = try? c.decode([Expr].self, forKey: k) { self = .eq(v); return }
            case "lt": if let v = try? c.decode([Expr].self, forKey: k) { self = .lt(v); return }
            case "len": if let v = try? c.decode(Expr.self, forKey: k) { self = .len(v); return }
            case "has": if let v = try? c.decode([Expr].self, forKey: k) { self = .has(v); return }
            case "is": if let v = try? c.decode(Match.self, forKey: k) { self = .`is`(v); return }
            case "add": if let v = try? c.decode([Expr].self, forKey: k) { self = .add(v); return }
            case "sub": if let v = try? c.decode([Expr].self, forKey: k) { self = .sub(v); return }
            case "mul": if let v = try? c.decode([Expr].self, forKey: k) { self = .mul(v); return }
            case "div": if let v = try? c.decode([Expr].self, forKey: k) { self = .div(v); return }
            case "cat": if let v = try? c.decode([Expr].self, forKey: k) { self = .cat(v); return }
            case "pick": if let v = try? c.decode([Expr].self, forKey: k) { self = .pick(v); return }
            default: break
            }
            self = .unknown(try JSONValue(from: decoder)); return
        }
        self = .lit(try Lit(from: decoder))
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .get(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("get"))
        case .not(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("not"))
        case .all(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("all"))
        case .`any`(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("any"))
        case .eq(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("eq"))
        case .lt(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("lt"))
        case .len(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("len"))
        case .has(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("has"))
        case .`is`(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("is"))
        case .add(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("add"))
        case .sub(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("sub"))
        case .mul(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("mul"))
        case .div(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("div"))
        case .cat(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("cat"))
        case .pick(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("pick"))
        case .lit(let v): try v.encode(to: encoder)
        case .unknown(let v): try v.encode(to: encoder)
        }
    }
}

public struct Fallback: Codable, Equatable, Sendable {
    public var subtitle: String?
    public var tap: Tap?
    public var title: String
}

public struct Field: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var keyboard: Keyboard?
    public var label: String?
    public var name: String
    public var open: Bool?
    public var options: [String]?
    public var placeholder: String?
    public var set: Bool?
    public var show: Expr?
    public var type: FieldKind
    public var value: FieldValue?
    public var was: String?
}

public struct FieldKind: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let text = Self(rawValue: "text")
    public static let toggle = Self(rawValue: "toggle")
    public static let picker = Self(rawValue: "picker")
    public static let secret = Self(rawValue: "secret")
    public static let all: [Self] = [.text, .toggle, .picker, .secret]
}

public enum FieldValue: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)

    public init(from decoder: any Decoder) throws {
        if let v = try? String(from: decoder) { self = .string(v) } else if let v = try? Double(from: decoder) { self = .number(v) } else if let v = try? Bool(from: decoder) { self = .bool(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no FieldValue")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .string(let v): try v.encode(to: encoder)
        case .number(let v): try v.encode(to: encoder)
        case .bool(let v): try v.encode(to: encoder)
        }
    }
}

public struct Figure: Codable, Equatable, Sendable {
    public var avatar: String?
    public var coat: String?
    public var grow: String?
    public var icon: String?
    public var state: Tone?
    public var tool: String?
}

public struct Finding: Codable, Equatable, Sendable {
    public var at: String
    public var file: String
    public var fix: String
    public var line: UInt32?
    public var message: String
    public var rule: String
    public var severity: Severity
    public var steps: String?
}

public struct Fold: Codable, Equatable, Sendable {
    public var line: String
    public var main: FoldMain?
}

public struct FoldMain: Codable, Equatable, Sendable {
    public var action: String
    public var block: String?
    public var label: String
    public var value: String?
    public var values: [String: JSONValue]?
}

public struct Form: Codable, Equatable, Sendable {
    public var action: String?
    public var fields: [Field]
    public var id: String?
    public var show: Expr?
    public var submit: Submit?
}

public struct Gesture: Codable, Equatable, Sendable {
    public var action: String
    public var enabled: Expr?
    public var name: String
}

public struct Have: Codable, Equatable, Sendable {
    public var k: String
    public var rev: UInt64?
}

public struct Hello: Codable, Equatable, Sendable {
    public var epoch: String
    public var keys: Int
    public var sid: String
    public var v: UInt8
}

public struct Hero: Codable, Equatable, Sendable {
    public var actions: [Act]?
    public var id: String?
    public var media: Media?
    public var show: Expr?
    public var subtitle: String?
    public var title: String
}

public struct Hunk: Codable, Equatable, Sendable {
    public var at: String
    public var lines: [String]
}

public struct Image: Codable, Equatable, Sendable {
    public var alt: String?
    public var caption: String?
    public var src: String
}

public struct ImageSize: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let small = Self(rawValue: "small")
    public static let large = Self(rawValue: "large")
    public static let all: [Self] = [.small, .large]
}

public struct Images: Codable, Equatable, Sendable {
    public var id: String?
    public var items: [Image]
    public var show: Expr?
    public var size: ImageSize?
}

public struct Island: Codable, Equatable, Sendable {
    public var events: [String]?
    public var fallback: Fallback
    public var id: String?
    public var name: String
    public var props: [String: JSONValue]?
    public var show: Expr?
    public var size: IslandSize?
}

public struct IslandSize: Codable, Equatable, Sendable {
    public var aspect: String?
    public var height: UInt32?
    public var width: UInt32?
}

public struct KeyState: Codable, Equatable, Sendable {
    public var gone: Int?
    public var k: String
    public var ops: [Op]?
    public var rev: UInt64?
    public var screen: Block?
}

public struct Keyboard: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let `default` = Self(rawValue: "default")
    public static let url = Self(rawValue: "url")
    public static let number = Self(rawValue: "number")
    public static let all: [Self] = [.`default`, .url, .number]
}

public struct Label: Codable, Equatable, Sendable {
    public var text: Shown
    public var tone: Tone?
}

public struct Lane: Codable, Equatable, Sendable {
    public var id: String
    public var since: String?
    public var stage: String?
    public var state: LaneState
    public var tap: Tap?
    public var title: String
    public var tool: String?
}

public struct LaneState: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let working = Self(rawValue: "working")
    public static let needs = Self(rawValue: "needs")
    public static let done = Self(rawValue: "done")
    public static let idle = Self(rawValue: "idle")
    public static let fail = Self(rawValue: "fail")
    public static let merged = Self(rawValue: "merged")
    public static let all: [Self] = [.working, .needs, .done, .idle, .fail, .merged]
}

public struct LineError: Codable, Equatable, Sendable {
    public var line: Int64
    public var message: String
}

public struct LineItem: Codable, Equatable, Sendable {
    public var id: String
    public var values: [String: JSONValue]
}

public struct Lines: Codable, Equatable, Sendable {
    public var action: String?
    public var add: String?
    public var balance: [String]?
    public var calc: [String: Expr]?
    public var columns: [Field]
    public var empty: String?
    public var errors: [RowError]?
    public var id: String?
    public var items: [LineItem]
    public var label: String?
    public var max: UInt32?
    public var min: UInt32?
    public var name: String
    public var scale: UInt8?
    public var show: Expr?
    public var submit: Submit?
    public var sum: [String]?
}

public struct Link: Codable, Equatable, Sendable {
    public var label: String
    public var tap: Tap
}

public struct List: Codable, Equatable, Sendable {
    public var id: String?
    public var reorder: Gesture?
    public var rows: [Block]
    public var show: Expr?
}

public enum Lit: Codable, Equatable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)

    public init(from decoder: any Decoder) throws {
        if (try? decoder.singleValueContainer().decodeNil()) == true { self = .null } else if let v = try? Bool(from: decoder) { self = .bool(v) } else if let v = try? Double(from: decoder) { self = .number(v) } else if let v = try? String(from: decoder) { self = .string(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no Lit")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .null: var c = encoder.singleValueContainer(); try c.encodeNil()
        case .bool(let v): try v.encode(to: encoder)
        case .number(let v): try v.encode(to: encoder)
        case .string(let v): try v.encode(to: encoder)
        }
    }
}

public struct Match: Codable, Equatable, Sendable {
    public var pattern: Pattern
    public var value: Expr
}

public struct Media: Codable, Equatable, Sendable {
    public var alt: String
    public var caption: String?
    public var height: UInt32
    public var id: String?
    public var poster: String?
    public var show: Expr?
    public var src: String
    public var video: Bool?
    public var width: UInt32
}

public struct Nav: Codable, Equatable, Sendable {
    public var brand: NavLink?
    public var id: String?
    public var links: [NavLink]
    public var show: Expr?
}

public struct NavLink: Codable, Equatable, Sendable {
    public var current: Bool?
    public var href: String
    public var label: String
}

public struct Node: Codable, Equatable, Sendable {
    public var coat: String?
    public var label: String?
    public var limit: String?
    public var state: Tone?
    public var tap: Tap?
    public var value: String?
}

public struct OldFrame: Codable, Equatable, Sendable {
    public var ops: [Op]
    public var seq: UInt64
}

public struct OpMerge: Codable, Equatable, Sendable {
    public var fields: [String: JSONValue]
    public var id: String
}

public struct OpInsert: Codable, Equatable, Sendable {
    public var after: String?
    public var before: String?
    public var block: Child
    public var into: String
}

public struct OpMove: Codable, Equatable, Sendable {
    public var before: String?
    public var id: String
    public var into: String
}

public struct OpRemove: Codable, Equatable, Sendable {
    public var id: String
}

public struct OpReplace: Codable, Equatable, Sendable {
    public var block: Block
    public var id: String
}

public struct OpBadge: Codable, Equatable, Sendable {
    public var count: UInt64
}

public struct OpDot: Codable, Equatable, Sendable {
    public var on: Bool
}

public struct OpScreen: Codable, Equatable, Sendable {
    public var screen: Block
}

public enum Op: Codable, Equatable, Sendable {
    case merge(OpMerge)
    case insert(OpInsert)
    case move(OpMove)
    case remove(OpRemove)
    case replace(OpReplace)
    case badge(OpBadge)
    case dot(OpDot)
    case screen(OpScreen)
    case unknown

    private enum Tag: String, CodingKey { case tag = "op" }

    public init(from decoder: any Decoder) throws {
        switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {
        case "merge": self = .merge(try OpMerge(from: decoder))
        case "insert": self = .insert(try OpInsert(from: decoder))
        case "move": self = .move(try OpMove(from: decoder))
        case "remove": self = .remove(try OpRemove(from: decoder))
        case "replace": self = .replace(try OpReplace(from: decoder))
        case "badge": self = .badge(try OpBadge(from: decoder))
        case "dot": self = .dot(try OpDot(from: decoder))
        case "screen": self = .screen(try OpScreen(from: decoder))
        default: self = .unknown
        }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .merge(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("merge", forKey: .tag)
        case .insert(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("insert", forKey: .tag)
        case .move(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("move", forKey: .tag)
        case .remove(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("remove", forKey: .tag)
        case .replace(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("replace", forKey: .tag)
        case .badge(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("badge", forKey: .tag)
        case .dot(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("dot", forKey: .tag)
        case .screen(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("screen", forKey: .tag)
        case .unknown: var c = encoder.container(keyedBy: Tag.self); try c.encode("unknown", forKey: .tag)
        }
    }
}

public struct Other: Codable, Equatable, Sendable {
    public var `for`: String?
    public var placeholder: String?
}

public struct PartHeading: Codable, Equatable, Sendable {
    public var level: UInt8
    public var spans: [Span]
}

public struct PartPara: Codable, Equatable, Sendable {
    public var spans: [Span]
}

public struct PartList: Codable, Equatable, Sendable {
    public var items: [[Span]]
    public var ordered: Bool
}

public struct PartQuote: Codable, Equatable, Sendable {
    public var spans: [Span]
}

public struct PartCode: Codable, Equatable, Sendable {
    public var lang: String?
    public var text: String
}

public struct PartRule: Codable, Equatable, Sendable {
}

public enum Part: Codable, Equatable, Sendable {
    case heading(PartHeading)
    case para(PartPara)
    case list(PartList)
    case quote(PartQuote)
    case code(PartCode)
    case rule(PartRule)
    case unknown

    private enum Tag: String, CodingKey { case tag = "part" }

    public init(from decoder: any Decoder) throws {
        switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {
        case "heading": self = .heading(try PartHeading(from: decoder))
        case "para": self = .para(try PartPara(from: decoder))
        case "list": self = .list(try PartList(from: decoder))
        case "quote": self = .quote(try PartQuote(from: decoder))
        case "code": self = .code(try PartCode(from: decoder))
        case "rule": self = .rule(try PartRule(from: decoder))
        default: self = .unknown
        }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .heading(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("heading", forKey: .tag)
        case .para(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("para", forKey: .tag)
        case .list(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("list", forKey: .tag)
        case .quote(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("quote", forKey: .tag)
        case .code(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("code", forKey: .tag)
        case .rule(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("rule", forKey: .tag)
        case .unknown: var c = encoder.container(keyedBy: Tag.self); try c.encode("unknown", forKey: .tag)
        }
    }
}

public struct Pattern: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let filled = Self(rawValue: "filled")
    public static let email = Self(rawValue: "email")
    public static let url = Self(rawValue: "url")
    public static let number = Self(rawValue: "number")
    public static let all: [Self] = [.filled, .email, .url, .number]
}

public struct Pending: Codable, Equatable, Sendable {
    public var count: String
    public var discard: Tap
    public var review: Tap
    public var text: String
}

public struct PhonePart: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let title = Self(rawValue: "title")
    public static let tag = Self(rawValue: "tag")
    public static let value = Self(rawValue: "value")
    public static let meta = Self(rawValue: "meta")
    public static let hide = Self(rawValue: "hide")
    public static let all: [Self] = [.title, .tag, .value, .meta, .hide]
}

public struct Plan: Codable, Equatable, Sendable {
    public var out: String
    public var runs: [PlanRun]
}

public struct PlanRun: Codable, Equatable, Sendable {
    public var css: [String]
    public var kinds: [String]
    public var name: String
    public var probes: Bool
    public var screen: String
    public var scripts: [String]
    public var size: String
    public var steps: [Step]
}

public struct Prose: Codable, Equatable, Sendable {
    public var id: String?
    public var parts: [Part]
    public var show: Expr?
}

public struct Queued: Codable, Equatable, Sendable {
    public var q: UInt64
    public var text: String
}

public struct Report: Codable, Equatable, Sendable {
    public var dropped: [String]
    public var sent: [Action]
    public var shots: [String]
    public var timings: Timings
}

public struct Round: Codable, Equatable, Sendable {
    public var blocks: [Block]?
    public var id: String
    public var lane: RoundLane?
    public var links: [Link]?
    public var name: String
    public var since: String?
    public var state: LaneState
    public var summary: String?
    public var tap: Tap?
}

public struct RoundLane: Codable, Equatable, Sendable {
    public var harness: String?
    public var host: String?
    public var lines: [String]?
    public var model: String?
    public var name: String?
}

public struct Row: Codable, Equatable, Sendable {
    public var accessory: Accessory?
    public var badge: Label?
    public var button: Act?
    public var changed: Bool?
    public var figure: Figure?
    public var handle: Bool?
    public var id: String?
    public var indent: UInt8?
    public var lifted: Bool?
    public var menu: [Act]?
    public var rounds: [Round]?
    public var show: Expr?
    public var sticky: Bool?
    public var style: RowStyle?
    public var subtitle: Toned?
    public var swipe: [Act]?
    public var tap: Tap?
    public var title: String
    public var value: Shown?
}

public struct RowError: Codable, Equatable, Sendable {
    public var message: String
    public var name: String?
    public var row: String?
}

public struct RowStyle: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let link = Self(rawValue: "link")
    public static let destructive = Self(rawValue: "destructive")
    public static let all: [Self] = [.link, .destructive]
}

public struct Run: Codable, Equatable, Sendable {
    public var action: String
    public var command: String
    public var dir: String?
    public var id: String?
    public var sha: String
    public var show: Expr?
    public var touches: String?
    public var until: String?
}

public struct Scene: Codable, Equatable, Sendable {
    public var id: String?
    public var label: String?
    public var lanes: [Lane]?
    public var show: Expr?
}

public struct Screen: Codable, Equatable, Sendable {
    public var actions: [Act]?
    public var back: String?
    public var badge: UInt64?
    public var blocks: [Block]?
    public var done: Submit?
    public var focus: Bool?
    public var id: String?
    public var large: Bool?
    public var pending: Pending?
    public var personas: [[String: JSONValue]]?
    public var refresh: Bool?
    public var show: Expr?
    public var sites: UInt64?
    public var source: String?
    public var state: [String: Lit]?
    public var stream: String?
    public var threads: [[String: JSONValue]]?
    public var title: String?
    public var url: String?
}

public struct Secret: Codable, Equatable, Sendable {
    public var action: String
    public var id: String?
    public var label: String?
    public var name: String
    public var placeholder: String?
    public var set: Bool?
    public var show: Expr?
    public var values: [String: JSONValue]?
}

public struct Section: Codable, Equatable, Sendable {
    public var blocks: [Block]
    public var footer: String?
    public var header: String?
    public var id: String?
    public var show: Expr?
}

public struct Seen: Codable, Equatable, Sendable {
    public var at: String
    public var detail: String
    public var file: String?
    public var line: UInt32?
    public var rule: String
    public var run: String?
    public var shot: String?
}

public struct SetState: Codable, Equatable, Sendable {
    public var key: String
    public var to: Expr
}

public struct Severity: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let error = Self(rawValue: "error")
    public static let warn = Self(rawValue: "warn")
    public static let all: [Self] = [.error, .warn]
}

public struct Sheet: Codable, Equatable, Sendable {
    public var blocks: [Block]
    public var cancel: String?
    public var done: Submit?
    public var id: String?
    public var show: Expr?
    public var title: String
}

public enum Shown: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case bound(Bound)
    case time(Time)

    public init(from decoder: any Decoder) throws {
        if let v = try? String(from: decoder) { self = .string(v) } else if let v = try? Double(from: decoder) { self = .number(v) } else if let v = try? Bound(from: decoder) { self = .bound(v) } else if let v = try? Time(from: decoder) { self = .time(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no Shown")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .string(let v): try v.encode(to: encoder)
        case .number(let v): try v.encode(to: encoder)
        case .bound(let v): try v.encode(to: encoder)
        case .time(let v): try v.encode(to: encoder)
        }
    }
}

public struct SortDir: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let asc = Self(rawValue: "asc")
    public static let desc = Self(rawValue: "desc")
    public static let all: [Self] = [.asc, .desc]
}

public struct Span: Codable, Equatable, Sendable {
    public var bold: Bool?
    public var code: Bool?
    public var italic: Bool?
    public var link: String?
    public var text: String
}

public struct Stage: Codable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var sub: String?
    public var tap: Tap?
}

public struct Stat: Codable, Equatable, Sendable {
    public var id: String?
    public var items: [Tile]?
    public var label: String?
    public var show: Expr?
    public var spark: [Double]?
    public var tone: Tone?
    public var unit: String?
    public var value: Shown?
}

public indirect enum Step: Codable, Equatable, Sendable {
    case tap(StepOn)
    case type(StepType)
    case scroll(StepOn)
    case frame(Frame)
    case answer(Answer)
    case shot(StepShot)
    case gesture(StepGesture)
    case refuse(StepRefuse)
    case unknown(JSONValue)

    private struct Key: CodingKey {
        let stringValue: String
        var intValue: Int? { nil }
        init(_ s: String) { stringValue = s }
        init?(stringValue: String) { self.init(stringValue) }
        init?(intValue: Int) { nil }
    }

    public init(from decoder: any Decoder) throws {
        if let c = try? decoder.container(keyedBy: Key.self), c.allKeys.count == 1, let k = c.allKeys.first {
            switch k.stringValue {
            case "tap": if let v = try? c.decode(StepOn.self, forKey: k) { self = .tap(v); return }
            case "type": if let v = try? c.decode(StepType.self, forKey: k) { self = .type(v); return }
            case "scroll": if let v = try? c.decode(StepOn.self, forKey: k) { self = .scroll(v); return }
            case "frame": if let v = try? c.decode(Frame.self, forKey: k) { self = .frame(v); return }
            case "answer": if let v = try? c.decode(Answer.self, forKey: k) { self = .answer(v); return }
            case "shot": if let v = try? c.decode(StepShot.self, forKey: k) { self = .shot(v); return }
            case "gesture": if let v = try? c.decode(StepGesture.self, forKey: k) { self = .gesture(v); return }
            case "refuse": if let v = try? c.decode(StepRefuse.self, forKey: k) { self = .refuse(v); return }
            default: break
            }
            self = .unknown(try JSONValue(from: decoder)); return
        }
        self = .unknown(try JSONValue(from: decoder))
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .tap(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("tap"))
        case .type(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("type"))
        case .scroll(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("scroll"))
        case .frame(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("frame"))
        case .answer(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("answer"))
        case .shot(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("shot"))
        case .gesture(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("gesture"))
        case .refuse(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("refuse"))
        case .unknown(let v): try v.encode(to: encoder)
        }
    }
}

public struct StepGesture: Codable, Equatable, Sendable {
    public var grab: JSONValue
    public var id: String
    public var reach: [JSONValue]
    public var via: Via
}

public struct StepOn: Codable, Equatable, Sendable {
    public var id: String
}

public struct StepRefuse: Codable, Equatable, Sendable {
    public var toast: String
}

public struct StepShot: Codable, Equatable, Sendable {
    public var name: String
}

public struct StepType: Codable, Equatable, Sendable {
    public var id: String
    public var text: String
}

public struct Steps: Codable, Equatable, Sendable {
    public var bars: [Bar]?
    public var current: String?
    public var done: Bool?
    public var fallback: Fallback?
    public var id: String?
    public var show: Expr?
    public var steps: [Stage]?
    public var title: String?
}

public struct Submit: Codable, Equatable, Sendable {
    public var action: String
    public var label: String
    public var off: Bool?
    public var values: [String: JSONValue]?
}

public struct Sync: Codable, Equatable, Sendable {
    public var close: [String]?
    public var open: [Have]
}

public struct Synced: Codable, Equatable, Sendable {
    public var keys: [KeyState]
}

public struct Table: Codable, Equatable, Sendable {
    public var columns: [Column]
    public var empty: String?
    public var export: [ExportFormat]?
    public var filter: Bool?
    public var id: String?
    public var rows: [TableRow]
    public var select: TableSelect?
    public var show: Expr?
    public var sort: TableSort?
    public var title: String?
}

public struct TableRow: Codable, Equatable, Sendable {
    public var cells: [String: Cell]
    public var id: String
    public var tap: Tap?
}

public struct TableSelect: Codable, Equatable, Sendable {
    public var actions: [BulkAction]
}

public struct TableSort: Codable, Equatable, Sendable {
    public var by: String
    public var dir: SortDir
}

public struct Tap: Codable, Equatable, Sendable {
    public var action: String?
    public var copy: String?
    public var focus: String?
    public var open: String?
    public var set: [SetState]?
    public var sheet: String?
    public var thread: String?
    public var url: String?
    public var values: [String: JSONValue]?
}

public struct Text: Codable, Equatable, Sendable {
    public var center: Bool?
    public var font: String?
    public var id: String?
    public var markdown: String?
    public var show: Expr?
    public var size: Double?
    public var style: TextStyle?
    public var text: String?
    public var tone: Tone?
    public var top: Double?
    public var until: String?
    public var weight: String?
}

public struct TextStyle: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let body = Self(rawValue: "body")
    public static let footnote = Self(rawValue: "footnote")
    public static let all: [Self] = [.body, .footnote]
}

public struct Tile: Codable, Equatable, Sendable {
    public var label: String
    public var spark: [Double]?
    public var tone: Tone?
    public var unit: String?
    public var value: Shown
}

public struct Time: Codable, Equatable, Sendable {
    public var label: String?
    public var since: String?
    public var until: String?
}

public struct Timings: Codable, Equatable, Sendable {
    public var first_paint_ms: Double
    public var frames_over_budget: UInt32?
    public var longest_frame_ms: Double?
    public var longest_patch_ms: Double?
    public var steps_ms: [Double]
}

public struct Toast: Codable, Equatable, Sendable {
    public var fallback: Fallback?
    public var id: String?
    public var show: Expr?
    public var title: String
    public var tone: Tone?
    public var undo: Undo?
}

public struct Tone: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let ok = Self(rawValue: "ok")
    public static let warn = Self(rawValue: "warn")
    public static let bad = Self(rawValue: "bad")
    public static let info = Self(rawValue: "info")
    public static let mute = Self(rawValue: "mute")
    public static let accent = Self(rawValue: "accent")
    public static let working = Self(rawValue: "working")
    public static let needs = Self(rawValue: "needs")
    public static let done = Self(rawValue: "done")
    public static let fail = Self(rawValue: "fail")
    public static let idle = Self(rawValue: "idle")
    public static let all: [Self] = [.ok, .warn, .bad, .info, .mute, .accent, .working, .needs, .done, .fail, .idle]
}

public enum Toned: Codable, Equatable, Sendable {
    case string(String)
    case label(Label)

    public init(from decoder: any Decoder) throws {
        if let v = try? String(from: decoder) { self = .string(v) } else if let v = try? Label(from: decoder) { self = .label(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no Toned")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .string(let v): try v.encode(to: encoder)
        case .label(let v): try v.encode(to: encoder)
        }
    }
}

public struct Total: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let sum = Self(rawValue: "sum")
    public static let avg = Self(rawValue: "avg")
    public static let count = Self(rawValue: "count")
    public static let all: [Self] = [.sum, .avg, .count]
}

public struct TreeDrawn: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let native = Self(rawValue: "native")
    public static let fallback = Self(rawValue: "fallback")
    public static let hidden = Self(rawValue: "hidden")
    public static let all: [Self] = [.native, .fallback, .hidden]
}

public struct TreeNode: Codable, Equatable, Sendable {
    public var children: [TreeNode]
    public var drawn: TreeDrawn
    public var id: String?
    public var kind: String
    public var name: String
    public var rect: [Double]?
    public var role: String
    public var text: String?
    public var variant: String?
}

public struct Undo: Codable, Equatable, Sendable {
    public var action: String
    public var confirm: Confirm?
    public var label: String?
    public var values: [String: JSONValue]?
}

public struct Via: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let pointer = Self(rawValue: "pointer")
    public static let keys = Self(rawValue: "keys")
    public static let action = Self(rawValue: "action")
    public static let all: [Self] = [.pointer, .keys, .action]
}

public struct Web: Codable, Equatable, Sendable {
    public var height: UInt32
    public var id: String?
    public var show: Expr?
    public var src: String
}

public struct Why: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let evicted = Self(rawValue: "evicted")
    public static let unpaired = Self(rawValue: "unpaired")
    public static let handover = Self(rawValue: "handover")
    public static let all: [Self] = [.evicted, .unpaired, .handover]
}

public struct Working: Codable, Equatable, Sendable {
    public var since: String
}
