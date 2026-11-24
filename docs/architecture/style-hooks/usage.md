# style hooks: how the callers read (#392)

Seven callers. Every sketch is the code after S5; a name not in the tree today is new, and the messages are how
they will read, not copied output.

## 1. An app sets a look: nothing changes

```json
{ "format": 2, "type": "mono", "radius": 0, "surface": "dashed", "fills": "outline", "buttons": "filled",
  "marks": "text", "sections": "quiet", "labels": { "kind": { "prefix": "[", "suffix": "]", "case": "lower" } } }
```

```rust
let style: Style = serde_json::from_str(text)?;
let head = theme::css(&schemes, &style);
```

```ts
const sheet = css(gated(pair), style);
```

```swift
view.blocksLook(Look(palette: palette, style: style))
```

## 2. A kind on the web tags its parts

The live renderer, the site writer and the React view of a kind write the same classes. Steps:

```ts
const box = el("div", n ? "sp as-surface" : "pg as-surface");
if (b.title) box.append(h("div", "sh as-section-label", b.title));
```

```ts
const mark = h("i", done ? "spm as-tint as-mark" : "spm", done ? "✓" : String(i + 1));
if (done) mark.dataset["mark"] = "done";
```

```rust
w.open_block("div", if n > 0 { "sp as-surface" } else { "pg as-surface" }, b, &[]);
```

The kind's CSS lays the part out and says nothing a finish says:

```css
.sp,.pg{container-type:inline-size;margin:var(--seam) 0;padding:var(--s2) var(--s3) var(--s3)}
```

The finish's look is written once, in `web/src/css/look/surface.css`:

```css
.as-surface{background:var(--card);border:1px solid var(--edge);border-radius:var(--radius)}
```

## 3. A kind in SwiftUI calls the finish and reads no style value

```swift
VStack(alignment: .leading, spacing: 8) {
    if let title = block.title { LookText(.section, title).ui(12, .regular, look).foregroundStyle(look.palette.mute) }
    content()
}
.padding(12).frame(maxWidth: .infinity, alignment: .leading)
.surface(look, radius: 16)
```

A row's button, which today reads `look.solid` and `look.outline` itself:

```swift
ActButton(source: Source(button)) {
    Text(button.label).ui(13, .semibold, look).padding(.horizontal, 12).frame(minHeight: 30).tinted(look, tint)
}
```

`look.outline` and the other five accessors are gone, and `look.style` is banned outside `Finish/`, so a kind
that tries to branch on the look does not build or does not pass arch-check.

## 4. A new style value: one axis file, one finish file

A look with a heavy tile edge. The crate, `crates/blocks/src/theme/axis/surface.rs`:

```rust
pick!(
    /// How a card's surface is drawn.
    pub Surface { Glass, Dashed, Solid, Heavy }
);

impl Surface {
    const fn rules(self) -> &'static [Rule] {
        match self {
            Self::Glass => &[],
            Self::Dashed => &[Rule::on(Finish::Surface, "border-style:dashed")],
            Self::Solid => &[Rule::on(Finish::Surface, "border-width:2px")],
            Self::Heavy => &[Rule::on(Finish::Surface, "border-width:var(--mark)")],
        }
    }
}
```

SwiftUI, `swift/Sources/BlocksUI/Finish/Surface.swift`, one more case in the one switch over `style.surface`:

```swift
case .heavy:
    content.background(palette.card).overlay(Rectangle().strokeBorder(palette.edge, lineWidth: Token.rule))
```

Then `just gen`. No kind file, no HTML or React renderer file and no shared list is edited. The look check draws a
surface under `heavy` in each renderer and fails with `look: surface heavy changes no surface` where it was forgotten.

## 5. A new kind that is a tile

It writes `as-surface` on its root in its three web files and `.surface(look)` in its Swift file. Every look,
today's and later ones, reaches it. If the Swift file forgets:

```
blocks-snap: gauge wears [] here, fixtures/look/worn.json says [surface]
```

## 6. An app's own CSS (open question 1)

```css
.as-surface { box-shadow: 0 1px 0 var(--line); }
.as-header-label { letter-spacing: 0.04em; }
```

`.as-tile` is no finish, so `blocks check --render` reports `css/private-selector` on it, with the fix text
naming `.as-<finish>` beside the other hooks.

## 7. A renderer that does not draw a value says so

`ci/tokens/finishes.txt`, written by S2 and S3 from what is true that day. S5 deletes each line or gives it a reason:

```
web value fills solid
web value labels kind
swift value sections quiet
swift value labels title
```

A line that is no longer true fails, as in the token baseline: `ci/tokens/finishes.txt lists
`swift value sections quiet`, and it draws now: shrink the baseline`. The `web` gate refuses a PR that adds a line.
