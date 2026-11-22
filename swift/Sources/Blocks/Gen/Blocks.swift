public let blocksSchemaVersion = 2

public struct Frame: Codable, Equatable, Sendable {
    public var from: UInt64?
    public var k: String
    public var ops: [Op]?
    public var rev: UInt64
    public var screen: Block?

    public init(from: UInt64? = nil, k: String, ops: [Op]? = nil, rev: UInt64, screen: Block? = nil) {
        self.from = from
        self.k = k
        self.ops = ops
        self.rev = rev
        self.screen = screen
    }
}

public struct Accept: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let image = Self(rawValue: "image")
    public static let pdf = Self(rawValue: "pdf")
    public static let sheet = Self(rawValue: "sheet")
    public static let all: [Self] = [.image, .pdf, .sheet]
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

    public init(action: String? = nil, confirm: Confirm? = nil, enabled: Expr? = nil, icon: String? = nil, label: String, menu: [Act]? = nil, tap: Tap? = nil, tone: Tone? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.confirm = confirm
        self.enabled = enabled
        self.icon = icon
        self.label = label
        self.menu = menu
        self.tap = tap
        self.tone = tone
        self.values = values
    }
}

public struct Action: Codable, Equatable, Sendable {
    public var action: String
    public var block: String?
    public var screen: String
    public var values: [String: JSONValue]?

    public init(action: String, block: String? = nil, screen: String, values: [String: JSONValue]? = nil) {
        self.action = action
        self.block = block
        self.screen = screen
        self.values = values
    }
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

    public init(close: Bool? = nil, open: String? = nil, ops: [Op]? = nil, toast: Toast? = nil) {
        self.close = close
        self.open = open
        self.ops = ops
        self.toast = toast
    }
}

public struct AppBlock: Codable, Equatable, Sendable {
    public var fallback: Fallback?
    public var id: String?
    public var type: String

    public init(fallback: Fallback? = nil, id: String? = nil, type: String) {
        self.fallback = fallback
        self.id = id
        self.type = type
    }
}

public struct Attachment: Codable, Equatable, Sendable {
    public var name: String
    public var src: String?
    public var tap: Tap

    public init(name: String, src: String? = nil, tap: Tap) {
        self.name = name
        self.src = src
        self.tap = tap
    }
}

public struct Band: Codable, Equatable, Sendable {
    public var blocks: [Block]?
    public var header: String?
    public var id: String
    public var rows: [SceneRow]?
    public var type: String

    public init(blocks: [Block]? = nil, header: String? = nil, id: String, rows: [SceneRow]? = nil, type: String) {
        self.blocks = blocks
        self.header = header
        self.id = id
        self.rows = rows
        self.type = type
    }
}

public struct Bar: Codable, Equatable, Sendable {
    public var label: String
    public var sub: String?
    public var tone: Tone?
    public var value: UInt8

    public init(label: String, sub: String? = nil, tone: Tone? = nil, value: UInt8) {
        self.label = label
        self.sub = sub
        self.tone = tone
        self.value = value
    }
}

public enum Block: Codable, Equatable, Sendable {
    case screen(Screen)
    case modal(Modal)
    case sheet(Modal)
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
    case chart(Chart)
    case toast(Toast)
    case pages(Pages)
    case timeline(Timeline)
    case `import`(Import)
    case message(Message)
    case tool(Tool)
    case sidebar(Sidebar)
    case appBlock(JSONValue)

    public static let tags: Set<String> = ["screen", "modal", "sheet", "section", "list", "row", "card", "choice", "form", "config", "secret", "run", "button", "chips", "stat", "text", "images", "web", "diff", "editor", "scene", "diagram", "composer", "lines", "prose", "hero", "media", "nav", "island", "table", "steps", "chart", "toast", "pages", "timeline", "import", "message", "tool", "sidebar"]

    private enum Tag: String, CodingKey { case tag = "type" }

