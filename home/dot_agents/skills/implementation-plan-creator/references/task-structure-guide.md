# Task Structure Guide

## Atomic Leaf Tasks

**Good:**
```markdown
- [ ] 1.1: Add status field to User model
- [ ] 1.2: Add validation for status transitions
```

**Bad:**
```markdown
- [ ] 1.1: Implement user status feature  ← too broad
- [ ] 1.2: Add fields and validation      ← two concerns
- [ ] 1.3: Write tests for 1.2             ← a test leaf for one leaf's change
```

## The Six Lines

Detail beyond the rule table in `SKILL.md`.

### Files

Exact paths, each marked `modify`, `create`, or `test`. The writer touches nothing outside this line, so a path left off is a task the writer must stop and report instead of finishing. This line is also the executor's parallelism test: two tasks sharing a path can never run together.

### Blocked by

Leaf task IDs that must be `[x]` before this task starts, or `none`. The executor dispatches unblocked leaves with disjoint `Files` together, so an invented edge costs parallelism and a missing one costs a broken build.

An edge exists when this task calls, extends, or imports a symbol another task creates, or when both tasks edit the same file. Nothing else is an edge: not "feels tidier after", not same layer, not same scenario, not adjacent numbering.

A phase's first task is usually `none`. A test leaf is blocked by every leaf whose behaviour it covers.

### Change

Prose with exact identifiers, parameters, and expected outputs.

**Good:** "return `ErrNotFound` when `repo.Get` returns `sql.ErrNoRows`; wrap other errors with `internalerror.Internal`"
**Bad:** "handle errors appropriately"

### Done when

One to three observations, each checkable by a reviewer who did not write the code:

| Activity (not done-criteria) | Observation (done-criteria) |
|---|---|
| Add validation | `POST /users` with empty email → 400 `invalid_email` |
| Write tests | `TestCreateUser_EmptyEmail` passes |
| Wire the endpoint | `curl localhost:8080/health` → `{"status":"ok"}` |
| Improve performance | `BenchmarkExport` under 200 ms for 10k rows |

The writer stops when every line holds. A resource limit names its workload and measurement, never a vague efficiency demand.

A task that reads untrusted input (a network message, a save or mod file, an upload, a request) lists its refusal cases, so the writer builds them up front instead of in a fix round:

| Activity (not done-criteria) | Observation (done-criteria) |
|---|---|
| Validate the snapshot | `test_snapshot_refuses_malformed`, `_oversized`, `_wrong_type`, and `_hostile_host` pass, each leaving the session in the menu with a reason |

## Snippets

Allowed only when prose is less precise than the shape itself, under ten lines:

```typescript
type UserStatus = 'active' | 'suspended' | 'deleted';
```

```
active    → suspended, deleted
suspended → active, deleted
deleted   → (terminal)
```

Not allowed: function bodies, test bodies, boilerplate, "similar to task N". The writer reads `Read first` and the real repo.

## Tests Live With the Change

A leaf writes the unit tests for its own change: its `Files` line lists the test path, and its `Done when` names the tests. A separate test leaf costs the executor a full writer and review cycle for code another writer already understood.

```markdown
- [ ] Task 2: Core Logic
  - [ ] 2.1: Implement status transitions   ← unit tests included
  - [ ] 2.2: Add validation rules           ← unit tests included
  - [ ] 2.3: Integration test for status changes through the API
```

A separate test leaf only for:

- an integration or end-to-end test spanning several leaves. It is blocked by each of them
- test infrastructure: a harness, fixtures, or a fake that later leaves use. It is sequenced before them

## Task Ordering

Follow the project's layers. Within a layer: interface or type changes → implementation. Integration tests after the leaves they span.

- **Go:** Entities → Repositories → Services → Transport → DI
- **TypeScript/Node:** Types → Data Access → Services → Controllers → Routes
- **React Native:** Types → Hooks → Components → Screens → Navigation
- **Swift/iOS:** Models → Services → ViewModels → Views
- **C#/.NET:** Models → Repositories → Services → Controllers

## Edge Cases, Generated Code, Repo Docs

Explicit tasks, not afterthoughts:

```markdown
- [ ] Task 5: Edge Cases
  - [ ] 5.1: Handle network timeout
  - [ ] 5.2: Reject oversized upload

- [ ] Task 6: Generated Code
  - [ ] 6.1: Regenerate mocks

- [ ] Task 7: Repo Documentation
  - [ ] 7.1: ADR for cookie-based theme storage
  - [ ] 7.2: `CONTEXT.md` entry for "theme scope"
```

Generated-code tasks name the command in `Change` (`make gen.mock`, `npm run generate`, `dotnet ef migrations add`). Repo-doc tasks come from `repo doc candidate` marks in `requirements.md`, name their target file per the `domain-modeling` skill, and are written to stand alone.
