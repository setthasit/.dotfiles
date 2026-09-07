# Proxyman License Workflows

Fetch the current License and License Manager pages from the live documentation index before using mutable entitlement or portal facts.

Official entry pages: [License](https://docs.proxyman.com/license) and [License Manager](https://docs.proxyman.com/license-manager).

## Surface Selection

| Goal | Preferred surface | Why |
|---|---|---|
| Activate the current desktop app | GUI | Keeps the key out of shell history/process arguments. |
| Activate the standalone iOS app | iOS app GUI | Uses the current protected license/unlock screen; no reviewed desktop MCP/CLI action. |
| Activate many managed Macs | User/organization-run `proxyman-cli`, after live help | Keep key injection in approved deployment tooling outside the agent transcript and tool calls. |
| Unlink the current available device | GUI, or CLI with confirmation | The local device can remove its own activation. |
| Remove/revoke an unavailable or old device | License Manager | The local CLI cannot operate a different device. |
| Inspect purchase/expiry/seat/device state | License Manager | Portal is the account-level source. |
| Renew/extend/manage seats or emails | License Manager/current pricing flow | Terms and options are mutable. |
| Activation behind corporate proxy | GUI External Proxy, then activation | Routes license traffic through the required upstream. |

## Current-Device Activation Checklist

1. Confirm platform, app version, and that Proxyman was launched at least once.
2. Verify the user has an official key without asking them to paste it into chat.
3. Prefer the in-app activation screen.
4. If the user requests CLI, read installed `activate --help` and explain that the reviewed positional argument can appear in shell history or process inspection.
5. Provide a verified command shape containing `<LICENSE_KEY>`. Do not receive the real key or execute the command through the agent host; the user substitutes the key and runs it directly in their terminal.
6. After successful CLI activation, have the user restart Proxyman. Do not terminate the app without explicit authorization.
7. Verify licensed state, expected account identity, and any seat count shown by the app/portal after relaunch.
8. Report only redacted key/account information.

Do not use the deep-link form as the default automation path: placing a key in a URL can expose it through browser history, logs, or inter-process handling.

## Current-Device Unlink Checklist

1. Confirm this is the exact current device and that the user understands Pro access will be removed here.
2. Record the device label/account state needed to verify the result; do not record the key.
3. Confirm immediately before unlink.
4. Perform the app unlink action or version-matched CLI command.
5. Verify the app is unlicensed and check License Manager when remote seat release matters.

Implementation note for the reviewed macOS CLI: the unlink flow attempts a remote DELETE and then removes local license data even when the network response fails. Therefore, a successful local unlink does not by itself prove the remote seat was released. Verify account-level state in License Manager.

## Remote Device Removal Checklist

1. Verify the current official License Manager entry point from the docs/official site.
2. Let the user enter purchase email or key on the official page.
3. Tell the user an access link is delivered to the purchase email. Do not request that link in chat.
4. In the portal, compare device name, platform, activation date, and other available metadata.
5. If two targets remain plausible, ask the user to choose; do not guess.
6. Explain whether the action removes, revokes, transfers, or frees a seat as shown by the current portal.
7. Confirm immediately before committing the portal action.
8. Verify the device list/available seat changed.

## Activation Failure Triage

Collect the exact sanitized message and classify it before acting:

- **Format/local validation:** verify the key was entered exactly in the app; do not echo it.
- **Already active/current state:** inspect current license state before retrying.
- **No available seat:** use License Manager to identify devices; do not unlink a random device.
- **Network/timeout:** test general connectivity and corporate proxy requirement.
- **TLS/certificate:** inspect system time, corporate interception policy, and upstream proxy trust; do not disable TLS validation.
- **Account/renewal/expiry:** verify in License Manager/current official terms.
- **Unknown server result:** stop repeated attempts and direct the user to official support with a sanitized error, app version, platform, and purchase email—not the key.

## Corporate Proxy

According to the official workflow, Proxyman can route activation through External Proxy on supported macOS versions:

1. Open Tools > Proxy Setting > External Proxy.
2. Configure required HTTP and HTTPS upstream host/port.
3. Add authentication only if required and only with the user's approval.
4. Enable the External Proxy feature.
5. Retry activation once and capture the sanitized result.
6. Restore the prior upstream-proxy state if it was temporary.

Use the current External Proxy documentation for exact UI and version support.

## What Not To Automate

- Do not invent a License Manager API or submit portal HTTP requests directly.
- Do not scrape an authenticated portal session.
- Do not open purchase email or access links without explicit authorization and an appropriate connector.
- Do not hardcode seat counts, prices, trial limits, renewal terms, or access-link lifetime.
- Do not persist license keys in environment variables, shell profiles, configuration files, screenshots, or reports.
- Do not execute the reviewed positional-argument `activate` command with a real key through an agent shell or tool call.
