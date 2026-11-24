# Skill evals

Does an agent that follows this skill build a screen that is clean and right? Each case in `evals.json` is a prompt
plus what the screen built for it must hold. `blocks eval --skill <this folder> --replies <dir>` reads `<dir>/<id>.json`,
the screen an agent wrote for case `<id>`, prints `ok` or `FAIL` with each miss per case, and exits 1 on any miss.
It calls no model.

## A case

| field | | a reply fails when |
|---|---|---|
| `id` | required, unique | `<id>.json` is missing or is not JSON |
| `prompt` | required | |
| `kinds` | kinds | one of them is not drawn |
| `absent` | kinds | one of them is drawn |
| `avoid` | guard rule ids | it hits one, a warning included |
| `actions` | action names | no block sends one |

Every reply also fails on any guard error. The checker refuses an unknown field, a repeated id, an empty prompt, a
kind the crate does not have and a rule the guard does not have.

## Refreshing the recorded replies

The blocks repo keeps one reply per case in `fixtures/skill/evals/replies/`, and CI scores them on every push. To
record them again, by hand or with any agent:

1. Give the agent this skill (`blocks skill --to <dir>`) and one case's `prompt`, and nothing else.
2. Save the screen JSON it answers with as `replies/<id>.json`, unedited.
3. Run `blocks eval --skill skill/blocks/evals --replies fixtures/skill/evals/replies` and commit the replies once
   it exits 0. A miss is a finding about the skill: fix the skill and record that case again, never edit the reply.
