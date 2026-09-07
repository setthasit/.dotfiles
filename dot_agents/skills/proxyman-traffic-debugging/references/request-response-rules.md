# Breakpoint, Map Local, Map Remote, And Scripting Through MCP

Use this reference when the user wants the agent to operate these rule families through Proxyman MCP. The connected server's live schemas remain authoritative.

## Choose The Rule Family

| Desired outcome | MCP route | Important boundary |
|---|---|---|
| Pause a matching request/response for manual editing | `create_breakpoint` | MCP manages the rule; the paused edit and Execute/Cancel/Abort actions remain in Proxyman's GUI. |
| Reuse a captured response | `create_map_local_from_flow` | Requires a current flow with the response still available in Proxyman memory. |
| Return a literal status/body/content type | `create_map_local` | Reviewed MCP does not select arbitrary local files or directories. |
| Route a request to another server | `create_map_remote` | Confirm destination, TLS, and Host behavior; this changes which system receives the request. |
| Apply conditional or repeatable JavaScript | `create_scripting_rule` | Read the Scripting resource first and verify runtime behavior on traffic. |

If the user asks for a local file/directory, Breakpoint template, paused-message automation, npm installation, environment permission, or a Map Remote option absent from the live schema, route to the GUI or version-matched CLI instead of approximating it.

## Establish State Before Any Mutation

1. Call `get_version`, `get_proxy_status`, `list_tool_status`, and `list_rules` for the relevant family.
2. Locate and inspect a representative flow with `get_flows`/`filter_flows` and `get_flow_detail` where one exists.
3. Record the exact URL, method, client, GraphQL operation, existing matched tools, and the feature/rule enabled state.
4. Explain the proposed rule scope and effect. Use the exact live schema and the smallest mutation.
5. Re-list the returned ID, confirm global feature state, send a fresh positive request, and inspect its detail.
6. Test a nearby negative URL when a broad wildcard, regex, or Include subpaths setting could affect unrelated traffic.

Do not create a duplicate rule merely because an existing rule is disabled. Update or enable the exact existing ID when it represents the requested behavior.

## Shared Matching Semantics

Set method, URL, subpaths, wildcard/regex mode, and optional GraphQL operation deliberately. In the reviewed schema, new-rule subpath defaults are:

| Rule | `include_paths` default |
|---|---:|
| Breakpoint | `true` |
| Map Local | `false` |
| Map Remote | `true` |
| Scripting | `false` |

Treat this table as a reviewed snapshot. Set `include_paths` explicitly whenever it changes the requested scope. Use uppercase `QUERY` only for an exact GraphQL-over-HTTP query method rule; use `ANY` only when all methods should match.

Creating Scripting rules auto-enables the global Scripting feature in the reviewed server. Breakpoint, Map Local, and Map Remote creation may leave their global feature disabled, so read `list_tool_status` and enable only the requested feature when needed.

## Breakpoint Workflow

1. Confirm whether the user wants request, response, or both phases and whether they can interact with the Proxyman window.
2. Inspect existing Breakpoint rules and global Breakpoint state.
3. Call `create_breakpoint` with a narrow URL and explicit method/subpath scope. Set `enable_request` and `enable_response` to the requested phases; do not rely on both defaulting on.
4. Verify the returned ID with `list_rules` and enable the global feature only if necessary.
5. Ask the user to generate a fresh request and interact with the paused Breakpoint window.
6. After the user executes/cancels/aborts, inspect the completed flow and `summary.debuggingTools`.

MCP does not expose the live Breakpoint editor, raw HTTP message, templates, or Execute/Cancel/Abort actions in the reviewed tool surface. Do not claim the breakpoint has completed merely because the rule was created.

If the request never pauses, verify normal-proxy rather than Atlantis traffic, global/rule state, method, URL, subpaths, match mode, GraphQL operation, and that the request is new. Narrow an overbroad rule before asking the user to resume traffic.

## Map Local Workflows

### From A Captured Response

1. Confirm the flow ID is current and inspect its request plus response metadata/body preview. The app-side create operation reuses the full in-memory response even when MCP preview text is truncated.
2. Use `create_map_local_from_flow`. By default it reuses the flow URL, method, response headers/body/type, and GraphQL operation where available.
3. Provide URL/method/subpath overrides only when the user wants a broader or different match. Pass an empty GraphQL operation only when intentionally clearing it.
4. Re-list the rule, confirm global Map Local state, resend, and compare status, headers, body type/content, and Debugging Tools metadata with the source flow.

### From Literal Content

1. Confirm exact status, Content-Type, and response body. Do not silently treat arbitrary text as JSON.
2. Use `create_map_local` with all three response fields explicit even when values match defaults.
3. Re-list, confirm global state, resend, and verify client decoding as well as visible body text.

For a literal-response update, send `response_body`, `status_code`, and `content_type` together. The reviewed implementation rebuilds the response file and omitted response fields can fall back to defaults. Matching-only updates may omit unchanged response fields.

The reviewed MCP does not configure a local file or directory path. If the user needs file/directory mapping, use current GUI guidance or `proxyman-cli rules map-local` help and verify that the path exists on the Proxyman host.

## Map Remote Workflow

