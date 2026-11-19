# guard: the contract for drover's `turn done` hook (#79)

blocks ships the command and this contract. The hook itself is a drover issue; what is marked "drover decides" is
that issue's to settle.

## When it runs

Before a lane's `turn done` is accepted, in the lane's worktree, when both hold:

- the repo has `.blocks/guard.json`;
- the lane's diff against its integration branch touches the fleet's `ui_paths`, `.blocks/` or a folder that
  `guard.json`'s `screens` names.

Otherwise nothing runs and the turn ends as today.

## What it runs

One command, which the app names once (recommended: a `guard` recipe in its justfile, so the hook and CI share it):

```sh
just blocks check --base "origin/$INTEGRATION" --render --format json --out "$GUARD_OUT"
```

| | |
|---|---|
| Inputs | the worktree as it is, committed or not; `--base` as the ref to compare with |
| Passes run | static on the changed fixtures; `--render` at 390 on the same (all of them when CSS, scripts or `inputs` moved). Never `--explore`, never `--all` |
| Time | static: under 5 s once built. Render: under 60 s warm, one WebKit process, no network, no server. drover decides the timeout; 180 s is safe |
| Host | no install: WebKit comes from the host's Playwright cache, and a missing one is exit 2. A repo with no `harness` gets static only |
| Idempotent | it writes only `$GUARD_OUT` and its own scratch folder; running it twice gives the same file |

## What comes back

| Exit | Means | The hook |
|---|---|---|
| 0 | no new error | accepts the turn |
| 1 | `Outcome.new` is not empty | refuses the turn and types the findings into the lane |
| 2 | the setup is broken: a config that does not parse, an ignore with no reason, a harness that did not start | drover decides; recommended: accept the turn and log it, so broken tooling never holds a lane. CI still gates |

`$GUARD_OUT` holds one `Outcome` (`shapes.md`). For a refusal the hook prints, per entry of `new`, in order:

```
<rule> <file> <at>: <message>
  fix: <fix>
```

and, recommended, at most the first 20 with a count of the rest. Every entry has a `fix`, so the lane is never told
only what is wrong. `warned` is not typed into the lane.

## What the lane may do about a finding

- Change the screen so the finding is gone. If it was in the baseline, run `blocks check --tighten`.
- Add an ignore with a reason in `.blocks/ignore/<fixture>.json`. The file is in the PR, so the reviewer reads the
  reason. drover decides whether a rev lane treats a new ignore as needing proof.
- Never: edit a file in `.blocks/baseline/` by hand to add an entry. The check fails with `guard/baseline-grew`.

Recommended, after drover's own pattern for a bad `why.md`: a `done` is refused once with the findings; a second
`done` at the same findings goes to review with the `Outcome` attached, so a wrong rule cannot trap a lane.

## The skill

`blocks skill --to <dir>` writes the usage skill of the repo's pin into `<dir>`, the same files on every run.
drover decides where a lane's skills live and calls it when it starts a lane on a repo with `.blocks/guard.json`.
The skill is not committed in the app.

## The nightly sweep

Not the hook's: the app's `guard.yml` runs it and uploads `guard-out/` (the `Outcome`, the SARIF, each failing walk's
`steps.json` and PNG) when it fails. drover decides who reads a red nightly and files the issue.
