# proxyman-cli Command Catalog

This catalog reflects the reviewed macOS CLI source. It helps choose a command hierarchy; it is not a substitute for the installed command's `--help`.

Official background: [Proxyman Command-line](https://docs.proxyman.com/command-line). Fetch its Markdown URL from the live documentation index before relying on current examples.

## How To Discover Help

With Proxyman MCP:

```text
get_proxyman_cli_help {}
get_proxyman_cli_help {"command_path":"export-log"}
get_proxyman_cli_help {"command_path":"rules map-local create"}
```

The bridge accepts command-name tokens only and always appends `--help`.

Without MCP, resolve the installed executable and run:

```text
<resolved-proxyman-cli> --help
<resolved-proxyman-cli> <command> --help
<resolved-proxyman-cli> <command> <subcommand> --help
```

Do not copy placeholders literally and do not assume the macOS app-bundle path on another platform.

## Top-Level Families

| Hierarchy | Purpose | Risk/verification |
|---|---|---|
| `activate` | Activate a license on this device. | Positional secret; agent provides a placeholder only, user runs it, restarts Proxyman, then verifies state. |
| `unlink` | Unlink this device's license. | Destructive; verify local state and remote seat separately. |
| `export` | Export Proxyman configuration. | Filesystem write; use an explicit path, confirm before overwrite, and verify the artifact. |
| `import` | Import Proxyman configuration. | Merge/override may replace state; verify all inventories. |
| `proxy` | Enable/disable Proxyman system proxy behavior. | Changes routing; record and verify original/current state. |
| `mcp` | Persistently turn Proxyman MCP server on/off. | Reload agent and launch app before operational MCP use. |
| `clear-session` | Clear captured traffic. | Destructive; verify the intended workspace/session first. |
| `breakpoint` | Manage Breakpoint rules through the legacy family. | Inspect/list before mutation. |
| `maplocal` | Manage Map Local rules through the legacy family. | Input files/responses and matching scope matter. |
| `map-remote` | Manage Map Remote rules through the legacy family. | Changes destinations for matching traffic. |
| `scripting` | Manage Scripting rules through the legacy family. | Validate Proxyman-specific script contract. |
| `block-list` | Manage Block List rules. | Can block or hide matching traffic. |
| `allow-list` | Manage Allow List rules. | Can hide all nonmatching traffic. |
| `reverse-proxy` | Manage local listener to upstream mappings. | Port conflicts/routing; verify with a request. |
| `network-condition` | Manage throttling. | Affects traffic performance; verify active state. |
| `no-caching` | Control No Caching. | Reversible global behavior. |
| `dns-spoofing` | Manage DNS overrides. | Changes destinations; verify exact host/IP. |
| `external-proxy` | Manage upstream HTTP/HTTPS/SOCKS/PAC settings. | Credentials/routing; preserve complete prior settings. |
| `export-log` | Export captured flows in supported formats/scopes. | Filesystem write; confirm overwrite and protect original traffic secrets. |
| `custom-cert` | Add/remove/replace server or client certificates. | Certificate password/trust and replacement risk. |
| `install-root-cert` | Import a custom root P12 and optionally trust it. | High-impact trust-store change; not default Proxyman CA setup. |
| `proxy-host` | Read proxy host/port information as structured data. | Read-only; useful for automation. |
| `rules` | Unified CRUD/state operations for rule families. | Preferred for broad rule automation when supported. |

## License Activation

The reviewed CLI accepts the license key as a positional argument and instructs the user to restart Proxyman after success. Discover the installed help, then provide only a command shape containing `<LICENSE_KEY>` for the user to substitute and run directly in their own terminal. Do not receive or execute a command containing the real key through the agent host. Warn that the user's local shell history and process inspection may still expose an argument, prefer the GUI when possible, and verify licensed state only after Proxyman relaunches.

## Export Logs

The reviewed CLI supports choices such as all flows or selected domains, formats including Proxyman session, HAR, and raw, and a boundary starting after a flow ID. Discover current names, required path behavior, and overwrite semantics before constructing the command.

Verification:

- command exit status;
- explicit output path;
- file exists and has nonzero expected size;
- file format opens in the intended consumer.

Never paste the exported payload into chat unless the user explicitly requests it and secret handling is agreed.

## Configuration Export/Import

Before import, discover whether the command merges or overrides. Treat override as destructive. A safe workflow exports current configuration first to an approved backup path, imports once, then lists affected rules/settings.

## Certificates

`custom-cert` covers reviewed add/remove/replace operations for server/client certificates. `install-root-cert` accepts a custom P12 and may offer trust installation. These are separate from installing Proxyman's generated default CA through the GUI/MCP certificate workflow.

Always discover:

- server vs client vs root intent;
- input path and format;
- password handling;
- add/remove/replace semantics;
- trust-store effect and rollback.

## Platform Boundary

Official CLI licensing documentation describes macOS. Do not promise the same executable or commands on Windows/Linux merely because the GUI and MCP exist there. Check the installed build first and route to GUI/MCP if absent.
