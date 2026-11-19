# `text`

Text: markdown, or a plain styled line.

The Rust type `Text`; in TS, `text(fields: Text)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `center` | `boolean` | optional |
| `font` | `string` | optional |
| `id` | `string` | optional |
| `markdown` | `string` | optional |
| `show` | `Expr` | optional |
| `size` | `number` | optional |
| `style` | `TextStyle` | optional |
| `text` | `string` | optional |
| `tone` | `Tone` | optional |
| `top` | `number` | optional |
| `until` | `string` | optional |
| `weight` | `string` | optional |

## A sample

```json
{
  "type": "text",
  "id": "note",
  "markdown": "**Hello**"
}
```

## The tree it draws

```json
{
  "kind": "text",
  "id": "note",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "note",
  "children": []
}
```
