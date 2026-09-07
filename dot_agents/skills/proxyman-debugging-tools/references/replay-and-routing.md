# Replay And Routing Workflows

Use this reference for Compose, Repeat, Network Conditions, and Reverse Proxy. Fetch each linked official page first; use live MCP schemas and installed CLI help for exact inputs.

## Compose And Repeat

These features all send requests, but they are not interchangeable:

- **Repeat** immediately resends one or more selected captured HTTP/HTTPS requests with the same request data. It is useful for checking a new server response without returning to the originating client.
- **Edit & Repeat** starts from a captured request, lets the user change it, and then sends it.
- **Compose** builds a request independently of a captured flow. The GUI supports richer editors, templates, cURL import, and history according to the current [Compose documentation](https://docs.proxyman.com/advanced-features/compose).

The exact GUI Repeat action is documented at [Repeat](https://docs.proxyman.com/advanced-features/repeat). It is HTTP/HTTPS-oriented; do not promise WebSocket replay.

### GUI

- Repeat: select the intended flow or flows and use the Flow/context-menu Repeat action. Inspect method, host, body, and credentials before resending a state-changing or production request.
- Edit & Repeat: open the selected flow with Edit & Repeat, change only the intended fields, send, and compare the new response.
- Compose: open Tools > Compose, enter URL/method/headers/query/body or use a supported template/import, then send and inspect the resulting flow/history.

Matching Breakpoint, Map Local, and Scripting rules can affect a repeated request. Include that fact when a repeated result differs from the original.

### MCP

The reviewed MCP exposes HTTP Compose, not a separate one-click Repeat tool:

1. Use `create_compose_http_from_flow` for the closest Edit & Repeat workflow, or `create_compose_http` for a blank request.
2. Read the returned draft with `get_compose_http`.
3. Update only documented method, URL, header-object, and UTF-8 `body_text` fields.
4. Send with `send_compose_http` and inspect the returned captured flow.
5. Delete an unused draft only after confirmation.

Compose IDs are in-memory. The reviewed MCP does not provide GUI parity for raw-message editing, multipart templates, cURL import, history, or WebSocket URLs. Do not call MCP Compose “Repeat” when exact Repeat semantics matter.

### Verification

Compare the original and new flow IDs, request method/URL/body, matched tools, response status/body, and timing. A successful send is not proof that the server behavior matched the user's expectation.

## Network Conditions

Network Conditions simulate adverse networks for a URL scope or, when supported, system-wide. Current preset profiles can model bandwidth, delay, and packet loss; exact profile names come from the live UI/schema, not from a remembered list. The public guide is [Network Conditions](https://docs.proxyman.com/advanced-features/network-throttling).

Use the normal proxy path. Atlantis traffic is inspection-only and is not modified by Network Conditions.

### GUI

1. Open Tools > Network Conditions or the selected flow's context action.
2. Choose the narrowest intended URL/domain scope, or explicitly choose system-wide behavior.
3. Select a preset profile and enable the rule.
4. Generate several comparable requests; preset bandwidth can vary within a range.
5. Disable the rule after the test unless the user wants it to persist.

Do not invent custom bandwidth/loss values when the installed build exposes presets only.

### MCP

1. Call `list_network_conditions` and record feature state, existing IDs, scopes, profiles, and the active condition.
2. Use the current `create_network_condition` schema for a new URL/profile and optional system-wide scope, or `update_network_condition` with an exact returned ID.
3. Only one condition can be active in the reviewed behavior; activating one can displace the previous active condition.
4. Verify by listing again and measuring fresh flow timing/behavior.
5. Restore the previous active condition or disable/delete the test rule according to the requested cleanup. Confirm immediately before deletion.

For CLI automation, discover `rules network-condition` or the installed legacy family through nested help before constructing flags.

## Reverse Proxy

Reverse Proxy opens a local Proxyman listener and forwards traffic to a remote host so Proxyman can capture clients that cannot use an HTTP proxy. It is useful for localhost-oriented or proxy-unaware clients. Read the current [Reverse Proxy documentation](https://docs.proxyman.com/advanced-features/reverse-proxy).

### Plan The Mapping

Establish:

- remote host and port;
- unused local listener port, or permission for Proxyman to choose one;
- whether the upstream is HTTP or HTTPS according to the installed behavior;
- whether the original Host header must be preserved;
- which client URL will be changed to the local listener.

In the reviewed behavior, remote port 443 triggers an upstream TLS handshake while other ports are treated as HTTP. Verify current docs/schema before relying on that inference. Preserve Host only when the upstream expects it; a mismatched Host can be rejected.

### GUI Or MCP

1. Read/list existing mappings and avoid a listener collision.
2. Create the local-port-to-remote-host mapping. MCP uses `list_reverse_proxies`, `create_reverse_proxy`, and `update_reverse_proxy`; use generic live rule toggle/delete operations only when the connected schema exposes Reverse Proxy for them.
3. Point the client at `http://localhost:<local-port>` or the actual reachable listener address required by that client.
4. Generate a known request and inspect the captured flow.
5. Verify remote destination, TLS behavior, Host header, response, and matched Breakpoint/Map Local/Scripting rules.
6. Disable/delete the temporary entry and restore the client's original URL when cleanup was requested.

For CLI automation, discover `rules reverse-proxy` or the installed legacy `reverse-proxy` help. Record the prior mapping before update and never infer an ID from a display name.