    public init(from decoder: any Decoder) throws {
        switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {
        case "screen": self = try (try? Screen(from: decoder)).map(Self.screen) ?? .appBlock(JSONValue(from: decoder))
        case "modal": self = try (try? Modal(from: decoder)).map(Self.modal) ?? .appBlock(JSONValue(from: decoder))
        case "sheet": self = try (try? Modal(from: decoder)).map(Self.sheet) ?? .appBlock(JSONValue(from: decoder))
        case "section": self = try (try? Section(from: decoder)).map(Self.section) ?? .appBlock(JSONValue(from: decoder))
        case "list": self = try (try? List(from: decoder)).map(Self.list) ?? .appBlock(JSONValue(from: decoder))
        case "row": self = try (try? Row(from: decoder)).map(Self.row) ?? .appBlock(JSONValue(from: decoder))
        case "card": self = try (try? Card(from: decoder)).map(Self.card) ?? .appBlock(JSONValue(from: decoder))
        case "choice": self = try (try? Choice(from: decoder)).map(Self.choice) ?? .appBlock(JSONValue(from: decoder))
        case "form": self = try (try? Form(from: decoder)).map(Self.form) ?? .appBlock(JSONValue(from: decoder))
        case "config": self = try (try? Form(from: decoder)).map(Self.config) ?? .appBlock(JSONValue(from: decoder))
        case "secret": self = try (try? Secret(from: decoder)).map(Self.secret) ?? .appBlock(JSONValue(from: decoder))
        case "run": self = try (try? Run(from: decoder)).map(Self.run) ?? .appBlock(JSONValue(from: decoder))
        case "button": self = try (try? Button(from: decoder)).map(Self.button) ?? .appBlock(JSONValue(from: decoder))
        case "chips": self = try (try? Chips(from: decoder)).map(Self.chips) ?? .appBlock(JSONValue(from: decoder))
        case "stat": self = try (try? Stat(from: decoder)).map(Self.stat) ?? .appBlock(JSONValue(from: decoder))
        case "text": self = try (try? Text(from: decoder)).map(Self.text) ?? .appBlock(JSONValue(from: decoder))
        case "images": self = try (try? Images(from: decoder)).map(Self.images) ?? .appBlock(JSONValue(from: decoder))
        case "web": self = try (try? Web(from: decoder)).map(Self.web) ?? .appBlock(JSONValue(from: decoder))
        case "diff": self = try (try? Diff(from: decoder)).map(Self.diff) ?? .appBlock(JSONValue(from: decoder))
        case "editor": self = try (try? Editor(from: decoder)).map(Self.editor) ?? .appBlock(JSONValue(from: decoder))
        case "scene": self = try (try? Scene(from: decoder)).map(Self.scene) ?? .appBlock(JSONValue(from: decoder))
        case "diagram": self = try (try? Diagram(from: decoder)).map(Self.diagram) ?? .appBlock(JSONValue(from: decoder))
        case "composer": self = try (try? Composer(from: decoder)).map(Self.composer) ?? .appBlock(JSONValue(from: decoder))
        case "lines": self = try (try? Lines(from: decoder)).map(Self.lines) ?? .appBlock(JSONValue(from: decoder))
        case "prose": self = try (try? Prose(from: decoder)).map(Self.prose) ?? .appBlock(JSONValue(from: decoder))
        case "hero": self = try (try? Hero(from: decoder)).map(Self.hero) ?? .appBlock(JSONValue(from: decoder))
        case "media": self = try (try? Media(from: decoder)).map(Self.media) ?? .appBlock(JSONValue(from: decoder))
        case "nav": self = try (try? Nav(from: decoder)).map(Self.nav) ?? .appBlock(JSONValue(from: decoder))
        case "island": self = try (try? Island(from: decoder)).map(Self.island) ?? .appBlock(JSONValue(from: decoder))
        case "table": self = try (try? Table(from: decoder)).map(Self.table) ?? .appBlock(JSONValue(from: decoder))
        case "steps": self = try (try? Steps(from: decoder)).map(Self.steps) ?? .appBlock(JSONValue(from: decoder))
        case "chart": self = try (try? Chart(from: decoder)).map(Self.chart) ?? .appBlock(JSONValue(from: decoder))
        case "toast": self = try (try? Toast(from: decoder)).map(Self.toast) ?? .appBlock(JSONValue(from: decoder))
        case "pages": self = try (try? Pages(from: decoder)).map(Self.pages) ?? .appBlock(JSONValue(from: decoder))
        case "timeline": self = try (try? Timeline(from: decoder)).map(Self.timeline) ?? .appBlock(JSONValue(from: decoder))
        case "import": self = try (try? Import(from: decoder)).map(Self.`import`) ?? .appBlock(JSONValue(from: decoder))
        case "message": self = try (try? Message(from: decoder)).map(Self.message) ?? .appBlock(JSONValue(from: decoder))
        case "tool": self = try (try? Tool(from: decoder)).map(Self.tool) ?? .appBlock(JSONValue(from: decoder))
        case "sidebar": self = try (try? Sidebar(from: decoder)).map(Self.sidebar) ?? .appBlock(JSONValue(from: decoder))
        default: self = .appBlock(try JSONValue(from: decoder))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .screen(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("screen", forKey: .tag)
        case .modal(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("modal", forKey: .tag)
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
        case .chart(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("chart", forKey: .tag)
        case .toast(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("toast", forKey: .tag)
        case .pages(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("pages", forKey: .tag)
        case .timeline(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("timeline", forKey: .tag)
        case .`import`(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("import", forKey: .tag)
        case .message(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("message", forKey: .tag)
        case .tool(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("tool", forKey: .tag)
        case .sidebar(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("sidebar", forKey: .tag)
        case .appBlock(let v): try v.encode(to: encoder)
        }
    }
}

public struct Bound: Codable, Equatable, Sendable {
    public var get: String

    public init(get: String) {
        self.get = get
    }
}

public struct BulkAction: Codable, Equatable, Sendable {
    public var action: String
    public var bad: Bool?
    public var label: String

    public init(action: String, bad: Bool? = nil, label: String) {
        self.action = action
        self.bad = bad
        self.label = label
    }
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

    public init(action: String? = nil, confirm: Confirm? = nil, enabled: Expr? = nil, id: String? = nil, label: String, show: Expr? = nil, style: ButtonStyle? = nil, tap: Tap? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.confirm = confirm
        self.enabled = enabled
        self.id = id
        self.label = label
        self.show = show
        self.style = style
        self.tap = tap
        self.values = values
    }
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

    public init(why: Why) {
        self.why = why
    }
}

public struct Card: Codable, Equatable, Sendable {
    public var badge: Label?
    public var blocks: [Block]?
    public var buttons: [Block]?
    public var color: String?
    public var fold: Fold?
    public var id: String?
    public var kind: CardKind?
    public var menu: [Act]?
    public var meta: Shown?
    public var push: Bool?
    public var show: Expr?
    public var subtitle: Toned?
    public var tap: Tap?
    public var title: String?
    public var tone: Tone?

    public init(badge: Label? = nil, blocks: [Block]? = nil, buttons: [Block]? = nil, color: String? = nil, fold: Fold? = nil, id: String? = nil, kind: CardKind? = nil, menu: [Act]? = nil, meta: Shown? = nil, push: Bool? = nil, show: Expr? = nil, subtitle: Toned? = nil, tap: Tap? = nil, title: String? = nil, tone: Tone? = nil) {
        self.badge = badge
        self.blocks = blocks
        self.buttons = buttons
        self.color = color
        self.fold = fold
        self.id = id
        self.kind = kind
        self.menu = menu
        self.meta = meta
        self.push = push
        self.show = show
        self.subtitle = subtitle
        self.tap = tap
        self.title = title
        self.tone = tone
    }
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

public struct Chart: Codable, Equatable, Sendable {
    public var chart: ChartKind
    public var empty: String?
    public var era: Era?
    public var format: ChartFormat?
    public var id: String?
    public var lang: String?
    public var move: Gesture?
    public var selected: String?
    public var series: [Series]
    public var show: Expr?
    public var tap: Tap?
    public var title: String
    public var x: [String]

    public init(chart: ChartKind, empty: String? = nil, era: Era? = nil, format: ChartFormat? = nil, id: String? = nil, lang: String? = nil, move: Gesture? = nil, selected: String? = nil, series: [Series], show: Expr? = nil, tap: Tap? = nil, title: String, x: [String]) {
        self.chart = chart
        self.empty = empty
        self.era = era
        self.format = format
        self.id = id
        self.lang = lang
        self.move = move
        self.selected = selected
        self.series = series
        self.show = show
        self.tap = tap
        self.title = title
        self.x = x
    }
}

public struct ChartFormat: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let count = Self(rawValue: "count")
    public static let thb = Self(rawValue: "thb")
    public static let thbM = Self(rawValue: "thb_m")
    public static let percent = Self(rawValue: "percent")
    public static let all: [Self] = [.count, .thb, .thbM, .percent]
}

public struct ChartKind: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let bar = Self(rawValue: "bar")
    public static let stacked = Self(rawValue: "stacked")
    public static let line = Self(rawValue: "line")
    public static let combo = Self(rawValue: "combo")
    public static let donut = Self(rawValue: "donut")
    public static let all: [Self] = [.bar, .stacked, .line, .combo, .donut]
}

public struct Check: Codable, Equatable, Sendable {
    public var ok: Expr
    public var say: String

    public init(ok: Expr, say: String) {
        self.ok = ok
        self.say = say
    }
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

    public init(label: String, value: String) {
        self.label = label
        self.value = value
    }
}

public struct Chips: Codable, Equatable, Sendable {
    public var action: String?
    public var id: String?
    public var multi: Bool?
    public var name: String
    public var options: [ChipOption]
    public var selected: [String]?
    public var show: Expr?

    public init(action: String? = nil, id: String? = nil, multi: Bool? = nil, name: String, options: [ChipOption], selected: [String]? = nil, show: Expr? = nil) {
        self.action = action
        self.id = id
        self.multi = multi
        self.name = name
        self.options = options
        self.selected = selected
        self.show = show
    }
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

    public init(action: String, `default`: ChoiceDefault? = nil, id: String? = nil, options: [ChoiceOption], other: Other? = nil, question: String? = nil, recommended: String? = nil, show: Expr? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.`default` = `default`
        self.id = id
        self.options = options
        self.other = other
        self.question = question
        self.recommended = recommended
        self.show = show
        self.values = values
    }
}

public struct ChoiceDefault: Codable, Equatable, Sendable {
    public var label: String?
    public var until: String
    public var value: String

    public init(label: String? = nil, until: String, value: String) {
        self.label = label
        self.until = until
        self.value = value
    }
}

public struct ChoiceOption: Codable, Equatable, Sendable {
    public var confirm: Confirm?
    public var label: String
    public var value: String
    public var values: [String: JSONValue]?

    public init(confirm: Confirm? = nil, label: String, value: String, values: [String: JSONValue]? = nil) {
        self.confirm = confirm
        self.label = label
        self.value = value
        self.values = values
    }
}

public struct Column: Codable, Equatable, Sendable {
    public var align: Align?
    public var currency: String?
    public var digits: UInt8?
    public var edit: Bool?
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

    public init(align: Align? = nil, currency: String? = nil, digits: UInt8? = nil, edit: Bool? = nil, era: Era? = nil, hide: Bool? = nil, id: String, kind: ColumnKind, label: String, max: Double? = nil, phone: PhonePart? = nil, sort: Bool? = nil, tone: Tone? = nil, total: Total? = nil, unit: String? = nil, width: Int? = nil) {
        self.align = align
        self.currency = currency
        self.digits = digits
        self.edit = edit
        self.era = era
        self.hide = hide
        self.id = id
        self.kind = kind
        self.label = label
        self.max = max
        self.phone = phone
        self.sort = sort
        self.tone = tone
        self.total = total
        self.unit = unit
        self.width = width
    }
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

    public init(action: String, acts: [String: String]? = nil, chips: [ComposerChip]? = nil, id: String? = nil, label: String? = nil, placeholder: String? = nil, queued: [Queued]? = nil, show: Expr? = nil, values: [String: JSONValue]? = nil, working: Working? = nil) {
        self.action = action
        self.acts = acts
        self.chips = chips
        self.id = id
        self.label = label
        self.placeholder = placeholder
        self.queued = queued
        self.show = show
        self.values = values
        self.working = working
    }
}

public struct ComposerChip: Codable, Equatable, Sendable {
    public var all: [String]
    public var cur: String?
    public var name: String

    public init(all: [String], cur: String? = nil, name: String) {
        self.all = all
        self.cur = cur
        self.name = name
    }
}

public struct Confirm: Codable, Equatable, Sendable {
    public var destructive: Bool?
    public var message: String?
    public var ok: String?
    public var title: String

    public init(destructive: Bool? = nil, message: String? = nil, ok: String? = nil, title: String) {
        self.destructive = destructive
        self.message = message
        self.ok = ok
        self.title = title
    }
}

public struct DaySpan: Codable, Equatable, Sendable {
    public var end: String
    public var id: String?
    public var row: String?
    public var start: String

    public init(end: String, id: String? = nil, row: String? = nil, start: String) {
        self.end = end
        self.id = id
        self.row = row
        self.start = start
    }
}

public struct Diagram: Codable, Equatable, Sendable {
    public var counts: [String: Double]?
    public var id: String?
    public var nodes: Nodes?
    public var selected: String?
    public var show: Expr?
    public var source: String
    public var title: String?

    public init(counts: [String: Double]? = nil, id: String? = nil, nodes: Nodes? = nil, selected: String? = nil, show: Expr? = nil, source: String, title: String? = nil) {
        self.counts = counts
        self.id = id
        self.nodes = nodes
        self.selected = selected
        self.show = show
        self.source = source
        self.title = title
    }
}

public struct Diff: Codable, Equatable, Sendable {
    public var file: String
    public var hunks: [Hunk]
    public var id: String?
    public var show: Expr?
    public var summary: String?

    public init(file: String, hunks: [Hunk], id: String? = nil, show: Expr? = nil, summary: String? = nil) {
        self.file = file
        self.hunks = hunks
        self.id = id
        self.show = show
        self.summary = summary
    }
}

public struct Editor: Codable, Equatable, Sendable {
    public var action: String
    public var errors: [LineError]?
    public var first: UInt32?
    public var id: String?
    public var name: String
    public var show: Expr?
    public var text: String

    public init(action: String, errors: [LineError]? = nil, first: UInt32? = nil, id: String? = nil, name: String, show: Expr? = nil, text: String) {
        self.action = action
        self.errors = errors
        self.first = first
        self.id = id
        self.name = name
        self.show = show
        self.text = text
    }
}

public struct Era: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let ce = Self(rawValue: "ce")
    public static let be = Self(rawValue: "be")
    public static let all: [Self] = [.ce, .be]
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

    public init(subtitle: String? = nil, tap: Tap? = nil, title: String) {
        self.subtitle = subtitle
        self.tap = tap
        self.title = title
    }
}

public enum Field: Codable, Equatable, Sendable {
    case text(TextField)
    case toggle(ToggleField)
    case picker(PickerField)
    case secret(SecretField)
    case upload(UploadField)
    case scan(ScanField)
    case otherField(JSONValue)

    public static let tags: Set<String> = ["text", "toggle", "picker", "secret", "upload", "scan"]

    private enum Tag: String, CodingKey { case tag = "type" }

    public init(from decoder: any Decoder) throws {
        switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {
        case "text": self = try (try? TextField(from: decoder)).map(Self.text) ?? .otherField(JSONValue(from: decoder))
        case "toggle": self = try (try? ToggleField(from: decoder)).map(Self.toggle) ?? .otherField(JSONValue(from: decoder))
        case "picker": self = try (try? PickerField(from: decoder)).map(Self.picker) ?? .otherField(JSONValue(from: decoder))
        case "secret": self = try (try? SecretField(from: decoder)).map(Self.secret) ?? .otherField(JSONValue(from: decoder))
        case "upload": self = try (try? UploadField(from: decoder)).map(Self.upload) ?? .otherField(JSONValue(from: decoder))
        case "scan": self = try (try? ScanField(from: decoder)).map(Self.scan) ?? .otherField(JSONValue(from: decoder))
        default: self = .otherField(try JSONValue(from: decoder))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .text(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("text", forKey: .tag)
        case .toggle(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("toggle", forKey: .tag)
        case .picker(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("picker", forKey: .tag)
        case .secret(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("secret", forKey: .tag)
        case .upload(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("upload", forKey: .tag)
        case .scan(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("scan", forKey: .tag)
        case .otherField(let v): try v.encode(to: encoder)
        }
    }
}

public struct FieldDrawn: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let native = Self(rawValue: "native")
    public static let plain = Self(rawValue: "plain")
    public static let hidden = Self(rawValue: "hidden")
    public static let all: [Self] = [.native, .plain, .hidden]
}

public struct FieldNode: Codable, Equatable, Sendable {
    public var drawn: FieldDrawn
    public var label: String
    public var name: String
    public var role: String
    public var type: String

    public init(drawn: FieldDrawn, label: String, name: String, role: String, type: String) {
        self.drawn = drawn
        self.label = label
        self.name = name
        self.role = role
        self.type = type
    }
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
    public var act: String?
    public var avatar: String?
    public var coat: String?
    public var grow: String?
    public var icon: String?
    public var issue: UInt64?
    public var load: String?
    public var moment: String?
    public var state: Tone?
    public var tool: String?

    public init(act: String? = nil, avatar: String? = nil, coat: String? = nil, grow: String? = nil, icon: String? = nil, issue: UInt64? = nil, load: String? = nil, moment: String? = nil, state: Tone? = nil, tool: String? = nil) {
        self.act = act
        self.avatar = avatar
        self.coat = coat
        self.grow = grow
        self.icon = icon
        self.issue = issue
        self.load = load
        self.moment = moment
        self.state = state
        self.tool = tool
    }
}

public struct FileLink: Codable, Equatable, Sendable {
    public var name: String
    public var src: String

    public init(name: String, src: String) {
        self.name = name
        self.src = src
    }
}

public struct FileRef: Codable, Equatable, Sendable {
    public var id: String
    public var name: String?
    public var src: String?

    public init(id: String, name: String? = nil, src: String? = nil) {
        self.id = id
        self.name = name
        self.src = src
    }
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

    public init(at: String, file: String, fix: String, line: UInt32? = nil, message: String, rule: String, severity: Severity, steps: String? = nil) {
        self.at = at
        self.file = file
        self.fix = fix
        self.line = line
        self.message = message
        self.rule = rule
        self.severity = severity
        self.steps = steps
    }
}

public struct Fold: Codable, Equatable, Sendable {
    public var line: String
    public var main: FoldMain?

    public init(line: String, main: FoldMain? = nil) {
        self.line = line
        self.main = main
    }
}

public struct FoldMain: Codable, Equatable, Sendable {
    public var action: String
    public var block: String?
    public var label: String
    public var value: String?
    public var values: [String: JSONValue]?

    public init(action: String, block: String? = nil, label: String, value: String? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.block = block
        self.label = label
        self.value = value
        self.values = values
    }
}

public struct Form: Codable, Equatable, Sendable {
    public var action: String?
    public var fields: [Field]
    public var id: String?
    public var more: String?
    public var show: Expr?
    public var submit: Submit?

    public init(action: String? = nil, fields: [Field], id: String? = nil, more: String? = nil, show: Expr? = nil, submit: Submit? = nil) {
        self.action = action
        self.fields = fields
        self.id = id
        self.more = more
        self.show = show
        self.submit = submit
    }
}

public struct Gesture: Codable, Equatable, Sendable {
    public var action: String
    public var enabled: Expr?
    public var name: String

    public init(action: String, enabled: Expr? = nil, name: String) {
        self.action = action
        self.enabled = enabled
        self.name = name
    }
}

public struct Handler: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let answers = Self(rawValue: "answers")
    public static let fails = Self(rawValue: "fails")
    public static let waits = Self(rawValue: "waits")
    public static let all: [Self] = [.answers, .fails, .waits]
}

public struct Have: Codable, Equatable, Sendable {
    public var k: String
    public var rev: UInt64?

    public init(k: String, rev: UInt64? = nil) {
        self.k = k
        self.rev = rev
    }
}

public struct Hello: Codable, Equatable, Sendable {
    public var epoch: String
    public var keys: Int
    public var sid: String
    public var v: UInt8

    public init(epoch: String, keys: Int, sid: String, v: UInt8) {
        self.epoch = epoch
        self.keys = keys
        self.sid = sid
        self.v = v
    }
}

public struct Hero: Codable, Equatable, Sendable {
    public var actions: [Act]?
    public var id: String?
    public var media: Media?
    public var show: Expr?
    public var subtitle: String?
    public var title: String

    public init(actions: [Act]? = nil, id: String? = nil, media: Media? = nil, show: Expr? = nil, subtitle: String? = nil, title: String) {
        self.actions = actions
        self.id = id
        self.media = media
        self.show = show
        self.subtitle = subtitle
        self.title = title
    }
}

public struct Hunk: Codable, Equatable, Sendable {
    public var at: String
    public var lines: [String]

    public init(at: String, lines: [String]) {
        self.at = at
        self.lines = lines
    }
}

public struct Image: Codable, Equatable, Sendable {
    public var alt: String?
    public var caption: String?
    public var src: String

    public init(alt: String? = nil, caption: String? = nil, src: String) {
        self.alt = alt
        self.caption = caption
        self.src = src
    }
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

    public init(id: String? = nil, items: [Image], show: Expr? = nil, size: ImageSize? = nil) {
        self.id = id
        self.items = items
        self.show = show
        self.size = size
    }
}

public struct Import: Codable, Equatable, Sendable {
    public var accept: [String]?
    public var action: String?
    public var columns: [ImportColumn]
    public var done: ImportDone?
    public var error: String?
    public var id: String?
    public var into: String?
    public var mb: UInt32?
    public var read: String?
    public var refused: [ImportRow]?
    public var sheet: ImportSheet?
    public var show: Expr?
    public var template: FileLink?
    public var title: String

    public init(accept: [String]? = nil, action: String? = nil, columns: [ImportColumn], done: ImportDone? = nil, error: String? = nil, id: String? = nil, into: String? = nil, mb: UInt32? = nil, read: String? = nil, refused: [ImportRow]? = nil, sheet: ImportSheet? = nil, show: Expr? = nil, template: FileLink? = nil, title: String) {
        self.accept = accept
        self.action = action
        self.columns = columns
        self.done = done
        self.error = error
        self.id = id
        self.into = into
        self.mb = mb
        self.read = read
        self.refused = refused
        self.sheet = sheet
        self.show = show
        self.template = template
        self.title = title
    }
}

public struct ImportColumn: Codable, Equatable, Sendable {
    public var key: String
    public var label: String
    public var required: Bool?
    public var type: ImportType?
    public var values: [String]?

    public init(key: String, label: String, required: Bool? = nil, type: ImportType? = nil, values: [String]? = nil) {
        self.key = key
        self.label = label
        self.required = required
        self.type = type
        self.values = values
    }
}

public struct ImportDone: Codable, Equatable, Sendable {
    public var count: UInt32
    public var file: FileLink?
    public var left: UInt32?

    public init(count: UInt32, file: FileLink? = nil, left: UInt32? = nil) {
        self.count = count
        self.file = file
        self.left = left
    }
}

public struct ImportFile: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var rows: UInt32
    public var sheet: String?
    public var sheets: [String]?
    public var size: UInt32?

    public init(id: String, name: String, rows: UInt32, sheet: String? = nil, sheets: [String]? = nil, size: UInt32? = nil) {
        self.id = id
        self.name = name
        self.rows = rows
        self.sheet = sheet
        self.sheets = sheets
        self.size = size
    }
}

public struct ImportRow: Codable, Equatable, Sendable {
    public var bad: [String: String]?
    public var cells: [String: String]
    public var n: UInt32

    public init(bad: [String: String]? = nil, cells: [String: String], n: UInt32) {
        self.bad = bad
        self.cells = cells
        self.n = n
    }
}

public struct ImportSheet: Codable, Equatable, Sendable {
    public var bad: [ImportRow]?
    public var file: ImportFile
    public var headers: [String]
    public var map: [String: String]
    public var rows: [ImportRow]

    public init(bad: [ImportRow]? = nil, file: ImportFile, headers: [String], map: [String: String], rows: [ImportRow]) {
        self.bad = bad
        self.file = file
        self.headers = headers
        self.map = map
        self.rows = rows
    }
}

public struct ImportType: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let text = Self(rawValue: "text")
    public static let number = Self(rawValue: "number")
    public static let money = Self(rawValue: "money")
    public static let date = Self(rawValue: "date")
    public static let choice = Self(rawValue: "choice")
    public static let all: [Self] = [.text, .number, .money, .date, .choice]
}

public struct Island: Codable, Equatable, Sendable {
    public var events: [String]?
    public var fallback: Fallback
    public var id: String?
    public var name: String
    public var props: [String: JSONValue]?
    public var show: Expr?
    public var size: IslandSize?

    public init(events: [String]? = nil, fallback: Fallback, id: String? = nil, name: String, props: [String: JSONValue]? = nil, show: Expr? = nil, size: IslandSize? = nil) {
        self.events = events
        self.fallback = fallback
        self.id = id
        self.name = name
        self.props = props
        self.show = show
        self.size = size
    }
}

public struct IslandSize: Codable, Equatable, Sendable {
    public var aspect: String?
    public var height: UInt32?
    public var width: UInt32?

    public init(aspect: String? = nil, height: UInt32? = nil, width: UInt32? = nil) {
        self.aspect = aspect
        self.height = height
        self.width = width
    }
}

public struct KeyState: Codable, Equatable, Sendable {
    public var gone: Int?
    public var k: String
    public var ops: [Op]?
    public var rev: UInt64?
    public var screen: Block?

    public init(gone: Int? = nil, k: String, ops: [Op]? = nil, rev: UInt64? = nil, screen: Block? = nil) {
        self.gone = gone
        self.k = k
        self.ops = ops
        self.rev = rev
        self.screen = screen
    }
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

    public init(text: Shown, tone: Tone? = nil) {
        self.text = text
        self.tone = tone
    }
}

public struct Lane: Codable, Equatable, Sendable {
    public var id: String
    public var since: String?
    public var stage: String?
    public var state: LaneState
    public var tap: Tap?
    public var title: String
    public var tool: String?

    public init(id: String, since: String? = nil, stage: String? = nil, state: LaneState, tap: Tap? = nil, title: String, tool: String? = nil) {
        self.id = id
        self.since = since
        self.stage = stage
        self.state = state
        self.tap = tap
        self.title = title
        self.tool = tool
    }
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

public struct Lang: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let en = Self(rawValue: "en")
    public static let th = Self(rawValue: "th")
    public static let all: [Self] = [.en, .th]
}

public struct LineError: Codable, Equatable, Sendable {
    public var line: Int64
    public var message: String

    public init(line: Int64, message: String) {
        self.line = line
        self.message = message
    }
}

public struct LineItem: Codable, Equatable, Sendable {
    public var id: String
    public var values: [String: JSONValue]

    public init(id: String, values: [String: JSONValue]) {
        self.id = id
        self.values = values
    }
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

    public init(action: String? = nil, add: String? = nil, balance: [String]? = nil, calc: [String: Expr]? = nil, columns: [Field], empty: String? = nil, errors: [RowError]? = nil, id: String? = nil, items: [LineItem], label: String? = nil, max: UInt32? = nil, min: UInt32? = nil, name: String, scale: UInt8? = nil, show: Expr? = nil, submit: Submit? = nil, sum: [String]? = nil) {
        self.action = action
        self.add = add
        self.balance = balance
        self.calc = calc
        self.columns = columns
        self.empty = empty
        self.errors = errors
        self.id = id
        self.items = items
        self.label = label
        self.max = max
        self.min = min
        self.name = name
        self.scale = scale
        self.show = show
        self.submit = submit
        self.sum = sum
    }
}

public struct Link: Codable, Equatable, Sendable {
    public var label: String
    public var tap: Tap

    public init(label: String, tap: Tap) {
        self.label = label
        self.tap = tap
    }
}

public struct List: Codable, Equatable, Sendable {
    public var id: String?
    public var more: More?
    public var reorder: Gesture?
    public var rows: [Block]
    public var show: Expr?

    public init(id: String? = nil, more: More? = nil, reorder: Gesture? = nil, rows: [Block], show: Expr? = nil) {
        self.id = id
        self.more = more
        self.reorder = reorder
        self.rows = rows
        self.show = show
    }
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

public struct Load: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let calm = Self(rawValue: "calm")
    public static let busy = Self(rawValue: "busy")
    public static let held = Self(rawValue: "held")
    public static let all: [Self] = [.calm, .busy, .held]
}

public struct Locale: Codable, Equatable, Sendable {
    public var era: Era?
    public var lang: Lang?
    public var today: String?

    public init(era: Era? = nil, lang: Lang? = nil, today: String? = nil) {
        self.era = era
        self.lang = lang
        self.today = today
    }
}

public struct Mark: Codable, Equatable, Sendable {
    public var at: [Double]
    public var fixed: Bool?
    public var group: String?
    public var id: String
    public var kind: MarkKind
    public var path: [[Double]]?
    public var text: String?
    public var to: [Double]?
    public var tone: Tone?

    public init(at: [Double], fixed: Bool? = nil, group: String? = nil, id: String, kind: MarkKind, path: [[Double]]? = nil, text: String? = nil, to: [Double]? = nil, tone: Tone? = nil) {
        self.at = at
        self.fixed = fixed
        self.group = group
        self.id = id
        self.kind = kind
        self.path = path
        self.text = text
        self.to = to
        self.tone = tone
    }
}

public struct MarkKind: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let arrow = Self(rawValue: "arrow")
    public static let box = Self(rawValue: "box")
    public static let ellipse = Self(rawValue: "ellipse")
    public static let text = Self(rawValue: "text")
    public static let pin = Self(rawValue: "pin")
    public static let highlight = Self(rawValue: "highlight")
    public static let line = Self(rawValue: "line")
    public static let all: [Self] = [.arrow, .box, .ellipse, .text, .pin, .highlight, .line]
}

public struct Match: Codable, Equatable, Sendable {
    public var pattern: Pattern
    public var value: Expr

    public init(pattern: Pattern, value: Expr) {
        self.pattern = pattern
        self.value = value
    }
}

public struct Media: Codable, Equatable, Sendable {
    public var alt: String
    public var caption: String?
    public var draw: Gesture?
    public var height: UInt32
    public var id: String?
    public var marks: [Mark]?
    public var move: Gesture?
    public var poster: String?
    public var remove: Gesture?
    public var show: Expr?
    public var src: String
    public var stretch: Gesture?
    public var tools: [MarkKind]?
    public var video: Bool?
    public var width: UInt32

    public init(alt: String, caption: String? = nil, draw: Gesture? = nil, height: UInt32, id: String? = nil, marks: [Mark]? = nil, move: Gesture? = nil, poster: String? = nil, remove: Gesture? = nil, show: Expr? = nil, src: String, stretch: Gesture? = nil, tools: [MarkKind]? = nil, video: Bool? = nil, width: UInt32) {
        self.alt = alt
        self.caption = caption
        self.draw = draw
        self.height = height
        self.id = id
        self.marks = marks
        self.move = move
        self.poster = poster
        self.remove = remove
        self.show = show
        self.src = src
        self.stretch = stretch
        self.tools = tools
        self.video = video
        self.width = width
    }
}

public struct Message: Codable, Equatable, Sendable {
    public var avatar: String?
    public var blocks: [Block]?
    public var files: [Attachment]?
    public var id: String?
    public var name: String
    public var role: Role
    public var show: Expr?
    public var time: String?

    public init(avatar: String? = nil, blocks: [Block]? = nil, files: [Attachment]? = nil, id: String? = nil, name: String, role: Role, show: Expr? = nil, time: String? = nil) {
        self.avatar = avatar
        self.blocks = blocks
        self.files = files
        self.id = id
        self.name = name
        self.role = role
        self.show = show
        self.time = time
    }
}

public struct Modal: Codable, Equatable, Sendable {
    public var blocks: [Block]
    public var cancel: String?
    public var destructive: Bool?
    public var done: Submit?
    public var id: String?
    public var locale: Locale?
    public var message: String?
    public var ok: String?
    public var show: Expr?
    public var title: String
    public var variant: ModalVariant?

    public init(blocks: [Block], cancel: String? = nil, destructive: Bool? = nil, done: Submit? = nil, id: String? = nil, locale: Locale? = nil, message: String? = nil, ok: String? = nil, show: Expr? = nil, title: String, variant: ModalVariant? = nil) {
        self.blocks = blocks
        self.cancel = cancel
        self.destructive = destructive
        self.done = done
        self.id = id
        self.locale = locale
        self.message = message
        self.ok = ok
        self.show = show
        self.title = title
        self.variant = variant
    }
}

public struct ModalVariant: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let dialog = Self(rawValue: "dialog")
    public static let alert = Self(rawValue: "alert")
    public static let tool = Self(rawValue: "tool")
    public static let all: [Self] = [.dialog, .alert, .tool]
}

public enum More: Codable, Equatable, Sendable {
    case string(String)
    case page(Page)

    public init(from decoder: any Decoder) throws {
        if let v = try? String(from: decoder) { self = .string(v) } else if let v = try? Page(from: decoder) { self = .page(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no More")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .string(let v): try v.encode(to: encoder)
        case .page(let v): try v.encode(to: encoder)
        }
    }
}

public struct Nav: Codable, Equatable, Sendable {
    public var brand: NavLink?
    public var id: String?
    public var links: [NavLink]
    public var show: Expr?

    public init(brand: NavLink? = nil, id: String? = nil, links: [NavLink], show: Expr? = nil) {
        self.brand = brand
        self.id = id
        self.links = links
        self.show = show
    }
}

public struct NavLink: Codable, Equatable, Sendable {
    public var current: Bool?
    public var href: String
    public var label: String

    public init(current: Bool? = nil, href: String, label: String) {
        self.current = current
        self.href = href
        self.label = label
    }
}

public struct Node: Codable, Equatable, Sendable {
    public var coat: String?
    public var id: String?
    public var label: String?
    public var limit: String?
    public var state: Tone?
    public var tap: Tap?
    public var value: String?

    public init(coat: String? = nil, id: String? = nil, label: String? = nil, limit: String? = nil, state: Tone? = nil, tap: Tap? = nil, value: String? = nil) {
        self.coat = coat
        self.id = id
        self.label = label
        self.limit = limit
        self.state = state
        self.tap = tap
        self.value = value
    }
}

public enum Nodes: Codable, Equatable, Sendable {
    case list([Node])
    case map([String: Node])

    public init(from decoder: any Decoder) throws {
        if let v = try? [Node](from: decoder) { self = .list(v) } else if let v = try? [String: Node](from: decoder) { self = .map(v) } else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "no Nodes")) }
    }

    public func encode(to encoder: any Encoder) throws {
        switch self {
        case .list(let v): try v.encode(to: encoder)
        case .map(let v): try v.encode(to: encoder)
        }
    }
}

public struct OldFrame: Codable, Equatable, Sendable {
    public var ops: [Op]
    public var seq: UInt64

    public init(ops: [Op], seq: UInt64) {
        self.ops = ops
        self.seq = seq
    }
}

public struct OpMerge: Codable, Equatable, Sendable {
    public var fields: [String: JSONValue]
    public var id: String

    public init(fields: [String: JSONValue], id: String) {
        self.fields = fields
        self.id = id
    }
}

public struct OpInsert: Codable, Equatable, Sendable {
    public var after: String?
    public var before: String?
    public var block: Child
    public var into: String

    public init(after: String? = nil, before: String? = nil, block: Child, into: String) {
        self.after = after
        self.before = before
        self.block = block
        self.into = into
    }
}

public struct OpMove: Codable, Equatable, Sendable {
    public var before: String?
    public var id: String
    public var into: String

    public init(before: String? = nil, id: String, into: String) {
        self.before = before
        self.id = id
        self.into = into
    }
}

public struct OpRemove: Codable, Equatable, Sendable {
    public var id: String

    public init(id: String) {
        self.id = id
    }
}

public struct OpReplace: Codable, Equatable, Sendable {
    public var block: Child
    public var id: String

    public init(block: Child, id: String) {
        self.block = block
        self.id = id
    }
}

public struct OpAppend: Codable, Equatable, Sendable {
    public var id: String
    public var keep: Int?
    public var parts: [Part]?
    public var text: String?

    public init(id: String, keep: Int? = nil, parts: [Part]? = nil, text: String? = nil) {
        self.id = id
        self.keep = keep
        self.parts = parts
        self.text = text
    }
}

public struct OpBadge: Codable, Equatable, Sendable {
    public var count: UInt64

    public init(count: UInt64) {
        self.count = count
    }
}

public struct OpDot: Codable, Equatable, Sendable {
    public var on: Bool

    public init(on: Bool) {
        self.on = on
    }
}

public struct OpScreen: Codable, Equatable, Sendable {
    public var screen: Block

    public init(screen: Block) {
        self.screen = screen
    }
}

public enum Op: Codable, Equatable, Sendable {
    case merge(OpMerge)
    case insert(OpInsert)
    case move(OpMove)
    case remove(OpRemove)
    case replace(OpReplace)
    case append(OpAppend)
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
        case "append": self = .append(try OpAppend(from: decoder))
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
        case .append(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); try c.encode("append", forKey: .tag)
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

    public init(`for`: String? = nil, placeholder: String? = nil) {
        self.`for` = `for`
        self.placeholder = placeholder
    }
}

public struct OtherField: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var label: String?
    public var name: String
    public var open: Bool?
    public var show: Expr?
    public var type: String
    public var was: String?

    public init(checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, label: String? = nil, name: String, open: Bool? = nil, show: Expr? = nil, type: String, was: String? = nil) {
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.label = label
        self.name = name
        self.open = open
        self.show = show
        self.type = type
        self.was = was
    }
}

public struct Page: Codable, Equatable, Sendable {
    public var action: String
    public var cursor: String

    public init(action: String, cursor: String) {
        self.action = action
        self.cursor = cursor
    }
}

public struct PageImage: Codable, Equatable, Sendable {
    public var alt: String
    public var height: UInt32
    public var src: String
    public var width: UInt32

    public init(alt: String, height: UInt32, src: String, width: UInt32) {
        self.alt = alt
        self.height = height
        self.src = src
        self.width = width
    }
}

public struct Pages: Codable, Equatable, Sendable {
    public var fallback: Fallback?
    public var file: String?
    public var id: String?
    public var note: String?
    public var pages: [PageImage]
    public var show: Expr?
    public var title: String?

    public init(fallback: Fallback? = nil, file: String? = nil, id: String? = nil, note: String? = nil, pages: [PageImage], show: Expr? = nil, title: String? = nil) {
        self.fallback = fallback
        self.file = file
        self.id = id
        self.note = note
        self.pages = pages
        self.show = show
        self.title = title
    }
}

public struct PartHeading: Codable, Equatable, Sendable {
    public var level: UInt8
    public var spans: [Span]

    public init(level: UInt8, spans: [Span]) {
        self.level = level
        self.spans = spans
    }
}

public struct PartPara: Codable, Equatable, Sendable {
    public var spans: [Span]

    public init(spans: [Span]) {
        self.spans = spans
    }
}

public struct PartList: Codable, Equatable, Sendable {
    public var items: [[Span]]
    public var ordered: Bool

    public init(items: [[Span]], ordered: Bool) {
        self.items = items
        self.ordered = ordered
    }
}

public struct PartQuote: Codable, Equatable, Sendable {
    public var spans: [Span]

    public init(spans: [Span]) {
        self.spans = spans
    }
}

public struct PartCode: Codable, Equatable, Sendable {
    public var lang: String?
    public var text: String

    public init(lang: String? = nil, text: String) {
        self.lang = lang
        self.text = text
    }
}

public struct PartRule: Codable, Equatable, Sendable {

    public init() {
    }
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

    public init(count: String, discard: Tap, review: Tap, text: String) {
        self.count = count
        self.discard = discard
        self.review = review
        self.text = text
    }
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

public struct PickerField: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var label: String?
    public var name: String
    public var open: Bool?
    public var options: [String]?
    public var show: Expr?
    public var value: FieldValue?
    public var was: String?

    public init(checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, label: String? = nil, name: String, open: Bool? = nil, options: [String]? = nil, show: Expr? = nil, value: FieldValue? = nil, was: String? = nil) {
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.label = label
        self.name = name
        self.open = open
        self.options = options
        self.show = show
        self.value = value
        self.was = was
    }
}

public struct Plan: Codable, Equatable, Sendable {
    public var out: String
    public var runs: [PlanRun]

    public init(out: String, runs: [PlanRun]) {
        self.out = out
        self.runs = runs
    }
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

    public init(css: [String], kinds: [String], name: String, probes: Bool, screen: String, scripts: [String], size: String, steps: [Step]) {
        self.css = css
        self.kinds = kinds
        self.name = name
        self.probes = probes
        self.screen = screen
        self.scripts = scripts
        self.size = size
        self.steps = steps
    }
}

public struct PointMove: Codable, Equatable, Sendable {
    public var at: String
    public var series: String
    public var y: Double

    public init(at: String, series: String, y: Double) {
        self.at = at
        self.series = series
        self.y = y
    }
}

public struct Prose: Codable, Equatable, Sendable {
    public var id: String?
    public var parts: [Part]
    public var show: Expr?
    public var streaming: Bool?

    public init(id: String? = nil, parts: [Part], show: Expr? = nil, streaming: Bool? = nil) {
        self.id = id
        self.parts = parts
        self.show = show
        self.streaming = streaming
    }
}

public struct Queued: Codable, Equatable, Sendable {
    public var q: UInt64
    public var text: String

    public init(q: UInt64, text: String) {
        self.q = q
        self.text = text
    }
}

public struct Report: Codable, Equatable, Sendable {
    public var dropped: [String]
    public var sent: [Action]
    public var shots: [String]
    public var timings: Timings

    public init(dropped: [String], sent: [Action], shots: [String], timings: Timings) {
        self.dropped = dropped
        self.sent = sent
        self.shots = shots
        self.timings = timings
    }
}

public struct Role: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let agent = Self(rawValue: "agent")
    public static let owner = Self(rawValue: "owner")
    public static let system = Self(rawValue: "system")
    public static let all: [Self] = [.agent, .owner, .system]
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

    public init(blocks: [Block]? = nil, id: String, lane: RoundLane? = nil, links: [Link]? = nil, name: String, since: String? = nil, state: LaneState, summary: String? = nil, tap: Tap? = nil) {
        self.blocks = blocks
        self.id = id
        self.lane = lane
        self.links = links
        self.name = name
        self.since = since
        self.state = state
        self.summary = summary
        self.tap = tap
    }
}

public struct RoundLane: Codable, Equatable, Sendable {
    public var harness: String?
    public var host: String?
    public var lines: [String]?
    public var model: String?
    public var name: String?

    public init(harness: String? = nil, host: String? = nil, lines: [String]? = nil, model: String? = nil, name: String? = nil) {
        self.harness = harness
        self.host = host
        self.lines = lines
        self.model = model
        self.name = name
    }
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
    public var title: String?
    public var value: Shown?

    public init(accessory: Accessory? = nil, badge: Label? = nil, button: Act? = nil, changed: Bool? = nil, figure: Figure? = nil, handle: Bool? = nil, id: String? = nil, indent: UInt8? = nil, lifted: Bool? = nil, menu: [Act]? = nil, rounds: [Round]? = nil, show: Expr? = nil, sticky: Bool? = nil, style: RowStyle? = nil, subtitle: Toned? = nil, swipe: [Act]? = nil, tap: Tap? = nil, title: String? = nil, value: Shown? = nil) {
        self.accessory = accessory
        self.badge = badge
        self.button = button
        self.changed = changed
        self.figure = figure
        self.handle = handle
        self.id = id
        self.indent = indent
        self.lifted = lifted
        self.menu = menu
        self.rounds = rounds
        self.show = show
        self.sticky = sticky
        self.style = style
        self.subtitle = subtitle
        self.swipe = swipe
        self.tap = tap
        self.title = title
        self.value = value
    }
}

public struct RowError: Codable, Equatable, Sendable {
    public var message: String
    public var name: String?
    public var row: String?

    public init(message: String, name: String? = nil, row: String? = nil) {
        self.message = message
        self.name = name
        self.row = row
    }
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

    public init(action: String, command: String, dir: String? = nil, id: String? = nil, sha: String, show: Expr? = nil, touches: String? = nil, until: String? = nil) {
        self.action = action
        self.command = command
        self.dir = dir
        self.id = id
        self.sha = sha
        self.show = show
        self.touches = touches
        self.until = until
    }
}

public struct ScanField: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var file: FileRef?
    public var label: String?
    public var max: UInt32?
    public var name: String
    public var open: Bool?
    public var show: Expr?
    public var was: String?

    public init(checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, file: FileRef? = nil, label: String? = nil, max: UInt32? = nil, name: String, open: Bool? = nil, show: Expr? = nil, was: String? = nil) {
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.file = file
        self.label = label
        self.max = max
        self.name = name
        self.open = open
        self.show = show
        self.was = was
    }
}

public struct Scene: Codable, Equatable, Sendable {
    public var id: String?
    public var label: String?
    public var lanes: [Lane]?
    public var load: Load?
    public var repos: [SceneRepo]?
    public var show: Expr?
    public var weather: Weather?

    public init(id: String? = nil, label: String? = nil, lanes: [Lane]? = nil, load: Load? = nil, repos: [SceneRepo]? = nil, show: Expr? = nil, weather: Weather? = nil) {
        self.id = id
        self.label = label
        self.lanes = lanes
        self.load = load
        self.repos = repos
        self.show = show
        self.weather = weather
    }
}

public struct SceneRepo: Codable, Equatable, Sendable {
    public var blocks: [Band]
    public var color: String?
    public var id: String
    public var subtitle: String?
    public var title: String

    public init(blocks: [Band], color: String? = nil, id: String, subtitle: String? = nil, title: String) {
        self.blocks = blocks
        self.color = color
        self.id = id
        self.subtitle = subtitle
        self.title = title
    }
}

public struct SceneRow: Codable, Equatable, Sendable {
    public var blocked_by: UInt64?
    public var figure: Figure?
    public var host: String?
    public var id: String
    public var needs: UInt64?
    public var subtitle: String?
    public var tap: Tap?
    public var title: String
    public var tone: Tone?
    public var value: String?

    public init(blocked_by: UInt64? = nil, figure: Figure? = nil, host: String? = nil, id: String, needs: UInt64? = nil, subtitle: String? = nil, tap: Tap? = nil, title: String, tone: Tone? = nil, value: String? = nil) {
        self.blocked_by = blocked_by
        self.figure = figure
        self.host = host
        self.id = id
        self.needs = needs
        self.subtitle = subtitle
        self.tap = tap
        self.title = title
        self.tone = tone
        self.value = value
    }
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
    public var locale: Locale?
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

    public init(actions: [Act]? = nil, back: String? = nil, badge: UInt64? = nil, blocks: [Block]? = nil, done: Submit? = nil, focus: Bool? = nil, id: String? = nil, large: Bool? = nil, locale: Locale? = nil, pending: Pending? = nil, personas: [[String: JSONValue]]? = nil, refresh: Bool? = nil, show: Expr? = nil, sites: UInt64? = nil, source: String? = nil, state: [String: Lit]? = nil, stream: String? = nil, threads: [[String: JSONValue]]? = nil, title: String? = nil, url: String? = nil) {
        self.actions = actions
        self.back = back
        self.badge = badge
        self.blocks = blocks
        self.done = done
        self.focus = focus
        self.id = id
        self.large = large
        self.locale = locale
        self.pending = pending
        self.personas = personas
        self.refresh = refresh
        self.show = show
        self.sites = sites
        self.source = source
        self.state = state
        self.stream = stream
        self.threads = threads
        self.title = title
        self.url = url
    }
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

    public init(action: String, id: String? = nil, label: String? = nil, name: String, placeholder: String? = nil, set: Bool? = nil, show: Expr? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.id = id
        self.label = label
        self.name = name
        self.placeholder = placeholder
        self.set = set
        self.show = show
        self.values = values
    }
}

public struct SecretField: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var label: String?
    public var name: String
    public var open: Bool?
    public var placeholder: String?
    public var set: Bool?
    public var show: Expr?
    public var value: String?
    public var was: String?

    public init(checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, label: String? = nil, name: String, open: Bool? = nil, placeholder: String? = nil, set: Bool? = nil, show: Expr? = nil, value: String? = nil, was: String? = nil) {
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.label = label
        self.name = name
        self.open = open
        self.placeholder = placeholder
        self.set = set
        self.show = show
        self.value = value
        self.was = was
    }
}

public struct Section: Codable, Equatable, Sendable {
    public var blocks: [Block]
    public var footer: String?
    public var header: String?
    public var id: String?
    public var show: Expr?

    public init(blocks: [Block], footer: String? = nil, header: String? = nil, id: String? = nil, show: Expr? = nil) {
        self.blocks = blocks
        self.footer = footer
        self.header = header
        self.id = id
        self.show = show
    }
}

public struct Seen: Codable, Equatable, Sendable {
    public var at: String
    public var detail: String
    public var file: String?
    public var line: UInt32?
    public var rule: String
    public var run: String?
    public var shot: String?

    public init(at: String, detail: String, file: String? = nil, line: UInt32? = nil, rule: String, run: String? = nil, shot: String? = nil) {
        self.at = at
        self.detail = detail
        self.file = file
        self.line = line
        self.rule = rule
        self.run = run
        self.shot = shot
    }
}

public struct Series: Codable, Equatable, Sendable {
    public var `as`: SeriesMark?
    public var dash: Bool?
    public var fixed: Bool?
    public var name: String
    public var step: Double?
    public var tone: Tone?
    public var values: [Double]

    public init(`as`: SeriesMark? = nil, dash: Bool? = nil, fixed: Bool? = nil, name: String, step: Double? = nil, tone: Tone? = nil, values: [Double]) {
        self.`as` = `as`
        self.dash = dash
        self.fixed = fixed
        self.name = name
        self.step = step
        self.tone = tone
        self.values = values
    }
}

public struct SeriesMark: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let bar = Self(rawValue: "bar")
    public static let line = Self(rawValue: "line")
    public static let all: [Self] = [.bar, .line]
}

public struct SetState: Codable, Equatable, Sendable {
    public var key: String
    public var to: Expr

