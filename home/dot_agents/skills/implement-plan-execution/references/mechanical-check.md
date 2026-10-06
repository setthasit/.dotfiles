# Mechanical Check

Reached from `SKILL.md` when a leaf was written by `sonic`. A rename, a move, or a constant edit has no design to judge and no scenario to trace. Two full reviews of a change with no decision in it cost more than the change, so one spawn checks it.

## The rule

| The leaf | Judged by |
|---|---|
| Written by `task` or `uxui-designer` | The Task review, or the Standards and Spec slots on a security surface, as in the skill |
| Written by `sonic` | One Mechanical check spawn, agent type from the skill's **Role → agent** table, prompt below |
| Mechanical check returns `NOT MECHANICAL` | The Task review, or the Standards and Spec slots on a security surface. Any fix round goes to a fresh `task` writer, never back to `sonic` |

- A Tester or Design review slot the leaf earns goes out beside the check, unchanged
- Findings use the shared rubric. The coordinator scores the task and routes through `references/drift.md`. Accepted notes do not trigger a writer round

## MECHANICAL CHECK prompt

```
## Mechanical check - Task [ID]: [task name]

A writer applied a mechanical change: no branching, no design choice. You are its only judge. You confirm the diff is exactly the change the task states and nothing else.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim]. Report finding levels and evidence. Your PASS confirms gates and coverage, not the aggregate task score.

### Step 1 - verify
[batch verification report]
A failed or unavailable required check in this report means FAIL. Record its command, working directory, cause, and prevented coverage. Continue review where possible. Attribute unrelated or sibling failures separately. Never run the test, lint, or build commands yourself. A check you need re-run is a finding.

### Task block (verbatim from plan)
Files / Change / Done when: [exactly as sent to the writer]

### The change
Run `git diff -- [Files paths]` (and `git status` for new files). It is unstaged, and another task's changes may sit in the same tree, so judge only these paths.

### Judge
1. `Done when`: every line holds, with the evidence
2. The diff is the `Change` line and nothing more: no new branch, no new behaviour, no file outside `Files`
3. Nothing was missed: search the repo for the old name, path, or value. A leftover occurrence is a finding
4. The diff holds a decision the `Change` line did not make (a default, an error path, a public symbol with callers outside `Files`) → `NOT MECHANICAL`, and say which decision

### Output - MAX 10 LINES plus one line per finding
VERDICT: PASS | FAIL | NOT MECHANICAL
Verification: [test / lint / build in the batch verification report -> pass, or the failing names]
Done when trace: [line → holds / does not hold, one per line]

Findings: [ID, level, criterion, file:line, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
```
