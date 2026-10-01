# Notes Round

Reached from `SKILL.md` and `references/drift.md` when every axis returned `PASS` and non-blocking notes are all that is left. It exists because a full re-review of a change that already passed costs a fresh spawn per axis and returns new notes every time.

## The rule

| The round returned | Next |
|---|---|
| `FAIL` on any axis | Fix round, then every slot the task earns again: fresh spawns, full prompts. A fix can break what another axis passed |
| `PASS` on every axis, no notes | Close out |
| `PASS` on every axis, notes only | One notes round, below |

1. **Sort the notes.** A nit stays inside behaviour the scenarios already state: a name, a comment, a dead branch, a duplicated block, a missing assertion. A note that asks for new behaviour, a signature change, or a new file is not a nit. A Tester or Designer note changes what the surface shows, so it is never a nit. Route every non-nit through the disposition table in `references/drift.md`
2. **No nit left** → close out
3. **Send the nits** to the writer with the FIX FORWARD prompt from `references/subagent-prompts.md`, verbatim, in one batch
4. **Dispatch one Notes check spawn**, agent type from the skill's **Role → agent** table, prompt below. It replaces the judging slots
5. **Notes check `PASS`** → close out. **`FAIL`** → it was not a notes round: fix round, then the full judging slots

A notes round happens once per task. It is not a fix round and does not count toward the third-round diagnosis. Nothing it turns up goes back to the writer:

| Left over | Ledger |
|---|---|
| A nit the writer declined, with its reason | `Accepted as-is:` |
| A `Seen` line that is taste | `Accepted as-is:` |
| A `Seen` line that is a defect | `## Found` |

## NOTES CHECK prompt

```
## Notes check — Task [ID]: [task name]

Every judge passed this change. The writer then applied the non-blocking notes below. You confirm that round did what the notes said and nothing else. You do not re-review the task, and you send nothing back to the writer.

### Step 1 — verify
Run [test cmd], [lint cmd], [build cmd]. Any red → `VERDICT: FAIL` with the failing names and nothing else.

### The notes (verbatim, as sent to the writer)
[The nits, under their `## Standards` and `## Spec` headings]

### The writer's report (verbatim)
[Finding -> what changed. Findings not addressed, and why]

### The change
Run `git diff -- [Files paths]` (and `git status` for new files). It is unstaged. Files this task may touch: [Files line, verbatim from the plan]

### Judge
1. Each note → applied as written, or declined with the writer's reason
2. Nothing changed beyond the notes: no new behaviour, no signature change, no file outside the Files line
3. `Done when` still holds: [Done when lines, verbatim]

### Output — MAX 10 LINES
VERDICT: PASS | FAIL
Verification: [test / lint / build → pass, or the failing names]
Notes trace: [note → applied | declined: reason, one per line]
FAIL only for red verification, a change beyond the notes, or a `Done when` line that no longer holds. Each with file:line.
Seen: [anything else you noticed, file:line and one line each, or none. It is logged, not fixed]
```
