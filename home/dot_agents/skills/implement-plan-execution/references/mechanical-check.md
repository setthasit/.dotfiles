# Mechanical Check

When this judge runs: the **Role → agent** table in `SKILL.md`. A rename, a move, or a constant edit has no design to judge and no scenario to trace, so one check replaces the code judges. A Tester or Design review the leaf needs still goes out beside it.

Verdict `NOT MECHANICAL` → judge the leaf again as a `task` leaf, by the same table. Any fix round goes to a fresh `task` writer, never back to `sonic`.

## MECHANICAL CHECK prompt

```
## Mechanical check - Task [ID]: [task name]

A writer applied a mechanical change: no branching, no design choice. You are its only judge. You confirm the diff is exactly the change the task states and nothing else.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim]. Report finding levels and evidence. Your PASS confirms gates and coverage, not the aggregate task score.

### Verification
The full suite runs beside you and reports to the coordinator. Do not run it. Judge the diff and the tests it names.

### Task block
Read task [ID] in [phase file path]: its Files, Change, and Done when lines.

### The change
Run `git diff -- [Files paths]`, and `git status` for new files. It is unstaged, and another task's changes may sit in the same tree, so judge only these paths.

### Judge
1. `Done when`: every line holds, with the evidence
2. The diff is the `Change` line and nothing more: no new branch, no new behaviour, no file outside `Files`
3. Nothing was missed: search the repo for the old name, path, or value. A leftover occurrence is a finding
4. The diff holds a decision the `Change` line did not make (a default, an error path, a public symbol with callers outside `Files`) → `NOT MECHANICAL`, and say which decision

### Output - MAX 10 LINES plus one line per finding
VERDICT: PASS | FAIL | NOT MECHANICAL
Done when trace: [line → holds / does not hold, one per line]

Findings: [ID, level, criterion, file:line, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
```