    public init(key: String, to: Expr) {
        self.key = key
        self.to = to
    }
}

public struct Severity: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let error = Self(rawValue: "error")
    public static let warn = Self(rawValue: "warn")
    public static let all: [Self] = [.error, .warn]
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

public struct SideBadge: Codable, Equatable, Sendable {
    public var count: UInt64
    public var tone: Tone?

    public init(count: UInt64, tone: Tone? = nil) {
        self.count = count
        self.tone = tone
    }
}

public struct SideGroup: Codable, Equatable, Sendable {
    public var links: [SideItem]
    public var title: String?

    public init(links: [SideItem], title: String? = nil) {
        self.links = links
        self.title = title
    }
}

public struct SideItem: Codable, Equatable, Sendable {
    public var badge: SideBadge?
    public var children: [SideLink]?
    public var current: Bool?
    public var href: String?
    public var icon: String?
    public var label: String
    public var open: Bool?

    public init(badge: SideBadge? = nil, children: [SideLink]? = nil, current: Bool? = nil, href: String? = nil, icon: String? = nil, label: String, open: Bool? = nil) {
        self.badge = badge
        self.children = children
        self.current = current
        self.href = href
        self.icon = icon
        self.label = label
        self.open = open
    }
}

public struct SideLink: Codable, Equatable, Sendable {
    public var badge: SideBadge?
    public var current: Bool?
    public var href: String
    public var icon: String?
    public var label: String

