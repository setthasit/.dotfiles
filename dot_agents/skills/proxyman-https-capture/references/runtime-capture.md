# Runtime, Framework, Browser, And Container Capture

Fetch the live language/framework page before giving exact commands. Proxy variables, CA options, and runtime behavior change across versions and libraries.

## Common Runtime Model

For a terminal/runtime process:

1. Route HTTP and HTTPS through Proxyman using the mechanism the client actually honors.
2. Point the runtime to the Proxyman CA using its supported trust-store/bundle mechanism.
3. Preserve `NO_PROXY`/bypass behavior deliberately, especially for localhost.
4. Start a fresh process after environment injection.
5. Enable SSL Proxying for the target host.
6. Generate one request and verify it by client/host in Proxyman.

Prefer Proxyman Automatic Setup or MCP `inject_terminal` for supported macOS terminals because it builds a current environment. Use `get_terminal_manual_command` when the user wants to inspect/copy the command rather than launch a terminal.

## Node.js And Next.js

- Fetch [NodeJS](https://docs.proxyman.com/debug-devices/nodejs) or [NextJS fetch](https://docs.proxyman.com/debug-devices/nextjs-fetch).
- Distinguish browser-side traffic from Node server-side fetch.
- Verify the HTTP library honors standard proxy variables; some clients require an agent/dispatcher or separate configuration.
- Configure Node's CA mechanism from the current guide rather than disabling certificate verification.
- Restart the dev/server process after environment changes.

## Python

- Fetch [Python](https://docs.proxyman.com/debug-devices/python).
- Identify the client (`requests`, `urllib`, `httpx`, `aiohttp`, SDK) and whether it honors environment proxies.
- Use the CA bundle option supported by that client/runtime.
- Virtual environments and packaged apps may use their own trust path.

## Ruby

- Fetch [Ruby](https://docs.proxyman.com/debug-devices/ruby).
- Identify Net::HTTP, Bundler tooling, or the specific gem because proxy/CA behavior can differ.
- Start a new shell/process after injection and verify the library did not override proxy variables.

## Go

- Fetch [Golang](https://docs.proxyman.com/debug-devices/golang).
- Standard `net/http` commonly uses proxy environment behavior, but custom transports and libraries can override it.
- Prefer the OS/runtime trust path or app-owned debug CA pool. Do not set insecure TLS verification as the normal solution.

## Rust

- Fetch [Rust](https://docs.proxyman.com/debug-devices/rust).
- Identify the HTTP client and TLS backend (for example native vs bundled TLS) before selecting proxy/CA configuration.
- A client compiled with its own roots may ignore the host trust store.

## Java/JVM

- Fetch [Java VMs](https://docs.proxyman.com/debug-devices/java).
- Distinguish JVM proxy properties from the Java trust store used by the exact runtime.
- Verify the selected JDK/JRE; importing a CA into one installation does not configure every JVM.
- Obtain confirmation before modifying a shared Java trust store.

## Firefox And Chromium

- Firefox can use its own proxy/certificate configuration; use the dedicated page/resource or guided setup.
- Chrome setup can target current or new profiles in supported guided automation. Explain profile launch/restart behavior first.
- Browser traffic may use HTTP/3/QUIC paths that do not follow classic HTTP proxy expectations. Use current Proxyman guidance rather than globally weakening browser security.

## Electron

- Fetch [ElectronJS](https://docs.proxyman.com/debug-devices/electronjs).
- On supported macOS builds, `inject_electron` can launch a selected `.app`; this changes another app's launch environment and requires consent.
- Distinguish Electron renderer requests, Node main-process requests, and custom native libraries.
- Verify which process/client appears in flow metadata.

## React Native And Flutter

- Start from the underlying iOS/Android device or simulator path.
- Fetch the framework page for framework-specific trust/proxy behavior.
- Debug and production builds can differ because of network security configuration or pinning.
- Atlantis is an option only for a controlled app that can include a currently supported iOS-family or Android instrumentation library; it is not a capture path for an arbitrary third-party app.

## Docker, WSL, VMs, And Containers

- Fetch [Docker](https://docs.proxyman.com/debug-devices/docker) or [WSL](https://docs.proxyman.com/proxyman-windows/wsl) as applicable.
- `127.0.0.1` inside a container/VM usually refers to that guest, not the Proxyman host.
- Choose a host-gateway or routable address supported by the environment.
- Configure proxy variables and CA trust inside the container/runtime, not only on the host.
- Avoid baking a development interception CA into a production image.
- Rebuild/restart the container after trust/config changes and document cleanup.

## HTTP Client Applications

Fetch [HTTP Clients](https://docs.proxyman.com/debug-devices/http-clients). Many tools have their own proxy toggle and certificate-validation setting. Prefer importing/trusting the Proxyman CA or using the client's supported custom CA over disabling validation.

## Anti-Patterns

- global `verify=false`, insecure TLS flags, or disabled hostname verification;
- broad permanent proxy variables in shell profiles when a scoped process is enough;
- assuming system proxy means every library follows it;
- assuming host Keychain trust configures Java, Node, containers, and bundled TLS clients;
- using production secrets/endpoints for a capture verification request;
- leaving injected terminals, profiles, containers, or proxy settings active without a rollback note.
