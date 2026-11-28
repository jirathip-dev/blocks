# glance: how the callers read (#412)

Eight callers. Every sketch is the code after S3; `Host`, `TurnActivity`, `StopIntent` and the `app://` links are
the example app's own names, and everything else that is not in the tree today is new.

## 1. A server builds one

An agent's turn. The head says what it is once; `expanded` adds what the opened island shows under it.

```rust
let stop = Act {
    label: "Stop".into(),
    action: Some("stop".into()),
    values: Some([("thread".to_string(), Value::from("t-42"))].into_iter().collect()),
    tone: Some(Tone::Bad),
    ..Act::default()
};
let turn = Glance::new("Ana")
    .id("turn")
    .subtitle("Order sync")
    .figure(Figure { avatar: Some("ana".into()), state: Some(Tone::Working), ..Figure::default() })
    .value(Time { since: Some("2026-11-25T09:41:00Z".into()), ..Time::default() })
    .tone(Tone::Working)
    .tap(Tap { thread: Some("t-42".into()), ..Tap::default() })
    .expanded(GlanceBody {
        line: Some("cargo test -p orders".into()),
        foot: Some("working · 3 tools".into()),
        acts: Some(vec![stop]),
        ..GlanceBody::default()
    });
let screen = Screen::new().id("glance").blocks(vec![Block::Glance(Box::new(turn)), needs, running]);
```

One screen holds every glance the app shows; each has an id the host asks for. When the turn asks a question the
server sends the same block with `.tone(Tone::Needs)` and `.trailing(GlanceSide { text: Some("ask".into()), tone:
Some(Tone::Bad), ..GlanceSide::default() })`, and `diff` sends that as one `merge`.

## 2. On the wire

```json
{
  "type": "glance", "id": "turn", "title": "Ana", "subtitle": "Order sync",
  "figure": { "avatar": "ana", "state": "working" },
  "value": { "since": "2026-11-25T09:41:00Z" }, "tone": "working",
  "tap": { "thread": "t-42" },
  "expanded": {
    "line": "cargo test -p orders", "foot": "working · 3 tools",
    "acts": [{ "label": "Stop", "action": "stop", "values": { "thread": "t-42" }, "tone": "bad" }]
  }
}
```

| Form | What this block draws |
|---|---|
| `leading` | Ana's figure |
| `trailing` | `2:14`, counting, in the working tone |
| `expanded` | the figure, "Ana", "Order sync", `2:14`; "cargo test -p orders"; "working · 3 tools" and Stop |
| `medium` | not declared: the head and `expanded`'s body, so the same parts |
| `small` | not declared: the figure and "Ana" as its label, `2:14` large, the line, the foot; no button |

## 3. A host draws a form: one line

```swift
GlanceView(block, .leading)
```

It fills the box it is put in, reads the look from the environment as every block does, and draws no ground. The
host says once how taps leave and which colours to use; this is all of the example app's own glue:

```swift
enum Host {
    static func link(_ tap: Tap) -> URL? { tap.thread.flatMap { URL(string: "app://thread/\($0)") } }

    static func intent(_ sent: BlockAction) -> (any AppIntent)? {
        sent.action == "stop" ? StopIntent(thread: sent.values["thread"]?.string ?? "") : nil
    }
}

extension View {
    func hosted(_ palette: Palette) -> some View {
        blocksLook(Look(palette: palette)).glanceTaps(link: Host.link, intent: Host.intent)
    }
}
```

## 4. A Live Activity

The block is the state. The island is black, so its forms get the dark scheme; the Lock Screen follows the system.

```swift
struct TurnActivity: ActivityAttributes {
    typealias ContentState = Glance
}

struct TurnLive: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TurnActivity.self) { context in
            Banner(glance: context.state)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.bottom) { GlanceView(context.state, .expanded).hosted(.defaultDark) }
            } compactLeading: {
                GlanceView(context.state, .leading).hosted(.defaultDark)
            } compactTrailing: {
                GlanceView(context.state, .trailing).hosted(.defaultDark)
            } minimal: {
                GlanceView(context.state, .leading).hosted(.defaultDark)
            }
            .widgetURL(context.state.tap.flatMap(Host.link))
        }
    }
}

struct Banner: View {
    @Environment(\.colorScheme) private var scheme
    let glance: Glance

    var body: some View {
        GlanceView(glance, .expanded).padding(BlocksView.inset)
            .hosted(scheme == .dark ? .defaultDark : .defaultLight).widgetURL(glance.tap.flatMap(Host.link))
    }
}
```

