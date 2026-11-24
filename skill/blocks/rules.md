# The guard's rules

Guard version 4. A new error fails `blocks check`; a warning never fails.

| rule | severity | since | fires on | fix |
|---|---|---|---|---|
| `lint/action-no-id` | warn | 1 | a block that sends an action has no id | Give the block an `id`; tests, the harness and explore find it by id. |
| `lint/actions-many` | warn | 1 | more than 12 actions on a screen, the rows' own not counted | Move the rare actions into a `menu` or a sheet. |
| `guard/baseline-grew` | error | 1 | a baseline gained an entry for a rule older than the file | Fix the finding, or add an ignore with a reason. |
| `guard/baseline-stale` | error | 1 | a baseline entry is no longer found | Run `blocks check --tighten`. |
| `lint/buttons-many` | error | 1 | more than 3 buttons in one group | Keep up to three; move the rest into a `menu`. |
| `catalog/action` | error | 4 | an action its kind's catalog entry does not list | Send only an action the finding lists for this kind, spelt as written, or none. |
| `catalog/field` | error | 4 | a field its kind's catalog entry does not offer, or one no catalog offers | Leave the field out: the kind takes the fields listed in the finding. |
| `catalog/input` | error | 4 | a form field of a type its catalog entry does not list | Use only the field types the finding lists for this form. |
| `catalog/kind` | error | 4 | a block of a kind its catalog does not name | Use only the kinds the catalog names, listed in the finding. |
| `catalog/link` | error | 4 | a `url`, `href` or `link`, or a link in `markdown` or `text`, that starts with none of its catalog's `links` | Start a link with one of the starts the finding lists, or write it as text. |
| `catalog/media` | error | 4 | a `src`, `avatar` or `poster` that starts with none of its catalog's `media` | Load a file only from a start the finding lists; else describe it in text. |
| `catalog/open` | error | 4 | a tap with `open`, `sheet` or `thread` in a block held to a catalog | Send an action instead; the app opens the screen. |
| `catalog/size` | error | 4 | more blocks than its catalog's `max.blocks` | Say it in fewer blocks. |
| `render/clipped-text` | error | 2 | text is cut by its box with no ellipsis | Let the text wrap, or shorten it. |
| `render/console` | error | 1 | a console error or an uncaught exception | Fix the script error; the message is in the finding. |
| `render/contrast` | error | 2 | text under 4.5:1 against what is drawn behind it (3:1 from 24 px, or 18.66 px bold); text over an image is skipped and counted | Use a token pair the scheme gate passes: `--fg` on `--bg`, or a tone's own pair. |
| `lint/depth` | error | 1 | blocks nested deeper than 6 | Flatten it: open the inner part as a sheet or a screen of its own with `tap.open`. |
| `lint/destructive-unconfirmed` | error | 1 | a destructive button or act sends an action with no confirm | Add a `confirm` whose title names what is lost. |
| `render/dropped` | warn | 2 | an island sent an event its `events` does not name | Name the event in the island's `events`, or stop sending it. |
| `lint/empty-state` | error | 1 | a list with no rows, a section with no blocks or a message with no blocks and no files, and no visible text, prose, hero or card beside it | Add a `text` beside it that says what will appear here. |
| `explore/error-screen` | error | 1 | an answer is an error, its ops do not apply, or the screen they give has a fault | Answer with ops that apply to the screen as it is; `Built::check` the result. |
| `lint/fault` | error | 1 | Built::check returns a fault | Build the block with its typed constructor; `Built::check` must return nothing. |
| `css/fixed-width` | error | 2 | a `width` or `min-width` over 390 px | Use `max-width`, or a width in `%`. |
| `render/frame-budget` | warn | 1 | first paint over 300 ms, or a frame over 16.7 ms | Draw fewer blocks at first: page the list, or fold the rest. |
| `lint/island-unsized` | warn | 1 | an island with no size | Reserve its box with `size`, so the page does not jump when it loads. |
| `lint/label-empty` | error | 1 | a blank button, act, chip, option or field label, row title, or message, tool or attachment name | Give it a label of one to three words. |
| `lint/label-long` | error | 1 | a button, act or chip label, or a message's or tool's name, over 30 characters, or a badge over 20 | Shorten it to a verb and its object; move the rest to a `confirm` or a `text` block. |
| `lint/label-twice` | error | 1 | two buttons or acts in one group with one label and different actions | Rename one so that each says what it does. |
| `lint/level-blocks` | warn | 1 | more than 12 blocks in one level, rows not counted | Group them into sections, or split the screen. |
| `css/motion` | error | 2 | a transition or keyframe of anything but `transform` and `opacity` | Animate `transform` or `opacity` only. |
| `render/no-name` | error | 2 | an actionable element or image with no accessible name | Give it a label, or an `alt` for an image. |
| `render/no-size` | error | 2 | a drawn block has no width or no height | Give the block content, or hide it with `show`. |
| `render/overflow` | error | 2 | a block leaves the 390 px width, or the page scrolls sideways | Let the block wrap: remove the fixed width or the unbroken text that holds it open. |
| `render/overlap` | error | 2 | two sibling blocks cover each other | Remove the app rule that positions the block; let the layout place it. |
| `lint/primary-twice` | error | 1 | two primary buttons among one block's children, or one at the top of a screen that has done | Keep one primary action in a group; make the others `plain`. |
| `css/private-selector` | error | 2 | an app selector names a `.b-` class that is no generated hook | Style a hook from the renderer contract (`.b-<kind>`, `.b-<kind>__<part>`, `[data-variant]`, `[data-tone]`). |
| `css/raw-colour` | error | 2 | an app colour property set to anything but a scheme token (`var(--fg)`, `var(--card)`, …), `currentColor`, `transparent` or `inherit` | Use the scheme token for that role, or add the colour to the app's scheme so the gate checks it. |
| `guard/seed-missing` | warn | 1 | a screen with a list has no `empty` fixture, or no `long` one | Add the fixture from the app's fixture writer. |
| `explore/sent-differs` | error | 1 | the renderer sent other actions than the screen declares for the step | Send the action from the block that declares it; an app view posts through the `act` it is handed. |
| `lint/stream-no-id` | error | 3 | a message, a tool, or a prose with `streaming`, that has no id | Give it an `id`: ops reach a block by its id, and without one each change replaces its parent. |
| `lint/summary-long` | warn | 3 | a tool's summary over 80 characters | Keep one line that says what it did; put the output in `body`. |
| `lint/tap-empty` | error | 3 | an attachment whose tap opens nothing | Give its `tap` a `url`, an `open`, a `sheet` or an `action`. |
| `render/tap-target` | error | 2 | a control under 44 by 44 px; a link inside running text is exempt | Give the control at least 44 px each way: use the kind's own button, or drop the app rule that shrinks it. |
| `lint/text-wall` | warn | 1 | a text block's markdown over 600 characters | Use `prose`, or split it under section headers. |
| `lint/title-long` | error | 1 | a title, header or question over 60 characters | Shorten it to 60 characters or fewer; move the detail to `subtitle` or to a `text` block. |
| `render/tree` | error | 2 | the drawn tree is not the one the crate expects: a block missing, or a fallback where a view was expected | Register the kind's view, or send a kind this renderer draws. |
| `render/truncated` | warn | 2 | a title or label ends in an ellipsis | Shorten it, or let it take two lines. |
| `explore/unanswered` | error | 1 | the answerer gave no answer to an action the screen declares | Handle the action in the app, or remove the control. |
| `explore/unstable` | error | 1 | the answerer gave another answer to the same walk | Make the answerer a function of its seed and the actions so far. |
| `lint/untitled` | warn | 1 | a screen with no title | Give the screen a title of one to three words. |
| `guard/unused-ignore` | error | 1 | an ignore matches no finding | Delete the ignore. |

