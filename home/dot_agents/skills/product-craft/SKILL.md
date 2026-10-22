---
name: product-craft
description: Use when specifying, building, or shipping anything a user or operator touches (game, web, mobile, or desktop app, API, backend, CLI, infrastructure, data pipeline, ML model, firmware), on "polish", "feels cheap", "production ready", "make it feel finished", or a craft pass at ship. Sets the quality bar from reference products and platform best practice, and audits work against it.
---

# Product Craft

Tests prove the product works. This skill decides whether it is finished: whether someone who uses the best products in its category would accept it.

## The bar comes from outside

Never from your own sense of done. Use all three sources every time:

| Source | How |
|---|---|
| Reference products | 2–3 shipped products the user names as the standard for this category. None named → propose three and ask. Record what each does for the area in scope |
| Platform best practice | The official guidance page for every engine, framework, or platform feature the work uses. Fetch it. Memory is not a source |
| Domain checklist | The reference file for the product kind, below |

| Kind | Checklist |
|---|---|
| Game | `references/game.md` |
| Web app or site | `references/web.md` |
| Mobile app | `references/mobile.md` |
| Desktop app | `references/desktop.md` |
| Backend service, API, CLI, library | `references/backend.md` |
| Infrastructure, deploy pipeline | `references/infra.md` |
| Data pipeline, ML model | `references/data-ml.md` |
| Embedded device, firmware | `references/embedded.md` |

A product that spans kinds (an online game has a server, an app has an API) uses every file that applies.

## The feedback matrix

The artifact that finds what a user notices is missing. Rows: every action a user can take, and every event the system raises that a user should notice. Columns: the channels the product kind has.

| Kind | Channels |
|---|---|
| Game | visual, sound, interface, what other players see and hear |
| Web, mobile, desktop | pending, success, failure, empty. Mobile adds haptic |
| Backend, CLI | response or exit code, error code and message, log line, metric |
| Infrastructure | plan output, rollout result, alert, dashboard |
| Data, ML | run status, data check, metric report, alert |
| Embedded | LED or display, log line, recorded reset cause, telemetry |

Each cell holds what the product does, `none: <reason the user accepted>`, or a gap. A gap is a finding. One worked row:

| Action | Visual | Sound | Interface | Others see and hear |
|---|---|---|---|---|
| Sip a drink | cup tilts to the mouth | `sip` on the press | thirst bar rises | cup tilts, `sip` placed at the player |

## Set the bar: before the plan

Runs inside the grounding step of the `implementation-plan-requirement` skill, or before any change without a plan that adds an action or a screen.

1. The read-only scout brief adds: what the reference products do in this area, the official best-practice page for each engine or framework feature in play, and the current measured budgets (frame time, load time, latency) when the repo can measure them
2. Draft the feedback matrix for the actions in scope, and pick the checklist items that apply
3. Offer the checklist items as one multi-select question, the recommended set marked, each option naming its cost. An item the user declines goes to `## Non-goals`
4. Write the result into `requirements.md` as that skill says: reference products and matrix under `## Quality bar`, each budget and chosen item as an Acceptance line starting `Craft:` with an observable check

## Decisions that cap quality

A decision that makes the product cheaper to build in a way a user can perceive is material. Examples: synthesized audio instead of recorded, untextured art, polling instead of push, a static screen instead of a transition, a fixed page size instead of pagination. Ask it, and state the ceiling it sets in the option text:

> Synthesized sounds: no new dependency. Ceiling: foley such as footsteps and pours sounds synthetic.

Never take it as the boring default. A constraint already in the repo that caps a bar item (an art bible rule, a no-dependency rule) → name the item it caps in `requirements.md`, so the user decides with the cost in view.

## Build to it

While writing any change in scope:

- Before setting up a feature with a performance or perceptual cost (lights and shadows, particles, audio buses, images and fonts, queries in a loop, network send rate), read its official best-practice page and follow it. A deviation gets one line in the report naming why
- The change adds an action or event → fill its matrix row in the same change, or report the gap. A cell is never left empty without a word
- The change can move a budget (frame time, bundle size, p95 latency, query count, flash use, monthly cost, an evaluation metric) → measure before and after, and report both numbers
- A gap outside the task's scope → report it as found, never fix it unasked. The spec still decides what gets built

## Craft audit

Runs at a phase's ship (the CRAFT prompt in the `implement-plan-execution` skill) or on request ("audit", "polish pass", "why does it feel cheap").

1. Use the product as its user does, on the real surface: play the game, click through the app, call the API, run the CLI, run the pipeline, read the infrastructure plan, run the firmware on the board. Reading code is not an audit
2. Walk the feedback matrix row by row. Each cell → observed or not, with evidence: screenshot, transcript, log line, or debug event
3. Measure each `Craft:` budget with the repo's measuring tool. No tool → name it missing
4. Walk the domain checklist for each kind in scope. A failed item that is on the bar is a finding. A failed item not on the bar is reported apart, for the user to triage
5. Take the scope's main flow in one reference product. Name the gap a user of that product would notice first

A finding names the action or item, observed against expected, the evidence, the reference product or best-practice page that sets the standard, and a concrete fix.

Some checks need human senses: whether a sound fits, whether a control feels responsive on real hardware. Prove what a tool can prove (the cue fired, the bus level, the frame time). List the rest under `Not verified` as a step the user can take ("listen to `sip` at the bar counter"). Never claim it.
