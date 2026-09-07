# MCP Resources And Prompts

Discover these live before use. This snapshot contains the 15 static resources, one resource template, and five prompts in the reviewed server.

The [public MCP guide](https://docs.proxyman.com/mcp) is useful for setup context, but the connected server's discovery responses remain authoritative for current tools and schemas.

## Resources

| URI | Use |
|---|---|
| `docs://automation/proxyman-cli` | Complete CLI execution model, command hierarchy, safety, and help-discovery workflow. |
| `docs://setup/ios-device` | Physical iPhone, iPad, and Vision Pro capture. |
| `docs://setup/ios-simulator` | Apple simulator capture. |
| `docs://setup/android-device` | Physical Android setup. |
| `docs://setup/android-emulator` | Android emulator automation and fallback. |
| `docs://setup/tvos-watchos` | tvOS/watchOS device and simulator setup. |
| `docs://setup/automatic-setup` | One-click Terminal/browser setup. |
| `docs://setup/manual-setup` | Manual environment and trust setup. |
| `docs://setup/firefox` | Firefox proxy and certificate setup. |
| `docs://setup/atlantis` | VPN-friendly iOS debug-app capture. |
| `docs://troubleshooting/vpn` | VPN conflict diagnosis. |
| `docs://troubleshooting/localhost` | Localhost bypass and Reverse Proxy guidance. |
| `docs://troubleshooting/third-party-libraries` | Libraries that bypass normal proxy/trust behavior. |
| `docs://scripting/snippet-code` | Canonical handler signatures, fields, body types, and examples. |
| `insights://popular-workflows` | Curated setup workflow ranking. |

Resource template:

- `docs://search/{query}` searches the bundled setup/troubleshooting knowledge base.

The built-in documentation is version-matched but intentionally narrower than all pages on `docs.proxyman.com`.

## Prompts

| Prompt | Required argument | Use |
|---|---|---|
| `recommend_capture_path` | `question` | Choose a target-aware capture path; optional platform/app hints. |
| `troubleshoot_missing_traffic` | `symptom` | Build an ordered missing-traffic diagnosis. |
| `explain_vpn_or_atlantis_choice` | none | Explain classic proxy versus Atlantis for a target. |
| `write_scripting_rule` | `user_need` | Draft Proxyman-specific script code with optional URL/method context. |
| `use_proxyman_cli` | `user_request` | Plan a CLI request using version-matched help; optional hierarchy hint. |

Prompts produce guidance, not permission. Their output does not authorize mutations, CLI execution, exports, or secret exposure.
