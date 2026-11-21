# `screen`

A whole screen.

The Rust type `Screen`; in TS, `screen(fields: Screen)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `actions` | `Act[]` | optional |
| `back` | `string` | optional |
| `badge` | `number` | optional |
| `blocks` | `Block[]` | optional |
| `done` | `Submit` | optional |
| `focus` | `boolean` | optional |
| `id` | `string` | optional |
| `large` | `boolean` | optional |
| `locale` | `Locale` | optional |
| `pending` | `Pending` | optional |
| `personas` | `Record<string, unknown>[]` | optional |
| `refresh` | `boolean` | optional |
| `show` | `Expr` | optional |
| `sites` | `number` | optional |
| `source` | `string` | optional |
| `state` | `Record<string, Lit>` | optional |
| `stream` | `string` | optional |
| `threads` | `Record<string, unknown>[]` | optional |
| `title` | `string` | optional |
| `url` | `string` | optional |

## A sample

```json
{
  "type": "screen",
  "id": "home",
  "title": "Home",
  "state": {
    "ready": true
  },
  "blocks": [
    {
      "type": "text",
      "id": "hint",
      "markdown": "Ready",
      "show": {
        "get": "ready"
      }
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "screen",
  "id": "home",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Home",
  "children": [
    {
      "kind": "text",
      "id": "hint",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "hint",
      "children": []
    }
  ]
}
```
