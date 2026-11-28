# `glance`

What an island and a widget show of one thing: a head every form draws from, and each form's own part.

The Rust type `Glance`; in TS, `glance(fields: Glance)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `expanded` | `GlanceBody` | optional |
| `figure` | `Figure` | optional |
| `id` | `string` | optional |
| `leading` | `GlanceSide` | optional |
| `medium` | `GlanceBody` | optional |
| `show` | `Expr` | optional |
| `small` | `GlanceBody` | optional |
| `subtitle` | `string` | optional |
| `tap` | `Tap` | optional |
| `title` | `string` | required |
| `tone` | `Tone` | optional |
| `trailing` | `GlanceSide` | optional |
| `value` | `Shown` | optional |

## A sample

```json
{
  "type": "glance",
  "id": "turn",
  "title": "Ana",
  "subtitle": "Order sync",
  "figure": {
    "state": "working",
    "avatar": "ana"
  },
  "value": {
    "since": "2026-11-25T09:41:00Z"
  },
  "tone": "working",
  "tap": {
    "thread": "t-42"
  },
  "leading": {
    "figure": {
      "state": "working",
      "avatar": "ana"
    }
  },
  "trailing": {
    "text": "ask",
    "tone": "bad"
  },
  "expanded": {
    "line": "cargo test -p orders",
    "foot": "working · 3 tools",
    "acts": [
      {
        "label": "Stop",
        "action": "stop",
        "values": {
          "thread": "t-42"
        },
        "tone": "bad"
      },
      {
        "label": "Open",
        "tap": {
          "thread": "t-42"
        }
      }
    ]
  },
  "small": {
    "line": "cargo test -p orders",
    "foot": "3 tools"
  },
  "medium": {
    "rows": [
      {
        "title": "Run the order tests",
        "subtitle": "orders",
        "figure": {
          "state": "working"
        },
        "value": {
          "since": "2026-11-25T09:41:00Z"
        },
        "tone": "working",
        "tap": {
          "thread": "t-42"
        }
      },
      {
        "title": "Read the sync log",
        "subtitle": "sync",
        "figure": {
          "state": "working"
        },
        "value": {
          "since": "2026-11-25T09:44:00Z"
        },
        "tone": "working",
        "tap": {
          "thread": "t-43"
        }
      }
    ],
    "foot": "working · 3 tools",
    "acts": [
      {
        "label": "Open",
        "tap": {
          "thread": "t-42"
        }
      }
    ]
  }
}
```

## The tree it draws

```json
{
  "kind": "glance",
  "id": "turn",
  "variant": null,
  "drawn": "native",
  "role": "status",
  "name": "Ana",
  "children": []
}
```
