# `steps`

A stepper of named steps with its current one, or progress bars.

The Rust type `Steps`; in TS, `steps(fields: Steps)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `bars` | `Bar[]` | optional |
| `current` | `string` | optional |
| `done` | `boolean` | optional |
| `fallback` | `Fallback` | optional |
| `id` | `string` | optional |
| `show` | `Expr` | optional |
| `steps` | `Stage[]` | optional |
| `title` | `string` | optional |

## A sample

```json
{
  "type": "steps",
  "id": "stop",
  "title": "Stop 3 of 8",
  "steps": [
    {
      "id": "stop",
      "label": "Stop",
      "sub": "arrived 09:42",
      "tap": {
        "open": "stop"
      }
    },
    {
      "id": "lines",
      "label": "Lines",
      "sub": "6 checked",
      "tap": {
        "open": "lines"
      }
    }
  ],
  "done": true
}
```

## The tree it draws

```json
{
  "kind": "steps",
  "id": "stop",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Stop 3 of 8",
  "children": []
}
```
