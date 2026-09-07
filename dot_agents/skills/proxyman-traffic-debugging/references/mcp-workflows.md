# Proxyman MCP Workflows

Use the connected tool schemas for inputs. These workflows define sequencing, evidence, and rollback.

## Inspect A Feature Or Regression

1. Read `get_proxy_status`.
2. Define the expected endpoint, client, method, behavior, and time window.
3. Use `get_flows` for recent host/method/status narrowing or `filter_flows` for header/body/client criteria.
4. Inspect representative `flow_id` values with `get_flow_detail`.
5. Compare request order, status, timing, payload, client metadata, and matched debugging tools.
6. Report passed, suspicious, failed, or inconclusive. State missing capture or truncated previews explicitly.

## Diagnose Missing Traffic

1. Call `answer_setup_question` with the exact target and symptom.
2. Check recording/port with `get_proxy_status`.
3. Check trust with `get_certificate_status` and host coverage with `get_ssl_proxying_list`.
4. Verify target routing separately from trust.
5. For localhost, use explicit proxying or Reverse Proxy.
6. For iOS plus VPN, evaluate Atlantis.
7. Before automation/injection, explain changes and obtain consent.
8. Generate a known request, find it by host/client, and inspect detail.

## Create A Rule From Traffic

For Breakpoint, Map Local, Map Remote, or Scripting, follow the deeper matching, interface-boundary, composition, and failure guidance in [request and response rules](request-response-rules.md).

1. Find and inspect the target flow.
2. Choose the narrowest matching URL, method, paths, and optional GraphQL operation.
3. For a captured response mock, prefer `create_map_local_from_flow`.
4. For literal custom content, use `create_map_local` with explicit response fields.
5. For redirect, blocking, visibility, throttling, DNS, or scripting, use the dedicated create tool.
6. Verify the returned ID through its inventory and confirm global feature state.
7. Test a new request and inspect `matched_tools` in detail.

## Update, Toggle, Or Delete A Rule

1. List the correct family; Reverse Proxy has a separate list.
2. Select the exact returned ID and confirm ambiguous names with the user.
3. For update, send only documented patch fields. Map Local literal responses are the exception: send body, status, and content type together.
4. For toggle, preserve the rule and verify its enabled state.
5. For delete, obtain immediate confirmation, delete once, and verify it is absent.

Typical `rule_type` values include `breakpoint`, `maplocal`, `mapremote`, `blacklist`, `scripting`, `whitelist`, `reverse_proxy`, `network_condition`, and `dns_spoofing`. Use the live schema for the current enum.

## Apply A Network Condition

1. Read `list_network_conditions` and record feature state, existing rules, and the active condition.
2. Choose the narrowest URL scope unless the user explicitly requested system-wide throttling.
3. Use a profile from the live schema. Do not invent custom bandwidth, latency, or loss fields when only presets are exposed.
4. Create or update by exact ID. Only one condition can be active in the reviewed behavior.
5. Generate several comparable requests and verify both listed state and observed timing/behavior.
6. Restore the prior active condition or disable/delete the test condition according to the requested cleanup; confirm before deletion.

## Write A Scripting Rule

Use [request and response rules](request-response-rules.md#scripting-workflow) for Mock Response, body types, advanced runtime boundaries, interaction with other rules, and runtime verification.

1. Read `docs://scripting/snippet-code` or use the `write_scripting_rule` prompt.
2. Use only the necessary canonical handlers:
   - `async function onRequest(context, url, request)` ending in `return request;`
   - `async function onResponse(context, url, request, response)` ending in `return response;`
3. Treat headers as mutable key-value objects; use documented request/response fields.
4. Avoid one-argument handlers: the first positional argument is `context`.
5. Create/update and fix the app's validation error rather than weakening the script.
6. Verify inventory and a matched flow.

## Compose, Edit & Repeat, And Replay HTTP

The reviewed MCP exposes HTTP Compose, not the GUI's exact one-click Repeat command. `create_compose_http_from_flow` is the Edit & Repeat analogue; do not claim GUI history, raw/multipart editing, or Repeat parity.

1. Create a blank draft or seed from a confirmed flow.
2. Read it back before edits.
3. Update using the live schema for method, URL, header objects, and UTF-8 body text.
4. Send and inspect the returned captured flow.
5. Compare response with the expected behavior.
6. Delete unused drafts only with confirmation.

`QUERY` can carry `body_text`. HTTP Compose does not send WebSocket URLs.

## Inspect WebSocket

1. List sessions and select by returned flow ID.
2. Read messages with direction `all`, `client`, or `server` and choose whether to include ping/pong and payload preview.
3. Correlate direction, opcode/type, ordering, timing, and truncation.
4. Close only when it is an active Compose-created session and the user confirms.

## Configure SSL Proxying

1. Read certificate status and the existing SSL list.
2. Choose the narrowest exact host or wildcard such as `*.example.com`.
3. Explain that enabling interception changes HTTPS handling for matching traffic.
4. Apply the exact requested action.
5. Verify the same pattern in `get_ssl_proxying_list` and inspect a new HTTPS flow.
6. Roll back using the exact same pattern.

## Configure External Proxy

1. Read `get_external_proxy`.
2. Identify exactly one kind: HTTP, HTTPS, SOCKS, or PAC.
3. Ask before sending credentials.
4. Send a complete setting for the selected kind; do not rely on omitted fields being preserved.
5. Read state again and verify an outbound flow.
6. Roll back to the recorded original setting.

## Reverse Proxy For Localhost Or Inbound Capture

1. Read existing reverse proxies and choose an unused local listener.
2. Confirm local port, remote host/port, protocol, and whether TLS is involved from the live schema/docs.
3. Decide whether to preserve Host. A mismatched preserved Host can be rejected by the upstream.
4. Create the entry and verify its ID/state.
5. Point the client at the local listener and produce a known request.
6. Inspect the captured flow and confirm the intended upstream/TLS behavior.
7. Disable/delete the entry only according to the user's requested cleanup.

## Export Or Generate A Reproduction

- cURL/code: confirm one flow, then use `export_flow_curl` or `generate_code`. Review redaction before sharing.
- HAR/Proxyman log: confirm selection, format, and explicit destination. Warn that original data on disk is not MCP-redacted. Verify the file.
- Generated code is a starting representation; it may need local secret injection and environment-specific TLS/proxy setup.

## Guided Setup And Injection

1. Discover workflows and read the matching built-in resource.
2. Confirm the target app/device/profile and prerequisites.
3. Explain processes/settings that will be launched, restarted, injected, or modified.
4. Obtain consent, run once, and surface any visible OS permission prompt.
5. Verify with a target-generated request and client metadata.
6. Use the documented revert workflow where one exists.

Android Google Play emulator Magisk automation has additional consent and rollback requirements in the HTTPS capture skill.
