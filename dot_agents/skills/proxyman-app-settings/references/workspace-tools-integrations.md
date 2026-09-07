# Workspace, Tools, And Integrations

Reviewed against the Proxyman macOS source on 2026-08-21. Treat account, product, plan, and integration details as mutable and verify the installed build plus live official docs.

## Workspace

The Workspace tab is present in the reviewed regular build and omitted from the reviewed Setapp build. It is for Team Workspace identity and license status, not a general local-sync engine.

### Signed Out

- **Login to Workspace** opens a login sheet.
- **Get Team Plan** opens Team pricing; Workspace is presented as Team Subscription functionality.
- The feature list describes shared logs, team collaboration, automatic team licensing, and role-based access.
- **Sync Settings** is marked Coming Soon. Do not promise cross-device preference sync.

### Signed In

- Shows name/email/role, team name, seat count when available, active license status, and updates-until date when available.
- **Open Workspace Website** opens the external workspace portal. Portal mutations follow the portal's own current permissions; the local tab does not perform them.
- **Sync Now** is disabled and reports Not Available in the reviewed build.
- **Logout** requires confirmation and revokes an active Workspace license from this device. Treat logout as both an account and licensing change; verify local signed-out state and license state afterward.

The public Team page currently distinguishes Admin and Developer roles; fetch it before guiding invitations, seat changes, member removal, or other portal administration.

Relevant docs: [Team Workspace](https://docs.proxyman.com/team-workspace/team-workspace), [Share Log online](https://docs.proxyman.com/team-workspace/share-log-online).

## Tools

### Map Local And Debugging Defaults

| Control | Behavior and verification |
|---|---|
| Map Local Path | Chooses the default host-local directory for temporary Map Local files. Approve a narrow folder; do not expose a home directory or secret-bearing tree. Verify the displayed standardized path and create a fresh Map Local only if requested. |
| Map Local Delay | Applies a default response delay: none, 1, 2, 3, 5, 15, 60, 120, 180 seconds, or the UI's Random (1–15)s choice. The reviewed implementation's random range resolves to 1–14 seconds despite the label. Measure a fresh matching request when timing matters. |
| Append Proxyman Headers | Adds Proxyman diagnostic headers for Map Local, Map Remote, and Scripting. Verify on a fresh matched flow. |
| Use No-Cache on Repeated Requests | Ignores caching for repeated requests so the upstream is fetched again. Verify request headers and a fresh response rather than assuming all global traffic is affected. |

For individual rules, use `proxyman-debugging-tools` or the current MCP/CLI rule skill instead of this preference catalog.

### Scripting

| Control | Behavior and verification |
|---|---|
| Allow Scripts to Read Environment Variables | Grants scripts access to host environment values sourced from shell configuration. This can expose tokens and credentials to every eligible script; require explicit approval, never print values for verification, and turn it off when no longer needed. |
| Allow Running Multiple Scripts for One Request | Permits multiple matching scripts to execute for one request. Verify execution order/result on a controlled flow and inspect the Scripting console for runtime errors. |

Relevant docs: [Scripting environment variables](https://docs.proxyman.com/scripting/environment-variables).

### Copy, Export, And Compose

| Control | Behavior and verification |
|---|---|
| Copy Library | Sets the default right-click copy format to cURL or HTTPie. |
| Add `--proxy` | Adds Proxyman's proxy argument to the selected copy-command format. Inspect a newly copied command and do not execute it merely to verify formatting. |
| Preserve Original Request | Preserves original `Content-Length`, `Accept-Encoding`, and `Content-Encoding` when generating the copied request. Explain that replay compatibility may differ when retaining transport-derived headers. |
| Open the export directory after exporting | Opens Finder after a successful log export. It does not redact or authorize the export itself. |
| Request Timeout | Sets Compose timeout in seconds; `0` disables the timeout. Invalid or negative input is normalized to `0` in the reviewed UI. Verify using a controlled Compose request only when requested. |

## GitHub

This tab configures **Publish to Gist** defaults; it does not publish until the user selects captured traffic and invokes Export > Publish To Gist.

| Control | Behavior and verification |
|---|---|
| Authorize… / Remove | Grants or removes GitHub Gist authorization. Authorization is PRO-gated and opens an external OAuth flow; the access token is stored in macOS Keychain. Confirm requested account and Gist permission before authorization, and confirm before removal. |
| Private Gist / Public Gist | Sets the default visibility for future publishes. Public Gists expose captured content publicly. Treat either choice as sending data to GitHub and review the exact payload first. |
| Redact Sensitive Headers | Redacts Authorization, Cookie, Set-Cookie, and similar headers before publishing. Keep it enabled by default, but still inspect bodies, URLs, and nonstandard headers because header redaction is not proof that the whole payload is safe. |
| Manage Access | Opens GitHub's external authorization-management page. It does not revoke access by itself. |
| Open Gist in the Default Browser | Opens the result after publishing. |
| Copy Gist URL | Copies the published URL to the system clipboard. Treat clipboard content as shareable data. |

Relevant docs: [Publish to Gist](https://docs.proxyman.com/advanced-features/publish-to-gist).

## Products

Products is a discovery catalog, not persistent preference state. Selecting a card opens an external website, store, or Setapp page.

The reviewed regular build lists:

- Proxyman for macOS, iOS, Android, Windows, and Linux;
- TCP Viewer;
- TinyShield.

In the reviewed Setapp build, the iOS and TinyShield destinations use Setapp and TCP Viewer is omitted. Verify the destination shown by the installed app before opening it. Do not report a card click as a setting change or install a product without a separate user request.

## MCP

| Control | Behavior and verification |
|---|---|
| Enable MCP Server | Starts/stops Proxyman's local MCP HTTP server and bridge handshake. It is license-gated. A CLI/organization lock disables the checkbox and shows **Disabled by your organization**. |
| Server Status | Shows Stopped or Running on an ephemeral localhost port. Never hardcode that port or its bearer token; MCP clients should launch the bundled stdio `mcp-server`. |
| MCP Configuration: Claude Code / Codex / Manual | Shows a version/build-specific command or JSON using the bundled bridge path, with Copy. Prefer this displayed configuration over a memorized app path. |
| Redact Sensitive Data Before Sending to AI | Redacts MCP previews/responses sent to the AI. Keep it on unless raw data is explicitly required and approved. It does not sanitize original HAR/Proxyman log files written by export operations. |
| Learn more about MCP / Skill | Opens the official MCP documentation or Proxyman skill repository. |

Verification requires an MCP client connection and a harmless call such as `get_version`; seeing a running port is necessary but not sufficient. If the checkbox is locked, use installed, version-matched `proxyman-cli mcp --help` to understand the saved CLI policy before changing it. Route client configuration and handshake troubleshooting to `proxyman-mcp-setup`.

Relevant docs: [MCP](https://docs.proxyman.com/mcp).
