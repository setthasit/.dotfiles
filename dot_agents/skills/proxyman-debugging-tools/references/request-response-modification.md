# Breakpoint, Map Local, Map Remote, And Scripting

This reference covers Proxyman's four main request/response modification tools. Re-fetch the current official pages before giving version-sensitive GUI steps:

- [Breakpoint](https://docs.proxyman.com/advanced-features/breakpoint)
- [HTTP Message Templates](https://docs.proxyman.com/advanced-features/breakpoint-templates)
- [Map Local file](https://docs.proxyman.com/advanced-features/map-local)
- [Map Local directory](https://docs.proxyman.com/advanced-features/map-local-directory)
- [Map Remote](https://docs.proxyman.com/advanced-features/map-remote)
- [Scripting](https://docs.proxyman.com/scripting/script)
- [Scripting snippets](https://docs.proxyman.com/scripting/snippet-code)

## Choose The Smallest Tool

| Goal | Prefer | Reason |
|---|---|---|
| Pause one request or response and edit it manually | Breakpoint | The user decides what to send while the flow is paused. |
| Return a fixed response, captured response, file, or directory tree | Map Local | The matched request can be answered locally without waiting for the upstream. |
| Send the original request to another server | Map Remote | The method/body can stay intact while selected URL components change. |
| Apply repeatable conditional logic, transform structured data, keep state, or synthesize a response | Scripting | JavaScript can express behavior that is awkward as one GUI rule. |

Do not reach for Scripting merely because it can imitate the other tools. Prefer the declarative tool when it completely describes the behavior; it is easier to inspect, disable, and explain.

## Shared Prerequisites And Matching

1. Confirm Proxyman captures the target traffic. For HTTPS body/header changes, confirm the target host is decrypted through SSL Proxying.
2. Use the normal proxy path. Atlantis traffic is inspection-oriented and these debugging tools do not modify it.
3. Start from a representative captured flow when possible so the URL, method, response type, and GraphQL operation are known.
4. Scope the rule by URL, method, subpaths, wildcard/regex mode, and optional GraphQL operation. Use the narrowest rule that exercises the intended case.
5. Confirm both the individual rule and its global feature are enabled. A newly created rule is not proof that the feature is active.
6. Generate a fresh request. Rules are not retroactive to an already completed flow.
7. In the new flow, inspect **Summary > Debugging Tools** and the final request/response. Do not infer a match from the rule list alone.

Default subpath behavior differs across rule types and interfaces. Read the live MCP schema or installed CLI help and set it explicitly whenever matching scope matters.

## Breakpoint

Use Breakpoint for an interactive, one-off decision. It can pause the request, response, or both and lets the user change URL components, method, query/form values, authorization/cookie headers, general headers, body, or response status before continuing.

### GUI Workflow

1. Select a captured request and choose **Tools > Breakpoint** from its context menu.
2. Review the prefilled matching rule and choose request, response, or both.
3. Narrow the method, subpath behavior, wildcard/regex pattern, or GraphQL operation if needed.
4. Add and enable the rule, then resend the request.
5. In the breakpoint window, edit the structured fields or use the Raw tab where supported.
6. Choose the correct action:
   - **Execute** sends the edited request/response.
   - **Cancel** discards the breakpoint edit and continues the request/response.
   - **Abort** closes the operation and returns a 503 response.
7. Inspect the completed flow and its Debugging Tools summary.

Current official documentation exposes Raw HTTP Message editing on macOS 6.12.0 or later. Breakpoint templates are GUI-managed reusable request method/URL/header or response status/header presets; do not imply MCP/CLI template parity.

### Interface Boundary

The reviewed MCP and CLI can create, update, list, enable/disable, and delete Breakpoint rules. They do not expose the live paused-message editor or Execute/Cancel/Abort actions. Keep Proxyman visible and tell the user that the actual paused edit is interactive in the GUI.

### Troubleshooting

- No pause: verify a fresh request, global Breakpoint state, individual rule state, method, URL/subpaths, regex/wildcard syntax, GraphQL operation, and normal-proxy rather than Atlantis capture.
- Too many pauses: narrow the host/path/method before continuing; a broad breakpoint can stall unrelated traffic.
- Wrong edit surface: request URL/method/query changes belong to the request breakpoint; status changes belong to the response breakpoint.
- Repeated pause after testing: disable the rule or the global feature instead of deleting it unless removal was requested.

## Map Local

Use Map Local when the expected result is a local response rather than a request to another upstream.

### Choose The Response Source

- **Captured response:** fastest way to reproduce a real response with its headers and body type.
- **Literal HTTP response:** explicit status, headers/content type, and body for an edge case.
- **Local file:** text, JSON, binary, and image files are supported by the GUI.
- **Directory:** maps subpaths into a selected directory. If the resolved file does not exist, Proxyman falls back to the real server.
- **`<FILE_URL>` body:** keeps status and headers in the HTTP message while loading the body from a file. Set the correct Content-Type.

### GUI Workflow

1. Start from a flow that already has a response and choose **Tools > Map Local**.
2. Decide whether to keep the generated HTTP response, select a local file, or configure directory mapping.
3. Review status, headers, Content-Type, body/file, method, matching mode, subpaths, and GraphQL scope.
4. Add and enable the rule, then resend the request.
5. Verify the returned status, headers, body type/content, and Debugging Tools summary.

For directory rules, test one file that exists and one that does not. Confirm the existing file resolves under the intended directory and the missing file deliberately falls through to the real server. Regex directory rules need a capture group that identifies the relative path.

### Interface Boundary

The reviewed MCP creates either a literal response or a rule seeded from an in-memory captured flow. It does not select arbitrary local files or directories. The reviewed unified CLI can accept a Map Local path; discover current nested help and validate whether that build accepts a file or directory for the requested rule.

Local paths resolve on the computer running Proxyman, not on a remote MCP client. Confirm the file exists, is readable, and is approved before using it. Do not expose private repository files or secret-bearing fixtures accidentally.

### Troubleshooting

- Wrong/default body after update: send body, status, and Content-Type together when the interface rebuilds a literal response.
- Wrong client decoding: verify Content-Type matches JSON, text, image, or binary content.
- Directory unexpectedly reaches upstream: inspect the resolved relative path, wildcard/regex capture, filename case, and file existence.
- Rule listed but response unchanged: verify global Map Local state, individual state, method/subpaths, and a fresh flow.

## Map Remote

Use Map Remote when the request should reach another server. It can change protocol, host, port, path, or query; an empty destination component in the GUI preserves that component from the original request.

### GUI Workflow

1. Select a representative request and choose **Tools > Map Remote**.
2. Review the source URL, method, matching mode, subpath behavior, and optional GraphQL operation.
3. Set only the destination components that should change. Leave a GUI component empty when the current docs say it should remain unchanged.
4. Decide Host-header behavior deliberately. By default Proxyman changes Host to the mapped host. Preserve the original Host only when the upstream expects it.
5. Add and enable the rule, then send a fresh request.
6. Inspect **Summary > Debugging Tools > Map URL**, the final destination, Host header, connection/TLS information, and response.

Map Remote supports HTTP to HTTPS, HTTPS to HTTP, and current documented WebSocket mappings. A protocol change can also change the default port and TLS expectations, so verify the actual connection rather than only the displayed URL.

### Interface Boundary

The reviewed MCP accepts complete `from_url` and `to_url` values plus method, subpaths, Host preservation, and optional GraphQL operation. It does not expose the reviewed CLI's separate `preserve_original_url` setting. Do not confuse:

- **Preserve Host:** keep the original HTTP Host header while routing to another server.
- **Preserve original URL:** retain the original displayed/request URL behavior while the routing destination changes.

If the requested behavior cannot be represented by the live MCP schema, route to the GUI or version-matched CLI help instead of approximating it.

### Troubleshooting

- Upstream rejects the request: compare mapped protocol/host/port, TLS, SNI/certificate behavior, and Host header.
- Only the exact path maps: review Include subpaths and source matching.
- Path/query unexpectedly changes: check which destination components were supplied rather than assuming blank and omitted fields behave identically across interfaces.
- Rule appears inactive: inspect the Map URL in the flow Summary, global/rule state, and the actual connected server IP.

## Scripting

Use Scripting for repeatable logic: conditional request/response changes, structured body transformations, mock responses, local-file selection, shared state, async lookup, or behavior that spans several endpoints.

### GUI And Code Workflow

1. Open **Script > Script List** or create a script from a captured flow's **Tools > Scripting** action.
2. Set a narrow URL/method/subpath/regex/GraphQL match and enable only the request/response phases needed.
3. Start from the current official snippet for the requested operation.
4. Use the canonical positional handlers and return the mutated object:

   ```javascript
   async function onRequest(context, url, request) {
     return request;
   }

   async function onResponse(context, url, request, response) {
     return response;
   }
   ```

5. Save/enable the rule, send a fresh request, inspect the final flow, and check the Scripting console for runtime errors or intentional logs.

### Body And Runtime Rules

| Content-Type family | Script body type |
|---|---|
| JSON or URL-encoded form | JavaScript object |
| Text-based | String |
| Other binary content | `Uint8Array` in current builds |

`rawBody` is for reading incorrectly typed content and is not written back. When changing a body representation, keep Content-Type and body type consistent. Use `bodyFilePath` for an approved local file and remember that the path is local to the Proxyman host.

Use Mock Response mode when the script should synthesize the response without contacting the upstream. Verify this independently from a normal response script; a successful rule creation does not prove that the upstream was bypassed.

### Advanced Boundaries

- Async HTTP: current docs use `$http` on macOS and built-in Axios on Windows/Linux, with a documented ten-second timeout. The inline request does not pass through Proxyman and is not affected by other debugging tools.
- WebSocket: current Scripting can change the WebSocket URL and handshake headers, but not WebSocket message payloads.
- Multipart: current docs expose multipart mutation on supported macOS versions; read the versioned snippet before generating code.
- Shared state persists across scripts in current builds until Proxyman quits or `clearSharedState()` is called. Avoid unbounded or secret-bearing state.
- Environment variables require the user to allow script access in Proxyman. Never log secret environment values or include them in agent-visible output.
- Built-in addons and libraries use Proxyman's documented import paths. Compatible npm packages must be CommonJS/pure JavaScript; Node built-ins, native `.node` modules, and ESM-only packages are not equivalent to a Node runtime.
- File read/write, npm installation, environment permission, and custom addon setup are host filesystem or GUI changes. Obtain authorization and verify paths; creating an MCP rule alone does not perform those prerequisites.

### Interface Boundary

The reviewed MCP can create/update a script and Mock Response setting and validates syntax, handler arguments/order, and final returns. It cannot prove runtime semantics, grant file/environment access, install npm packages, or inspect every GUI console error. Always exercise the rule on a fresh matching flow.

### Troubleshooting

- Wrong object changes: reject one-argument handlers; `context` is the first positional argument.
- Script validates but has no effect: check enabled phases, global/rule state, match scope, runtime console, and required return value.
- Body mutation fails: compare Content-Type, parsed body type, and `rawBody` before changing parsing logic.
- Async request is invisible in captured traffic: this is expected for the documented inline request path.
- Package import fails: verify installation in Proxyman's Application Support `node_modules` and reject Node-native dependencies.
- Mock rule still reaches upstream: confirm Mock Response is enabled and that one narrow matching script owns the mock behavior.

## Interaction And Ordering

The reviewed core evaluates these rule families in this priority: **Map Local, Map Remote, Scripting, Breakpoint**. This priority is selection and composition behavior, not a reason to create overlapping rules casually.

- Map Local takes precedence over Map Remote for the same request.
- A Map Local or Map Remote match can be combined with Scripting or Breakpoint in the reviewed behavior.
- Scripting can be followed by Breakpoint; when both are retained, the breakpoint sees the scripted request/response.
- After Map Remote, subsequent Scripting or Breakpoint matching normally uses the mapped URL unless the rule preserves the original URL behavior.
- If Map Local/Map Remote, Scripting, and Breakpoint all overlap, do not assume every matching rule runs. The reviewed selection path may retain Scripting instead of Breakpoint for that branch.
- Map Local and Scripting Mock Response can bypass the upstream. Map Remote still connects to an upstream, but a different one.

This ordering is version-sensitive implementation behavior. After an app update, verify it with a fresh flow's ordered Debugging Tools summary and the observed request/response before relying on a multi-rule chain.

## Verification And Cleanup

For every rule change, record the rule ID/state first, exercise one positive and one negative URL where practical, and inspect a fresh flow. Verify:

- expected rule names in Debugging Tools and their order;
- final URL, method, Host, connection destination, and TLS behavior;
- final status, headers, body type/content, and whether the upstream was contacted;
- absence of unexpected matches on adjacent traffic.

Prefer disabling a temporary rule for reversible testing. Delete only when the user requested removal and confirms the exact ID immediately before deletion.
