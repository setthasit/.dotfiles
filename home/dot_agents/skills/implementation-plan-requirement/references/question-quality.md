# Question and Scenario Quality

## A question earns its place when

- The code cannot answer it — otherwise the scout answers it
- Its prerequisites are settled — otherwise it waits for the next round
- The answer changes what gets built, or what "done" means
- It arrives with a recommendation and the reason

## Shape of a good question

Question text: the decision and what it unlocks. Options: concrete, distinct, short labels. Descriptions: the trade-off. `recommended`: the boring, reversible choice unless evidence says otherwise.

Good:

> **Where should theme preference persist?** Decides whether the toggle needs a backend call.
> - Cookie — survives reload, sent to the server, 4 KB cap *(recommended: server-rendered pages need it at first paint)*
> - localStorage — client only, no server access, flash of wrong theme on first paint
> - User profile (API) — cross-device, needs an endpoint and a migration

Bad:

> How do you want to handle theme persistence?

No options, no recommendation, no consequence.

> Should we use cookies? Also what about the API? And do we need dark mode on mobile?

Three decisions with different prerequisites in one question.

## Frontier order

Outcome first, then the approach when the user brought one, then scope, contracts, details:

1. Who this is for; what must be true when it ships
2. Approach, when the request names one: the problem it solves and the alternatives the code already offers, with a recommendation
3. What is out of scope
4. Observable behaviour per case, including failure
5. Data or API shape; compatibility with existing callers
6. Security, authz, rate limits, money
7. Acceptance: what a reviewer checks

Asking 5 before 1 produces answers that get reversed. Asking 3 before 2 scopes a solution nobody has agreed to.

## Scenario quality

A scenario is testable when someone could write an automated test from it without asking a question.

| Weak | Testable |
|---|---|
| Users can export data | WHEN a signed-in user requests CSV export THEN a file with all their rows downloads within 5 s |
| Handles errors gracefully | WHEN the upstream returns 503 THEN the request is retried twice, then fails with `upstream_unavailable` |
| Fast enough | WHEN 100 concurrent exports run THEN p95 completes under 2 s |

Numbers, error codes, and orderings stay exact. "Roughly", "appropriately", and "as needed" are assumptions in disguise — ask, or put them under `## Assumptions`.

## Pre-approval lint

Run over the whole document before it is presented. Each check is on what is written, not on the code.

| Check | Fails when |
|---|---|
| Every `### R<n>` has at least one `#### S<n>`; a refactor's `### No behaviour change` lists at least one invariant | A requirement without a scenario or invariant cannot be tested or traced |
| Every scenario has WHEN and THEN with exact values | An input, count, code, or duration is missing or approximate |
| No vague adjective outside `## Assumptions` | "fast", "gracefully", "appropriate", "robust", "as needed" in a requirement or scenario |
| No implementation names | A class, function, file, library, or framework appears in a requirement or scenario |
| `## Non-goals` is not empty | Nothing was excluded, so nothing stops scope creep |
| Every `## Decisions` row has alternatives and a reason | A choice without alternatives was never a decision |
| `## Not yet specified` names every fuzzy area, and nothing in it would change scope, approach, or tasks | A fuzzy area is missing, so the plan invents it — or an entry belongs in a round instead |

A failure is fixed in place when the answer is already known, otherwise it becomes a frontier question. Report with the document: `lint: clean`, or each flagged line and its resolution.