    public init(badge: SideBadge? = nil, current: Bool? = nil, href: String, icon: String? = nil, label: String) {
        self.badge = badge
        self.current = current
        self.href = href
        self.icon = icon
        self.label = label
    }
}

public struct Sidebar: Codable, Equatable, Sendable {
    public var brand: SideLink?
    public var empty: String?
    public var footer: [SideLink]?
    public var groups: [SideGroup]
    public var id: String?
    public var label: String
    public var show: Expr?

    public init(brand: SideLink? = nil, empty: String? = nil, footer: [SideLink]? = nil, groups: [SideGroup], id: String? = nil, label: String, show: Expr? = nil) {
        self.brand = brand
        self.empty = empty
        self.footer = footer
        self.groups = groups
        self.id = id
        self.label = label
        self.show = show
    }
}

public struct Sky: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let clear = Self(rawValue: "clear")
    public static let windy = Self(rawValue: "windy")
    public static let fog = Self(rawValue: "fog")
    public static let storm = Self(rawValue: "storm")
    public static let all: [Self] = [.clear, .windy, .fog, .storm]
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

    public init(bold: Bool? = nil, code: Bool? = nil, italic: Bool? = nil, link: String? = nil, text: String) {
        self.bold = bold
        self.code = code
        self.italic = italic
        self.link = link
        self.text = text
    }
}

