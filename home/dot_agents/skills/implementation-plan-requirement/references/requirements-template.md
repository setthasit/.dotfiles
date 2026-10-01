# {Feature Name} — Requirements

> **Working document — never committed.** Not staged or committed at any point; nothing outside it may reference it.

## Goal

{1–3 sentences: the outcome, for whom, why now}

## Non-goals — out of scope

- {Ruled out, and the one-line reason it is ruled out}

## Requirements — specify now

### R1: {Behaviour name}

The system SHALL {observable behaviour}.

#### S1: {Scenario name}
- WHEN {trigger, inputs, state}
- THEN {observable result}

#### S2: {Edge or error case}
- WHEN {…}
- THEN {…}

### R2: {…}

{Refactor or tooling only — replace the requirements above with:}

### No behaviour change

Invariants to preserve:
- {Existing behaviour, contract, or output that must stay identical}

## Decisions

| Decision | Chosen | Alternatives | Why |
|---|---|---|---|
| {e.g. theme persistence} | {cookie} | {localStorage, user profile} | {constraint or trade-off} |

{Mark `repo doc candidate` on any decision that is hard to reverse and surprising without context, with its target: `CONTEXT.md` → `## Language` for a term, an ADR for a decision.}

## Assumptions

- {Minor ambiguity, the assumption made, and what would change if wrong}

## Not yet specified

- {In scope and real, but not yet phrasable as a scenario: the area, and what must be known before it can be written}

## Glossary

- **{Term}** — {one-line definition in the project's own words}

## Change log

{Empty at creation. After approval, one line per change: date — what — why}
