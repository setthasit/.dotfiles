# General, Appearance, And Privacy

Reviewed against the Proxyman macOS source on 2026-08-21. Treat the installed UI as authoritative for a newer or differently distributed build.

## General

### Proxyman CA

| Control | Behavior and verification |
|---|---|
| Certificate name and validity | Shows the generated or custom root CA, valid-from/valid-until dates, and whether it is installed/trusted or expired. Verify certificate state independently in Keychain or with MCP `get_certificate_status` when connected. |
| Generate… | Opens the certificate dashboard when no usable root exists. Installation and trust are separate outcomes; verify both before expecting HTTPS decryption. |
| Status button | When the certificate is installed but not trusted, opens Keychain Access so the user can change trust. |
| Preview… | Opens the current certificate for inspection. It is available only while a valid certificate exists. |
| Private Key… | Exports the generated CA private key. This is a high-value secret; require an approved path and do not read or paste it into the agent conversation. |
| Root Certificate as P12… | Exports the root certificate plus private key and prompts for a password. Protect both the file and password. |
| Root Certificate as PEM… / DER… | Exports the public root certificate in the selected representation. These exports remain trust-sensitive even though they do not contain the private key. |
| Require trusted Proxyman certificate in Keychain Access | Makes trusted-root state a requirement. Verify a known HTTPS request after changing it. |
| Delete | Removing the generated root certificate is confirmed as irreversible in the reviewed UI and can break HTTPS capture until regenerated/reinstalled. Removing a custom root stops using that custom root. Inventory dependent devices/apps and retain an approved backup before deletion. |

Relevant docs: [Custom Certificates](https://docs.proxyman.com/advanced-features/custom-certificates), [macOS HTTPS setup](https://docs.proxyman.com/debug-devices/macos).

For installation/trust, custom root replacement, custom server/client identities, or certificate-removal recovery, route to `proxyman-certificates-recovery`; this Settings reference covers only the General-tab controls.

### Proxy And Startup

| Control | Behavior and verification |
|---|---|
| Port Number | Selects Proxyman's local proxy port. An occupied port is rejected and the previous working port should be treated as active. Changing it can disconnect manually configured clients; verify the displayed port and capture a fresh request. |
| Override System Proxy Settings at Launch | Persists whether Proxyman should set the macOS HTTP/HTTPS proxy when the app launches. This is not the same as a one-time MCP `set_system_proxy` action. Record the previous system proxy before testing. |
| Start Recording Traffic at Launch | Controls recording state on future launches. Relaunch only when the user wants end-to-end verification. |
| Use HTTP/2 | The reviewed production control is disabled and its change action does not persist a preference. Do not report it as enabled because it looks checked. A separate Beta Download action may appear, but it opens a download rather than changing this build. |
| Proxy Settings… | Opens the separate advanced Proxy Settings window. It is not another Settings toolbar tab; use current proxy guidance for access control, External Proxy, or similar routing configuration. |

Relevant docs: [Proxy Helper Tool](https://docs.proxyman.com/basic-features/proxy-setting-tool).

### Layout And Menu Bar

| Control | Behavior and verification |
|---|---|
| Content Layout: Vertical / Horizontal | Changes the Request and Response panel arrangement immediately. Verify in the active workspace. Detachable-window layout is available elsewhere, not through this pair. |
| Show Proxyman Icon in Menu Bar | Adds/removes Proxyman's macOS menu-bar control. Verify the status item itself. |
| Truncation Style: Head / Middle / Tail | Chooses where long table text is shortened. Verify with a long URL or other overflowing value. |

Relevant docs: [Horizontal/Vertical/Window Layout](https://docs.proxyman.com/basic-features/horizontal-vertical-layout).

## Appearance

### Theme And Dock Icon

| Control | Behavior and limits |
|---|---|
| App Theme | Selects System, Light, or Dark and applies it immediately. |
| Proxyman Dock Icon | Selects On Earth (default), On Mars, Space Candy, or Classic in the reviewed build. Alternative icons require an authorized license; the default is free. |
| Dock icon troubleshooting / reload | Opens the official troubleshooting page or forces an icon refresh. Use this before repeatedly changing the selection. |

### Body, Editor, And Table Display

| Control | Behavior and limits |
|---|---|
| Font Size | Sets content/editor body size from the values visible in the menu. |
| Word Wrap | Wraps long body/editor lines. |
| Show Invisibles | Shows whitespace/newline/tab/nonspacing markers. It is a PRO control and shares the same stored value as Advanced > Show Invisible Characters. |
| Show Minimap | Enables the editor minimap; PRO. |
| Scroll Beyond the Last Line | Allows editor scrolling below the final line; PRO. |
| Tab Width | Selects 2 or 4 spaces; PRO. |
| Use Monospaced Font | Applies monospaced UI text to Request/Response tabs and the main table. It is free in the reviewed build even if an older visual tag suggests otherwise. |
| Alternate Row Background Colors | Alternates main-table row colors; PRO. |

Verify these controls with a representative text body and the main table, not only the checkbox state.

### Restore Defaults

In the reviewed build, Restore Defaults changes:

- content font size to the app default;
- Word Wrap on;
- Minimap off;
- Scroll Beyond the Last Line off;
- Use Monospaced Font off;
- Alternate Row Background Colors off;
- theme to Dark;
- Dock icon to On Earth/default.

It does **not** reset Show Invisibles or Tab Width in the reviewed implementation. Treat it as a multi-setting mutation, preserve any desired current choices first, and verify each value the user cares about.

## Privacy

| Control | Behavior and verification |
|---|---|
| Share analytics with Proxyman | Enables/disables anonymous diagnostics and usage analytics. The reviewed UI marks the change as restart-required. |
| Share crash reports | Enables/disables anonymous crash reporting. The reviewed UI marks the change as restart-required. |
| Powered by Sentry | Opens the external Sentry information destination; it does not change consent. |
| Privacy Policy | Opens Proxyman's privacy policy; it does not change consent. |

For an audit, report the two consents separately. After a requested change, verify the saved checkboxes and explain that the running process may retain its prior analytics/crash-reporting setup until Proxyman restarts.