public struct Stage: Codable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var sub: String?
    public var tap: Tap?

    public init(id: String, label: String, sub: String? = nil, tap: Tap? = nil) {
        self.id = id
        self.label = label
        self.sub = sub
        self.tap = tap
    }
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

    public init(id: String? = nil, items: [Tile]? = nil, label: String? = nil, show: Expr? = nil, spark: [Double]? = nil, tone: Tone? = nil, unit: String? = nil, value: Shown? = nil) {
        self.id = id
        self.items = items
        self.label = label
        self.show = show
        self.spark = spark
        self.tone = tone
        self.unit = unit
        self.value = value
    }
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
    case file(StepFile)
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
            case "file": if let v = try? c.decode(StepFile.self, forKey: k) { self = .file(v); return }
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
        case .file(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key("file"))
        case .unknown(let v): try v.encode(to: encoder)
        }
    }
}

public struct StepFile: Codable, Equatable, Sendable {
    public var field: String
    public var handler: Handler
    public var mime: String
    public var name: String
    public var size: UInt64

    public init(field: String, handler: Handler, mime: String, name: String, size: UInt64) {
        self.field = field
        self.handler = handler
        self.mime = mime
        self.name = name
        self.size = size
    }
}

public struct StepGesture: Codable, Equatable, Sendable {
    public var grab: JSONValue
    public var id: String
    public var reach: [JSONValue]
    public var via: Via

