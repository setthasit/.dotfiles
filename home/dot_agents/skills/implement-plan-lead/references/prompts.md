# Lead Prompt Templates

Fill every bracket. A spawn inherits nothing, so the Goal and the Non-goals travel in the prompt verbatim. Everything else travels as a path.

## PLANNER - `task` spawn

```
## Plan - [plan name], phase [N]

Load the `implementation-plan-creator` skill and run [its full Workflow | its "Detail the next phase" for phase [N]] on [plan dir].

### Goal and Non-goals (verbatim from requirements.md)
[blocks]

### Your owner is the lead, not the user
The user is away. Every point where the skill presents or asks the user ends your turn with a report to the lead. The lead answers by message, and you continue.

### Files you own
[plan dir]/plan.md, [plan dir]/phase-*.md. Never code, never git, never progress.md.

### Report - at most 40 lines
The skill's presentation: decisions table, part split with each `Ends with:`, coverage matrix, tasks whose `Done when` is not a test, and every question you could not settle from the requirements, the code, or the plan, each with your recommendation.
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
