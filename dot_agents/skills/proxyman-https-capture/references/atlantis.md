# Atlantis Capture

Use Atlantis when the user controls an app and wants its traffic to appear in Proxyman without routing the device through Proxyman's HTTP proxy or installing the Proxyman CA. It is especially useful when an iOS VPN or managed-network stack bypasses the normal proxy.

## Establish The Boundary First

Atlantis is an instrumentation library that sends captured request/response data to Proxyman over the local connection. It is not a transparent system proxy.

- Choose Atlantis for inspection of traffic from a build that can include and start the library.
- Choose the normal Proxyman proxy when the user needs Breakpoint, Map Local, Map Remote, Scripting, Network Conditions, Reverse Proxy, or other debugging tools. Atlantis-sourced traffic is inspection-oriented and those tools do not alter the original app traffic.
- Do not propose Atlantis for an arbitrary third-party/App Store/Play Store app that the user cannot rebuild.
- Prefer debug-only integration unless the user has deliberately reviewed production logging, privacy, and data-handling consequences.

Fetch both current sources before giving exact dependency versions or platform requirements:

1. [Atlantis for iOS](https://docs.proxyman.com/atlantis/atlantis-for-ios) from the live Proxyman documentation index.
2. The current official [Atlantis repository README](https://github.com/ProxymanApp/atlantis), which the documentation page uses for installation details. For Android, follow the separate official Android repository linked there.

## iOS-Family Integration

Use the current README for exact APIs, supported OS versions, and package details. The workflow shape is:

1. Add the official Atlantis Swift package to a target the user controls.
2. Add the current local-network usage description and Proxyman Bonjour service entry required by the README.
3. Import and start Atlantis from the app's startup path, normally behind the project's debug-build condition. Use the optional Proxyman host name only when discovery finds the wrong Mac or multiple Macs are present.
4. Open Proxyman on the Mac.
5. Keep the device/simulator and Mac on the same reachable local network, or use the supported USB path.
6. Build and launch the instrumented app, generate a known request, and find the Atlantis client/source in Proxyman.

Do not paste a remembered `Info.plist` block or API signature without checking the current README. Atlantis commonly captures URLSession-based HTTP/HTTPS automatically. WebSocket and custom-network-stack support depends on the concrete library; use the current README's manual logging or interceptor path when automatic capture does not apply.

## Android Integration

Android uses the separate official Atlantis Android implementation. Verify the current repository before giving coordinates or versions.

1. Add it as a debug dependency.
2. Start Atlantis from the debug application lifecycle.
3. Attach its interceptor to the supported HTTP client; Retrofit or GraphQL clients must use that instrumented client instance.
4. Run Proxyman and ensure the physical device can discover/reach the Mac. Use the documented emulator host route for the active emulator type.
5. Generate a known request and verify its app/device source in Proxyman.

Do not claim support for a networking client merely because the app uses Android. Confirm the current supported-client list first.

## Verification

Confirm all of the following:

- Proxyman identifies the expected app and device/client source as Atlantis traffic;
- the known request and response appear with the expected URL, method, and status;
- HTTPS content is readable without configuring the device proxy or installing the Proxyman CA;
- capture still works under the VPN when VPN compatibility was the reason for choosing Atlantis;
- the user understands that Proxyman debugging rules do not modify Atlantis traffic.

## Troubleshooting

- **No Atlantis source:** verify the dependency is linked to the active target, startup code ran, and the build condition includes Atlantis.
- **Discovery fails:** verify Proxyman is running, local-network permission is granted, both endpoints are reachable on the same network or supported USB path, and Bonjour/mDNS is not blocked. Use the documented Mac host name when needed.
- **Only some calls appear:** identify the actual HTTP/WebSocket library. A custom stack may need the current manual logging/interceptor API.
- **VPN capture still fails:** distinguish local discovery being blocked from ordinary HTTP proxy bypass. Atlantis avoids the latter but still needs a route to Proxyman.
- **Debugging rule has no effect:** this is expected for Atlantis inspection; switch the controlled build to the normal proxy path when modification or throttling is required.

## Removal

Stopping capture means removing or disabling Atlantis startup in the controlled build. Remove the dependency and Atlantis-only local-network/Bonjour declarations only when the user requests full project cleanup and those declarations are not used elsewhere.
