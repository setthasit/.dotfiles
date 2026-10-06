---
name: application-security
description: Use when writing, editing, or reviewing code in any language, or the config it ships with. Fires on a handler, route, query, shell call, template, file path, auth, session, token, or crypto logic, a new dependency, CORS, cookie, or TLS settings, error handling, logging, and any security weakness spotted in passing.
---

# Application Security

Applies to every line you write, generate, or review. Project skills add language specifics.

## Access control is per request AND per object

- Authentication ("is there a session") is not authorization ("does this user own this row"). A handler needs both.
- Every read or write keyed on a client-supplied id gets an ownership or tenant check. Prefer a query already scoped to the caller over fetch-then-compare. Identity comes from the verified session or token, never a body, param, or header the client controls.
- Fail closed: cannot decide → deny. A caught exception never drops the request onto the happy path. UI role checks are UX only. Re-check server-side every time.
- RLS, Firestore/Supabase policies, and permission tables ship with the change. A new table or route with no policy is a hole, not a TODO. A new endpoint is protected unless deliberately made public.

## Configuration is attack surface

- CORS: exact origins, never `*`, never `*` with credentials. Cookies `HttpOnly` + `Secure` + `SameSite`. CSP and HSTS wherever the app serves HTML.
- Debug mode, verbose errors, stack traces, directory listings, seeded admin accounts, sample endpoints: off anywhere but local.
- TLS on, verification never disabled. `InsecureSkipVerify`, `rejectUnauthorized: false`, `verify=False`, `-k` are red flags, not workarounds.
- Secrets resolved from config/env at runtime, never hardcoded, never in a client bundle. `NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`, and mobile binaries are public. Service-role and admin keys server-side only.

## Supply chain

- Before adding a package, verify it exists on the registry, is the one intended, and is not a near-miss of a real name. Check age, downloads, maintainer. Hallucinated and typosquatted names are an active attack path.
- Pin versions, install from the lockfile, never `latest`. Never disable an integrity check, signature verification, lockfile, or audit gate to unblock yourself.

## Injection: never build a command out of a string

- SQL/NoSQL: driver parameter binding or the ORM's typed builder. No concatenation, template literals, or format strings, including inside a conditionally assembled `WHERE`.
- Shell: pass an argv array. No shell string, no `shell=True`, no interpolated `bash -c`. Shell unavoidable → interpolate only from a strict allowlist. Anything long-lived starts as a background process from an argv, not a shell line.
- HTML and templates: framework auto-escaping, escaped per context. `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `|safe` with user data only after a real sanitizer.
- Paths: normalize/`realpath` the joined path, then verify it is still under the base directory. Never `eval`, dynamic `exec`, or unsafe deserialization (`pickle`, `unserialize`, unsafe YAML load, native Java) on untrusted data.
- Validate at the trust boundary with a schema: type, length, range, format, allowed values, allowlist not denylist. Reject bad input. Do not "sanitize" by stripping characters. A validation regex must actually reject the bad case and must not backtrack catastrophically. Where a real parser exists (URL, email, date), parse instead.

## Crypto, tokens, sessions: use the boring proven thing

- Never hand-roll auth, session, crypto, or token logic. Use the framework, a vetted library, or the project's identity provider.
- Security-relevant randomness comes from the crypto RNG (`crypto/rand`, `secrets`, `crypto.randomUUID`). Never `Math.random()` or a seeded PRNG.
- Passwords: argon2id, bcrypt, or scrypt at a current cost, never plain and never a bare hash. Compare secrets, tokens, and MACs in constant time, never `==`.
- JWT: pin the algorithm, verify the signature, check `iss`, `aud`, `exp`. No `alg: none`, no decode-without-verify.
- Rotate the session id on login and privilege change, invalidate server-side on logout, CSRF-protect every cookie-authed state change. Reset links, magic links, and OTPs: short expiry, single use, killed on reissue.

## Trust nothing that crosses the boundary, in either direction

- Recompute prices, totals, quantities, roles, and ownership server-side. A client-sent value is a request, not a fact.
- SSRF: a user-supplied URL gets a scheme/host/port allowlist, must not resolve to internal or link-local ranges, and no blind redirect following. Webhooks: verify the signature before parsing or acting on the payload.
- Responses return a DTO with only the fields the caller needs. Never dump an internal record with hashes, tokens, or another user's data.

## Errors, logging, limits

- Client gets a generic message, detail goes to the log. No stack traces, SQL, file paths, or version strings in a response. Same response and same timing for "user not found" and "wrong password".
- Log authentication outcomes and authorization denials by user id or a hashed identifier. Never log raw email or other PII, passwords, tokens, keys, or full request bodies.
- Rate-limit login, registration, password reset, OTP, and anything that sends a message or costs money. Size-limit bodies and uploads, set a timeout on every outbound call.
- Repo has a scanner (`govulncheck`, `gosec`, `npm audit`, `semgrep`, secret scanning) → run it when the change touches a security-relevant path. Deeper pass on a security-relevant diff → dispatch the read-only `security-reviewer` agent.

## Found a weakness → raise it, never silently fix and never silently pass

- In your diff or in a file you only read: report `file:line`, what an attacker gets, the concrete fix, and whether it is exploitable now or latent. Do not inflate it, do not soften it.
- In scope, small, behavior-preserving → fix it in the same change and say you did. Out of scope, or the fix moves an auth, crypto, or API boundary → report and ask first.
- A secret in the repo or its history → stop, report, recommend rotation and purge. Rotation is the user's call.
- Never weaken a control to make something work, and never add a backdoor, debug bypass, hardcoded test account, or `if env == "dev"` auth skip. Not behind a flag, not temporarily. Blocked by a control → report the block.
