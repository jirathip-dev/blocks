# `diff`

A file's diff.

The Rust type `Diff`; in TS, `diff(fields: Diff)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `file` | `string` | required |
| `hunks` | `Hunk[]` | required |
| `id` | `string` | optional |
| `show` | `Expr` | optional |
| `summary` | `string` | optional |

## A sample

```json
{
  "type": "diff",
  "id": "change",
  "file": "src/lib.rs",
  "hunks": [
    {
      "at": "@@ -1 +1 @@",
      "lines": [
        "-a",
        "+b"
      ]
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "diff",
  "id": "change",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "src/lib.rs",
  "children": []
}
```
