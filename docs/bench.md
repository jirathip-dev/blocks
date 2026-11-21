# The 200-row bench

The same 200-row screen built three ways (blocks, React, topcoat), measured in the headless harness's WebKit.
This is owner decision q2111. It is not a CI gate: blocks' perf gates stay its own budgets
(`crates/blocks/tests/perf.rs`). CI only checks that `bench/` builds (the `local/bench` gate). The public site shows
only blocks' own numbers, from `docs/bench-blocks.json`. Nothing from the named comparison goes there.

`just bench` builds everything and runs `bench/run.js`. It writes `bench/results.json` (every target) and
`docs/bench-blocks.json` (blocks only), and prints the table below.

## What is measured

Each target serves the same screen: a title and 200 rows. Each row has a title, a subtitle and a value. Every page
loads `web/dist/blocks.css` and uses the same row markup, so layout costs the same everywhere.

- **blocks**: `bench/src/bin/blocks.rs`, a std-only server on `Shelf`. Its page is `mount` from `web/dist/blocks.js`
  with a one-screen layout. An update rebuilds the whole screen and calls `Shelf::put`. The diff frame goes out on
  the event stream.
- **react-csr / react-ssr**: React and react-dom 19.3.1, a production esbuild bundle with keyed, memoised rows
  (`bench/react/`). Client-rendered fetches `/rows` after the bundle loads. Server-rendered uses `renderToString`
  and then `hydrateRoot`. An update is a `POST` whose answer is the whole list, the common refetch pattern. A React
  app with its own patch protocol would send less.
- **topcoat**: topcoat 0.11.0 (the version cooee pins), `bench/src/bin/topcoat.rs`. The rows are a shard, as the
  runtime guide recommends. An update calls a procedure that changes the rows, then increments a revision signal,
  so the shard renders again on the server. This is the pattern of topcoat's own todo template.

Before measuring, the runner checks that all four pages draw the same 200 rows: the same count and the same title,
subtitle and value text. It stops if they differ.

The measures, each the median of 10 runs with min–max in brackets:

- **first paint**: ms from navigation start to the frame after all 200 rows are in the DOM. Cold uses a fresh
  browser context. Warm reloads in a context that has loaded the page once, with scripts cached.
- **update**: ms from the trigger in the page to the DOM showing the change (a MutationObserver sees the
  change's text). Three kinds: one row changed, one row inserted, 20 rows changed. Two warm-up rounds come first.
  Updates are 150 ms apart (see "Where blocks loses").
- **bytes per update**: response and stream bytes the page received for that update, uncompressed, headers left out.
- **script, gzipped**: every script the page loads, gzipped at level 9.
- **memory**: RSS of the page's WebContent process after 1,000 updates (one, insert and twenty in turn, so the
  list ends at 533 rows), in a fresh browser for each run. WebKit has no `performance.memory`. On macOS its
  WebContent processes are XPC services, not children of the browser, so the runner takes the new WebContent
  process that used the most CPU. That skips WebKit's idle prewarmed spare.

All three servers run on the same machine as the browser, over loopback. WebKit rounds `performance.now()` to
1 ms here, so update differences under 2 ms are noise.

## Machine and versions

- Run 2026-11-19 on an Apple M6, 12 cores, 32 GB, macOS 27.2 (Darwin 27.2.0)
- WebKit 26.6 (Playwright 1.63.0), Node 24.22.2
- React 19.3.1, react-dom 19.3.1 (`bench/package-lock.json`)
- topcoat 0.11.0, topcoat-cli 0.11.0 (`bench/Cargo.lock`)

## Results

| measure | blocks | react-csr | react-ssr | topcoat |
|---|---|---|---|---|
| first paint, cold (ms) | 20.5 (18.0–24.0) | 31.0 (24.0–89.0) | 15.0 (13.0–22.0) | 11.0 (9.0–14.0) |
| first paint, warm (ms) | 11.5 (8.0–18.0) | 17.5 (16.0–22.0) | 12.5 (10.0–16.0) | 8.5 (7.0–11.0) |
| one row changed (ms) | 2.0 (2.0–6.0) | 3.0 (2.0–11.0) | 3.0 (2.0–4.0) | 5.5 (5.0–6.0) |
| one row inserted (ms) | 2.0 (2.0–3.0) | 3.0 (2.0–4.0) | 2.0 (1.0–4.0) | 5.5 (5.0–9.0) |
| 20 rows changed (ms) | 3.0 (3.0–4.0) | 3.0 (2.0–16.0) | 3.0 (2.0–4.0) | 5.0 (4.0–8.0) |
| bytes, one row changed | 155 (150–156) | 13497 (12844–14075) | 13497 (12844–14075) | 44441 (43119–45690) |
| bytes, one row inserted | 171 (167–171) | 13561 (12906–14139) | 13561 (12906–14139) | 44654 (43329–45903) |
| bytes, 20 rows changed | 2393 (2344–2409) | 13624 (12976–14188) | 13624 (12976–14188) | 44717 (43399–45952) |
| script, gzipped (bytes) | 14022 | 69009 | 69009 | 15159 |
| memory after 1,000 updates (MB) | 251 (229–302) | 233 (230–303) | 359 (312–442) | 761 (333–772) |

## Where blocks wins

- **Bytes per update**: 155 bytes for one changed row, against 13.5 KB for React and 44 KB for topcoat. Only the
  changed row travels, as a row op. The other two resend the list: React as JSON, topcoat as the shard's HTML plus
  the procedure call.
- **Script size**: 14.0 KB gzipped, about a fifth of React's 69.0 KB, and a little under topcoat's 15.2 KB.
- **Update time**: tied with React within the 1 ms resolution, and about twice as fast as topcoat, which waits for
  two server round trips and a server render.
- **First paint against client-rendered React**: 20.5 ms against 31.0 ms cold.

## Where blocks loses

- **Cold first paint**: blocks is last but one, at 20.5 ms against topcoat's 11.0 ms and server-rendered React's
  15.0 ms. Both of those put the rows in the first HTML. blocks opens its stream, syncs the key and only then
  draws, so it pays an extra round trip before the first row.
- **Warm first paint**: topcoat is still faster (8.5 ms against 11.5 ms). blocks' warm paint draws the copy the
  shell keeps from the last visit, and server-rendered React is about level with it.
- **Memory**: client-rendered React ends lower (233 MB against 251 MB). blocks is well under server-rendered React
  (359 MB) and topcoat (761 MB). The shell also writes each screen to localStorage on every update.
- **Bursts**: the patcher queues ops and draws them on the next animation frame (`web/src/patch.ts`), so updates
  that land within one frame draw together. The timed updates here are 150 ms apart, well over a frame, so each
  draws on its own. React and topcoat draw each update as soon as it lands.

## Not measured

- Compressed transfer: no server compresses its answers here.
- Request bytes (the browser's sync, procedure and signal bodies): only bytes received are counted.
- Rune is not in this benchmark and is not adopted.
