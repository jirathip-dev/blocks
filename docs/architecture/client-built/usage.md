# Usage: how the callers read

The example is a meter: a count, a list of sends and one button. Sections 1 and 2 were built to wasm and run in
node for this ADR (`measured.md`); sections 3 to 6 are sketches against the code on staging 73adae31. Every name
is specified in `shapes.md`.

## 1. The app's Rust: state in, a screen and ops out

Plain Rust with no glue in it: it runs natively under `cargo test` and unchanged inside the wasm. The one rule an
app keeps: ops are the difference from the screen it last handed out.

```rust
// demo/client/src/lib.rs
use blocks::{diff, Action, Answer, Block, Button, List, Row, Screen, Shown, Stat};

#[derive(Default)]
pub struct Meter {
    sent: u64,
    drawn: Option<Block>,
}

impl Meter {
    fn build(&self) -> Block {
        let rows = (0..self.sent).map(|i| Block::Row(Box::new(Row::new(format!("Send {i}")).id(format!("send-{i}")))));
        let screen = Screen::new().id("meter").title("Meter").blocks(vec![
            Block::Stat(Box::new(Stat::new().id("count").label("sent").value(Shown::Number(self.sent.into())))),
            Block::List(Box::new(List::new(rows.collect::<Vec<_>>()).id("sends"))),
            Block::Button(Box::new(Button::new("Send one").id("send").action("send"))),
        ]);
        Block::Screen(Box::new(screen))
    }

    /// The whole screen; the next ops start from it.
    pub fn screen(&mut self) -> &Block {
        self.drawn.insert(self.build())
    }

    /// What an action does: the state changes and the answer carries the ops from the screen last handed out.
    pub fn act(&mut self, a: &Action) -> Answer {
        if a.action == "send" {
            self.sent += 1;
        }
        let next = self.build();
        let ops = self.drawn.as_ref().map(|old| diff(old, &next)).unwrap_or_default();
        self.drawn = Some(next);
        Answer { ops, ..Answer::default() }
    }
}
```

`Built::of(&screen).check(&[])` belongs in the app's native tests, as in Mode A. It is not called in the wasm.

## 2. The wasm glue: JSON text through one buffer

The app's job, and its choice. The example shows the smallest glue that works: five exports, no dependency and no
`unsafe` block. The page writes text into a buffer the Rust owns, calls an export, and reads the answer back from
the same buffer.

```rust
// demo/client/src/glue.rs, compiled for wasm32 only
use std::cell::RefCell;

use crate::Meter;

thread_local! {
    static APP: RefCell<Meter> = RefCell::new(Meter::default());
    static TEXT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

fn put(s: String) {
    TEXT.with(|t| *t.borrow_mut() = s.into_bytes());
}

#[no_mangle]
pub extern "C" fn text(len: usize) -> *const u8 {
    TEXT.with(|t| {
        let mut t = t.borrow_mut();
        t.clear();
        t.resize(len, 0);
        t.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn text_at() -> *const u8 {
    TEXT.with(|t| t.borrow().as_ptr())
}

#[no_mangle]
pub extern "C" fn text_len() -> usize {
    TEXT.with(|t| t.borrow().len())
}

#[no_mangle]
pub extern "C" fn screen() {
    put(APP.with(|a| serde_json::to_string(a.borrow_mut().screen()).unwrap_or_default()));
}

#[no_mangle]
pub extern "C" fn act() {
    let asked = TEXT.with(|t| serde_json::from_slice::<blocks::Action>(&t.borrow()));
    let answer = asked.map(|a| APP.with(|app| app.borrow_mut().act(&a))).unwrap_or_default();
    put(serde_json::to_string(&answer).unwrap_or_default());
}
```

An app that prefers `wasm-bindgen` writes `#[wasm_bindgen] pub fn act(action: &str) -> String` instead and drops
the buffer. That is its own dependency, in its own repo.

## 3. The page: the same `mount`, a local source

```js
// demo/client/web/main.js
import { local, mount } from "./blocks.js";

const { instance } = await WebAssembly.instantiateStreaming(fetch("meter.wasm"));
const x = instance.exports;
const call = (f, text = "") => {
  const sent = new TextEncoder().encode(text);
  new Uint8Array(x.memory.buffer, x.text(sent.length), sent.length).set(sent);
  f();
  return new TextDecoder().decode(new Uint8Array(x.memory.buffer, x.text_at(), x.text_len()));
};

const meter = local({
  screen: () => JSON.parse(call(x.screen)),
  act: (action) => JSON.parse(call(x.act, JSON.stringify(action))),
});

const at = (place) => ({ compact: place, wide: place });
const screen = { type: "screen", id: "meter", source: "meter", path: "/meter", label: "Meter", place: at("strip"), transition: "push" };
mount({
  root: document.body,
  layout: { format: 1, root: { type: "nav", id: "root", place: at("inline"), transition: "push", slots: { main: [screen] } } },
  sources: { meter },
});
```

No `url`, so no stream and no request. A tap on "Send one" reaches `act`; the answer's ops patch the list and the
count in place; its `toast`, `open` and `close` work as a server's do. drover and cooee keep `mount({ url })`
unchanged, and one page may mix both: `mount({ url, sources: { meter } })` draws `meter` from local code and
every other source from its server.

## 4. A change nobody tapped for: `push`

A timer, a sensor or a message from a worker makes ops with no action. The glue hands them to the same source.

