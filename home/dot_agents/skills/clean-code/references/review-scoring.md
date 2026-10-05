# Review Scoring

Use for scored implementation reviews. Reviewers classify findings and provide evidence. The coordinator calculates one acceptance score for the current task. A score is a policy decision, not a probability of correctness.

## Acceptance gates

All gates must hold before a numeric score can pass:

- Every scenario and `Done when` observation assigned to the current task or phase holds. Existing behavior, contracts, and data remain intact unless the task explicitly changes them.
- No introduced or exposed reachable crash, data loss, or vulnerability remains. Always report pre-existing security findings separately and follow the governing security policy.
- Required verification passes and every assigned review axis has evidence for its coverage. Failed or unavailable checks withhold acceptance even when unrelated to the patch. Attribute the cause separately.
- Explicit task requirements, safety rules, permission boundaries, and file ownership hold. A score never waives these gates.

Clean-code style rules are quality criteria, not automatic gates. Naming, comments, duplication, structure, and design-token findings are classified by demonstrated impact. A violated safety or behavior contract remains a blocker even when the finding also concerns style. Never convert an explicit requirement into an optional improvement.

The plan maps feature Acceptance criteria to enforcing tasks and phase verification. Do not require an intermediate task to deliver behavior assigned to a later task. Safety, required verification, ownership, permissions, and preservation of existing behavior apply to every task. Phase review enforces every criterion assigned to that phase. Missing coverage mapping is a planning gap, not a waived requirement.

## Finding levels

| Level | Anchor | Deduction |
|---|---|---|
| Blocker | A gate fails. Name the violated requirement or the reachable input and consequence | Score withheld |
| Material | Gates hold, but evidence shows substantial recurring maintenance or resource cost. Example: an unnecessary abstraction makes every existing consumer duplicate conversion logic | 10 per root cause |
| Minor | Gates hold, but evidence shows a limited local maintenance or resource cost. Example: a misleading local name repeatedly requires tracing its producer to understand its unit | 3 per root cause |
| Nit | Optional polish with no demonstrated behavior, safety, maintenance, or resource cost. Example: a redundant comment restates the next line | 1 per root cause, 5 total maximum |
| Preference | An alternative with no established requirement or demonstrated benefit. Example: choosing another equally clear loop form | 0 |
| Unverified | Required evidence or coverage is missing. This is uncertainty, not a proven defect | Score withheld |

Classify by consequence and reachability, not the fix's size or cost. A one-line missing authorization check is a blocker. A speculative optimization is a preference. A measured performance-limit breach is a blocker. An improvement below that limit is graded only when its remaining cost is demonstrated.

## Evidence and review order

Review functionality first, then crash and security risk, verification, measured efficiency, maintainability, and polish. A review axis only covers its assigned criteria.

Each finding carries:

1. Stable finding ID, axis, level, and applicable criterion.
2. File:line or observed step, with the triggering input or maintenance operation.
3. Concrete consequence and evidence, such as a caller path, test result, measurement, or screenshot.
4. Smallest concrete fix. Fix cost affects optional scheduling, never severity.

A gate violation needs the gate and evidence. A nit needs its location and proposed polish, not an invented risk. Unresolved questions go under Unverified, not a speculative deduction. Each finding adds one line to a report's cap, so never omit a finding to fit. State any incomplete coverage.

Only findings introduced or exposed by the current task affect its score. Record unrelated pre-existing findings separately. Accepted findings still count while they remain in the task's diff.

## Calculate once

Preserve each axis' report. Deduplicate findings only for arithmetic. Reports describing the same root cause share one deduction at the highest supported level. Keep every finding ID and axis in the duplicate mapping.

Conflicting evidence or disputed levels go back to the relevant judge for a bounded clarification. Until resolved: `Score: N/A`, `Decision: BLOCKED`. The coordinator never downgrades a finding to reach 95. A blocker cannot be voted away. Do not average reviewer or task scores.

With any blocker, unverified required coverage, or failed axis gate: `Score: N/A`, `Decision: BLOCKED`. Otherwise:

```text
score = max(0, 100 - 10 * material - 3 * minor - min(5, nits))
score >= 95 -> PASS
score < 95  -> FIX
```

An axis' `PASS` means its gates and coverage hold. It can still report material or minor findings. Only the coordinator's aggregate score decides task acceptance.

Record `Score:`, `Decision:`, deduction IDs, duplicate mappings, and evidence references in the task ledger. At 100, state only that no scored findings remain in the reviewed scope. Do not claim exhaustive correctness.

## Fix and stop

- BLOCKED: resolve gate failures or missing evidence. Never spend a fix round polishing unrelated nits while a blocker remains.
- FIX: select substantive findings sufficient to reach 95. Start with higher impact, then prefer the smaller safe fix within scope. Send selected findings verbatim to the writer. Keep every other finding recorded.
- PASS: record remaining findings as `Accepted as-is:` with their level and reason. Close out by default. Do not send optional notes to a writer automatically or seek 100.
- Optional polish: at most one pass when a writer proposes a small, safe improvement or the user requests it. Verify the resulting diff before acceptance. New behavior, contract, or surface changes require the relevant full reviews.
- Required fix rounds keep the execution skill's existing diagnosis and stop limits. A score does not authorize endless retries, broader scope, or weakened checks.

Recalculate from unresolved findings on the latest reviewed diff. A re-review after an edit judges the prior findings and the edit. A new finding on lines the edit did not touch deducts only at blocker or material level. Record a lower one as `Accepted as-is:` with no deduction. Remove a deduction only with evidence the finding was resolved or withdrawn by its judge. After a PASS with no edits, do not reopen review merely to search for more polish. New evidence of a gate failure still blocks acceptance.

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

For rubric changes, give independent judges identical sample diffs and requirements. Compare gate decisions and finding levels before numeric totals. Resolve ambiguous anchors rather than adjusting scores to obtain agreement.
