# glance: a Live Activity, a widget and a notch window from one block

A `glance` block says what an island and a widget show of one thing. Its head (`title`, `subtitle`, `figure`,
`value`, `tone`, `tap`) is said once; each of its five forms is optional and changes only what that form shows.
BlocksUI draws a form into the box a host hands it. The host owns the activity, the widget and the window.
The decision and its reasons: `docs/architecture/glance/`.

## The wire

```json
{
  "type": "glance", "id": "turn", "title": "Ana", "subtitle": "Order sync",
  "figure": { "avatar": "ana", "state": "working" },
  "value": { "since": "2026-11-25T09:41:00Z" }, "tone": "working",
  "tap": { "thread": "t-42" },
  "trailing": { "text": "ask", "tone": "bad" },
  "expanded": {
    "line": "cargo test -p orders", "foot": "working · 3 tools",
    "acts": [{ "label": "Stop", "action": "stop", "values": { "thread": "t-42" }, "tone": "bad" }]
  }
}
```

`leading` and `trailing` take a side (`figure`, `text`, `tone`); `expanded`, `medium` and `small` take a body
(`line`, `rows`, `foot`, `acts`). A row is `title`, `subtitle`, `figure`, `value`, `tone`, `tap`. A `value` given as
`{"since": …}` or `{"until": …}` is the system's timer text, so the island ticks with no update. Keep a glance under
3,000 bytes of JSON (`lint/glance-heavy`): an activity's state is at most 4 KB.

## The forms

| Form | Box, pt | Draws | When it is not declared |
|---|---|---|---|
| `leading` | 60 × 24 | the side's figure and text | the head's figure, else a dot in the head's tone |
| `trailing` | 60 × 24 | the side's figure and text | the head's value in its tone |
| `expanded` | 340 × 140 | figure, title, subtitle, value; two rows, else a two-line `line`; foot; two acts | `medium`'s body |
| `medium` | 289 × 116 | the same, one act | `expanded`'s body |
| `small` | 116 × 116 | figure and title, the value large; two rows, else `line`; foot | `medium`'s body, else `expanded`'s |

With no body at all a roomy form draws the head alone, so a title and a value already fill all five. A form never
scrolls, shrinks its type or draws outside its box. In a screen `BlocksView` draws the `medium` form on a tile; the
web and the site draw the block as its fallback row.

## The host's glue

Taps leave as a link or an intent, never a closure, so they work in an extension. An act whose tap has no link and
whose action has no intent is not drawn.

```swift
enum Host {
    static let file = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.app")?
        .appendingPathComponent("glance.json")

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

## A Live Activity

The block is the activity's state; a server may push the block's JSON as the push's `content-state`. The island is
black, so its forms take the dark palette.

```swift
struct TurnActivity: ActivityAttributes {
    typealias ContentState = Glance
}

struct TurnLive: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TurnActivity.self) { context in
            GlanceView(context.state, .expanded).padding(BlocksView.inset).hosted(.defaultDark)
                .widgetURL(context.state.tap.flatMap(Host.link))
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
```

The app starts, updates and ends it from the screen it holds:

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

## A widget

The provider reads the screen the app wrote to its App Group; the family picks the form.

```swift
struct Entry: TimelineEntry {
    let date: Date
    let screen: Block?
}

struct Feed: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, screen: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(entry) }
    func getTimeline(in context: Context, completion: @escaping (WidgetKit.Timeline<Entry>) -> Void) {
        completion(WidgetKit.Timeline(entries: [entry], policy: .never))
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

## A Mac notch window

The panel, where it sits and when it opens are the app's. A `Link` reaches the app's own URL handler and an intent
runs in the app, so the taps work as in the extension.

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

@MainActor func notch(_ glance: Glance, over frame: NSRect, gap: CGFloat) -> NSPanel {
    let panel = NSPanel(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    panel.level = .statusBar
    panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
    panel.contentView = NSHostingView(rootView: Notch(glance: glance, gap: gap))
    panel.orderFrontRegardless()
    return panel
}
```

The widget, the notch window and the glue above compile in `swift/Tests/AppFixtureTests/GlanceHostTests.swift`;
the Live Activity needs ActivityKit, which is iOS only.

## Checking the forms

```sh
blocks-snap --screen fixtures/blocks/glance.json --form trailing --scheme dark --out shots/glance/trailing-dark
```

It draws the first glance in the file in the form's box and exits 1 when anything is drawn outside the box or
nothing inside it. The `swift-glance` gate runs it on every glance fixture, each form, light and dark.