    public init(grab: JSONValue, id: String, reach: [JSONValue], via: Via) {
        self.grab = grab
        self.id = id
        self.reach = reach
        self.via = via
    }
}

public struct StepOn: Codable, Equatable, Sendable {
    public var id: String

    public init(id: String) {
        self.id = id
    }
}

public struct StepRefuse: Codable, Equatable, Sendable {
    public var toast: String

    public init(toast: String) {
        self.toast = toast
    }
}

public struct StepShot: Codable, Equatable, Sendable {
    public var name: String

    public init(name: String) {
        self.name = name
    }
}

public struct StepType: Codable, Equatable, Sendable {
    public var id: String
    public var text: String

    public init(id: String, text: String) {
        self.id = id
        self.text = text
    }
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

    public init(bars: [Bar]? = nil, current: String? = nil, done: Bool? = nil, fallback: Fallback? = nil, id: String? = nil, show: Expr? = nil, steps: [Stage]? = nil, title: String? = nil) {
        self.bars = bars
        self.current = current
        self.done = done
        self.fallback = fallback
        self.id = id
        self.show = show
        self.steps = steps
        self.title = title
    }
}

public struct Submit: Codable, Equatable, Sendable {
    public var action: String
    public var label: String
    public var off: Bool?
    public var values: [String: JSONValue]?