## 5. A widget

The provider reads the screen the app wrote; the family picks the form.

```swift
struct Entry: TimelineEntry {
    let date: Date
    let screen: Block?
}

struct Feed: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, screen: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(entry) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        completion(Timeline(entries: [entry], policy: .never))
    }

    private var entry: Entry {
        let data = Host.file.flatMap { try? Data(contentsOf: $0) }
        return Entry(date: .now, screen: data.flatMap { try? JSONDecoder().decode(Block.self, from: $0) })
    }
}

struct NeedsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "needs", provider: Feed()) { entry in Card(glance: entry.screen?.glance("needs")) }
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct Card: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme
    let glance: Glance?

    var body: some View {
        let palette: Palette = scheme == .dark ? .defaultDark : .defaultLight
        Group {
            if let glance { GlanceView(glance, family == .systemMedium ? .medium : .small) }
        }
        .hosted(palette).widgetURL(glance?.tap.flatMap(Host.link))
        .containerBackground(palette.background, for: .widget)
    }
}
```

## 6. The app keeps them fed

Called with each new value of the `glance` screen, from the `Replica` that holds it.

```swift
func show(_ screen: Block) async {
    if let file = Host.file { try? JSONEncoder().encode(screen).write(to: file, options: .atomic) }
    WidgetCenter.shared.reloadAllTimelines()
    let turn = screen.glance("turn").map { ActivityContent(state: $0, staleDate: nil) }
    switch (Activity<TurnActivity>.activities.first, turn) {
    case (nil, let turn?): _ = try? Activity.request(attributes: TurnActivity(), content: turn)
    case (let live?, let turn?): await live.update(turn)
    case (let live?, nil): await live.end(nil, dismissalPolicy: .immediate)
    case (nil, nil): break
    }
}
```

A server that pushes to the activity sends the block's own JSON as the push's `content-state`; nothing in the
extension changes.

## 7. A Mac notch window

The panel, where it sits and when it opens are the app's. The forms and the taps are the same as in the extension:
a `Link` reaches the app's own URL handler and an intent runs in the app.

```swift
struct Notch: View {
    @State private var open = false
    let glance: Glance
    let gap: CGFloat

    var body: some View {
        Group {
            if open {
                GlanceView(glance, .expanded).padding(BlocksView.inset)
            } else {
                HStack(spacing: gap) {
                    GlanceView(glance, .leading)
                    GlanceView(glance, .trailing)
                }
            }
        }
        .hosted(.defaultDark).background(Palette.defaultDark.background).onHover { open = $0 }
    }
}

let panel = NSPanel(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
panel.level = .statusBar
panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
panel.contentView = NSHostingView(rootView: Notch(glance: turn, gap: notch.width))
panel.orderFrontRegardless()
```

## 8. The tests

One form of one fixture, in its box, on one scheme; a fault names what drew outside the box.

```swift
func testEveryFormOfEveryGlanceDrawsInsideItsBoxLightAndDark() throws {
    for name in ["glance", "glance-needs", "glance-bare", "stress/glance-long"] {
        let block = try glance(name)
        for form in GlanceForm.allCases {
            for look in [light, dark] {
                let shot = try Snapshot.form(block, form, look: look)
                XCTAssertEqual(shot.faults, [], "\(name) \(form.rawValue)")
            }
        }
    }
}

func testAMissingFormIsDrawnFromTheHeadAndASibling() throws {
    let (bare, needs) = (try glance("glance-bare"), try glance("glance-needs"))
    XCTAssertEqual(bare.drawn(.trailing).value, bare.value)
    XCTAssertTrue(bare.drawn(.leading).mark)
    XCTAssertEqual(needs.drawn(.expanded).foot, needs.medium?.foot)
    XCTAssertEqual(try glance("glance").drawn(.small).acts, [])
}
```

```sh
blocks-snap --screen fixtures/blocks/glance.json --form trailing --scheme dark --out shots/glance/trailing-dark
```
