# proxyman-cli Rule Automation

Use `rules --help` and nested help before every exact command construction. The reviewed unified hierarchy covers:

- `block-list`
- `allow-list`
- `ssl-proxying`
- `map-local`
- `map-remote`
- `breakpoint`
- `scripting`
- `network-condition`
- `reverse-proxy`
- `protobuf`
- `dns-spoofing`

Each family can expose `list`, `get`, `create`, `update`, `delete`, `enable`, and `disable`; availability and required fields vary. Discover the leaf help instead of assuming uniform options.

## Safe CRUD Sequence

1. **List** the family and preserve exact IDs.
2. **Get** the selected ID before update/delete when supported.
3. Define URL/method/path/GraphQL/client scope deliberately.
4. **Create** or **update** with version-matched flags.
5. List/get again and verify stable ID, values, and enabled state.
6. Generate traffic and confirm behavior in Proxyman.
7. For **delete**, confirm the exact ID immediately before execution and verify absence.

Never infer an ID from list order or display name.

## Rule-Specific Checks

For Breakpoint, Map Local, Map Remote, and Scripting, distinguish rule configuration from runtime behavior. A successful JSON response proves the rule was stored; generate fresh traffic and inspect the completed flow before claiming the debugging task works.

### SSL Proxying

- Prefer the narrowest exact host or wildcard.
- Record include/exclude and enabled state first.
- Use the exact same pattern for rollback.
- Verify a new HTTPS flow is decrypted.

### Map Local

- Distinguish a file/directory-backed rule from a literal response or captured-flow response.
- In the reviewed unified CLI, Map Local exposes a host-local `path` and optional delay in addition to common URL/method/matching fields. Discover current help before deciding whether the installed build accepts the requested file or directory form.
- Validate every local path before execution.
- Paths resolve on the Proxyman computer. Confirm readability and avoid mapping secret-bearing repository or user files unintentionally.
- Preserve status/content type when changing response content.
- For a directory rule, test both an existing resolved file and an intentional miss; current GUI behavior falls through to the real server when the file is absent.
- Verify the response and matched-tool evidence on a new flow.

### Map Remote

- Record the original destination.
- Check scheme, host, port, path/query preservation, method scope, subpaths, and GraphQL operation.
- Treat `preserve-host` and `preserve-original-url` as different settings. The first changes the HTTP Host header; the second changes whether the original URL representation is retained while routing.
- By default, prefer the mapped Host header. Preserve the original Host only when the target upstream expects it.
- Explain that matching requests may reach a different system.
- For HTTP/HTTPS or WebSocket protocol changes, verify the actual connection, TLS/certificate behavior, and handshake rather than only the configured URL.
- Verify the configured rule, Summary Map URL, Host header, connected destination, and response.

### DNS Spoofing

- Record the original resolved destination and distinguish IP resolution changes from Map Remote URL/Host changes.
- Verify the rule and the captured connection destination.

### Breakpoint

- Confirm whether request, response, or both should pause.
- Avoid broad wildcards that can stop unrelated traffic.
- Ensure the GUI/session is available for interactive edits. CLI rule CRUD does not perform the paused edit or Execute/Cancel/Abort action.
- After creation, trigger a fresh request and wait for the user to complete the paused GUI interaction before reporting success.
- Raw-message editing and Breakpoint templates are GUI capabilities; do not invent CLI subcommands for them.

### Scripting

- Read the current scripting snippet contract.
- Use canonical positional handlers and required return values.
- Validate input script path/content handling from help.
- The reviewed unified CLI reads code from a script file for direct-field creation/update and can set request/response/both phase plus Mock Response. Build exact arguments from installed help.
- Match body code to Content-Type: JSON/form objects, text strings, and binary data are different runtime types. Treat `rawBody` as read-only diagnosis.
- A stored script is not a runtime pass. Send a fresh matching request and inspect the result and Proxyman Scripting console.
- Mock Response should be verified to avoid upstream contact. File paths, environment permission, addons, and npm installation are separate host/GUI prerequisites.
- Current async helper and package behavior differs by platform. Fetch current docs before using `$http`, Axios, multipart, WebSocket, environment, or npm functionality.
- Test on a narrow URL before broadening the match.

### Interaction Order

The reviewed app evaluates these families in priority order: Map Local, Map Remote, Scripting, then Breakpoint. Map Local wins over Map Remote; Scripting can run before Breakpoint; and an overlapping Map Local/Map Remote branch may retain Scripting instead of Breakpoint. Treat this as version-sensitive behavior and verify ordered Debugging Tools metadata on a fresh flow rather than promising that every overlapping rule runs.

### Allow/Block List

- Explain the difference between hiding traffic and blocking a network request.
- A broad Allow List can make unrelated flows disappear from view.
- Verify both feature state and an expected included/excluded request.

### Network Condition

- Record the existing active profile.
- Only one condition can be active at a time in the reviewed product behavior.
- Verify with rule state and measured flow timing.

### Reverse Proxy

- Check that the local listener port is unused.
- Distinguish local listener address from remote destination.
- Verify a request through the listener and keep rollback instructions.

### Protobuf

- Establish an up-to-date `.desc` schema and fully qualified request/response message types before constructing the rule.
- Distinguish Auto, Single Message, and Delimited Message payload modes using current docs/help.
- Discover the reviewed `request-type`, optional `response-type`, payload, URL, and common matching inputs from current nested help; do not assume names across versions.
- Validate local descriptor/schema files and treat internal schemas as sensitive.
- Verify decoded request/response content on a fresh flow in Proxyman, not only CLI rule state.

## Legacy Versus Unified Commands

Some builds retain top-level families such as `breakpoint`, `maplocal`, `map-remote`, and `scripting` alongside `rules`. Prefer the hierarchy whose installed help supports the user's complete operation. Do not mix flags between legacy and unified commands.