    public init(action: String, label: String, off: Bool? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.label = label
        self.off = off
        self.values = values
    }
}

public struct Sync: Codable, Equatable, Sendable {
    public var close: [String]?
    public var open: [Have]

    public init(close: [String]? = nil, open: [Have]) {
        self.close = close
        self.open = open
    }
}

public struct Synced: Codable, Equatable, Sendable {
    public var keys: [KeyState]

    public init(keys: [KeyState]) {
        self.keys = keys
    }
}

public struct Table: Codable, Equatable, Sendable {
    public var calc: [String: Expr]?
    public var columns: [Column]
    public var edit: Gesture?
    public var empty: String?
    public var export: [ExportFormat]?
    public var filter: Bool?
    public var id: String?
    public var more: Page?
    public var reorder: Gesture?
    public var rows: [TableRow]
    public var select: TableSelect?
    public var show: Expr?
    public var sort: TableSort?
    public var title: String?

    public init(calc: [String: Expr]? = nil, columns: [Column], edit: Gesture? = nil, empty: String? = nil, export: [ExportFormat]? = nil, filter: Bool? = nil, id: String? = nil, more: Page? = nil, reorder: Gesture? = nil, rows: [TableRow], select: TableSelect? = nil, show: Expr? = nil, sort: TableSort? = nil, title: String? = nil) {
        self.calc = calc
        self.columns = columns
        self.edit = edit
        self.empty = empty
        self.export = export
        self.filter = filter
        self.id = id
        self.more = more
        self.reorder = reorder
        self.rows = rows
        self.select = select
        self.show = show
        self.sort = sort
        self.title = title
    }
}

public struct TableRow: Codable, Equatable, Sendable {
    public var cells: [String: Cell]
    public var fixed: Bool?
    public var group: Bool?
    public var id: String
    public var tap: Tap?

    public init(cells: [String: Cell], fixed: Bool? = nil, group: Bool? = nil, id: String, tap: Tap? = nil) {
        self.cells = cells
        self.fixed = fixed
        self.group = group
        self.id = id
        self.tap = tap
    }
}

public struct TableSelect: Codable, Equatable, Sendable {
    public var actions: [BulkAction]

    public init(actions: [BulkAction]) {
        self.actions = actions
    }
}

public struct TableSort: Codable, Equatable, Sendable {
    public var by: String
    public var dir: SortDir

    public init(by: String, dir: SortDir) {
        self.by = by
        self.dir = dir
    }
}

public struct Tap: Codable, Equatable, Sendable {
    public var action: String?
    public var copy: String?
    public var focus: String?
    public var keep: Bool?
    public var open: String?
    public var set: [SetState]?
    public var sheet: String?
    public var thread: String?
    public var url: String?
    public var values: [String: JSONValue]?

    public init(action: String? = nil, copy: String? = nil, focus: String? = nil, keep: Bool? = nil, open: String? = nil, set: [SetState]? = nil, sheet: String? = nil, thread: String? = nil, url: String? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.copy = copy
        self.focus = focus
        self.keep = keep
        self.open = open
        self.set = set
        self.sheet = sheet
        self.thread = thread
        self.url = url
        self.values = values
    }
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

