# {Feature Name}

> **Working document — never committed.** This file is not staged or committed at any point, and nothing outside it may reference it: no plan filename, task ID, phase number, or requirement ID in code, comments, tests, commit messages, or other docs.

Requirements: `requirements.md` (same directory). Progress: `progress.md` (written by the executor).

## Design

### Decisions

| Decision | Chosen | Alternatives | Why |
|---|---|---|---|
| {…} | {…} | {…} | {…} |

### Risks

- {Risk} → {mitigation}

### Non-goals

See `requirements.md` → Non-goals. {Design-level exclusions only.}

### Open questions

{Empty, or only what can be answered during implementation without changing scope, approach, or tasks.}

## Tasks

- [ ] Task 1: {Task Name}
  - [ ] 1.1: {Subtask}
  - [ ] 1.2: {Subtask}

- [ ] Task 2: {Task Name}
  - [ ] 2.1: {Subtask}
  - [ ] 2.2: {Subtask — tests}

## Implementation Details

### Task 1: {Task Name}

#### 1.1: {Subtask}
Serves: R1.S1
Files: modify `{path}`; test `{path}`
Blocked by: none
Read first: `{path:line}` ({what to copy from it}); `{path:line}` ({contract to honour})
Change: {concrete identifiers, signatures, expected outputs}
Done when: {observable check}; `{test name}` passes

#### 1.2: {Subtask}
Serves: {…}
Files: {…}
Blocked by: 1.1
Read first: {…}
Change: {…}
Done when: {…}

### Task 2: {Task Name}

#### 2.1: {Subtask}
Serves: {…}
Files: {…}
Blocked by: {leaf task IDs, or none}
Read first: {…}
Change: {…}
Done when: {…}

#### 2.2: {Tests}
Serves: R1.S1, R1.S2
Files: create `{test path}`
Blocked by: 2.1
Read first: `{existing test path:line}` (fixture and mocking style)
Change: one test per scenario served, asserting real values
Done when: `{test names}` pass; every scenario in Serves has a test

## Phase Verification

Run by the ship reviewer, not the orchestrator:

- Full test, lint, build commands from the repo: `{cmd}`, `{cmd}`, `{cmd}`
- Every scenario in `requirements.md` traced to a test or an observed behaviour
- {Manual or UI check, if any: what to open, what to see}
