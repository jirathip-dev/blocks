# Example: `ok-sheet`

A screen with no guard finding: start a new screen from it.

```json
{
  "blocks": [
    {
      "action": "add",
      "fields": [
        {
          "label": "Repo",
          "name": "repo",
          "type": "text"
        }
      ],
      "id": "f",
      "type": "form"
    },
    {
      "action": "cancel",
      "id": "cancel-add",
      "label": "Cancel",
      "type": "button"
    }
  ],
  "done": {
    "action": "add",
    "label": "Add"
  },
  "id": "add",
  "title": "Add fleet",
  "type": "sheet"
}
```