    public init(center: Bool? = nil, font: String? = nil, id: String? = nil, markdown: String? = nil, show: Expr? = nil, size: Double? = nil, style: TextStyle? = nil, text: String? = nil, tone: Tone? = nil, top: Double? = nil, until: String? = nil, weight: String? = nil) {
        self.center = center
        self.font = font
        self.id = id
        self.markdown = markdown
        self.show = show
        self.size = size
        self.style = style
        self.text = text
        self.tone = tone
        self.top = top
        self.until = until
        self.weight = weight
    }
}

public struct TextField: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var keyboard: Keyboard?
    public var label: String?
    public var name: String
    public var open: Bool?
    public var placeholder: String?
    public var show: Expr?
    public var value: FieldValue?
    public var was: String?

    public init(checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, keyboard: Keyboard? = nil, label: String? = nil, name: String, open: Bool? = nil, placeholder: String? = nil, show: Expr? = nil, value: FieldValue? = nil, was: String? = nil) {
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.keyboard = keyboard
        self.label = label
        self.name = name
        self.open = open
        self.placeholder = placeholder
        self.show = show
        self.value = value
        self.was = was
    }
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

    public init(label: String, spark: [Double]? = nil, tone: Tone? = nil, unit: String? = nil, value: Shown) {
        self.label = label
        self.spark = spark
        self.tone = tone
        self.unit = unit
        self.value = value
    }
}

public struct Time: Codable, Equatable, Sendable {
    public var label: String?
    public var since: String?
    public var until: String?

    public init(label: String? = nil, since: String? = nil, until: String? = nil) {
        self.label = label
        self.since = since
        self.until = until
    }
}

public struct TimeBar: Codable, Equatable, Sendable {
    public var end: String
    public var fixed: Bool?
    public var id: String
    public var label: String?
    public var progress: UInt8?
    public var start: String
    public var tap: Tap?
    public var tone: Tone?

    public init(end: String, fixed: Bool? = nil, id: String, label: String? = nil, progress: UInt8? = nil, start: String, tap: Tap? = nil, tone: Tone? = nil) {
        self.end = end
        self.fixed = fixed
        self.id = id
        self.label = label
        self.progress = progress
        self.start = start
        self.tap = tap
        self.tone = tone
    }
}

public struct TimeRow: Codable, Equatable, Sendable {
    public var bars: [TimeBar]
    public var id: String
    public var subtitle: String?
    public var tap: Tap?
    public var title: String

    public init(bars: [TimeBar], id: String, subtitle: String? = nil, tap: Tap? = nil, title: String) {
        self.bars = bars
        self.id = id
        self.subtitle = subtitle
        self.tap = tap
        self.title = title
    }
}

public struct Timeline: Codable, Equatable, Sendable {
    public var draw: Gesture?
    public var empty: String?
    public var from: String
    public var id: String?
    public var move: Gesture?
    public var off: [String]?
    public var show: Expr?
    public var stretch: Gesture?
    public var title: String?
    public var to: String
    public var tracks: [TimeRow]

    public init(draw: Gesture? = nil, empty: String? = nil, from: String, id: String? = nil, move: Gesture? = nil, off: [String]? = nil, show: Expr? = nil, stretch: Gesture? = nil, title: String? = nil, to: String, tracks: [TimeRow]) {
        self.draw = draw
        self.empty = empty
        self.from = from
        self.id = id
        self.move = move
        self.off = off
        self.show = show
        self.stretch = stretch
        self.title = title
        self.to = to
        self.tracks = tracks
    }
}

public struct Timings: Codable, Equatable, Sendable {
    public var first_paint_ms: Double
    public var frames_over_budget: UInt32?
    public var longest_frame_ms: Double?
    public var longest_patch_ms: Double?
    public var steps_ms: [Double]

    public init(first_paint_ms: Double, frames_over_budget: UInt32? = nil, longest_frame_ms: Double? = nil, longest_patch_ms: Double? = nil, steps_ms: [Double]) {
        self.first_paint_ms = first_paint_ms
        self.frames_over_budget = frames_over_budget
        self.longest_frame_ms = longest_frame_ms
        self.longest_patch_ms = longest_patch_ms
        self.steps_ms = steps_ms
    }
}

public struct Toast: Codable, Equatable, Sendable {
    public var fallback: Fallback?
    public var id: String?
    public var show: Expr?
    public var title: String
    public var tone: Tone?
    public var undo: Undo?

    public init(fallback: Fallback? = nil, id: String? = nil, show: Expr? = nil, title: String, tone: Tone? = nil, undo: Undo? = nil) {
        self.fallback = fallback
        self.id = id
        self.show = show
        self.title = title
        self.tone = tone
        self.undo = undo
    }
}

public struct ToggleField: Codable, Equatable, Sendable {
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var label: String?
    public var name: String
    public var open: Bool?
    public var show: Expr?
    public var value: FieldValue?
    public var was: String?

    public init(checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, label: String? = nil, name: String, open: Bool? = nil, show: Expr? = nil, value: FieldValue? = nil, was: String? = nil) {
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.label = label
        self.name = name
        self.open = open
        self.show = show
        self.value = value
        self.was = was
    }
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

public struct Tool: Codable, Equatable, Sendable {
    public var body: String?
    public var id: String?
    public var name: String
    public var show: Expr?
    public var state: ToolState
    public var summary: String?

    public init(body: String? = nil, id: String? = nil, name: String, show: Expr? = nil, state: ToolState, summary: String? = nil) {
        self.body = body
        self.id = id
        self.name = name
        self.show = show
        self.state = state
        self.summary = summary
    }
}

public struct ToolState: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let running = Self(rawValue: "running")
    public static let done = Self(rawValue: "done")
    public static let failed = Self(rawValue: "failed")
    public static let all: [Self] = [.running, .done, .failed]
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
    public var fields: [FieldNode]?
    public var id: String?
    public var kind: String
    public var name: String
    public var rect: [Double]?
    public var role: String
    public var text: String?
    public var variant: String?

    public init(children: [TreeNode], drawn: TreeDrawn, fields: [FieldNode]? = nil, id: String? = nil, kind: String, name: String, rect: [Double]? = nil, role: String, text: String? = nil, variant: String? = nil) {
        self.children = children
        self.drawn = drawn
        self.fields = fields
        self.id = id
        self.kind = kind
        self.name = name
        self.rect = rect
        self.role = role
        self.text = text
        self.variant = variant
    }
}

public struct Undo: Codable, Equatable, Sendable {
    public var action: String
    public var confirm: Confirm?
    public var label: String?
    public var values: [String: JSONValue]?

    public init(action: String, confirm: Confirm? = nil, label: String? = nil, values: [String: JSONValue]? = nil) {
        self.action = action
        self.confirm = confirm
        self.label = label
        self.values = values
    }
}

public struct UploadField: Codable, Equatable, Sendable {
    public var accept: [Accept]?
    public var capture: Bool?
    public var checks: [Check]?
    public var doc: String?
    public var enabled: Expr?
    public var error: String?
    public var files: [FileRef]?
    public var label: String?
    public var many: Bool?
    public var mb: UInt32?
    public var name: String
    public var open: Bool?
    public var show: Expr?
    public var was: String?

    public init(accept: [Accept]? = nil, capture: Bool? = nil, checks: [Check]? = nil, doc: String? = nil, enabled: Expr? = nil, error: String? = nil, files: [FileRef]? = nil, label: String? = nil, many: Bool? = nil, mb: UInt32? = nil, name: String, open: Bool? = nil, show: Expr? = nil, was: String? = nil) {
        self.accept = accept
        self.capture = capture
        self.checks = checks
        self.doc = doc
        self.enabled = enabled
        self.error = error
        self.files = files
        self.label = label
        self.many = many
        self.mb = mb
        self.name = name
        self.open = open
        self.show = show
        self.was = was
    }
}

public struct Via: RawRepresentable, Hashable, Codable, Equatable, Sendable {
    public let rawValue: String
    public init(rawValue: String) { self.rawValue = rawValue }
    public static let pointer = Self(rawValue: "pointer")
    public static let keys = Self(rawValue: "keys")
    public static let action = Self(rawValue: "action")
    public static let all: [Self] = [.pointer, .keys, .action]
}

public struct Weather: Codable, Equatable, Sendable {
    public var fog: UInt8?
    public var line: String?
    public var sky: Sky
    public var storm: Bool?
    public var wind: Double?

    public init(fog: UInt8? = nil, line: String? = nil, sky: Sky, storm: Bool? = nil, wind: Double? = nil) {
        self.fog = fog
        self.line = line
        self.sky = sky
        self.storm = storm
        self.wind = wind
    }
}

public struct Web: Codable, Equatable, Sendable {
    public var height: UInt32
    public var id: String?
    public var show: Expr?
    public var src: String

    public init(height: UInt32, id: String? = nil, show: Expr? = nil, src: String) {
        self.height = height
        self.id = id
        self.show = show
        self.src = src
    }
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

    public init(since: String) {
        self.since = since
    }
}
