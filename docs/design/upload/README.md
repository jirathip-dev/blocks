## Summary

Decision: the upload field is a list of file rows under its label. Each row has a 56 px thumbnail (or a square with the file's extension), the name, one status line (size, "uploading 62 %" over a thin ink bar, "upload failed", or a red "refused: …") and its buttons: [remove], [retry] or [dismiss]. Under the list are [add photos] / [choose file] / [replace] and a hint built from `accept` and `mb`. On a touch screen with `capture`, [take photo] comes first. The submit stays off, with a line saying why, while a file is uploading or failed. With no file handler the field is drawn off. With JS off, the static page shows the browser's own file input. Default look, no new colour.
Screens: a delivery proof form (uploading, empty, failed), a sheet of every state (empty, one file, many, progress, failed, refused for type and for size, Thai, the app's error, off), and the static page next to its live version. Each is drawn light and dark, at 1440 and 390.
Open questions: (1) On a phone the row stacks under its label, unlike the other fields. Is that OK? (2) This look hides every field's note, so only upload shows the app's error as text. Should other fields do the same later?

## Images

| Image | What it shows |
|---|---|
| `proof-light-1440.png`, `proof-dark-1440.png` | delivery's proof form (`usage.md` part 4). (1) Two photos done and one uploading at 62 %: the submit is off and says "waiting for 1 upload". (2) Empty: [add photos] and the hint "images · up to 10 MB each". (3) One photo failed: [retry] and a red [remove], and the submit says "an upload failed: retry or remove it" |
| `proof-light-390.png`, `proof-dark-390.png` | The same form on a phone. The file list goes full width under its label, and each row's buttons go under the file name. [take photo] comes before [add photos] (it opens the camera through `capture`). [add photos] opens the library |
| `states-light-*.png`, `states-dark-*.png` | 1 empty: one file, many, images only, no `accept`. 2 one file held: a photo, a PDF with a long name cut off, and [replace]. 3 uploading at 8 % and 62 % (the thumbnail dims), done, failed. 4 refused: the wrong type ("refused: only images") and over the size ("refused: 14.2 MB is over 10 MB"). These rows never reach the handler and stay until [dismiss] or the next pick. Also the same in Thai. 5 the app's own error as the field's red note with a red edge, and the field off with no handler ("uploads are off here") |
| `static-light-*.png`, `static-dark-*.png` | JS off: the site writes `<form method=post enctype=multipart/form-data>` with a plain `<input type=file accept capture multiple>`, its button styled with the look's tokens. Below it is the same form once the live renderer takes over |

## What impl builds

- `web/src/render/field/upload.ts`: the root is `div.fu` with `role=group`, named by the label and the file count. Inside it is `ul.fuf` > `li.fui.<state>`: `img.fut` (aria-hidden) or `span.fux`, then `span.fum` (`.fun` name, `.pgt` progress bar with `role=progressbar` while uploading, `.fus` status line), then `span.fua` buttons, each named "remove <file name>" and so on. Then `div.fub`: [take photo] `.fuc`, the pick button, the `.fuh` hint, and a hidden `input[type=file]` the buttons click.
- `busy()` is true while any row is uploading or failed. The form turns the submit off and writes the `.say-busy` line.
- The words (choose file, add files, add photos, choose photo, take photo, replace, remove, retry, dismiss, the hint, uploading, failed, the two refusals, off, the two busy lines) go in the field's words table in English and Thai. Their text is in `upload.js` here.
- `upload.css` here (tokens only) goes into the stylesheet folder. It reuses `.fd`, `.fn`, `.pgt` and the button. The camera button shows on `(pointer:coarse)`. In these previews it shows at 390 wide instead, since headless Chromium has no touch.
- `page.css` and `upload.js` are only for these previews, like in `docs/design/steps`. Run `./render.sh` to make the images (Playwright's cached headless Chromium, light and dark, reduced motion). The photos are three small SVGs in this folder.
- A multi-field form with a submit is drawn here as a card with the submit at the bottom right. How such a form is laid out is not part of this issue.
