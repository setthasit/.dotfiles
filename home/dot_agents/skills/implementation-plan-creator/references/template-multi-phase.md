# Multi-Phase Implementation Plan Template

For features that ship as more than one PR, create a directory with one file per phase:

```
document/{feature-name}/
├── requirements.md              # from implementation-plan-requirement
├── phase-1-{description}.md
├── phase-2-{description}.md
└── progress.md                  # written by the executor
```

This directory is git-ignored working state. No file in it is ever staged or committed.

## Phase Naming

Descriptive of the behaviour the phase makes work, never a layer: `phase-1-create-order.md`, `phase-2-cancel-order.md`, `phase-3-order-export.md`.

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

## Tasks

- [ ] Task 1: {Task Name}
  - [ ] 1.1: {Subtask}
  - [ ] 1.2: {Subtask}

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

Each phase is one branch off `main` and one PR. A phase is a vertical slice: one or more scenarios from `requirements.md` working end to end, every layer they touch included. Layer order (entities → repositories → services → transport, or the stack's equivalent) sequences the tasks *inside* a phase, never the phases — an entities-only PR is dead code until the next phase lands, and a reviewer cannot judge it against any behaviour.

Split along:

- **Scenario groups** — R1 end to end, then R2; the first phase carries the scenarios that make the feature usable at all
- **Stacks that ship separately** — a backend contract before the client that consumes it, each side behaviour-complete on its own
- **A shared prerequisite** — a migration or helper later phases depend on, only when it is mergeable and exercised on its own
- **A wide refactor** — expand, then migrate call sites in batches, then contract; one phase per stage. Only when the blast radius crosses the whole repo and no vertical slice exists

**By dependency order:** shared prerequisite → the slice that makes the feature usable → the slices that extend it.

A phase that cannot be merged on its own, or merges nothing observable, is not a phase — fold it into its neighbour.
