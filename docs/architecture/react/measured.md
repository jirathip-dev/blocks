# Measured and tried

Nothing here is in the repo: the spike and both libraries lived in a scratch folder and are not committed.

## 1. Two ways to draw in React, built and run

At `d21aedb`, React 19.3.1, esbuild 0.28.2, Playwright 1.63.0's WebKit, 390 by 844.

- **Host**: one component that calls the HTML renderer's `render` into its own element after each commit, with
  each island a portal into a box the component keeps by the island's id. 70 lines, every kind.
- **Native**: ten kinds as React components (screen, section, list, row, card, button, stat, text, form, island),
  with local state from the core's `start` and `view`. 292 lines; rows without rounds and swipe, cards without
  fold, text without markdown, forms without drafts.

The same screen in both: a list of one row, a form with one text field, an island holding a counter. The steps:
press the counter twice, type `abc` into the field, then hand the view a new screen whose row title changed.

| After the new screen | Host | Native |
|---|---|---|
| the row's title | new | new |
| the text typed into the field | gone: the input is a new element | `abc`, the same element |
| the focus | lost | kept |
| the island's counter | 2, only because of the box kept by id | 2 |
| pressing the form's submit, the field filled | sends nothing while the field is named `q`; sends once it is named `text` | sends `{ screen: "s", action: "go", block: "f", values: { q: "abc" } }` |

| | Host | Native |
|---|---|---|
| Server render of a three-block screen | `<div class="b-view"></div>` | the whole screen's markup, 611 bytes |
| Adapter, minified and gzipped, React left out | 15,448 bytes (it carries the whole HTML renderer) | 4,437 bytes for the ten kinds |
| The same element list as the HTML renderer (tag, classes, `data-*`, `role`, `aria-*`, own text) | by construction | 8 of 10 blocks identical; `form` lacks the draft attributes and `text` the markdown, the two parts the spike left out |

The scoped stylesheet, made from `blocks.css` by the wrap in `shapes.md`, on the same page:

| Element | `::before` content | |
|---|---|---|
| a button inside the view | `"["` | styled |
| a button beside the view | none | left alone |
| a button inside the island's component | none | left alone |
| the fallback row of an island with no component | min-height 44px | styled |

For scale: the HTML renderer's kinds are 1,293 lines, and the files of the ten spiked kinds are 506 of them. A
React kind takes about the lines of its HTML twin, which gives the slice budgets: 560 for the 12 kinds of R6 and R7
(the island box is in R5's frame), about 650 for the later 14.

Not measured: frame times of the native adapter on the 200-row screen (the bench has a hand-written React page, not
this adapter); R5 adds the adapter to the harness, which reports them.

## 2. json-render, tried

`@json-render/core` and `@json-render/react` 0.23.2, Apache-2.0, with zod 4.6.7, in node 24: a four-component
catalog, a registry, static and client renders, and probes for each feature. It is native React components per
type, memoised per element.

| It has | What ran | For blocks |
|---|---|---|
| An error boundary per element | the throwing element drew nothing, its siblings stayed; the server render threw | **take, better**: the block's fallback is drawn, not nothing (R5) |
| Confirm as data on the action, drawn by the renderer | cancel rejects the caller's promise: an unhandled rejection from a plain click handler | have confirm; **take the lesson**: cancel resolves as not sent (R5) |
| Resolved values shared with the last render, a memo per element | an unrelated state write called 0 components, a relevant one called 1 | **take**: `share()` and a memo per block (R2, R5) |
| An action observer and a devtools panel | read in source, not run | **take, small**: one `onReport` callback (R5) |
| Issues with a stable code and the element's key | `validateSpec` finds missing children and orphans | have `Fault`; **take** the place: every fault says where (own issue) |
| A catalog with a schema per component | with five components a wrong prop type passed; unknown actions passed | have, stricter: the generated types and `check()` |
| `validateForm` | did not stop the next action in the list: save still ran | have the rule; **take as a test**: a failing check cannot send (R7) |
| Any prop may be a `$state` or `$computed` expression; `repeat` over state | a missing path drew the text `undefined` | no: a builder is a function over the route's data |
| A flat element map and a JSON-patch stream | a bad op is a silent no-op; a cyclic spec ran node out of memory | no: made for a model's stream; Mode A has ops by id |
| Prompt generation, code export | 17,213 characters of prompt | no; the agent kit is #79's |

## 3. A2UI's React renderer, tried

`@a2ui/react` and `@a2ui/web_core` 0.15.0, Apache-2.0, repo `a2ui-project/a2ui` at `b4f91c2`, in node 24: the v0.9
message processor run headless, and the older v0.8 React entry rendered to a string.

| It has | What ran | For blocks |
|---|---|---|
| A React renderer that hosts shared web components (since 0.13) | importing it in node fails; with a stub the server render throws; a host registry and portals carry React context; 68 KB gzipped for the surface alone, 139 KB with the catalog | **the evidence against hosting** (`adr.md`, options) |
| One core for Lit, Angular and React, and a shared conformance suite each implementation runs | the core is not neutral in practice: it ships Lit and the Lit catalog | have the idea; **take the lesson**: the core imports no framework, held by a ban (R1) |
| Errors as a code, a path and a message; a non-throwing variant | `VALIDATION_FAILED` at `/components/0/text` | **take**: every fault says where (own issue, with json-render's) |
| URL sanitising for media, a ReDoS check on patterns | read in source | **take**: a URL that is not http, https, mailto or relative is a fault (own issue). blocks has named patterns only, so no ReDoS |
| Checks with a result per field, a button disabled by its own checks | the core still dispatches the action while a check fails; only its button stops it | have, in `view()`; the same test as above (R7) |
| `allowedParents` and `allowedChildren` per component | a misplaced component is refused | not now: the types already say what a list field holds; a rule table would be one more thing for both checks |
| A flat list of components by id, filled in as messages arrive | a missing child is a placeholder until it comes | have: ops by id, with remove and insert at a place, which A2UI lacks |
| A data model apart from the structure, lists from a template | list items are identified by index: after a reorder, item 0 is the same object showing other data | no: rows carry ids |
| Surfaces, catalog negotiation, a theme in the message | the theme left the format in v1.0 | no: a screen is the surface, the kinds are fixed, the look is the app's |
| An unknown component | draws nothing and reports | have, better: the mandatory fallback |

Not run for either: anything in a real browser, the other frameworks' renderers, any attack on the security claims.
