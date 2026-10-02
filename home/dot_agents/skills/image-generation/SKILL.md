---
name: image-generation
description: Use when the user asks for a generated image, such as concept art, a reference picture, an icon or logo draft, a texture, a mockup, or an illustration. Ships a script that turns a text prompt into a PNG through a paid third-party API. Covers the ask before spending, the brief, a low-quality draft, judging the PNG against the brief, and the raster-only limit for vector assets.
---

# Image Generation

`scripts/generate_image.py` turns one text prompt into one PNG. It sits in this skill's directory, `~/.agents/skills/image-generation/`.

Every run without `--dry-run` costs the user money and sends the prompt to a third party.

## Gate: ask before every paid run

A paid third-party call is an ask-first action under the shared policy. Follow its "How to ask" rule. The ask also states:

- how many images, drafts included
- the size and the quality of each
- that the prompt text leaves the machine

The approval covers that count. One image more → ask again. `--dry-run` sends nothing and needs no ask.

## Loop

1. **Brief.** Write one line per field before writing the prompt.

   | Field | Holds |
   |---|---|
   | Subject | what is shown, and how many of it |
   | Style | the medium and one rendering trait: "flat shapes, no gradients", "35 mm product photo" |
   | Composition | framing, viewpoint, where the subject sits, portrait or landscape or square |
   | Palette | hex values, each tied to the thing it colours |
   | Background | transparent, one hex colour, or a described scene |
   | Excluded | what must not appear: text, a watermark, a border, people |

   A field the user left open and the project does not answer → ask the user. The prompt is the brief written as sentences.
2. **Dry run.** Run the command with `--dry-run`. Exit 0 → the printed model, size, quality, and output path are the facts for the ask.
3. **Ask.** The gate above.
4. **Draft.** Run with `--quality low`.
5. **Look.** Open the PNG with the host's image-reading tool. Write pass or fail for every line of the brief. An image nobody opened is not done.
6. **Revise or finish.**

   | Result | Next |
   |---|---|
   | A line fails | Change the prompt for that line and draft again: `references/revising-a-draft.md` |
   | Every line passes | Generate the final at the approved quality, then repeat step 5 on it |

   The final is a new sample, not the draft sharpened. It can fail a line the draft passed.

Report the path of the final PNG and the pass or fail line for each brief field.

## The script

```
python3 ~/.agents/skills/image-generation/scripts/generate_image.py \
  --prompt-file <prompt.txt> --out <new.png> --size <size> --quality <quality> \
  [--transparent] [--dry-run]
```

| Flag | Rule |
|---|---|
| `--prompt` or `--prompt-file` | exactly one |
| `--out` | a `.png` path that does not exist, in a directory that does. The script never overwrites, so each draft gets its own name |
| `--size`, `--quality`, `--model` | allowlisted. `--help` prints the values. Leave `--model` at its default unless the user names one |
| `--transparent` | transparent background |

| Exit | Meaning | Next |
|---|---|---|
| 0 | the PNG is written, or the dry run is valid | step 5, or step 3 |
| 1 | the API refused or failed. Stderr holds the HTTP status and the reason | 429 or 5xx → wait, retry once. Any other status → the request has to change first. A content refusal → show the user the reason |
| 2 | a bad argument, an existing output file, or a missing API key. Stderr names it | fix the argument. A missing key → tell the user which variable to export, and stop |

## Where the file goes

| The user | `--out` |
|---|---|
| names a path | that path, for the final |
| names none | the session temp directory |

Drafts always go to the session temp directory. Never write an image into a repository unless the user asked for it there.

## Raster only

The output is a PNG. For an asset that ships as a vector (an icon, a logo, a diagram), the PNG is a reference to redraw or trace as SVG. Never deliver the PNG as the asset, and never wrap it in an `<image>` tag inside an SVG.

## What goes in a prompt

Describe the picture, not the project. Never put a secret, private source code, an internal name, or personal data about a real person in a prompt.
