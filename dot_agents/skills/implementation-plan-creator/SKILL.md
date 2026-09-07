---
name: implementation-plan-creator
description: Use when the user asks to create an implementation plan, design a feature plan, plan a refactor, break down a feature, or produce a development roadmap or implementation document — "create a plan for", "help me plan", "design implementation for". Turns an approved `requirements.md` into phased checkbox tasks for implement-plan-execution; writes plan documents only, then stops for review.
---

# Implementation Plan Creator

Turn an approved `requirements.md` into a plan the `implement-plan-execution` skill can run in dependency order, closing out one task at a time: design decisions, tasks with pointers into the real code, declared blocking edges, and a definition of done on every task.

## Gate

`document/{feature-name}/requirements.md` must exist and be approved. Missing or unapproved → stop, read `skill://implementation-plan-requirement`, run it, and return here on a later request. Never write a plan from a raw request: an unwritten requirement becomes an unreviewable task.

## Boundary

- Planning documents only. Nothing is written outside `document/{feature-name}/` — no code, no config, no test, no repo doc — even when the request says "plan and build", "plan and implement", or "then do it"
- **The plan files are the deliverable.** Last file written and presented → the work is complete. The harness rule "never yield while actionable work remains" stops at this line: unchecked `- [ ]` boxes are the artifact, not a backlog to burn down in this session
- Never delegate around it either. No `task`, `sonic`, writer, or any subagent that touches code. Delegation carries no authority the planner lacks
- An explicit yes approves the design; it is not a start signal. Approved → say so and stop. Execution is a separate user request, run under `skill://implement-plan-execution`, best in a fresh session
- The user reviews the written files before anything is built. That review is the point of stopping

## Structure

A **phase** is one branch, one PR, one mergeable behaviour increment. Brownfield default: single phase.

Split into phases when any holds:

- stacks that ship independently (a backend contract before the client that consumes it)
- a standalone mergeable increment that later work depends on (a shared helper, a migration)
- more than about eight leaf tasks — split by scenario group, never by layer; a layer-only phase merges dead code

| Shape | File | Template |
|---|---|---|
| Single phase | `document/{feature-name}/plan.md` | `references/template-single-phase.md` |
| Multi phase | `document/{feature-name}/phase-1-xxx.md`, `phase-2-yyy.md`, … | `references/template-multi-phase.md` |

Each phase stands alone: builds, tests green, no dead code, no half-wired API.

### Wide refactor: expand → migrate → contract

A mechanical change whose blast radius crosses the whole repo — renaming a shared column, retyping a shared value, moving a package — has no vertical slice to split by. Sequence it instead:

1. **Expand** — add the new shape beside the old; no call site switches yet
2. **Migrate** — move call sites in batches small enough that the suite stays green between them. Batches touching disjoint files carry no `Blocked by` edge between them, so the executor can run them together
3. **Contract** — delete the old shape and any shim that carried it

Each stage is its own phase, or its own task chain inside one phase, and every batch boundary leaves the build green and mergeable. A behaviour change hiding inside a rename is two changes and gets planned as two: the mechanical migration, then the behaviour, each with its own `Done when`.

## Plan Documents Stay Out of Git

The plan is a working artifact for the agent and the user — never a repo deliverable.

- **Never** `git add`, stage, or commit a plan file, at any point, in any phase, not even alongside the code it drives
- Check the plan directory is ignored before writing into it. Not ignored → tell the user and ask how to exclude it (`.gitignore` entry vs local `.git/info/exclude`). Never edit git config or `.git/` without approval
- The plan doc is not a substitute for real documentation. Anything the repo must keep long-term is written as its own task, in its own file, phrased so it stands alone: API docs, README, and every `repo doc candidate` from requirements — a term to a `CONTEXT.md` entry, a hard-to-reverse decision to an ADR, both per `skill://domain-modeling`

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
  - [ ] 2.1: Implement main logic
  - [ ] 2.2: Write unit tests
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
| `Read first` | `path:line` pointers to the pattern to follow and the contracts to honour. The writer reads the repo, not the plan — pointers are the plan's job |
| `Change` | Prose with concrete identifiers, signatures, expected outputs. "Align X with Y" without the target state is not a task |
| `Done when` | 1–3 observations a reviewer can check: a named test passes, a request returns a code, a command prints a value. Activities ("add validation") are not done-criteria |

**Snippets** appear only when they encode a decision more precisely than prose — a type shape, a schema, a state table, an API contract — and stay under ten lines. Never function bodies, test bodies, or boilerplate: the writer reads the real code and picks the shape that fits it, and plan code goes stale before it is read.

Details and examples: `references/task-structure-guide.md`.

### A parked task is re-grounded before dispatch

`Files` and `Read first` hold for the session that wrote them and the next one. A task parked for days, or handed to a queue, is dispatched only after its pointers are re-run against the current code — or rewritten behaviourally: what must become true, not which lines to touch. Line numbers move while the plan sits still.

## Workflow

1. **Read requirements** — goal, non-goals, every scenario, decisions, assumptions, and `## Not yet specified`. An unspecified area that would change what gets built goes back to the requirement skill, not into the plan
2. **Analyze the codebase** — locate the files, patterns, contracts, and test conventions each scenario touches. Unfamiliar area → a read-only `scout` brief; record `path:line`, not contents
3. **Design** — decisions with alternatives and why; risks with mitigation; non-goals by pointer to requirements. Architecture and approach, not line-by-line
4. **Choose structure** — single or multi phase
5. **Define tasks** — one leaf task per implementable unit in the project's layer order (`references/task-structure-guide.md`); separate test tasks; every scenario served by at least one task
6. **Write details** — the six lines per leaf task, pointers from step 2. `Blocked by` names only real edges, so independent leaves can be dispatched together
7. **Review completeness** — every scenario traced to a task, every task has `Done when`, every phase stands alone, nothing references the plan from outside
8. **Present and stop** — show the decisions table, the phase split with the reason for each boundary, a coverage matrix (one row per scenario in `requirements.md` with the task IDs that serve it — a row with no task is a gap, fixed before presenting), and every task whose `Done when` is not a test. Every task blocked by the previous one is a serial plan: say so, with the edge that forces it, so the user can judge whether it is real. Name the plan file paths so the user can open them. Ask for an explicit yes, then **end the turn** — the user reads the files before any code exists. Approved → say so and stop; implementation starts only on a later request. Not approved → revise the disputed tasks and re-present

## Critical Rules

1. **Gate first**: no approved `requirements.md`, no plan
2. **Checkbox format**: `- [ ]` exactly (space between brackets)
3. **Task atomicity**: each leaf task completes in one writer dispatch
4. **Six lines per leaf task**: `Serves`, `Files`, `Blocked by`, `Read first`, `Change`, `Done when`
5. **No code bodies**: pointers and decision-shape snippets only
6. **Test tasks**: explicit, not embedded in implementation tasks
7. **Never committed, never referenced**
8. **Plan, then stop**: files written, coverage matrix presented, turn ends. No code, no subagent, no execution — not on "plan and build", not after the user's yes

## Templates

- Single phase: `references/template-single-phase.md`
- Multi phase: `references/template-multi-phase.md`
- Task structure: `references/task-structure-guide.md`
