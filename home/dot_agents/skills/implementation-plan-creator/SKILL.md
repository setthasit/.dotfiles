---
name: implementation-plan-creator
description: Use when the user asks to create an implementation plan, design a feature plan, plan a refactor, break down a feature, or produce a development roadmap or implementation document, or detail the next outline phase ("create a plan for", "help me plan", "plan the next phase"). Turns an approved `requirements.md` into phased checkbox tasks for implement-plan-execution; writes plan documents only, then stops for review.
---

# Implementation Plan Creator

Turn an approved `requirements.md` into a plan the `implement-plan-execution` skill can run in dependency order, closing out one task at a time: design decisions, tasks with pointers into the real code, declared blocking edges, and a definition of done on every task.

## Gate

`.plans/{feature-name}/requirements.md` must exist and be approved. Missing or unapproved → stop, read the `implementation-plan-requirement` skill, run it, and return here on a later request. Never write a plan from a raw request: an unwritten requirement becomes an unreviewable task.

## Boundary

- Planning documents only. Nothing is written outside `.plans/{feature-name}/`: no code, no config, no test, no repo doc. This holds even when the request says "plan and build", "plan and implement", or "then do it"
- **The plan files are the deliverable.** Last file written and presented → the work is complete. The harness rule "never yield while actionable work remains" stops at this line: unchecked `- [ ]` boxes are the artifact, not a backlog to burn down in this session
- Never delegate around it either. No `task`, `sonic`, writer, or any subagent that touches code. Delegation carries no authority the planner lacks
- An explicit yes approves the design; it is not a start signal. Approved → say so and stop. Execution is a separate user request, run under the `implement-plan-execution` skill, best in a fresh session
- The user reviews the written files before anything is built. That review is the point of stopping

## Structure

A **phase** is one feature: one branch, one PR, one mergeable behaviour increment. A **part** is the slice of a phase one execution session finishes. Brownfield default: single phase, single part.

Split into phases when any holds:

- the work holds more than one feature. One requirement, or one tight scenario group, per phase. Split by scenario group, never by layer. A layer-only phase merges dead code
- stacks that ship independently (a backend contract before the client that consumes it)
- a standalone mergeable increment that later work depends on (a shared helper, a migration)
- one feature needs more than three parts. Split it into two features

| Shape | File | Template |
|---|---|---|
| Single phase | `.plans/{feature-name}/plan.md` | `references/template-single-phase.md` |
| Multi phase | `.plans/{feature-name}/phase-1-xxx.md`, `phase-2-yyy.md`, … | `references/template-multi-phase.md` |

Each phase stands alone: builds, tests green, no dead code, no half-wired API.

### Parts: one execution session each

The executor spends about 200k tokens of its own context on setup and the first leaf task, then 40–50k per further leaf. Six leaves fill about half a 1M window. A phase over six leaf tasks is cut into parts:

- At most **six leaf tasks per part** and **three parts per phase**
- Parts are `### Part {N}.{k}: {name}` sections inside the phase's one file. A single-phase `plan.md` is phase 1. Task IDs run on across parts: part 2 starts at the next task number
- A part may leave code that nothing calls yet. It never leaves the branch red: every part ends with build and tests green and every task committed. Only the whole phase must be mergeable
- Cut where no task is blocked by a task in a later part
- Each part opens with an `Ends with:` line. It states what is true on the branch after the part: the symbols, contracts, and behaviour the next part builds on. The next session starts from that line and the code, not from this session's memory

### Outline phases: detail one phase at a time

A multi-phase plan details only the next phase to execute. Every later phase is written as an **outline**: goal, scenarios served, scope, prerequisites, expected parts, and the questions to settle when detailing it. No tasks and no `path:line` pointers: they go stale before the phase starts, and the earlier phases' rulings and deviations change what the later ones should be.

An outline phase is detailed by a later planning request, after the phase before it merges or the user chooses to stack on its branch. That request runs **Detail the next phase** below.

### Wide refactor: expand → migrate → contract

A mechanical change whose blast radius crosses the whole repo (renaming a shared column, retyping a shared value, moving a package) has no vertical slice to split by. Sequence it instead:

