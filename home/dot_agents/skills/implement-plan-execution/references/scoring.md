# Scoring a Task

The judges level findings with the `clean-code` skill's Review Scoring reference. This file turns their reports into one decision. Judges never see it.

## Calculate once

Preserve each judge's report. Deduplicate findings only for arithmetic. Reports describing the same root cause share one deduction at the highest supported level. Keep every finding ID and axis in the duplicate mapping.

Conflicting evidence or disputed levels go back to the relevant judge for a bounded clarification. Until resolved: `Score: N/A`, `Decision: BLOCKED`. Never downgrade a finding to reach 95. A blocker cannot be voted away. Never average judge or task scores.

With any blocker, unverified required coverage, failed axis gate, or a failed or unavailable VERIFY check attributed to the task: `Score: N/A`, `Decision: BLOCKED`. Otherwise:

```text
score = max(0, 100 - 10 * material - 3 * minor - min(5, nits))
score >= 95 -> PASS
score < 95  -> FIX
```

A judge's `PASS` means its gates and coverage hold. It can still report material or minor findings. Only this score decides task acceptance.

Record `Score:`, `Decision:`, deduction IDs, duplicate mappings, and evidence references in the ledger. At 100, state only that no scored findings remain in the reviewed scope. Never claim exhaustive correctness.

## Route the decision

- BLOCKED: resolve gate failures or missing evidence first. Never spend a fix round on unrelated nits while a blocker remains.
- FIX: select substantive findings sufficient to reach 95. Start with higher impact, then prefer the smaller safe fix within scope. Send the selected findings verbatim to the writer. Keep every other finding recorded.
- PASS: record each remaining finding as `Accepted as-is:` with its level and reason, then close out. Never send a remaining finding to a writer or chase 100.
- Fix rounds stop at the limit in `SKILL.md` step 4. A score never authorizes more rounds, broader scope, or weaker checks.

## After an edit

Recalculate from the unresolved findings on the latest reviewed diff. A re-review judges the prior findings and the edit. A new finding on lines the edit did not touch deducts only at blocker or material level. Record a lower one as `Accepted as-is:` with no deduction. Remove a deduction only with evidence that the finding was resolved, or that its judge withdrew it. After a PASS with no edits, never reopen review to search for more findings. New evidence of a gate failure still blocks acceptance.

## Calibration cases

Assume complete coverage and green verification except where stated:

| Case | Score | Decision |
|---|---|---|
| No findings | 100 | PASS |
| One minor and two distinct nits | 95 | PASS with recorded findings |
| Twenty distinct nits | 95 | PASS with recorded findings |
| Two minor root causes | 94 | FIX one minor, then recheck |
| One material concern | 90 | FIX |
| Two axes report the same minor root cause | 97 | PASS, count once |
| Missing ownership check, otherwise polished | N/A | BLOCKED |
| Required scenario missing or required check unavailable | N/A | BLOCKED |
| Pre-existing unrelated inefficiency, no new exposure | 100 | PASS, report separately |
