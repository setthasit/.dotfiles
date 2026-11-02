# Approach Check

Reached when a leaf has a `Risk:` line. A judge tries to break the approach before code exists, so a wrong approach costs minutes instead of fix rounds.

1. Dispatch the writer with the CODE prompt plus the APPROACH block below
2. Writer returns the note → dispatch the judge from the **Role → agent** table with the APPROACH CHECK prompt
3. PASS → message the same writer to build the approved approach, with the judge's `Unchecked` and `Simpler approach` lines verbatim. It takes the simpler approach, or says why not in its report. The cycle continues at VERIFY and the judges
4. FAIL → message the same writer the judge's report to revise the note, then message the same judge. Two revisions at most. A third FAIL → stop and ask, as `SKILL.md` Stop conditions says for a decision the plan does not answer

## APPROACH block

```
### First: approach note
This task's `Risk:` line says its approach is unproven. Before any source change, write [plan dir]/reports/[phase]-[ID]-approach.md, at most 30 lines: the approach, what it relies on, how it fails, and the measurement that would prove it. A throwaway measurement script goes in [plan dir]/scripts/. Return the note's path and stop. You build it only after a judge passes it.
```

## APPROACH CHECK prompt

```
## Approach check - Task [ID]: [task name]

No code exists yet. Try to break this approach before anyone builds it. Judge the approach only, never a plan's wording or code style.

Read task [ID] in [phase file path], then [approach note path]. Read `## Security scope` in [requirements.md path] when it has one: a route outside it does not fail the approach.

### Judge
1. The harm the `Risk:` line names: find a route to it under this approach, as a concrete input or sequence
2. Each thing the note relies on: check it against the library's source or docs, or a cheap command that changes no state
3. A simpler approach that closes the same risk

### Output - MAX 15 LINES
VERDICT: PASS | FAIL
Routes: [concrete input or sequence → the harm, or none]
Unchecked: [what the approach relies on that you could not check, or none]
Simpler approach: [one line, or none]
```
