# `run`

A command the owner approves to run.

The Rust type `Run`; in TS, `run(fields: Run)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | required |
| `command` | `string` | required |
| `dir` | `string` | optional |
| `id` | `string` | optional |
| `sha` | `string` | required |
| `show` | `Expr` | optional |
| `touches` | `string` | optional |
| `until` | `string` | optional |

## A sample

```json
{
  "type": "run",
  "id": "run",
  "action": "approve",
  "command": "cargo test",
  "sha": "4f2a9c1",
  "dir": "crates"
}
```

## The tree it draws

```json
{
  "kind": "run",
  "id": "run",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "cargo test",
  "children": []
}
```
