# Ops and the stream

An op names a block by its id: `merge` (fields over it), `insert` into a block's list (`before` an id, else `after`
one, else at the end), `move`, `remove`, `replace`, `badge` (the place's count), `dot` (its unread dot) and
`screen` (the whole screen). A container's list is `rows` for a list, `lanes` for a scene, `rounds` for a row, else
`blocks`.

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

The media type names the format and the version, `application/vnd.blocks+json;v=1`. `MediaType::pick` reads an
`Accept` value and answers at the lower of the two versions, or refuses one more than one apart.
