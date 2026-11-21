# `message`

One message of a conversation: who said it, what was said as blocks, and its attachments.

The Rust type `Message`; in TS, `message(fields: Message)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `avatar` | `string` | optional |
| `blocks` | `Block[]` | optional |
| `files` | `Attachment[]` | optional |
| `id` | `string` | optional |
| `name` | `string` | required |
| `role` | `Role` | required |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "message",
  "id": "chat",
  "role": "agent",
  "name": "Scout",
  "avatar": "/media/sample.svg",
  "blocks": [
    {
      "type": "prose",
      "id": "chat-a",
      "parts": [
        {
          "part": "para",
          "spans": [
            {
              "text": "Reading both files."
            }
          ]
        }
      ]
    },
    {
      "type": "tool",
      "id": "chat-read",
      "name": "Read",
      "state": "done",
      "summary": "patch.rs, 238 lines",
      "body": "use std::fmt;"
    },
    {
      "type": "prose",
      "id": "chat-b",
      "parts": [],
      "streaming": true
    }
  ],
  "files": [
    {
      "name": "plan.pdf",
      "tap": {
        "url": "/files/plan.pdf"
      }
    },
    {
      "name": "shot.png",
      "tap": {
        "url": "/files/shot.png"
      },
      "src": "/media/sample.svg"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "message",
  "id": "chat",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "Scout",
  "children": [
    {
      "kind": "prose",
      "id": "chat-a",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "chat-a",
      "children": []
    },
    {
      "kind": "tool",
      "id": "chat-read",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "Read",
      "children": []
    },
    {
      "kind": "prose",
      "id": "chat-b",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "chat-b",
      "children": []
    }
  ]
}
```
