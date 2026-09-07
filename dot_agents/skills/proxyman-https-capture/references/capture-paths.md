# HTTPS Capture Path Matrix

Fetch `https://docs.proxyman.com/llms.txt` and the linked page for current steps. Use this table to select, not replace, the official guide.

| Target | Preferred path | Built-in MCP guidance | Official page |
|---|---|---|---|
| Standalone Proxyman for iOS app | On-device VPN capture and Proxyman iOS certificate | Desktop MCP does not control this app; use its GUI | [Proxyman for iOS](https://docs.proxyman.com/proxyman-ios/vpn-and-proxyman-certificate) |
| macOS host apps/browsers | System proxy/Helper Tool, host CA trust, host-scoped SSL Proxying | proxy/certificate/SSL tools; automatic/manual setup | [macOS](https://docs.proxyman.com/debug-devices/macos) |
| Windows host | Proxyman proxy setup and Windows certificate trust | use live platform tool discovery | [Windows certificate](https://docs.proxyman.com/proxyman-windows/install-certificate) |
| Linux host | App/system proxy plus distro trust store; use live app guidance | use live platform tool discovery | fetch current Manual Setup/platform guidance |
| iPhone/iPad/Vision Pro device | Wi-Fi manual proxy to reachable host, device CA trust, SSL host | `docs://setup/ios-device`; `answer_setup_question` | [iOS Device](https://docs.proxyman.com/debug-devices/ios-device) |
| iOS/iPadOS/visionOS simulator | Booted simulator certificate install and proxy override | `docs://setup/ios-simulator` | [iOS Simulator](https://docs.proxyman.com/debug-devices/ios-simulator) |
| Apple TV/Watch | Device/simulator-specific trust and proxy path | `docs://setup/tvos-watchos` | [tvOS & watchOS](https://docs.proxyman.com/debug-devices/tvos-and-watchos) |
| Android physical device | Wi-Fi proxy, Android/app-appropriate CA trust, SSL host | `docs://setup/android-device` | [Android Device & Emulator](https://docs.proxyman.com/debug-devices/android-device) |
| Google APIs Android emulator | Guided script selects `adb root` path | `docs://setup/android-emulator`; `run_guided_setup` | [Automatic Android Emulator](https://docs.proxyman.com/debug-devices/android-device/automatic-script-for-android-emulator) |
| Android Studio Google Play AVD | Explicit-consent temporary Magisk path where supported | same, with separate override/revert consent | [Google Play AVD with Magisk](https://docs.proxyman.com/debug-devices/android-device/google-play-android-emulator-with-magisk) |
| Firefox | Guided browser setup or manual browser proxy/trust | `docs://setup/firefox`; guided Firefox action | [Firefox](https://docs.proxyman.com/debug-devices/firefox) |
| Chrome/current or new profile | Guided automation when supported | automatic setup; guided Chrome actions | [Automatic Setup](https://docs.proxyman.com/automatic-setup/automatic-setup) |
| Node/Python/Ruby terminal | Injected terminal/Automatic Setup; otherwise explicit proxy + CA | automatic/manual resources, terminal tools | [Automatic Setup](https://docs.proxyman.com/automatic-setup/automatic-setup), [Manual Setup](https://docs.proxyman.com/automatic-setup/manual-setup) |
| Go/Rust/Java | Explicit client proxy and runtime trust store | setup question/search; manual resource | language page from live index |
| React Native/Flutter | Native platform path plus framework-specific proxy/trust behavior | setup question/search | [React Native](https://docs.proxyman.com/debug-devices/react-native), [Flutter](https://docs.proxyman.com/debug-devices/flutter) |
| Electron | Electron injection when live tool supports target | `inject_electron` | [ElectronJS](https://docs.proxyman.com/debug-devices/electronjs) |
| Next.js server-side fetch | Node/server runtime path, not browser-only setup | manual/automatic runtime guidance | [NextJS fetch](https://docs.proxyman.com/debug-devices/nextjs-fetch) |
| Docker | Reachable host-gateway address, container proxy env, container/runtime CA | setup question plus current docs | [Docker](https://docs.proxyman.com/debug-devices/docker) |
| API clients | Client-specific proxy and CA settings | setup question/search | [HTTP Clients](https://docs.proxyman.com/debug-devices/http-clients) |
| iOS-family app the user can instrument | Atlantis when proxy/certificate setup is undesirable or a VPN blocks it | `docs://setup/atlantis`; Atlantis prompt/screen; read [Atlantis capture](atlantis.md) | [Atlantis for iOS](https://docs.proxyman.com/atlantis/atlantis-for-ios) |
| Android debug app using a supported HTTP client | Atlantis Android instrumentation when the current official repository supports the client | no reviewed Android Atlantis MCP setup resource; read [Atlantis capture](atlantis.md) | [Atlantis repository](https://github.com/ProxymanApp/atlantis) |
| localhost target | Explicit proxy or Reverse Proxy | localhost resource; Reverse Proxy tools | [Localhost troubleshooting](https://docs.proxyman.com/troubleshooting/couldnt-see-any-request-from-localhost-server) |

Supporting examples and setup troubleshooting:

- [Sample Android Project](https://docs.proxyman.com/debug-devices/android-device/sample-android-project)
- [Demo iOS & Android](https://docs.proxyman.com/debug-devices/demo-ios-and-android)
- [Automatic/Manual Setup Troubleshooting](https://docs.proxyman.com/automatic-setup/troubleshooting)

## MCP Setup Resources

Use discovery, then read only what the target needs:

- `docs://setup/ios-device`
- `docs://setup/ios-simulator`
- `docs://setup/android-device`
- `docs://setup/android-emulator`
- `docs://setup/tvos-watchos`
- `docs://setup/automatic-setup`
- `docs://setup/manual-setup`
- `docs://setup/firefox`
- `docs://setup/atlantis`
- `docs://troubleshooting/vpn`
- `docs://troubleshooting/localhost`
- `docs://troubleshooting/third-party-libraries`

## Selection Rules

1. Prefer a target-supported proxy/trust configuration over disabling TLS verification.
2. Prefer app-provided automation when it identifies the exact active target and offers a revert.
3. Use manual steps when automation cannot identify the target, lacks permission, or does not support the runtime.
4. Use Atlantis only for an app the user controls and can instrument. It is not a generic capture route for arbitrary App Store or Play Store apps.
5. Do not root a physical Android device or production environment as a default troubleshooting step.
6. For certificate pinning, change the user's own debug build or use its debug trust configuration. Do not silently bypass security in a third-party/production app.
7. Use an exact host for SSL Proxying first; broaden only when evidence requires it.

## Verification Request

Use a request the target already makes or a user-approved deterministic endpoint. Avoid relying on a third-party service whose availability or TLS policy can change. Verify flow client/source, URL, status, and readable HTTPS content.
