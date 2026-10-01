# Task Structure Guide

## Checkbox Format

The executor parses checkboxes: `- [ ]` incomplete, `- [x]` done, space between the brackets.

```markdown
- [ ] Task 1: Parent Task Name
  - [ ] 1.1: Subtask
  - [ ] 1.2: Subtask

- [ ] Task 2: Parent Task Name
  - [ ] 2.1: Subtask
```

Parent tasks group; leaf tasks are the unit of work. One leaf task = one writer dispatch.

## Atomic Leaf Tasks

**Good:**
```markdown
- [ ] 1.1: Add status field to User model
- [ ] 1.2: Add validation for status transitions
- [ ] 1.3: Write unit tests for status validation
```

**Bad:**
```markdown
- [ ] 1.1: Implement user status feature  ← too broad
- [ ] 1.2: Add fields and tests           ← two concerns
```

## The Six Lines

Every leaf task in Implementation Details:

```markdown
#### 1.2: Add validation for status transitions
Serves: R3.S1, R3.S2
Files: modify `src/models/user.ts`; test `src/models/user.test.ts`
Blocked by: 1.1 (adds the `status` field this guard reads)
Read first: `src/models/order.ts:30-52` (transition guard pattern); `src/errors.ts:8` (error shape)
Change: add `canTransition(from, to)` using the same guard-table shape as order; invalid → throw `InvalidTransition`
Done when: `active → deleted` allowed, `deleted → active` throws `InvalidTransition`; transition cases in `user.test.ts` pass
```

### Serves

Scenario IDs from `requirements.md`. Lets the ship reviewer trace requirement → task → test without re-deriving it. Infrastructure with no scenario → `Serves: infra`. Cannot name either → the task is not needed.

### Files

Exact paths, each marked `modify`, `create`, or `test`. The writer touches nothing outside this line, so a path left off is a task the writer must stop and report instead of finishing. This line is also the executor's parallelism test: two tasks sharing a path can never run together.

### Blocked by

Leaf task IDs that must be `[x]` before this task starts, or `none`. The executor dispatches unblocked leaves with disjoint `Files` together, so an invented edge costs parallelism and a missing one costs a broken build.

An edge exists when this task calls, extends, or imports a symbol another task creates, or when both tasks edit the same file. Nothing else is an edge — not "feels tidier after", not same layer, not same scenario, not adjacent numbering.

A phase's first task is usually `none`. A test task is blocked by the logic it covers.

### Read first

`path:line` for the nearest existing example of the pattern and for every contract the change must honour. The plan points; the writer reads. A pointer costs the planner one grep and saves the writer a wrong guess.

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

The writer stops when every line holds — even when it sees more to do.

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

## Never Reference the Plan From the Code

The plan is never committed, so anything pointing at it dangles.

**Bad tasks:**
```markdown
- [ ] 1.4: Add a comment linking this handler to Task 1.2
- [ ] 1.5: Add the plan file to the commit
- [ ] 1.6: Note the phase number in the README
```

Documentation the repo must keep gets its own task, written to stand alone.

## Separate Implementation From Testing

```markdown
- [ ] Task 2: Core Logic
  - [ ] 2.1: Implement status transition logic
  - [ ] 2.2: Add validation rules
  - [ ] 2.3: Write unit tests for transitions
  - [ ] 2.4: Write integration tests
```

Test tasks serve the same scenarios as the logic they cover.

## Task Ordering

Follow the project's layers. Within a layer: interface or type changes → implementation → tests.

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

Generated-code tasks name the command in `Change` (`make gen.mock`, `npm run generate`, `dotnet ef migrations add`). Repo-doc tasks come from `repo doc candidate` marks in `requirements.md`, name their target file per `skill://domain-modeling`, and are written to stand alone.
