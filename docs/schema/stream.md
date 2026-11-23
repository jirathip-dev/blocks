# Ops and the stream

An op names a block by its id: `merge` (fields over it), `insert` into a block's list (`before` an id, else `after`
one, else at the end), `move`, `remove`, `replace`, `badge` (the place's count), `dot` (its unread dot) and
`screen` (the whole screen). A container's list is `rows` for a list or a table, `lanes` for a scene, `rounds` for a
row, else `blocks`; `merge` and `remove` also name a table's row by its id, and `diff` sends a table's changed rows so.

`append` grows a `prose` block at its end: it keeps the first `keep` parts, adds `parts`, then adds `text` to the last
part's text (a heading's, paragraph's or quote's last span, a list's last item's last span, a code part's text). It
counts parts, never characters; a `keep` over the parts, a last part with no text (a rule, no spans, none) or an id that
is no prose does not fit, a gap as for any op. Only `diff` writes it, for a prose whose parts changed: `text` alone
when only the last text grew, else `keep` and the parts after it; other changed fields go in a `merge` before it.
`wire::old` turns it into a `merge` of the block's `parts`. A client built before it asks for the whole screen on
each such frame, so an app ships its clients before its server streams. The cases are `fixtures/append/`, outside
`fixtures/protocol/`, so the compat job's last release is not asked to know it.

`points` grows a `plot`'s series named `series`: it drops `drop` points from the series' front, then adds `x` and
`y` at its end. It counts and copies, never works out a value; a `drop` over the points held, an `x` and a `y` of two
lengths, no series of that name or an id that is no plot does not fit. Only `diff` writes it (or a core that hands
ops to its own view), for a plot whose series kept their names and tones in order and each grew by a tail after
losing a front; any other change to `series` is a `merge`. `wire::old` turns a frame's `points` on one plot into one
`merge` of its `series`. The cases and a 6 s stream are `fixtures/plot/`, outside `fixtures/protocol/`.

One stream per device carries every key (a screen's path) it opens. The server's `Shelf` keeps each key's rev, its
JSON and a ring of its last 16 deltas (or 64 KB); the client's `Mirror` (the crate's, `web/src/stream.ts`'s) keeps
the rev it holds and the screen. The stream starts with `hello` (`v`, `sid`, `epoch`, `keys`); the client answers
with a `Sync` that opens its keys, each with its rev when its copy came from the same epoch, and the `Synced` reply
gives per key nothing (current), the ring's ops, the whole screen, or `gone`. A `Frame` (`k`, `from`, `rev`, `ops`)
applies only on rev `from`; one with no `from` carries the whole `screen`. A frame at or below the rev held is
dropped, one from above it is a gap (open the key again with the rev held), and one with an op the client does not
know is dropped and the key opened again with no rev. No order is assumed between the reply and the stream, so
`just sim` drops, doubles and reorders frames and checks the mirror converges; `fixtures/protocol/` holds the cases
both clients run. `wire::old` turns ops into the old per-screen stream's `{"seq", "ops"}` frames (`OldFrame`).

The media type names the format and the version, `application/vnd.blocks+json;v=2`. `MediaType::pick` reads an
`Accept` value and answers at the lower of the two versions, or refuses one more than one apart.
