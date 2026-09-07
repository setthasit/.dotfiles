# Advanced

Reviewed against the Proxyman macOS source on 2026-08-21. The Advanced tab includes privileged and routing-related controls; distinguish an observed current value from a desired value.

## Proxy Helper Tool

The status can be Installed, Needs Update, Not Installed, or Permission Required.

| Control/action | Behavior and verification |
|---|---|
| Install / Update | Opens Proxyman's privileged helper installer. It can require administrator/root authorization and, on macOS 13+, permission under System Settings > General > Login Items. Explain the privilege change before proceeding and verify the installed version/status afterward. |
| Open Login Items… | Appears when background/login-item permission is required. Grant only the Proxyman item, return to Settings, and refresh the helper status. |
| Installed status | The helper performs system HTTP/HTTPS proxy override/revert more efficiently than the `networksetup` fallback. Selecting its status can reveal the helper location in Finder. |
| Uninstall | Confirms removal and returns Proxyman to the `networksetup` fallback. Record current proxy behavior and verify launch/quit proxy restoration after removal. |
| Documentation / Changelog | Opens the current helper documentation or changelog; it does not change helper state. |

Do not delete `/Library/PrivilegedHelperTools` contents manually through an agent when the in-app uninstall action is available.

Relevant docs: [Proxyman Proxy Helper Tool](https://docs.proxyman.com/basic-features/proxy-setting-tool).

## Time Format

| Control | Behavior and verification |
|---|---|
| Use 24-Hour Time | Switches displayed timestamps between 12-hour and 24-hour format. |
| Display Full Time Format | Includes date, time, and time zone in time labels. |

Verify against a visible flow timestamp. These controls change presentation, not captured network timing.

## Miscellaneous

| Control | Behavior and verification |
|---|---|
| Show Alert on Quit | Controls whether quitting Proxyman presents a warning. Do not quit solely to test unless the user approves disrupting capture. |
| Show Resource Usage in Bottom Bar | Displays memory usage and upload/download speed in the main bottom bar. |
| Hide Unnecessary Apple Requests from iOS Simulators | Hides `*.apple.com` and `*.icloud.com` simulator traffic in the reviewed UI and immediately closes existing live connections so the setting takes effect. Warn about that disruption; verify with new simulator traffic. |
| Stay on Top | Makes Proxyman windows float above other app windows. |
| Show Invisible Characters | Displays whitespace/newline/tab/nonspacing characters. It shares the same stored setting as Appearance > Show Invisibles; treat them as two controls for one value. |
| Clean Up Resources When Memory Usage Is High | When Proxyman RAM reaches at least 2 GB, the reviewed behavior cleans half of retained requests/responses. This can discard body data needed for later inspection; export important traffic first and prefer narrowing broad SSL Proxying scope when memory pressure is caused by capturing everything. |

Relevant docs: [High memory usage troubleshooting](https://docs.proxyman.com/troubleshooting/proxyman-consumes-too-much-ram-and-unresponsive).

## App Update

**Show Update Notification at Launch** controls whether the app presents update notifications at launch. It does not perform an update or prove the app is current. Verify version/update state through the app's update mechanism separately.

## Restore Previous Proxy

**Restore the Previous HTTP/HTTPS Proxy When Proxyman Closes** preserves and restores the pre-Proxyman system proxy configuration. This matters when another proxy/PAC configuration was active first.

Before changing or testing it:

1. Record the current HTTP, HTTPS, SOCKS, and PAC state for the active network service.
2. Change only the requested preference.
3. If end-to-end verification is required, avoid doing it during an active capture, launch Proxyman, observe its proxy state, then quit normally and compare the restored state.
4. Restore the prior preference and proxy values if the test fails.

The helper-tool path is designed to persist/restore previous proxy settings and to recover more gracefully from app crashes, but do not promise recovery without observing the installed helper state.

## App Language

The reviewed build supports English and Chinese (Simplified). Proxyman follows the system language by default; selecting the in-app language control presents instructions to override Proxyman under macOS Language & Region app-specific settings rather than directly rewriting the language.

Verify after relaunching Proxyman. Do not change the user's global macOS language when only an app-specific override was requested.

Relevant docs: [Localization](https://docs.proxyman.com/basic-features/localization).