1. **Expand**: add the new shape beside the old. No call site switches yet
2. **Migrate**: move call sites in batches small enough that the suite stays green between them. Batches touching disjoint files carry no `Blocked by` edge between them, so the executor can run them together
3. **Contract**: delete the old shape and any shim that carried it

Each stage is its own phase, or its own task chain inside one phase, and every batch boundary leaves the build green and mergeable. A behaviour change hiding inside a rename is two changes and gets planned as two: the mechanical migration, then the behaviour, each with its own `Done when`.

## Plan Documents Stay Out of Git

The plan is a working artifact for the agent and the user. It is never a repo deliverable.

- **Never** `git add`, stage, or commit a plan file, at any point, in any phase, not even alongside the code it drives
- Check the plan directory is ignored before writing into it. Not ignored → tell the user and ask how to exclude it (`.gitignore` entry vs local `.git/info/exclude`). Never edit git config or `.git/` without approval
- The plan doc is not a substitute for real documentation. Anything the repo must keep long-term is written as its own task, in its own file, phrased so it stands alone: API docs, README, and every `repo doc candidate` from requirements. A term goes to a `CONTEXT.md` entry and a hard-to-reverse decision to an ADR, both per the `domain-modeling` skill

## No Plan References Outside the Plan

Nothing outside the plan directory may mention it.

- No plan filename, task ID (`Task 2.3`), phase number, requirement ID, or "see the plan" in code, comments, tests, config, commit messages, PR descriptions, or any existing doc
- Code explains itself in its own terms; a reader without the plan must lose nothing
- Never write a task that instructs someone to add such a reference

## Task Format

Checkboxes the executor parses, hierarchical numbering:

```markdown
- [ ] Task 1: Foundation
  - [ ] 1.1: Add data model
  - [ ] 1.2: Add validation logic

- [ ] Task 2: Core Implementation
  - [ ] 2.1: Implement main logic, with its unit tests
  - [ ] 2.2: Integration test across 1.2 and 2.1
```

Every leaf task carries six lines under Implementation Details:

```markdown
#### 2.3: Reject empty email
Serves: R2.S1, R2.S3
Files: modify `svc/user/create.go`; test `svc/user/create_test.go`
Blocked by: 2.1 (creates the validator this task calls)
Read first: `svc/user/update.go:41-58` (validation pattern); `internalerror/codes.go:12` (error code style)
Change: validate email before the repo call; empty or malformed → `internalerror.Invalid("invalid_email")`
Done when: `POST /users` with empty email → 400 `invalid_email`; `TestCreateUser_EmptyEmail` passes
```

| Line | Rule |
|---|---|
| `Serves` | Scenario IDs from `requirements.md`. Infrastructure with no scenario → `infra`. Neither → the task does not belong |
| `Files` | Exact paths, each marked modify / create / test. The writer touches nothing else |
| `Blocked by` | Leaf task IDs that must be `[x]` before this one starts, or `none`. Only real edges: this task reads a symbol another creates, or edits a file another edits. Ordering preference is not an edge; a phase's first task is usually `none` |
| `Read first` | `path:line` pointers to the pattern to follow and the contracts to honour. The writer reads the repo, not the plan. Pointers are the plan's job |
| `Change` | Prose with concrete identifiers, signatures, expected outputs. "Align X with Y" without the target state is not a task |
| `Done when` | 1–3 observations a reviewer can check: a named test passes, a request returns a code, a command prints a value. Activities ("add validation") are not done-criteria |

Map every requirements Acceptance criterion to enforcing tasks and phase evidence. Intermediate tasks receive only their applicable criteria plus universal gates. Phase review enforces all criteria assigned to that phase. Load the `clean-code` skill's Review Scoring reference. Optional polish is not a `Done when` gate. Scores never waive behavior or safety

**Snippets** appear only when they encode a decision more precisely than prose (a type shape, a schema, a state table, an API contract), and they stay under ten lines. Never function bodies, test bodies, or boilerplate: the writer reads the real code and picks the shape that fits it, and plan code goes stale before it is read.

Details and examples: `references/task-structure-guide.md`.

### A parked task is re-grounded before dispatch

