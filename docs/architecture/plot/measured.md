# Measured (#351)

Nothing here is in the repo: a scratch page, a scratch test in `crates/blocks/tests/` and a scratch Swift
program were run and deleted. Staging `73adae31`, release builds, macOS on Apple silicon; Playwright 1.63.0's
WebKit; Swift 6.4.2 with `-O`.

## The setup

- A live screen: six `stat` blocks and one plot. Its first series is force at 80 points a second, x to four
  decimals and y to two; in the WebKit runs a second series holds one point a second.
- The plot is full: 2,400 points (30 s), 4,800 (60 s, the AC's run at its end), and one larger size.
- A frame adds one or two points to the first series and drops as many from its front.

## 1. The shape of a series, in WebKit

The screen as JSON, and what `core/apply.ts` does for every stream frame today, a `structuredClone` of the
screen, then the points added:

| Points | | Objects `{x, y}` | Pairs `[x, y]` | Two columns |
|---|---|---|---|---|
| 2,400 | the screen | 50.9 KB | 31.5 KB | 26.6 KB |
| | the copy, per frame | 0.56 to 0.73 ms | 0.29 to 0.35 ms | 0.08 to 0.09 ms |
| 4,800 | the screen | 101.8 KB | 63.0 KB | 53.2 KB |
| | the copy, per frame | 1.14 to 1.29 ms | 0.55 to 0.67 ms | 0.17 to 0.18 ms |
| 28,800 | the screen | 631 KB | 398 KB | 339 KB |
| | the copy, per frame | 6.8 to 8.1 ms | 3.3 to 4.2 ms | 0.90 to 1.05 ms |

- Columns copy about seven times faster than objects: an array of numbers is the engine's fast case.
- At 80 points a second one or two stream frames arrive per animation frame, and each is one copy. With objects
  at 4,800 points that alone is up to 2.6 ms of the frame; with columns 0.36 ms.
- A copy that shares what it does not change took 0.01 ms. It would need `apply` rewritten for every op, and
  columns make it unnecessary here.

## 2. Drawing, in WebKit

An SVG of two lines, a target, a peak and tick texts at 390 and 1,440 wide. Each frame was applied and laid out
(a forced layout after every frame; paint is not in it).

- **redraw**: what the patcher does for a `merge` today: build the plot again and replace its element.
- **in place**: set each path's `d`, the peak's place and the tick texts on the elements that are there.
- **every point** joins all the points; **columns** keeps a column's first, lowest, highest and last point.

| Points | Redraw, every point | In place, every point | In place, 1,000 columns | In place, 500 columns |
|---|---|---|---|---|
| 2,400 | 0.49 to 0.59 ms | 0.46 to 0.56 ms | 0.45 to 0.53 ms | 0.22 to 0.23 ms |
| 4,800 | 0.96 to 1.30 ms | 0.85 to 1.07 ms | 0.47 to 0.54 ms | 0.27 to 0.29 ms |
| 28,800 | 4.9 to 8.5 ms | 4.9 to 6.2 ms | 0.70 to 0.79 ms | 0.50 to 0.54 ms |

- One draw is cheap up to a few thousand points whichever way. What costs is drawing once per op: two series
  and a moving peak are three to six ops in an animation frame. So the decision is one draw per plot per frame.
- Past a few thousand points the path's text is the cost, and columns bound it. 1,000 columns is 1.3 px a
  column on a 1,440 px page, so nothing is lost to the eye; 500 would show on a wide screen.
- After every in-place run the element was equal (`isEqualNode`) to a fresh draw of the last model.
- Redraw and in place cost about the same per draw. In place keeps the elements, so what the design puts on
  them (a pointer's readout, a focus) is not lost 60 times a second.
- In place with columns, the longest frame was 1 to 3 ms, but for one of 10 ms at 28,800 points. A redraw of
  every point reached 13 to 27 ms from 4,800 points up. WebKit's clock has 1 ms steps.
- Frames over 16.7 ms were not counted: headless WebKit ran the scratch page's animation frames every 10 ms,
  off the display's clock. The harness meters real frames, and the perf check in `usage.md` part 6 uses it.

## 3. The crate

Today's code on an app kind with the plot's JSON (columns, one series), so `diff` writes a `merge` of `series`:

| Points | The screen | Serialize | Parse | `Shelf::put` | Its frame | At 80 frames a second |
|---|---|---|---|---|---|---|
| 2,400 | 28.7 KB | 45 µs | 128 µs | 0.58 ms | 28.3 KB | 2.3 MB a second |
| 4,800 | 57.5 KB | 111 µs | 242 µs | 1.22 ms | 57.1 KB | 4.6 MB a second |
| 20,000 | 251.7 KB | 421 µs | 1.03 ms | 4.82 ms | 251.3 KB | 20 MB a second |

- With `points` a frame of one point is about 115 bytes: 9 KB a second in place of 2.3 to 20 MB.
- `put`'s time is the screen's: serialize, parse the old one, compare. The op does not change it, so it stays
  near these figures: 5% of a core at 2,400 points and 80 puts a second, 10% at 4,800. One put per display
  frame is the app's lever, and 20,000 points is where a put stops fitting a frame's share. Hence the limit.
- On typed columns, dropping two points and adding two took 0.6 µs at 2,400 points, 2.6 µs at 4,800 and
  11.5 µs at 20,000. The crate's `apply` and `Mirror` add nothing that shows.

## 4. Swift

A program with a copy of `JSONValue.swift` and `Codable` types of the screen's shape. "Through the tree" is
what `Block.apply` does for every batch today: encode, read as `JSONValue`, encode, decode.

| Points | Through the tree, objects | Through the tree, columns | Decode the screen once, columns | Typed drop and add |
|---|---|---|---|---|
| 2,400 | 24.3 ms | 7.0 ms | 0.8 ms | 0.9 µs |
| 4,800 | 51.5 ms | 13.5 ms | 1.8 ms | 1.4 µs |
| 20,000 | 200.8 ms | 55.9 ms | 5.6 ms | 6.1 µs |

- Through the tree, one batch takes most of a 16.7 ms frame at 4,800 points, and two stream frames arrive in
  some display frames. This is any op on a screen that holds the plot, a stat's `merge` included.
- So `points` and a block's `merge` go by a typed walk (decision 10), and a merge on the plot leaves its
  points out of the round trip.

## Not measured

- SwiftUI's drawing, and the typed walk itself: neither is written. The Swift gate is where they are first seen.
- `diff` writing `points`, and `Shelf::put` with it: section 3 is today's `merge`, a little over what it will be.
- A real 60 s run with frames metered: that is the AC's perf check.
- A phone. Every figure is a desktop core's.
