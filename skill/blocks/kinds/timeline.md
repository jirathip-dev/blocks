# `timeline`

Rows of bars on a day axis from `from` to `to` (ISO days); `move`, `stretch` and `draw` each send a `DaySpan`.

The Rust type `Timeline`; in TS, `timeline(fields: Timeline)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `draw` | `Gesture` | optional |
| `empty` | `string` | optional |
| `from` | `string` | required |
| `id` | `string` | optional |
| `move` | `Gesture` | optional |
| `off` | `string[]` | optional |
| `show` | `Expr` | optional |
| `stretch` | `Gesture` | optional |
| `title` | `string` | optional |
| `to` | `string` | required |
| `tracks` | `TimeRow[]` | required |

## A sample

```json
{
  "type": "timeline",
  "id": "plan",
  "title": "Crews",
  "from": "2026-12-01",
  "to": "2026-12-31",
  "off": [
    "2026-12-05",
    "2026-12-06",
    "2026-12-10",
    "2026-12-12",
    "2026-12-13",
    "2026-12-19",
    "2026-12-20",
    "2026-12-26",
    "2026-12-27",
    "2026-12-31"
  ],
  "tracks": [
    {
      "id": "j0",
      "title": "St Anne's annexe",
      "subtitle": "Crew 3 · fit-out",
      "bars": [
        {
          "id": "b01",
          "start": "2026-11-23",
          "end": "2026-12-04",
          "label": "Fit-out",
          "progress": 80
        }
      ]
    },
    {
      "id": "j1",
      "title": "Riverside Tower A",
      "subtitle": "Crew 1",
      "bars": [
        {
          "id": "b11",
          "start": "2026-12-01",
          "end": "2026-12-04",
          "label": "Formwork",
          "tone": "ok",
          "progress": 100
        },
        {
          "id": "b12",
          "start": "2026-12-07",
          "end": "2026-12-09",
          "label": "Pour"
        },
        {
          "id": "b13",
          "start": "2026-12-14",
          "end": "2026-12-22",
          "label": "Cure",
          "tone": "info"
        }
      ]
    },
    {
      "id": "j2",
      "title": "Riverside Tower B",
      "subtitle": "Crew 2",
      "bars": [
        {
          "id": "b21",
          "start": "2026-12-02",
          "end": "2026-12-08",
          "label": "Excavate",
          "progress": 60
        },
        {
          "id": "b22",
          "start": "2026-12-11",
          "end": "2026-12-18",
          "label": "Footings"
        }
      ]
    },
    {
      "id": "j3",
      "title": "Marlow Street flats",
      "subtitle": "Crew 3 · behind",
      "bars": [
        {
          "id": "b31",
          "start": "2026-12-07",
          "end": "2026-12-23",
          "label": "Brickwork",
          "tone": "warn",
          "progress": 30
        },
        {
          "id": "b32",
          "start": "2026-12-28",
          "end": "2026-12-28",
          "label": "Inspect"
        }
      ]
    },
    {
      "id": "j4",
      "title": "Kingfisher school hall",
      "subtitle": "Crew 1 · finished",
      "bars": [
        {
          "id": "b41",
          "start": "2026-12-01",
          "end": "2026-12-03",
          "label": "Roof",
          "tone": "ok",
          "progress": 100,
          "fixed": true
        },
        {
          "id": "b42",
          "start": "2026-12-07",
          "end": "2026-12-08",
          "label": "Snag list",
          "progress": 100,
          "fixed": true
        }
      ]
    },
    {
      "id": "j5",
      "title": "Quayside car park",
      "subtitle": "Crew 4",
      "bars": [
        {
          "id": "b51",
          "start": "2026-12-15",
          "end": "2026-12-18",
          "label": "Resurface · no permit",
          "tone": "bad"
        },
        {
          "id": "b52",
          "start": "2026-12-21",
          "end": "2026-12-22",
          "label": "Lines"
        }
      ]
    },
    {
      "id": "j6",
      "title": "Old Mill conversion",
      "subtitle": "unassigned",
      "bars": []
    },
    {
      "id": "j7",
      "title": "Pier Road drainage",
      "subtitle": "Crew 2",
      "bars": [
        {
          "id": "b71",
          "start": "2026-12-21",
          "end": "2026-12-23",
          "label": "Survey"
        },
        {
          "id": "b72",
          "start": "2026-12-28",
          "end": "2027-01-08",
          "label": "Dig",
          "tone": "accent"
        }
      ]
    }
  ],
  "move": {
    "action": "schedule",
    "name": "bar"
  },
  "stretch": {
    "action": "schedule",
    "name": "bar"
  },
  "draw": {
    "action": "schedule",
    "name": "bar"
  }
}
```

## The tree it draws

```json
{
  "kind": "timeline",
  "id": "plan",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Crews",
  "children": []
}
```
