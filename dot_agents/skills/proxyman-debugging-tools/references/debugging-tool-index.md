# Proxyman Debugging Tool Index

Snapshot reviewed against `https://docs.proxyman.com/llms.txt` on 2026-08-21. Fetch that index and the linked `.md` page again before claiming current behavior.

Interface cells are routing hints:

- **MCP** lists known operations; confirm them with `tools/list`.
- **CLI** names a likely command family; confirm it with version-matched help.
- **GUI only** means no matching MCP/CLI action was found in the reviewed surfaces, not that future builds cannot add one.

## Proxyman For iOS App

The standalone Proxyman for iOS app is a separate product surface. The reviewed desktop Proxyman MCP does not remotely control its Map Local or Breakpoint UI, so use the current iOS documentation and do not imply desktop MCP parity.

| Feature | Official page | Automation boundary |
|---|---|---|
| On-device VPN/certificate capture | [Proxyman for iOS](https://docs.proxyman.com/proxyman-ios/vpn-and-proxyman-certificate) | iOS app GUI; no reviewed desktop MCP action |
| Map Local for iOS | [Map Local for iOS](https://docs.proxyman.com/proxyman-ios/map-local-for-ios) | iOS app GUI |
| Breakpoint for iOS | [Breakpoint for iOS](https://docs.proxyman.com/proxyman-ios/breakpoint-for-ios) | iOS app GUI |
| iOS app tutorial | [Tutorial for iOS](https://docs.proxyman.com/proxyman-ios/tutorial-for-ios) | iOS app GUI |
| Map Local tutorial | [Map Local tutorial](https://docs.proxyman.com/proxyman-ios/tutorial-for-ios/map-local-for-ios-tutorial) | iOS app GUI |
| Breakpoint tutorial | [Breakpoint tutorial](https://docs.proxyman.com/proxyman-ios/tutorial-for-ios/breakpoint-for-ios-tutorial) | iOS app GUI |

## Capture, Inspect, Filter, And Export

| Feature | Official page | MCP | CLI |
|---|---|---|---|
| Proxy Helper/System Proxy | [Proxy Setting Tool](https://docs.proxyman.com/basic-features/proxy-setting-tool) | `get_system_proxy_status`, `set_system_proxy` | `proxy`, `proxy-host` |
| Request/Response viewer and Summary | [Request / Response Previewer](https://docs.proxyman.com/basic-features/request-response-viewer) | `get_flows`, `filter_flows`, `get_flow_detail` | `export-log` for files |
| SSL decryption scope | [SSL Proxying](https://docs.proxyman.com/basic-features/ssl-proxying) | SSL list/enable/disable/toggle tools | `rules ssl-proxying` |
| Bypass proxy list | [Bypass Proxy List](https://docs.proxyman.com/basic-features/bypass-proxy-list) | GUI only in reviewed MCP | verify installed help |
| Import/export traffic | [Import / Export](https://docs.proxyman.com/basic-features/import-export) | `export_flows` | `export-log`; GUI for broader imports |
| Content filtering | [Content Filter](https://docs.proxyman.com/basic-features/content-filter) | `filter_flows` | export filters vary by help |
| Multiple/custom filters | [Multiple Filters](https://docs.proxyman.com/advanced-features/multiple-filters), [Custom Filters](https://docs.proxyman.com/advanced-features/custom-filters) | use `filter_flows`; saved-filter UI is GUI only | verify installed help |
| Copy as | [Copy as](https://docs.proxyman.com/basic-features/copy-as) | `export_flow_curl`, `generate_code` | export-log, depending on goal |
| Code Generator | [Code Generator](https://docs.proxyman.com/advanced-features/code-generator) | `generate_code` | GUI only in reviewed CLI |
| Save session | [Save Session](https://docs.proxyman.com/advanced-features/save-session) | `export_flows` | `export-log` |
| Clear session | [Clear Session](https://docs.proxyman.com/advanced-features/clear-session) | `clear_session` | `clear-session` |
| Charles log conversion | [Charles Proxy Converter](https://docs.proxyman.com/advanced-features/charles-proxy-converter) | GUI only in reviewed MCP | GUI only |
| Diff | [Diff](https://docs.proxyman.com/advanced-features/diff) | inspect two details manually; GUI comparison is GUI only | GUI only |
| Swagger/OpenAPI export | [Swagger OpenAPI](https://docs.proxyman.com/advanced-features/swagger-openapi) | GUI only in reviewed MCP | verify installed help |
| Publish to Gist/share | [Publish to Gist](https://docs.proxyman.com/advanced-features/publish-to-gist), [Share Log online](https://docs.proxyman.com/team-workspace/share-log-online) | no reviewed publishing action | GUI only |

### Workspace, Analysis, And Presentation Tools

These are GUI-oriented in the reviewed MCP/CLI surfaces. Fetch the current page and give GUI steps without inventing automation parity.

| Feature | Official page |
|---|---|
| Multiple Tabs | [Multiple Tabs](https://docs.proxyman.com/basic-features/multiple-tabs) |
| Horizontal/Vertical/Window layout | [Workspace Layout](https://docs.proxyman.com/basic-features/horizontal-vertical-layout) |
| Custom Previewer Tab | [Custom Previewer](https://docs.proxyman.com/basic-features/custom-previewer-tab) |
| Custom Header Column | [Custom Header Column](https://docs.proxyman.com/basic-features/custom-header-column) |
| Regular expressions | [Regex](https://docs.proxyman.com/basic-features/regex) |
| Filter JSON Response | [Filter JSON Response](https://docs.proxyman.com/basic-features/filter-json-response) |
| Highlight and comments | [Highlight and Comment](https://docs.proxyman.com/basic-features/highlight-by-color-and-add-comment) |
| Settings import/export | [Import / Export Settings](https://docs.proxyman.com/basic-features/import-export-settings) |
| Multipart Form-Data | [Multipart Previewer](https://docs.proxyman.com/basic-features/multipart-form-data-previewer) |
| JSONPath | [JSONPath](https://docs.proxyman.com/basic-features/jsonpaths) |
| JQ | [JQ](https://docs.proxyman.com/basic-features/jq) |
| Customize Toolbar | [Customize Toolbar](https://docs.proxyman.com/basic-features/customize-toolbar) |
| Localization | [Localization](https://docs.proxyman.com/basic-features/localization) |
| Quick Preview | [Quick Preview](https://docs.proxyman.com/basic-features/quick-preview) |
| Command Palette | [Command Palette](https://docs.proxyman.com/basic-features/command-palette) |

## Replay And Request Construction

| Feature | Official page | MCP | CLI |
|---|---|---|---|
| Repeat | [Repeat](https://docs.proxyman.com/advanced-features/repeat) | seed/send with HTTP Compose only when equivalent behavior is acceptable; read [replay workflow](replay-and-routing.md#compose-and-repeat) | verify installed help |
| Edit & Repeat | [Edit & Repeat](https://docs.proxyman.com/advanced-features/edit-and-repeat) | `create_compose_http_from_flow`, update, send; read [replay workflow](replay-and-routing.md#compose-and-repeat) | verify installed help |
| Compose | [Compose new Request](https://docs.proxyman.com/advanced-features/compose) | all HTTP Compose tools; read [replay workflow](replay-and-routing.md#compose-and-repeat) | GUI only in reviewed CLI |
| WebSocket | [WebSocket](https://docs.proxyman.com/advanced-features/websocket) | list/read/close supported sessions | GUI only in reviewed CLI |

Do not claim Repeat and Compose are identical. Use the GUI page when exact interaction, history, or WebSocket compose behavior matters.

## Request/Response Modification Rules

For choosing among Breakpoint, Map Local, Map Remote, and Scripting, plus detailed matching, GUI steps, interface limits, interaction order, verification, and troubleshooting, read [request and response modification](request-response-modification.md).

| Feature | Official page | MCP | CLI |
|---|---|---|---|
| Breakpoint | [Breakpoint](https://docs.proxyman.com/advanced-features/breakpoint) | create/update/list/toggle/delete | `breakpoint`, `rules breakpoint` |
| Breakpoint templates | [HTTP Message Templates](https://docs.proxyman.com/advanced-features/breakpoint-templates) | GUI only in reviewed MCP | GUI only |
| Map Local file/response | [Map Local](https://docs.proxyman.com/advanced-features/map-local) | create literal/from flow, update/list/toggle/delete | `maplocal`, `rules map-local` |
| Map Local directory | [Map Local Directory](https://docs.proxyman.com/advanced-features/map-local-directory) | confirm live schema; reviewed MCP is response/file-rule oriented | verify `rules map-local` help |
| Map Remote | [Map Remote](https://docs.proxyman.com/advanced-features/map-remote) | create/update/list/toggle/delete | `map-remote`, `rules map-remote` |
| Block List | [Block List](https://docs.proxyman.com/advanced-features/blacklist) | create/update/list/toggle/delete | `block-list`, `rules block-list` |
| Allow List | [Allow List](https://docs.proxyman.com/advanced-features/whitelist) | create/update/list/toggle/delete | `allow-list`, `rules allow-list` |
| No Caching | [No Caching](https://docs.proxyman.com/advanced-features/no-caching) | `toggle_no_caching`, `toggle_tool` | `no-caching` |
| Scripting | [Scripting](https://docs.proxyman.com/scripting/script) | create/update/list/toggle/delete; read snippet resource first | `scripting`, `rules scripting` |

For advanced scripting, use the same Scripting MCP rule operations only when the live script contract supports the requested code. The supporting feature itself can remain GUI/runtime-specific.

| Scripting topic | Official page |
|---|---|
| async/await Request | [async/await Request](https://docs.proxyman.com/scripting/async-await-request) |
| Addons | [Addons](https://docs.proxyman.com/scripting/addons) |
| Built-in JS Libraries | [Built-in JS Libraries](https://docs.proxyman.com/scripting/built-in-js-libraries) |
| npm packages | [Use npm install](https://docs.proxyman.com/scripting/use-npm-install) |
| Custom Addons | [Write your own Addons](https://docs.proxyman.com/scripting/write-your-own-addons) |
| Canonical snippets | [Snippet Code](https://docs.proxyman.com/scripting/snippet-code) |
| Environment variables | [Environment Variables](https://docs.proxyman.com/scripting/environment-variables) |

MCP validates canonical Proxyman handlers but does not replace this full scripting documentation.

## Routing, Network, And Protocol Tools

| Feature | Official page | MCP | CLI |
|---|---|---|---|
| External Proxy | [External Proxy](https://docs.proxyman.com/advanced-features/external-proxy) | get/set complete protocol setting | `external-proxy` |
| Reverse Proxy | [Reverse Proxy](https://docs.proxyman.com/advanced-features/reverse-proxy) | list/create/update; deletion/toggle via live rule surface if exposed; read [routing workflow](replay-and-routing.md#reverse-proxy) | `reverse-proxy`, `rules reverse-proxy` |
| SOCKS Proxy | [SOCKS Proxy](https://docs.proxyman.com/advanced-features/socks-proxy) | external SOCKS upstream setting; Proxyman SOCKS listener details are GUI/docs-specific | verify installed help |
| Network Conditions | [Network Conditions](https://docs.proxyman.com/advanced-features/network-throttling) | create/list/update and global tool state; read [throttling workflow](replay-and-routing.md#network-conditions) | `network-condition`, `rules network-condition` |
| DNS Spoofing | [DNS Spoofing](https://docs.proxyman.com/advanced-features/dns-spoofing) | create/list/update/toggle/delete | `dns-spoofing`, `rules dns-spoofing` |
| Access Control | [Access Control](https://docs.proxyman.com/advanced-features/access-control) | GUI only in reviewed MCP | verify installed help |

## Certificates, Encodings, And Specialized Protocols

| Feature | Official page | MCP | CLI |
|---|---|---|---|
| Default root certificate | target platform page plus SSL troubleshooting | status/install/uninstall | GUI normally; CLI custom-root command is a separate feature |
| Custom server/client certificates | [Custom Certificates](https://docs.proxyman.com/advanced-features/custom-certificates) | GUI only in reviewed MCP | `custom-cert` |
| Custom root import/trust | [Custom Certificates](https://docs.proxyman.com/advanced-features/custom-certificates) | GUI only in reviewed MCP | `install-root-cert` where supported |
| Protobuf | [Protobuf](https://docs.proxyman.com/advanced-features/protobuf) | detail sees decoded data when app provides it; rule config is not in reviewed MCP; read [decoding workflow](protocol-decoding-and-key-logging.md#protobuf) | `rules protobuf` |
| GraphQL | [GraphQL](https://docs.proxyman.com/advanced-features/graphql) | flow detail and GraphQL operation filters on supported rule schemas | no separate family found |
| TLS Key Logging | [TLS Key Logging](https://docs.proxyman.com/advanced-features/tls-key-logging) plus [source-grounded workflow](protocol-decoding-and-key-logging.md#tls-key-logging) when the live page is incomplete | no reviewed MCP action | GUI only |

## Troubleshooting Index

Fetch the exact page for the symptom. MCP's built-in setup index directly covers VPN, localhost, and third-party-library cases; use public docs for the rest.

| Symptom | Official page |
|---|---|
| VPN conflict | [Proxyman does not work with VPN apps](https://docs.proxyman.com/troubleshooting/proxyman-does-not-work-with-vpn-apps) |
| Remote iOS/Android device cannot connect | [Remote device connection](https://docs.proxyman.com/troubleshooting/my-ios-devices-couldnt-connect-to-proxyman-via-proxy) |
| iOS 16/17 proxy issue | [iOS device issues](https://docs.proxyman.com/troubleshooting/ios-16-devices-issues) |
| HTTPS/SSL error | [SSL Error](https://docs.proxyman.com/troubleshooting/get-ssl-error-from-https-request-and-response) |
| Localhost missing | [Localhost server](https://docs.proxyman.com/troubleshooting/couldnt-see-any-request-from-localhost-server) |
| Node/Python/Ruby/Go traffic missing | [Runtime traffic missing](https://docs.proxyman.com/troubleshooting/i-could-not-see-any-http-traffic-from-my-nodejs-python-or-ruby-scripts) |
| `.local` traffic missing | [`.local` requests](https://docs.proxyman.com/troubleshooting/.local-doesnt-appear-in-proxyman) |
| No traffic at all | [No traffic](https://docs.proxyman.com/troubleshooting/i-couldnt-see-any-traffics-on-proxyman) |
| Third-party network library missing | [Third-party libraries](https://docs.proxyman.com/troubleshooting/couldnt-see-any-requests-from-3rd-party-network-libraries) |
| Breakpoint raw-message edit | [Breakpoint raw message](https://docs.proxyman.com/troubleshooting/breakpoint-modify-request-response-by-raw-message) |
| App icon cannot change | [App icon](https://docs.proxyman.com/troubleshooting/could-not-change-proxyman-app-icons) |
| Lost data after update | [Lost data](https://docs.proxyman.com/troubleshooting/lost-data-after-updating-proxyman-app) |
| High memory/unresponsive app | [Memory and responsiveness](https://docs.proxyman.com/troubleshooting/proxyman-consumes-too-much-ram-and-unresponsive) |

## Other Official Product Pages

The live index also includes [Overview](https://docs.proxyman.com/readme), [Changelog](https://docs.proxyman.com/changelog), [Raycast](https://docs.proxyman.com/raycast), [official SKILL.md](https://docs.proxyman.com/skill-md), [Security Compliance](https://docs.proxyman.com/security-compliance), and [Team Workspace](https://docs.proxyman.com/team-workspace/team-workspace). These are not all debugging actions, but they complete the reviewed documentation snapshot and can affect product/setup answers.

## Always Use This Mapping Pattern

1. Fetch the current page.
2. Discover current MCP tools and installed CLI help.
3. Read state before change.
4. Apply the narrowest supported change.
5. Generate traffic that exercises it.
6. Verify through detail/list/status evidence.
7. Document rollback.
