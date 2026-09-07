# Proxyman MCP Tool Catalog

This snapshot covers the 70 tools implemented by the reviewed Proxyman MCP server. It is a routing guide, not a schema contract. Always use the connected server's `tools/list` for current availability, inputs, annotations, and enums.

Legend (behavioral routing; the connected server's live annotations remain authoritative):

- **R**: advertised read-only by the reviewed MCP annotations.
- **N**: behaviorally non-mutating, but not advertised read-only by the reviewed annotations.
- **W**: changes Proxyman or sends/exports traffic.
- **D**: destructive according to MCP annotations; obtain immediate confirmation.
- **P**: platform-sensitive; verify live availability and applicability.

## Connection, Status, And Traffic

| Tool | Kind | Use |
|---|---:|---|
| `get_version` | R | Verify bridge-to-app connectivity and get app/build version. |
| `get_proxyman_cli_help` | R | Read safe, version-matched CLI help for a command hierarchy; never executes it. |
| `get_proxy_status` | R | Read recording, proxy port, and SSL Proxying state. |
| `get_flows` | R | List recent flows with basic host/method/status filters and client identity. |
| `filter_flows` | N | Search flows by richer request/response criteria, including client. |
| `get_flow_detail` | R | Read exact flow metadata, headers, query, cookies, and body previews. |
| `export_flow_curl` | N | Produce a cURL representation of one confirmed flow. |
| `export_flows` | W | Write selected original flows as HAR or ProxymanLogv2 to an approved path. |
| `generate_code` | N | Generate a request in a supported language/client format from one flow. |
| `toggle_recording` | W | Set recording state; verify with `get_proxy_status`. |
| `clear_session` | D | Remove current captured session flows. |

## Rule Inventory And Global Tool State

| Tool | Kind | Use |
|---|---:|---|
| `list_rules` | R | Get IDs and details for standard rule families. |
| `list_tool_status` | R | Read global enabled state for debugging tools. |
| `toggle_tool` | W | Set a global tool state such as Breakpoint, Map Local, or Scripting. |
| `toggle_no_caching` | W | Set No Caching directly. |
| `delete_rule` | D | Delete a rule using its exact ID and rule type. |
| `toggle_rule` | W | Enable/disable one rule without deleting it. |

## Breakpoint, Map Local, Map Remote, And Block List

For full matching defaults, interface boundaries, multi-rule behavior, verification, and failure triage for Breakpoint, Map Local, Map Remote, and Scripting, read [request and response rules](request-response-rules.md).

| Tool | Kind | Use |
|---|---:|---|
| `create_breakpoint` | W | Create a request/response breakpoint for a URL/method pattern. |
| `update_breakpoint` | W | Patch an existing breakpoint by ID. |
| `create_map_local` | W | Create a Map Local rule from literal response content. |
| `create_map_local_from_flow` | W | Seed Map Local from a captured response. |
| `update_map_local` | W | Update URL/matching or rebuild a literal response. |
| `create_map_remote` | W | Redirect matching requests to another remote destination. |
| `update_map_remote` | W | Patch an existing Map Remote rule. |
| `create_blacklist` | W | Create a Block List rule to block or hide matches. |
| `update_blacklist` | W | Patch an existing Block List rule. |

## Scripting, Allow List, Network Condition, And DNS

| Tool | Kind | Use |
|---|---:|---|
| `create_scripting_rule` | W | Create validated Proxyman JavaScript for request/response handling. |
| `update_scripting_rule` | W | Patch a scripting rule after reading the snippet contract. |
| `create_allow_list` | W | Create an Allow List visibility rule and enable the feature. |
| `update_allow_list` | W | Patch an Allow List rule. |
| `create_network_condition` | W | Create a throttling profile/rule; only one can be active. |
| `list_network_conditions` | R | Read network-condition IDs and active state. |
| `update_network_condition` | W | Patch a condition and/or its active state. |
| `create_dns_spoofing` | W | Create a DNS override and enable the feature. |
| `list_dns_spoofing` | R | Read DNS Spoofing rules and IDs. |
| `update_dns_spoofing` | W | Patch a DNS Spoofing rule. |

## Reverse And External Proxy

| Tool | Kind | Use |
|---|---:|---|
| `list_reverse_proxies` | R | Read Reverse Proxy entries; they are not returned by `list_rules`. |
| `create_reverse_proxy` | W | Create and enable a local-listener-to-remote mapping. |
| `update_reverse_proxy` | W | Patch a Reverse Proxy entry. |
| `get_external_proxy` | R | Read HTTP, HTTPS, SOCKS, PAC, auth, and global upstream state. |
| `set_external_proxy` | W | Set a complete upstream-proxy setting for one kind. |

## SSL, Certificates, And System Proxy

| Tool | Kind | Use |
|---|---:|---|
| `get_ssl_proxying_list` | R | Read global state plus include/exclude host patterns. |
| `enable_ssl_proxying` | W | Add/enable decryption for a host or wildcard pattern. |
| `disable_ssl_proxying` | W | Disable/remove decryption scope according to live schema. |
| `toggle_ssl_proxying_domain` | W | Set one existing include/exclude domain's enabled state. |
| `get_certificate_status` | R | Inspect root-certificate existence/trust and usable paths. |
| `install_certificate` | W/P | Install/trust Proxyman's certificate using a supported mode. |
| `uninstall_certificate` | D/P | Remove Proxyman certificate/trust. |
| `get_system_proxy_status` | R/P | Read macOS system proxy override state. |
| `set_system_proxy` | W/P | Set macOS system proxy state; may require the Helper Tool. |

## Compose And WebSocket

| Tool | Kind | Use |
|---|---:|---|
| `create_compose_http` | W | Create an in-memory blank HTTP Compose draft. |
| `create_compose_http_from_flow` | W | Seed a Compose draft from a captured flow. |
| `get_compose_http` | R | Read a draft by Compose ID. |
| `update_compose_http` | W | Patch method, URL, headers, and UTF-8 body. |
| `send_compose_http` | W | Send the draft and return the resulting captured flow. |
| `delete_compose_http` | D | Delete an in-memory Compose draft. |
| `list_websocket_sessions` | R | List captured WebSocket flows and active Compose session state. |
| `get_websocket_messages` | R | Read direction-filtered frames with optional payload previews. |
| `close_websocket_session` | D | Close an active Compose-created WebSocket session. |

## Setup Knowledge And Guided Automation

| Tool | Kind | Use |
|---|---:|---|
| `answer_setup_question` | R | Get target-aware setup diagnosis, steps, citations, and next actions. |
| `search_docs` | R | Search the built-in setup/troubleshooting index, not the full website. |
| `list_setup_workflows` | R | Discover supported setup recipes and automation IDs. |
| `list_popular_workflows` | R | Read curated setup workflow rankings. |
| `open_proxyman_screen` | W | Open the relevant in-app guide or feature screen. |
| `run_guided_setup` | W/P | Run a supported browser or Android-emulator setup/revert automation. |

## Runtime Injection And App Control

| Tool | Kind | Use |
|---|---:|---|
| `get_terminal_manual_command` | R/P | Get a manual proxy-injected terminal command without launching it. |
| `inject_terminal` | W/P | Launch a supported terminal with Proxyman proxy/certificate environment. |
| `inject_electron` | W/P | Launch a selected Electron `.app` with capture injection. |
| `open_proxyman` | W/P | Launch regular or Setapp Proxyman. |
| `quit_proxyman` | D/P | Quit the running Proxyman app. |

## Pair Every Mutation With A Verification

| Mutation family | Verification |
|---|---|
| capture/recording/system proxy/SSL | `get_proxy_status`, `get_system_proxy_status`, `get_ssl_proxying_list` |
| certificates | `get_certificate_status` plus a known HTTPS flow |
| standard rules | `list_rules` and `list_tool_status` |
| Reverse Proxy | `list_reverse_proxies` plus traffic through its listener |
| Network Condition | `list_network_conditions` plus flow timing |
| DNS Spoofing | `list_dns_spoofing` plus resolved/captured destination evidence |
| external proxy | `get_external_proxy` plus an outbound flow |
| Compose | `get_compose_http` before send; returned flow after send |
| WebSocket | `list_websocket_sessions`/`get_websocket_messages` |
| export | existence, format, path, and size of written file |

## Important Reviewed Enum Snapshots

Use these to choose a workflow, then confirm exact values in the live input schema:

- `filter_flows` keys: `url`, `host`, `method`, `statusCode`, `requestHeader`, `responseHeader`, `requestBody`, `responseBody`, `client`.
- Filter matches: `contains`, `notContains`, `startWith`, `endWith`, `equal`, `notEqual`, `regex`, `wildcard`; multi-filter combination is `and` or `or`.
- `export_flows` formats: `har`, `proxymanlogv2`. It accepts optional `flow_ids`; omitting them exports all current flows.
- `generate_code` targets: `curl`, `python`, `swift_urlsession`, `swift_alamofire`, `swift_moya`, `go`, `node_fetch`, `node_http`, `axios`, `javascript_jquery`, `kotlin_okhttp`, `java_httpclient`, `dart`, `php_guzzle`, `rust_reqwest`, `objective_c`, `httpie`, `har`, `postman`.
- Global `toggle_tool` names: `breakpoint`, `map_local`, `map_remote`, `blacklist`, `scripting`, `dns_spoofing`, `network_throttling`, `whitelist`, `reverse_proxy`, `no_caching`, `external_proxy`.
- `list_rules` families: `all`, `breakpoint`, `maplocal`, `mapremote`, `blacklist`, `scripting`, `whitelist`, `network_condition`, `dns_spoofing`. Reverse Proxy uses its own list tool.
- WebSocket message direction: `all`, `client`, `server`.
- Certificate installation mode: `automatic` or `manual` in the reviewed macOS schema.
- Terminal target: `apple_terminal`, `iterm2`, `ghostty`.
- External proxy kind: `http`, `https`, `socks`, `pac`.
- `open_proxyman_screen`: `automatic_setup`, `manual_setup`, `ios_device_guide`, `ios_simulator_guide`, `android_device_guide`, `android_emulator_guide`, `certificate_dashboard`, `ssl_proxying`, `reverse_proxy`, `atlantis`, `proxy_settings`.
- `run_guided_setup`: `chrome_current_profile`, `chrome_new_profile`, `firefox`, `android_emulator_override`, `android_emulator_revert`.

Rule method schemas accept the established HTTP methods and uppercase `QUERY` where documented. HTTP Compose uses header objects shaped as `[{"key":"...","value":"..."}]` and UTF-8 `body_text`; inspect its live schema before constructing a call.

## Reviewed MCP Annotations

The reviewed server advertises these exact annotation sets. Refresh `tools/list` after an update rather than assuming the snapshot is still current.

Read-only (22):

- `get_version`, `get_proxyman_cli_help`, `get_proxy_status`, `get_flows`, `get_flow_detail`
- `list_websocket_sessions`, `get_websocket_messages`, `list_rules`, `get_ssl_proxying_list`, `get_system_proxy_status`
- `get_compose_http`, `get_certificate_status`, `get_terminal_manual_command`
- `answer_setup_question`, `search_docs`, `list_setup_workflows`, `list_popular_workflows`
- `list_reverse_proxies`, `list_network_conditions`, `list_dns_spoofing`, `get_external_proxy`, `list_tool_status`

Destructive (6):

- `clear_session`, `close_websocket_session`, `delete_compose_http`, `delete_rule`, `uninstall_certificate`, `quit_proxyman`

Idempotent (12):

- `install_certificate`, `set_external_proxy`, `toggle_rule`, `toggle_tool`, `toggle_no_caching`, `toggle_recording`
- `enable_ssl_proxying`, `disable_ssl_proxying`, `toggle_ssl_proxying_domain`, `set_system_proxy`, `open_proxyman_screen`, `open_proxyman`

All reviewed tools set `openWorldHint` to false. `filter_flows`, `export_flow_curl`, and `generate_code` are operationally non-mutating but are not in the server's reviewed read-only annotation set; follow the live annotation rather than silently relabeling them.
