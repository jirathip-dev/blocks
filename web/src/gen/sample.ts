import type { Frame } from "./types.ts";

export const sample: Frame[] = [
  {
    "seq": 0,
    "body": {
      "snapshot": {
        "screen": {
          "rows": [
            {
              "id": "title",
              "block": {
                "text": {
                  "text": "Hello"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    "seq": 1,
    "body": {
      "ops": {
        "ops": [
          {
            "insert": {
              "at": 1,
              "row": {
                "id": "go",
                "block": {
                  "button": {
                    "label": "Go",
                    "action": "go"
                  }
                }
              }
            }
          },
          {
            "update": {
              "row": {
                "id": "title",
                "block": {
                  "text": {
                    "text": "Hi"
                  }
                }
              }
            }
          },
          {
            "remove": {
              "id": "go"
            }
          }
        ]
      }
    }
  }
];
