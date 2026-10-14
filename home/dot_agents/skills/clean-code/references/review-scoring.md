# Review Scoring

Use for scored implementation reviews. Reviewers classify findings and give evidence. They never score: the coordinator of the `implement-plan-execution` skill turns findings into one decision for the task. A score is a policy decision, not a probability of correctness.

## Acceptance gates

All gates must hold before a numeric score can pass:

- Every scenario and `Done when` observation assigned to the current task or phase holds. Existing behaviour, contracts, and data remain intact unless the task explicitly changes them.
- No introduced or exposed reachable crash, data loss, or vulnerability remains. Always report pre-existing security findings separately and follow the `application-security` skill.
- Required verification passes and every assigned review axis has evidence for its coverage. Failed or unavailable checks withhold acceptance even when unrelated to the patch. Attribute the cause separately.
- Explicit task requirements, safety rules, permission boundaries, and file ownership hold. A score never waives these gates.

Clean-code style rules are quality criteria, not automatic gates. Naming, comments, duplication, structure, and design-token findings are classified by demonstrated impact. A violated safety or behaviour contract remains a blocker even when the finding also concerns style. Never convert an explicit requirement into an optional improvement.

The plan maps feature Acceptance criteria to enforcing tasks and phase verification. Do not require an intermediate task to deliver behaviour assigned to a later task. Safety, required verification, ownership, permissions, and preservation of existing behaviour apply to every task. Phase review enforces every criterion assigned to that phase. Missing coverage mapping is a planning gap, not a waived requirement.

## Finding levels

| Level | Anchor | Deduction |
|---|---|---|
| Blocker | A gate fails. Name the violated requirement or the reachable input and consequence | Score withheld |
| Material | Gates hold, but evidence shows substantial recurring maintenance or resource cost. Example: an unnecessary abstraction makes every existing consumer duplicate conversion logic | 10 per root cause |
| Minor | Gates hold, but evidence shows a limited local maintenance or resource cost. Example: a misleading local name repeatedly requires tracing its producer to understand its unit | 3 per root cause |
| Nit | Polish with no demonstrated behaviour, safety, maintenance, or resource cost. Example: a redundant comment restates the next line | 1 per root cause, 5 total maximum |
| Preference | An alternative with no established requirement or demonstrated benefit. Example: choosing another equally clear loop form | 0 |
| Unverified | Required evidence or coverage is missing. This is uncertainty, not a proven defect | Score withheld |

Classify by consequence and reachability, not the fix's size or cost. A one-line missing authorization check is a blocker. A speculative optimization is a preference. A measured performance-limit breach is a blocker. An improvement below that limit is graded only when its remaining cost is demonstrated.

## Evidence and review order

Review functionality first, then crash and security risk, verification, measured efficiency, maintainability, and polish. A review axis only covers its assigned criteria.

Each finding carries:

1. Stable finding ID, axis, level, and applicable criterion.
2. File:line or observed step, with the triggering input or maintenance operation.
3. Concrete consequence and evidence, such as a caller path, test result, measurement, or screenshot.
4. Smallest concrete fix. Fix cost never changes the level.

A gate violation needs the gate and evidence. A nit needs its location and proposed polish, not an invented risk. Unresolved questions go under Unverified, not a speculative deduction. Each finding adds one line to a report's cap, so never omit a finding to fit. State any incomplete coverage.

Only findings introduced or exposed by the current task affect its score. Record unrelated pre-existing findings separately. Accepted findings still count while they remain in the task's diff.
