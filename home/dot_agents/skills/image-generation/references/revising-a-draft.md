# Revising A Draft

Reached from `SKILL.md` step 6 when a draft fails a line of the brief.

Change only the sentences behind the failed lines. A full rewrite also moves the lines that passed.

| The draft | Change |
|---|---|
| Colours are off | Name each hex value next to the thing it colours: "background #0F172A, jacket #F59E0B" |
| Text is garbled or misspelt | Take the text out of the prompt and add "no text, no lettering". Set the text afterwards in code or in a vector editor |
| An excluded thing appears | Say what fills that space, and keep the exclusion: "an empty street, no people" |
| The subject is cropped or off-centre | State the framing: "whole object in frame, centred, clear margin on every side" |
| The style is wrong | Name the medium and one concrete trait: "flat shapes, no gradients, 2 px outline" |
| Parts sit in the wrong place | Cut the scene to one subject per image. Compose several images in code |
| A recurring character or mark differs between images | Generate every pose on one sheet in a single image, then crop |
| The background is not clean | Add `--transparent` and "isolated subject, no shadow, no ground" |

Precise text, exact placement, and consistency across separate images are known limits of image models. Take the workaround in the row before spending another draft on rewording.

## Stop rule

The same line fails on two revisions in a row → stop. Show the user the best draft and name the failing line. Every further attempt is another paid image and needs a new ask.
