# Optional Notes Round

Reached only when a task already has coordinator PASS and a writer proposes small, safe polish or the user requests it. Default: record remaining findings and close out. Do not dispatch a writer just because notes exist.

## The rule

1. At most one optional pass per task. Stage the snapshot from `references/re-review.md`, then send only the chosen findings through FIX FORWARD. All other accepted findings stay unchanged.
2. Behavior, public-contract, or surface changes require the full earned judging slots. A rename, comment edit, or equivalent internal cleanup earns one Notes check: the RE-REVIEW prompt in `references/re-review.md`, mode optional polish.
3. Any applied edit invalidates the previous acceptance until verified. The Notes check must detect regression risk, not just confirm the writer's report.
4. The coordinator recalculates from unresolved findings plus new supported findings. PASS → close out without more polish. A gate failure or score below acceptance → required fix routing in `references/drift.md`.

Optional polish is not a required fix round. A regression it introduces enters the required cycle and its existing diagnosis limits. Never silently log a newly introduced blocker as future work.