`Files` and `Read first` hold for the session that wrote them and the next one. A task parked for days, or handed to a queue, is dispatched only after its pointers are re-run against the current code, or after the task is rewritten behaviourally: what must become true, not which lines to touch. Line numbers move while the plan sits still.

## Workflow

1. **Read requirements**: goal, non-goals, every scenario, decisions, assumptions, and `## Not yet specified`. An unspecified area that would change what gets built goes back to the requirement skill, not into the plan
2. **Analyze the codebase**: locate the files, patterns, contracts, and test conventions each scenario touches. Unfamiliar area → a read-only `scout` brief; record `path:line`, not contents
3. **Design**: decisions with alternatives and why, risks with mitigation, and non-goals by pointer to requirements. Architecture and approach, not line-by-line
4. **Choose structure**: single or multi phase, one feature per phase. Multi phase → detail the first phase, outline the rest
5. **Define tasks**: one leaf task per implementable unit in the project's layer order (`references/task-structure-guide.md`). Each leaf writes the unit tests for its own change. Every scenario served by at least one task. Over six leaves → cut into parts
6. **Write details**: the six lines per leaf task, pointers from step 2. `Blocked by` names only real edges, so independent leaves can be dispatched together
7. **Review completeness**: run `python3 scripts/plan_check.py lint .plans/{feature-name}` until it prints `clean`. It checks the checkbox format, the six lines, `Blocked by` IDs and cycles, part caps and numbering, `Ends with:` lines, outline shape, and `Serves` IDs against `requirements.md`. Then check by hand what it cannot: every scenario traced to a task or to an outline phase, every phase stands alone, every part ends green, nothing references the plan from outside
8. **Present and stop**: show the decisions table, the phase split with the reason for each boundary, the part split with each part's `Ends with:`, a coverage matrix (one row per scenario in `requirements.md` with the task IDs that serve it, or the outline phase that will. A row with neither is a gap, fixed before presenting), and every task whose `Done when` is not a test. Every task blocked by the previous one is a serial plan: say so, with the edge that forces it, so the user can judge whether it is real. Name the plan file paths so the user can open them. Ask for an explicit yes, then **end the turn**. The user reads the files before any code exists. Approved → say so and stop; implementation starts only on a later request. Not approved → revise the disputed tasks and re-present

## Detail the next phase

Reached when the request names an outline phase or asks to plan the next phase.

1. **Gate**: `requirements.md` approved, and every earlier phase shipped: all its boxes `[x]` and its PR merged, or the user chooses to stack this phase on its branch. An earlier phase still open → stop and name it
2. **Read what the earlier phases learned**: the outline, the scenarios its `Serves` names, and the `## Ruling`, `## Found`, `Deviation:`, and `Accepted as-is:` entries in `progress.md`. A ruling that moves the outline's scope → revise the scope and say so when presenting. A ruling that contradicts a requirement → the change protocol in the `implementation-plan-requirement` skill first
3. **Plan the phase**: Workflow steps 2–8 for this phase only. Rewrite the outline file in place as a full phase file from `references/template-multi-phase.md`. Edit a later outline only when this phase's design moves its scope, prerequisites, or open questions

## Critical Rules

1. **Gate first**: no approved `requirements.md`, no plan
2. **Checkbox format**: `- [ ]` exactly (space between brackets)
3. **Task atomicity**: each leaf task completes in one writer dispatch
4. **Six lines per leaf task**: `Serves`, `Files`, `Blocked by`, `Read first`, `Change`, `Done when`
5. **No code bodies**: pointers and decision-shape snippets only
6. **Tests with the change**: a leaf writes the unit tests for its own change. A separate test leaf only for tests spanning several leaves (integration, end to end) or for test infrastructure
7. **Parts**: at most six leaf tasks per part and three parts per phase. Every part ends green
8. **One phase detailed at a time**: later phases stay outlines until the phase before them merges, or the user chooses to stack on its branch
9. **Never committed, never referenced**
10. **Plan, then stop**: files written, coverage matrix presented, turn ends. No code, no subagent, no execution, not even on "plan and build" or after the user's yes

## Templates

- Single phase: `references/template-single-phase.md`
- Multi phase: `references/template-multi-phase.md`
- Task structure: `references/task-structure-guide.md`