```js
setInterval(() => meter.push("/meter", JSON.parse(call(x.tick))), 1000);
```

If ops ever do not fit the screen the page holds, the source asks `screen` again and redraws. Nothing else is needed
from the app.

## 5. SwiftUI: the entry point that is already there

`BlocksView` never knew a stream: it takes a `Block` and gives each action to a closure. The app keeps the block,
applies the ops and calls its own FFI. `MeterCore` here stands for that FFI (UniFFI, swift-bridge or a C header:
the app's choice); it passes the same JSON text as section 2.

```swift
import Blocks
import BlocksUI
import SwiftUI

@MainActor @Observable
final class MeterModel {
    private(set) var screen: Block
    private let core: MeterCore

    init(core: MeterCore) throws {
        self.core = core
        screen = try JSONDecoder().decode(Block.self, from: core.screen())
    }

    func act(_ a: BlockAction) {
        let asked = Action(action: a.action, block: a.block, screen: screen.id ?? "", values: a.values)
        do {
            let answer = try JSONDecoder().decode(Answer.self, from: core.act(JSONEncoder().encode(asked)))
            try screen.apply(answer.ops ?? [])
        } catch {
            if let whole = try? JSONDecoder().decode(Block.self, from: core.screen()) { screen = whole }
        }
    }
}

struct MeterView: View {
    let model: MeterModel

    var body: some View {
        ScrollView { BlocksView(model.screen, source: nil, act: model.act).padding(BlocksView.inset) }
    }
}
```

The `catch` is the Swift form of section 4's last line: ops that do not fit mean "take the whole screen again".

## 6. The tests

```rust
// demo/client/src/lib.rs, native: the app's own test, and the writer of the shared fixtures
#[test]
fn generated_a_send_adds_a_row_and_counts_it() {
    let mut m = Meter::default();
    let first = m.screen().clone();
    let asked = Action { screen: "meter".into(), block: Some("send".into()), action: "send".into(), ..Action::default() };
    let answer = m.act(&asked);
    let mut drawn = first.clone();
    blocks::apply(&mut drawn, &answer.ops).unwrap();
    assert_eq!(&drawn, m.screen());
    held("fixtures/client/screen.json", &first);
    held("fixtures/client/send.json", &Sent { action: asked, answer });
}
```

`held` compares with the committed file and, under `BLOCKS_GEN=1`, writes it: the pattern `scripts/gen.sh` already
uses for the sim's fixtures.

```ts
// web/test/source.test.ts, node with the fake DOM: every gate host runs it, no wasm needed
test("a local source draws its screen, patches an answer's ops and never asks a server", async () => {
  g.fetch = g.EventSource = () => fail("a local source made a request");
  const meter = local({ screen: () => first, act: () => ({ ops: sent.answer.ops, toast: { title: "sent" } }) });
  const page = mount({ root, layout, sources: { meter } });
  const list = root.querySelector('[data-id="sends"]');
  root.querySelector('[data-id="send"]').click();
  await settled();
  strictEqual(root.querySelector('[data-id="count"]').textContent.includes("1"), true);
  strictEqual(root.querySelector('[data-id="sends"]'), list, "patched in place, not redrawn");
  ok(root.textContent.includes("sent"), "the answer's toast is shown");
});
```

The same file covers `push`, ops that do not fit (the screen is asked again), an `act` that throws (a bad toast)
and a page that mixes a local source with a served one.

```ts
// web/test/client/page.test.ts, WebKit, CI's `client` gate: the real wasm in the real page
test("the wasm32 build answers what the native test wrote", async () => {
  const call = caller((await WebAssembly.instantiate(readFileSync(wasm))).instance.exports);
  deepStrictEqual(JSON.parse(call("screen")), fixture("screen.json"));
  deepStrictEqual(JSON.parse(call("act", JSON.stringify(fixture("send.json").action))), fixture("send.json").answer);
});

test("the example page draws the Rust screen and applies its ops with no request beyond its own files", async () => {
  const { page, asked } = await served({ "": "demo/client/web/index.html", "main.js": "demo/client/web/main.js", "meter.wasm": wasm });
  await page.getByRole("button", { name: "Send one" }).click();
  await page.getByText("Send 0").waitFor();
  deepStrictEqual(asked.sort(), ["", "blocks.css", "blocks.js", "main.js", "meter.wasm"]);
});
```

`served` routes the page's files as `web/shot/shot.ts` does and records each request; anything else is refused.

```swift
// swift/Tests/BlocksTests/ClientBuiltTests.swift: the same screen and ops, from the same fixtures
func testTheLocalScreenDrawsSendsItsActionAndTakesTheOps() throws {
    let sent = try fixture("client/send", as: Sent.self)
    let run = try Snapshot(fixture("client/screen", as: Block.self))
        .run([.tap(StepOn(id: "send")), .answer(sent.answer), .shot(StepShot(name: "after"))], check: true)
    let got = try XCTUnwrap(run.report.sent.first)
    XCTAssertEqual([got.screen, got.block, got.action], [sent.action.screen, sent.action.block, sent.action.action])
    XCTAssertTrue(ids(run.trees["after"]).contains("send-0"), "the inserted row is drawn")
    XCTAssertEqual(run.faults, [])
}
```

`Step`, `Report.sent` and `Snapshot.run` are the harness's own, unchanged; `fixture` and `ids` are the test's helpers.
