# Lead Prompt Templates

Fill every bracket. A spawn inherits nothing, so the Goal and the Non-goals travel in the prompt verbatim. Everything else travels as a path.

## PLANNER - `planner` spawn

```
## Plan - [plan name], phase [N]

Plan directory: [plan dir]. Run [the skill's full Workflow | the skill's "Detail the next phase" for phase [N]].

### Goal and Non-goals (verbatim from requirements.md)
[blocks]
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