## Incorrect and Correct

Each rule a screen can hit, as a screen that hits it and the same screen fixed. A `render/` half is drawn with the app CSS or script under it; a `css/` half is an app style sheet over any screen. A `catalog/` pair is held to this catalog:

```json
{
  "name": "fixture",
  "kinds": {
    "text": {
      "fields": [
        "markdown"
      ]
    },
    "section": {},
    "button": {
      "fields": [
        "label",
        "action",
        "style",
        "values",
        "tap"
      ],
      "actions": [
        "pick"
      ]
    },
    "form": {
      "actions": [
        "save"
      ],
      "inputs": [
        "text"
      ]
    },
    "row": {
      "fields": [
        "title",
        "subtitle",
        "tap"
      ]
    },
    "media": {}
  },
  "links": [
    "https://"
  ],
  "media": [
    "https://cdn.example/"
  ],
  "max": {
    "blocks": 4
  }
}
```

### `lint/action-no-id`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "drive",
      "label": "Drive",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "action": "drive",
      "id": "drive",
      "label": "Drive",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/actions-many`

Incorrect:

```json
{
  "actions": [
    {
      "action": "do-0",
      "label": "Do 0"
    },
    {
      "action": "do-1",
      "label": "Do 1"
    },
    {
      "action": "do-2",
      "label": "Do 2"
    },
    {
      "action": "do-3",
      "label": "Do 3"
    },
    {
      "action": "do-4",
      "label": "Do 4"
    },
    {
      "action": "do-5",
      "label": "Do 5"
    },
    {
      "action": "do-6",
      "label": "Do 6"
    },
    {
      "action": "do-7",
      "label": "Do 7"
    },
    {
      "action": "do-8",
      "label": "Do 8"
    },
    {
      "action": "do-9",
      "label": "Do 9"
    },
    {
      "action": "do-10",
      "label": "Do 10"
    },
    {
      "action": "do-11",
      "label": "Do 11"
    },
    {
      "action": "do-12",
      "label": "Do 12"
    }
  ],
  "blocks": [
    {
      "markdown": "Pick one.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "actions": [
    {
      "action": "do-0",
      "label": "Do 0"
    },
    {
      "action": "do-1",
      "label": "Do 1"
    },
    {
      "action": "do-2",
      "label": "Do 2"
    },
    {
      "action": "do-3",
      "label": "Do 3"
    },
    {
      "action": "do-4",
      "label": "Do 4"
    },
    {
      "action": "do-5",
      "label": "Do 5"
    },
    {
      "action": "do-6",
      "label": "Do 6"
    },
    {
      "action": "do-7",
      "label": "Do 7"
    },
    {
      "action": "do-8",
      "label": "Do 8"
    },
    {
      "action": "do-9",
      "label": "Do 9"
    },
    {
      "action": "do-10",
      "label": "Do 10"
    },
    {
      "label": "More",
      "tap": {
        "sheet": "more"
      }
    }
  ],
  "blocks": [
    {
      "markdown": "Pick one.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/buttons-many`

Incorrect:

```json
{
  "blocks": [
    {
      "buttons": [
        {
          "action": "stop",
          "id": "stop",
          "label": "Stop",
          "type": "button"
        },
        {
          "action": "kill",
          "id": "kill",
          "label": "Kill",
          "type": "button"
        },
        {
          "action": "clean",
          "id": "clean",
          "label": "Clean",
          "type": "button"
        },
        {
          "action": "spawn",
          "id": "spawn",
          "label": "Spawn",
          "type": "button"
        }
      ],
      "id": "c",
      "title": "Lane",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "buttons": [
        {
          "action": "stop",
          "id": "stop",
          "label": "Stop",
          "type": "button"
        },
        {
          "action": "kill",
          "id": "kill",
          "label": "Kill",
          "type": "button"
        },
        {
          "action": "clean",
          "id": "clean",
          "label": "Clean",
          "type": "button"
        }
      ],
      "id": "c",
      "title": "Lane",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/action`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "wipe",
      "id": "b",
      "label": "Go",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "action": "pick",
      "id": "b",
      "label": "Go",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/field`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "t",
      "markdown": "Hi",
      "tone": "ok",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "t",
      "markdown": "Hi",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/input`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "save",
      "fields": [
        {
          "label": "On",
          "name": "on",
          "type": "toggle"
        }
      ],
      "id": "f",
      "type": "form"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "action": "save",
      "fields": [
        {
          "label": "On",
          "name": "on",
          "type": "text"
        }
      ],
      "id": "f",
      "type": "form"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/kind`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "c",
      "title": "Plans",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "c",
      "markdown": "Plans",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/link`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "r",
      "tap": {
        "url": "http://docs.example/"
      },
      "title": "Docs",
      "type": "row"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "r",
      "tap": {
        "url": "https://docs.example/"
      },
      "title": "Docs",
      "type": "row"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/media`

Incorrect:

```json
{
  "blocks": [
    {
      "alt": "A cat",
      "height": 10,
      "id": "m",
      "src": "https://evil.example/a.png",
      "type": "media",
      "width": 10
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "alt": "A cat",
      "height": 10,
      "id": "m",
      "src": "https://cdn.example/a.png",
      "type": "media",
      "width": 10
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/open`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "b",
      "label": "Settings",
      "tap": {
        "open": "settings"
      },
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "b",
      "label": "Settings",
      "tap": {
        "action": "pick"
      },
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `catalog/size`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "t0",
      "markdown": "Line 0.",
      "type": "text"
    },
    {
      "id": "t1",
      "markdown": "Line 1.",
      "type": "text"
    },
    {
      "id": "t2",
      "markdown": "Line 2.",
      "type": "text"
    },
    {
      "id": "t3",
      "markdown": "Line 3.",
      "type": "text"
    },
    {
      "id": "t4",
      "markdown": "Line 4.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "t0",
      "markdown": "Line 0.",
      "type": "text"
    },
    {
      "id": "t1",
      "markdown": "Line 1.",
      "type": "text"
    },
    {
      "id": "t2",
      "markdown": "Line 2.",
      "type": "text"
    },
    {
      "id": "t3",
      "markdown": "Line 3.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `render/clipped-text`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```
```css
.b-text{white-space:nowrap;overflow:hidden}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `render/console`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "note",
      "markdown": "The app's script throws as the page loads.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Console",
  "type": "screen"
}
```
```js
throw new Error("the app script broke");
```

Correct:

```json
{
  "blocks": [
    {
      "id": "note",
      "markdown": "The app's script throws as the page loads.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Console",
  "type": "screen"
}
```

### `render/contrast`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```
```css
:root{--fg:#bbb}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `lint/depth`

Incorrect:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "blocks": [
            {
              "blocks": [
                {
                  "blocks": [
                    {
                      "blocks": [
                        {
                          "blocks": [
                            {
                              "markdown": "Seven levels down.",
                              "type": "text"
                            }
                          ],
                          "header": "More",
                          "type": "section"
                        }
                      ],
                      "header": "More",
                      "type": "section"
                    }
                  ],
                  "header": "More",
                  "type": "section"
                }
              ],
              "header": "More",
              "type": "section"
            }
          ],
          "header": "More",
          "type": "section"
        }
      ],
      "header": "More",
      "type": "section"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "blocks": [
            {
              "blocks": [
                {
                  "blocks": [
                    {
                      "blocks": [
                        {
                          "markdown": "Six levels down.",
                          "type": "text"
                        }
                      ],
                      "header": "More",
                      "type": "section"
                    }
                  ],
                  "header": "More",
                  "type": "section"
                }
              ],
              "header": "More",
              "type": "section"
            }
          ],
          "header": "More",
          "type": "section"
        }
      ],
      "header": "More",
      "type": "section"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/destructive-unconfirmed`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "remove",
      "id": "rm",
      "label": "Remove fleet",
      "style": "destructive",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "action": "remove",
      "confirm": {
        "title": "Remove the fleet and its lanes?"
      },
      "id": "rm",
      "label": "Remove fleet",
      "style": "destructive",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `render/dropped`

Incorrect:

```json
{
  "blocks": [
    {
      "events": [],
      "fallback": {
        "title": "No echo"
      },
      "id": "e",
      "name": "x-echo",
      "props": {
        "zoom": 3
      },
      "type": "island"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "events": [
        "echo"
      ],
      "fallback": {
        "title": "No echo"
      },
      "id": "e",
      "name": "x-echo",
      "props": {
        "zoom": 3
      },
      "size": {
        "height": 240,
        "width": 390
      },
      "type": "island"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `lint/empty-state`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "rows",
      "rows": [],
      "type": "list"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "rows",
      "rows": [],
      "type": "list"
    },
    {
      "markdown": "Queued lanes will show here.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/fault`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "g",
      "type": "gizmo"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "g",
      "markdown": "A note.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `css/fixed-width`

Incorrect:

```css
.b-diagram{
  max-width:500px;
  min-width:400px
}
```

Correct:

```css
.b-diagram{
  max-width:100%
}
```

### `lint/island-unsized`

Incorrect:

```json
{
  "blocks": [
    {
      "fallback": {
        "title": "Fleet map"
      },
      "id": "map",
      "name": "fleet-map",
      "type": "island"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "fallback": {
        "title": "Fleet map"
      },
      "id": "map",
      "name": "fleet-map",
      "size": {
        "height": 240,
        "width": 390
      },
      "type": "island"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/label-empty`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "go",
      "id": "go",
      "label": " ",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "action": "go",
      "id": "go",
      "label": "Go",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/label-long`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "merge",
      "id": "go",
      "label": "Merge every pull request that is green",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "action": "merge",
      "id": "go",
      "label": "Merge green PRs",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/label-twice`

Incorrect:

```json
{
  "blocks": [
    {
      "buttons": [
        {
          "action": "ship",
          "id": "a",
          "label": "Go",
          "type": "button"
        },
        {
          "action": "stage",
          "id": "b",
          "label": "Go",
          "type": "button"
        }
      ],
      "id": "c",
      "title": "Next",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "buttons": [
        {
          "action": "ship",
          "id": "a",
          "label": "Ship",
          "type": "button"
        },
        {
          "action": "stage",
          "id": "b",
          "label": "Stage",
          "type": "button"
        }
      ],
      "id": "c",
      "title": "Next",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/level-blocks`

Incorrect:

```json
{
  "blocks": [
    {
      "markdown": "Line 0.",
      "type": "text"
    },
    {
      "markdown": "Line 1.",
      "type": "text"
    },
    {
      "markdown": "Line 2.",
      "type": "text"
    },
    {
      "markdown": "Line 3.",
      "type": "text"
    },
    {
      "markdown": "Line 4.",
      "type": "text"
    },
    {
      "markdown": "Line 5.",
      "type": "text"
    },
    {
      "markdown": "Line 6.",
      "type": "text"
    },
    {
      "markdown": "Line 7.",
      "type": "text"
    },
    {
      "markdown": "Line 8.",
      "type": "text"
    },
    {
      "markdown": "Line 9.",
      "type": "text"
    },
    {
      "markdown": "Line 10.",
      "type": "text"
    },
    {
      "markdown": "Line 11.",
      "type": "text"
    },
    {
      "markdown": "Line 12.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "markdown": "Line 0.",
      "type": "text"
    },
    {
      "markdown": "Line 1.",
      "type": "text"
    },
    {
      "markdown": "Line 2.",
      "type": "text"
    },
    {
      "markdown": "Line 3.",
      "type": "text"
    },
    {
      "markdown": "Line 4.",
      "type": "text"
    },
    {
      "markdown": "Line 5.",
      "type": "text"
    },
    {
      "markdown": "Line 6.",
      "type": "text"
    },
    {
      "markdown": "Line 7.",
      "type": "text"
    },
    {
      "markdown": "Line 8.",
      "type": "text"
    },
    {
      "markdown": "Line 9.",
      "type": "text"
    },
    {
      "markdown": "Line 10.",
      "type": "text"
    },
    {
      "markdown": "Line 11.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `css/motion`

Incorrect:

```css
.b-card{transition:opacity .2s, transform .2s}
@keyframes in{from{opacity:0;transform:none}to{opacity:1}}
.b-card{transition:height .2s}
```

Correct:

```css
.b-card{transition:opacity .2s, transform .2s}
```

### `render/no-name`

Incorrect:

```json
{
  "blocks": [
    {
      "type": ""
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `render/no-size`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```
```css
.b-text{height:0;padding:0;margin:0}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `render/overflow`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```
```css
.b-text{margin-left:200px;width:300px}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `render/overlap`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    },
    {
      "id": "b",
      "markdown": "A second note",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```
```css
.b-text{position:relative}
.b-text + .b-text{top:-30px}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    },
    {
      "id": "b",
      "markdown": "A second note",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `lint/primary-twice`

Incorrect:

```json
{
  "blocks": [
    {
      "buttons": [
        {
          "action": "ship",
          "id": "ship",
          "label": "Ship",
          "style": "primary",
          "type": "button"
        },
        {
          "action": "stage",
          "id": "stage",
          "label": "Stage",
          "style": "primary",
          "type": "button"
        }
      ],
      "id": "c",
      "title": "Deploy",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "buttons": [
        {
          "action": "ship",
          "id": "ship",
          "label": "Ship",
          "style": "primary",
          "type": "button"
        },
        {
          "action": "stage",
          "id": "stage",
          "label": "Stage",
          "style": "plain",
          "type": "button"
        }
      ],
      "id": "c",
      "title": "Deploy",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `css/private-selector`

Incorrect:

```css
.b-card{color:var(--fg)}
/* .b-nope{} */
.b-card__title, .b-card__nope{color:var(--fg)}
```

Correct:

```css
.b-card__title{color:var(--fg)}
```

### `css/raw-colour`

Incorrect:

```css
.b-card{color:var(--fg);background:var(--card) url(#red);border:1px solid currentColor;--brand:#1a73e8}
.b-card__title{display:grid;gap:8px;padding:4px;position:relative;outline:2px solid transparent;box-shadow:0 0 0 1px var(--edge, inherit)}
.b-card{border-color:#1a73e8}
```

Correct:

```css
.b-card{color:var(--fg);background:var(--card);border:1px solid currentColor}
```

### `lint/stream-no-id`

Incorrect:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "id": "t1-a",
          "parts": [
            {
              "part": "para",
              "spans": [
                {
                  "text": "Done."
                }
              ]
            }
          ],
          "type": "prose"
        }
      ],
      "name": "Scout",
      "role": "agent",
      "type": "message"
    }
  ],
  "id": "s",
  "title": "Thread",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "id": "t1-a",
          "parts": [
            {
              "part": "para",
              "spans": [
                {
                  "text": "Done."
                }
              ]
            }
          ],
          "type": "prose"
        }
      ],
      "id": "t1",
      "name": "Scout",
      "role": "agent",
      "type": "message"
    }
  ],
  "id": "s",
  "title": "Thread",
  "type": "screen"
}
```

### `lint/summary-long`

Incorrect:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "id": "t1-b",
          "name": "Test",
          "state": "done",
          "summary": "ran every test in the workspace with all features and the locked lockfile, all passed",
          "type": "tool"
        }
      ],
      "id": "t1",
      "name": "Scout",
      "role": "agent",
      "type": "message"
    }
  ],
  "id": "s",
  "title": "Thread",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "id": "t1-b",
          "name": "Test",
          "state": "done",
          "summary": "ran every test, all passed",
          "type": "tool"
        }
      ],
      "id": "t1",
      "name": "Scout",
      "role": "agent",
      "type": "message"
    }
  ],
  "id": "s",
  "title": "Thread",
  "type": "screen"
}
```

### `lint/tap-empty`

Incorrect:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "id": "t1-a",
          "parts": [
            {
              "part": "para",
              "spans": [
                {
                  "text": "Done."
                }
              ]
            }
          ],
          "type": "prose"
        }
      ],
      "files": [
        {
          "name": "plan.pdf",
          "tap": {}
        }
      ],
      "id": "t1",
      "name": "You",
      "role": "owner",
      "type": "message"
    }
  ],
  "id": "s",
  "title": "Thread",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "blocks": [
        {
          "id": "t1-a",
          "parts": [
            {
              "part": "para",
              "spans": [
                {
                  "text": "Done."
                }
              ]
            }
          ],
          "type": "prose"
        }
      ],
      "files": [
        {
          "name": "plan.pdf",
          "tap": {
            "url": "https://example.com/plan.pdf"
          }
        }
      ],
      "id": "t1",
      "name": "You",
      "role": "owner",
      "type": "message"
    }
  ],
  "id": "s",
  "title": "Thread",
  "type": "screen"
}
```

### `render/tap-target`

Incorrect:

```json
{
  "blocks": [
    {
      "action": "go",
      "id": "go",
      "label": "Go",
      "type": "button"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "go",
      "tap": {
        "action": "go"
      },
      "title": "Go",
      "type": "row"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `lint/text-wall`

Incorrect:

```json
{
  "blocks": [
    {
      "markdown": "The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review. The lane waits for its review.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "markdown": "The lane waits for its review.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

### `lint/title-long`

Incorrect:

```json
{
  "blocks": [
    {
      "markdown": "Nothing queued.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Every lane that waits on the owner, the reviewer or the CI runner",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "markdown": "Nothing queued.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Waiting lanes",
  "type": "screen"
}
```

### `render/tree`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "g",
      "title": "Load",
      "type": "gauge"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "g",
      "title": "Load",
      "type": "card"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `render/truncated`

Incorrect:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```
```css
.b-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
```

Correct:

```json
{
  "blocks": [
    {
      "id": "a",
      "markdown": "A note that is long enough to fill more than one line of the screen at 390 px wide",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Bad",
  "type": "screen"
}
```

### `lint/untitled`

Incorrect:

```json
{
  "blocks": [
    {
      "markdown": "Nothing queued.",
      "type": "text"
    }
  ],
  "id": "s",
  "type": "screen"
}
```

Correct:

```json
{
  "blocks": [
    {
      "markdown": "Nothing queued.",
      "type": "text"
    }
  ],
  "id": "s",
  "title": "Queue",
  "type": "screen"
}
```

No pair: `guard/baseline-grew`, `guard/baseline-stale`, `explore/error-screen`, `render/frame-budget`, `guard/seed-missing`, `explore/sent-differs`, `explore/unanswered`, `explore/unstable`, `guard/unused-ignore`. Each judges a baseline, an app's answerer or the time a draw takes, not a screen.
