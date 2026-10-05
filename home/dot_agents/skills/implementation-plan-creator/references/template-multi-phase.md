# Multi-Phase Implementation Plan Template

For features that ship as more than one PR, create a directory with one file per phase. The next phase to execute is detailed. Every later phase is an outline until the phase before it merges, or the user chooses to stack on its branch:

```
.plans/{feature-name}/
├── requirements.md              # from implementation-plan-requirement
├── phase-1-{description}.md     # detailed: tasks, possibly in parts
├── phase-2-{description}.md     # outline
├── phase-3-{description}.md     # outline
└── progress.md                  # written by the executor
```

This directory is git-ignored working state. No file in it is ever staged or committed.

## Phase Naming

Descriptive of the behaviour the phase makes work, never a layer: `phase-1-create-order.md`, `phase-2-cancel-order.md`, `phase-3-order-export.md`.

## Outline Template

Enough for a later planning session to detail the phase without re-deriving its purpose. No tasks, no `path:line`.

---

# Phase {N}: {Phase Name}

> **Working document — never committed.** Not staged or committed at any point; nothing outside it may reference it.

Status: outline

## Goal

{1–3 sentences: the feature this phase makes work, as a user or caller observes it.}

**Serves**: {scenario IDs}

**Prerequisites**: Phase {N-1} merged, or stacked on by the user's choice ({what it must provide: a contract, a table, a screen})

## Scope

- In: {behaviours, surfaces, and code areas by directory}
- Out: {what waits for a later phase, or a non-goal by pointer to requirements}

## Expected shape

{Expected parts: 1–3. More than three → this outline is two features. Split it now.}

## Settle when detailing

- {Open design question, and what will answer it: an earlier phase's contract, a ruling, a measurement}

---

The detailing session replaces the whole file with the phase file template below. `Status: outline` is the executor's stop signal: it never runs a file that carries it.

## Phase File Template

---

# Phase {N}: {Phase Name}

> **Working document — never committed.** Not staged or committed at any point; nothing outside it may reference it.

Requirements: `requirements.md`. Progress: `progress.md`.

## Context

{What this phase delivers and why it is mergeable on its own.}

**Serves**: {scenario IDs this phase makes observable end to end}

**Prerequisites**: Phase {N-1} merged ({what it provided}).

## Design

### Decisions

| Decision | Chosen | Alternatives | Why |
|---|---|---|---|
| {…} | {…} | {…} | {…} |

### Risks

- {Risk} → {mitigation}

### Open questions

{Empty, or deferrable only.}

## Acceptance

| Mandatory criterion for this phase | Enforced by task | Phase evidence |
|---|---|---|
| {verbatim requirements Acceptance criterion} | {task IDs} | {test or observed behavior} |

- Required verification: {repo commands}. Universal gates apply to every task. Later-task behavior does not block intermediate tasks
- Quality acceptance follows the `clean-code` skill's Review Scoring reference. Record deferred findings at acceptance. Do not create tasks solely for optional polish

## Tasks

{Six leaf tasks or fewer: delete the part headings and `Ends with:` lines. More: a `### Part {N}.{k}: {name}` heading with its `Ends with:` line above each group of at most six, at most three parts. The two parts below show that form only.}

### Part {N}.1: {Part Name}
Ends with: {what is true on the branch after this part: symbols, contracts, behaviour the next part relies on}

- [ ] Task 1: {Task Name}
  - [ ] 1.1: {Subtask}
  - [ ] 1.2: {Subtask}

### Part {N}.2: {Part Name}
Ends with: {…. The phase is mergeable}

- [ ] Task 2: {Task Name}
  - [ ] 2.1: {Subtask}

## Implementation Details

### Task 1: {Task Name}

#### 1.1: {Subtask}
Serves: {…}
Files: {…}
Blocked by: none
Read first: {…}
Change: {…}
Done when: {…}

#### 1.2: {Subtask}
Serves: {…}
Files: {…}
Blocked by: {leaf task IDs, or none}
Read first: {…}
Change: {…}
Done when: {…}

## Phase Verification

Run by the ship reviewer, not the orchestrator:

- Full test, lint, build
- Scenarios served by this phase traced to tests
- Integration with Phase {N-1}: {what to exercise}

---

## Phase Boundaries

Each phase is one feature: one branch off `main` and one PR. A phase is a vertical slice: the scenarios of one requirement, or one tight scenario group, working end to end, every layer they touch included. Its parts share that branch. The PR opens after the last part. Layer order (entities → repositories → services → transport, or the stack's equivalent) sequences the tasks *inside* a phase, never the phases — an entities-only PR is dead code until the next phase lands, and a reviewer cannot judge it against any behaviour.

Split along:

- **Features** — R1 end to end, then R2; the first phase carries the scenarios that make the feature usable at all. A feature needing more than three parts splits into two scenario groups
- **Stacks that ship separately** — a backend contract before the client that consumes it, each side behaviour-complete on its own
- **A shared prerequisite** — a migration or helper later phases depend on, only when it is mergeable and exercised on its own
- **A wide refactor** — expand, then migrate call sites in batches, then contract; one phase per stage. Only when the blast radius crosses the whole repo and no vertical slice exists

**By dependency order:** shared prerequisite → the slice that makes the feature usable → the slices that extend it.

A phase that cannot be merged on its own, or merges nothing observable, is not a phase — fold it into its neighbour.
