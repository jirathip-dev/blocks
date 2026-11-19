import type { OldFrame } from "./types.ts";

export const sample: OldFrame[] = [
  {
    "seq": 0,
    "ops": [
      {
        "op": "screen",
        "screen": {
          "type": "screen",
          "id": "s",
          "title": "Thread",
          "blocks": [
            {
              "type": "text",
              "id": "note",
              "markdown": "**Hello**"
            },
            {
              "type": "list",
              "id": "l",
              "rows": [
                {
                  "type": "row",
                  "id": "a",
                  "title": "first"
                },
                {
                  "type": "row",
                  "id": "b",
                  "title": "second"
                }
              ]
            },
            {
              "type": "composer",
              "id": "say",
              "action": "thread-say",
              "placeholder": "message the orchestrator",
              "chips": [
                {
                  "name": "effort",
                  "cur": null,
                  "all": [
                    "low",
                    "high"
                  ]
                }
              ],
              "queued": [
                {
                  "q": 1,
                  "text": "and the tests"
                }
              ]
            }
          ]
        }
      }
    ]
  },
  {
    "seq": 1,
    "ops": [
      {
        "op": "insert",
        "into": "l",
        "before": "a",
        "block": {
          "type": "row",
          "id": "c",
          "title": "before a"
        }
      },
      {
        "op": "insert",
        "into": "l",
        "after": "a",
        "block": {
          "type": "row",
          "id": "d",
          "title": "after a"
        }
      },
      {
        "op": "merge",
        "id": "b",
        "fields": {
          "subtitle": "now"
        }
      },
      {
        "op": "move",
        "id": "b",
        "into": "l",
        "before": "c"
      },
      {
        "op": "replace",
        "id": "note",
        "block": {
          "type": "card",
          "id": "c",
          "tone": "warn",
          "title": "q1"
        }
      },
      {
        "op": "remove",
        "id": "d"
      },
      {
        "op": "badge",
        "count": 2
      },
      {
        "op": "dot",
        "on": true
      }
    ]
  }
];