1. Inspect the source flow and record its current scheme, host, port, path, query, method, Host header, TLS details, and server destination.
2. Inspect existing Map Remote rules and global state to avoid an overlapping redirect.
3. Use `create_map_remote` with explicit `from_url` and `to_url`. Set method, `include_paths`, `preserve_host`, and GraphQL operation deliberately.
4. Default `preserve_host` to false unless the target upstream explicitly expects the original Host. Routing to one host while sending another Host can be intentional virtual-host behavior, but it can also cause rejection.
5. Re-list, confirm global Map Remote state, and send a fresh request.
6. Inspect the flow's Debugging Tools/Map URL, final request URL and Host, connection destination, TLS/certificate details, and response.

The reviewed MCP schema accepts a complete destination URL but does not expose the CLI's separate `preserve_original_url` option. Preserve Host and preserve original URL are different behaviors; route to GUI/CLI when the requested semantics cannot be expressed exactly.

For HTTP-to-HTTPS, HTTPS-to-HTTP, or WebSocket mapping, confirm the live schema accepts the URL forms and verify the actual connection. A rule-list entry alone does not prove protocol, SNI, certificate, or WebSocket handshake success.

## Scripting Workflow

1. Read `docs://scripting/snippet-code` or use `write_scripting_rule` before generating non-trivial code.
2. Decide whether the script needs request, response, or both phases and whether it should be a Mock Response. Generate only the necessary handlers.
3. Use the canonical positional signatures:

   ```javascript
   async function onRequest(context, url, request) {
     return request;
   }

   async function onResponse(context, url, request, response) {
     return response;
   }
   ```

4. Keep `context` and `url` read-only. Mutate `request`/`response`, use fields from the live resource, and return the correct object on every normal path.
5. Match body changes to Content-Type: JSON/form objects, text strings, and binary `Uint8Array` are not interchangeable. Use `rawBody` for diagnosis, not as a writable replacement.
6. Call `create_scripting_rule` with explicit phase booleans, match scope, and Mock Response state. Fix validation errors rather than weakening the script contract.
7. Re-list the rule, confirm global state, send a fresh matching request, inspect the result, and ask the user to check the Proxyman Scripting console when runtime behavior differs.

Creation-time validation checks syntax, handler arity/order, and final returns; it does not prove runtime data shapes, file availability, async results, addon compatibility, or the intended upstream behavior.

### Advanced Scripting Boundaries

- **Mock Response:** set the live `is_mock_response` field when the response must be synthesized without contacting upstream. Verify that behavior, not only the returned rule.
- **Async HTTP:** current public docs use `$http` on macOS and Axios on Windows/Linux. The inline request has a documented timeout and bypasses Proxyman/other debugging tools.
- **Files:** `bodyFilePath` and file APIs resolve on the Proxyman host. Confirm authorization and existence; MCP rule creation does not create the file.
- **Environment:** the user must grant script environment access in Proxyman. Never log or return secret environment values.
- **npm/addons:** MCP does not install packages. Proxyman runs JavaScriptCore, so Node built-ins/native modules and incompatible ESM-only packages are not supported merely because npm installed them.
- **WebSocket:** current Scripting changes URL/handshake headers, not message payloads.
- **Multipart/binary:** fetch current versioned docs before generating code and test the actual body type.

## Multi-Rule Interaction

The reviewed app core evaluates these families in priority order: Map Local, Map Remote, Scripting, then Breakpoint.

- Map Local wins over Map Remote when both match.
- Map Local/Map Remote may compose with Scripting or Breakpoint; Scripting can compose with Breakpoint.
- Where Scripting and Breakpoint are both retained, Scripting runs first so the breakpoint sees the scripted request/response.
- After Map Remote, subsequent Scripting/Breakpoint matching normally uses the mapped URL.
- When Map Local/Map Remote, Scripting, and Breakpoint all overlap, the reviewed selection branch may retain Scripting instead of Breakpoint. Do not promise a three-tool chain.
- Map Local and Scripting Mock Response can prevent an upstream request; Map Remote selects a different upstream.

This ordering can change with the app. Verify `summary.debuggingTools` order and observable behavior on a fresh flow before relying on a multi-rule chain.

## Update, Disable, Delete, And Roll Back

- Use `list_rules` and the exact ID. Update only documented patch fields, except for the Map Local literal-response field group described above.
- Use `toggle_rule` to preserve a rule while testing it off. Verify the individual state and global feature state separately.
- Record the original rule before update so rollback can restore its fields. Do not assume a second update with omitted fields restores defaults.
- Obtain immediate confirmation before `delete_rule`, pass the exact live `rule_type`, call it once, and verify absence.
- After cleanup, send another request to ensure the temporary behavior is gone and adjacent traffic is unaffected.

## Failure Triage

| Symptom | Check first |
|---|---|
| Rule exists but does not match | Fresh flow, global/rule state, method, URL, subpaths, wildcard/regex, GraphQL operation, normal proxy versus Atlantis. |
| Wrong rule affects the flow | Debugging Tools order, overlapping patterns, selection priority, and whether Map Remote changed the URL used by later matching. |
| Map Local returns defaults | Literal update field group, Content-Type/body, or stale captured-flow ID. |
| Map Remote returns TLS/host error | Destination scheme/port, Host preservation, connected IP, SNI/certificate, upstream availability. |
| Script validates but does nothing | Enabled phase, return path, runtime body type, Scripting console, Mock Response state, file/env/addon prerequisite. |
| Breakpoint rule created but task is unfinished | The user still needs to trigger traffic and interact with the paused GUI. |
