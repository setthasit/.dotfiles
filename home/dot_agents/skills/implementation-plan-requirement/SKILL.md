---
name: implementation-plan-requirement
description: Use when the user asks to gather, clarify, or align on requirements before a plan is written, says "what should X do" or "before we plan", when implementation-plan-creator finds no approved `requirements.md`, or when an approved requirement must change. Interviews in dependency-ordered rounds and writes `requirements.md` for approval.
---

# Implementation Plan Requirement

Interview the user until both sides hold one understanding of the change, and write that understanding down as it forms. Output: `requirements.md`, approved by the user. Nothing else.

## Boundary

- This skill produces requirements only. No plan, no tasks, no code, even when the request says "build" or "fix". After approval, stop. The plan is a separate invocation of `implementation-plan-creator`
- The harness default is "act, don't ask". This phase is the exception: the shared understanding *is* the deliverable, and every question that removes a silent assumption is the work
- Read-only against the repo. Facts come from code. Decisions come from the user

## Where it lives

`.plans/{feature-name}/requirements.md`, in the same git-ignored directory the plan will use (`.plans/` may be another directory the harness or user names). The `implementation-plan-creator` skill's Plan Documents section governs it, including the check that the directory is ignored before writing.

## Workflow

### 0. Size the request and announce it

| Size | Signal | Rounds |
|---|---|---|
| Spike | Throwaway experiment, answer a question, no lasting code | None. Say so. No `requirements.md` |
| Bounded | Clear outcome, ≤3 real decisions, one area of the code | 0–1 |
| Architectural | Cross-cutting, new contract or data shape, security/money, or several open decisions | As many as the frontier needs |

### 1. Ground in the code

Before any question: what does the code already answer? Dispatch a read-only `scout` for the area, brief ≤25 lines: files and symbols, current behaviour, contracts, tests, gotchas. When the request names a solution, the brief also covers the problem it addresses and any alternative the code already offers. Read the brief, not the code.

- Never ask the user a fact the repo can answer
- Mark every statement as **observed** (from the brief) or **assumed** (yours). Assumptions become questions or `## Assumptions` entries, never silent
- Request arrives as a solution ("add a cache", "store it in a cookie") → the problem behind it and the alternatives from the brief are round-1 questions. A solution the user brought is a candidate, not a decision

### 2. Build the decision tree

List every decision the change needs, in the frontier order of `references/question-quality.md`. Note which depend on which. The **frontier** is every decision whose prerequisites are settled. Ask from the frontier only.

### 3. Rounds

One structured question call per round, 2–5 frontier questions. Each question, shaped like the examples in `references/question-quality.md`:

- Options, not open text, wherever options exist. Multi-select when several can hold at once
- A recommended option marked, with the reason in the option description and what the answer unlocks in the question text
- Short labels. Trade-offs in descriptions

After **every** round, in the same turn: write each answer into `requirements.md` in its final form (a scenario, a decision, a non-goal). Recompute the frontier. Next round.

Stop when the user says "enough", or when the frontier is empty and every area sits in a scope bucket. No question cap: a hard problem gets as many rounds as it needs, an easy one gets none.

### 4. Material vs minor

| Ambiguity touches | Action |
|---|---|
| Scope, observable behaviour, data or contract shape, compatibility, security/authz, money, acceptance | Ask |
| Anything else | Assume the boring option, record it under `## Assumptions` |

### 5. Lint, then approval

Run the pre-approval lint in `references/question-quality.md` over the whole document. A flagged line is fixed in place when the answer is known, otherwise it becomes a frontier question. It is never presented as-is. Present `requirements.md` with the lint result: `lint: clean`, or each flagged line and its resolution. The approval gate: lint resolved and the frontier empty. Ask for an explicit yes. Approved → say so, stop. Not approved → back to step 3 on the disputed items.

## Writing requirements

Template: `references/requirements-template.md`. Scenario quality: `references/question-quality.md`.

- One `### R<n>` per behaviour the system SHALL/MUST have, with one or more `#### S<n>` scenarios beneath, `WHEN … THEN …`, each testable
- Behaviour only. No class names, libraries, or steps. If the implementation can change without the user noticing, it does not belong here
- Refactor or tooling change → `No behaviour change` plus the invariants to preserve, not invented scenarios
- Acceptance criteria cover behaviour, safety, compatibility, and measurable limits. Each is a mandatory gate
- Non-goals are written, not implied. Scope discipline in execution checks against this list

## Scope buckets

| Bucket | Holds | Written as |
|---|---|---|
| **Specify now** | In scope, and sharp enough to write as a scenario | `### R<n>` with its `#### S<n>` scenarios |
| **Not yet specified** | In scope and real, but not yet phrasable precisely | `## Not yet specified`, one line each: the area, and what must be known before it can be written |
| **Out of scope** | Ruled out, with the one-line reason | `## Non-goals` |

Every area the request touches sits in exactly one bucket. An area nobody can place is the next frontier question.

## Durable knowledge

A resolved term the project lacked a word for, or a decision that is hard to reverse and surprising without context, outlives this document. Flag it under `## Decisions` as `repo doc candidate` with its target from the `domain-modeling` skill: a resolved term goes to `CONTEXT.md` → `## Language`, a hard-to-reverse decision goes to an ADR. The plan turns each flagged item into its own committed task. This skill never writes repo files.

## Changing an approved requirement

Requirements are living, and implementation progress counts.

1. Edit `requirements.md` and append to `## Change log`: date, what changed, why
2. Find tasks whose `Serves:` names an affected scenario and tasks mapped to changed Acceptance criteria. An Acceptance-only change still affects implementation, even when no scenario text changed. Missing mapping → resolve it before dispatch
   - Pending task → edit it in the plan
   - Done task → add `Reconcile <task id> with <changed scenario or Acceptance criterion>` next in order. Never patch code to a requirement the document no longer states
3. Intent changed, or more than half the scope moved → new `requirements.md` and new plan. Patching a document whose goal is gone produces a plan nobody can review
