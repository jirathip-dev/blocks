# `diagram`

A diagram from its source, with counts and its nodes.

The Rust type `Diagram`; in TS, `diagram(fields: Diagram)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `counts` | `Record<string, number>` | optional |
| `id` | `string` | optional |
| `nodes` | `Nodes` | optional |
| `selected` | `string` | optional |
| `show` | `Expr` | optional |
| `source` | `string` | required |
| `title` | `string` | optional |

## A sample

```json
{
  "type": "diagram",
  "id": "flow",
  "title": "Flow",
  "source": "[*] --> a\na --> b"
}
```

## The tree it draws

```json
{
  "kind": "diagram",
  "id": "flow",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Flow",
  "children": []
}
```
