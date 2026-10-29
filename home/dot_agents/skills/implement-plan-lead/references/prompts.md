# Lead Prompt Templates

Fill every bracket. A spawn inherits nothing, so the Goal and the Non-goals travel in the prompt verbatim. Everything else travels as a path.

## PLANNER - `planner` spawn

```
## Plan - [plan name], phase [N]

Plan directory: [plan dir]. Run [the skill's full Workflow | the skill's "Detail the next phase" for phase [N]].

### Goal and Non-goals (verbatim from requirements.md)
[blocks]

### Plan ahead (only when phase [N-1] is still in its last part)
Phase [N-1] is in its last part on branch [branch], at [HEAD hash]. Detail this phase against that branch. Its last part and ship fixes may still move files: a later RECONCILE message covers them.
```

## RECONCILE - message to a plan-ahead planner

```
## Reconcile - phase [N]

Phase [N-1] shipped at [merge commit]. Read the `progress.md` entries after `## Ruling - phase [N] plan approved`, and run `git diff --stat [plan-time hash]..[merge commit]`. Revise each task whose scope, Files, Read first, or Done when they move. Run `plan_check.py lint`. Reply with the tasks changed, or `no change`.
```

## COORDINATOR - `coordinator` spawn

```
## Run part - [plan name], phase [N], part [N.k]

Plan directory: [plan dir]. Run the current part under the `implement-plan-execution` skill.

### Goal and Non-goals (verbatim from requirements.md)
[blocks]

### Rulings this part depends on
[each `## Ruling` line from progress.md that touches this phase, or none]

### This part ends with
[handoff to part N.k+1 | the ship of phase [N]]
```
