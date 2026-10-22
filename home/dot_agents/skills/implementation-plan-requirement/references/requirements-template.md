# {Feature Name} - Requirements

## Goal

{1–3 sentences: the outcome, for whom, why now}

## Non-goals - out of scope

- {Ruled out, and the one-line reason it is ruled out}

## Requirements - specify now

### R1: {Behaviour name}

The system SHALL {observable behaviour}.

#### S1: {Scenario name}
- WHEN {trigger, inputs, state}
- THEN {observable result}

#### S2: {Edge or error case}
- WHEN {…}
- THEN {…}

### R2: {…}

{Refactor or tooling only. Replace the requirements above with:}

### No behaviour change

Invariants to preserve:
- {Existing behaviour, contract, or output that must stay identical}

## Quality bar

{Work a user or operator touches, built with the `product-craft` skill. Delete for internal tooling and a refactor with no behaviour change.}

Reference products: {2–3 products the user named as the standard, and what each does in this area}

| Action or event | {channel} | {channel} | {channel} |
|---|---|---|---|
| {every action and noticeable event in scope} | {what happens, or `none: <reason the user accepted>`} | | |

## Acceptance

- Mandatory: {behaviour, safety, compatibility, accessibility, or resource limit with observable evidence}
- Craft: every row of `## Quality bar` holds on the running product
- Craft: {budget or checklist item with its check, e.g. 1% low frame time at most 20 ms in the busiest scene, 4 players, on the minimum-spec machine}

## Decisions

| Decision | Chosen | Alternatives | Why |
|---|---|---|---|
| {e.g. theme persistence} | {cookie} | {localStorage, user profile} | {constraint or trade-off} |

{Mark `repo doc candidate` on any decision that is hard to reverse and surprising without context, with its target: `CONTEXT.md` → `## Language` for a term, an ADR for a decision.}

## Assumptions

- {Minor ambiguity, the assumption made, and what would change if wrong}

## Not yet specified

- {The area, and what must be known before it can be written}

## Glossary

- **{Term}**: {one-line definition in the project's own words}

## Change log

{Empty at creation. After approval, one line per change: date - what - why}
