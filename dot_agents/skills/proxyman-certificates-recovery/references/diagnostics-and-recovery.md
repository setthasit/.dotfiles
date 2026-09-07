# Diagnostics And Recovery

Reviewed against the Proxyman macOS source on 2026-08-21. The live official documentation index currently has no dedicated Debug Mode or Factory Reset page, so verify labels and prompts in the installed Help menu.

## Start With Copy Debug Info

Before enabling verbose diagnostics, use **Help > Copy Debug Info…** when available:

- it reports macOS/device/app version, bundle ID, license status, memory usage, tool enabled states/counts, wildcard/browser warnings, access-control mode, and custom-certificate counts;
- it does not include captured request/response bodies in the reviewed implementation;
- preview the generated sheet before copying, because environment and tool-state metadata may still be sensitive.

Use this read-only snapshot to narrow the reproduction. It is different from Debug Mode console output.

## Debug Mode

### Enable And Capture

1. Define the exact symptom and shortest controlled reproduction first.
2. Open **Help > Advanced > Enable Debug Mode…**. The user's explicit request to enable it is sufficient authorization; confirm the reproduction and output-sharing scope before launching from Terminal or sharing logs.
3. Record the menu's prior checked state. Enabling persists the setting and shows the current app executable path.
4. Quit Proxyman normally, then run the exact displayed executable command in Terminal so stdout/stderr remains visible.
5. Reproduce once. Capture only the minimal relevant lines and inspect them for URLs, paths, headers, credentials, certificate names, or other sensitive data before sharing.
6. Stop the terminal-launched process and disable Debug Mode when finished unless the user explicitly needs it left on.

The reviewed production logger emits error/warning messages plus selected production-debug messages when enabled. It does not turn the production app into a full debug build, and many debug-only subsystems remain silent. Do not promise full packet, request-body, WebSocket, or scripting logs.

### Verify And Stop

- Verify the menu checkmark reflects the requested state.
- Verify at least one expected diagnostic appears during the controlled reproduction; an empty console can mean the relevant code path does not use production logging.
- If no useful log appears after one valid reproduction, stop rather than repeatedly exposing traffic. Use Copy Debug Info, the relevant feature console, or a narrower troubleshooting workflow.

## Help > Advanced Recovery Actions

### Reset Network Proxy…

This action synchronously attempts to revert the macOS system proxy to its prior state. It can interrupt routing.

1. Record HTTP, HTTPS, SOCKS, PAC, bypass, and active network-service state.
2. Stop or obtain approval to interrupt active captures.
3. Invoke **Help > Advanced > Reset Network Proxy…** once.
4. Verify the macOS proxy state independently and restore any still-required non-Proxyman proxy/PAC configuration.

Do not confuse this recovery action with Factory Reset or the General startup override preference.

### Open User Data Folder… / Open Backup Folder…

These open the build-specific folders in Finder and are safer than hardcoding an Application Support bundle path. Treat their contents as sensitive: they can contain debugging rules, scripts, Map Local files, sessions, certificates, and backups.

The official lost-data guide describes update-time backups, but Factory Reset with its broad deletion checkbox also deletes the reviewed app-managed backup folder. Copy any required backup to an approved location outside Proxyman's Application Support tree before reset.

Official docs: [Lost data recovery](https://docs.proxyman.com/troubleshooting/lost-data-after-updating-proxyman-app), [Command-line rule export/import](https://docs.proxyman.com/command-line).

### Simulate Memory Warning

The reviewed production build hides this developer action. Do not tell ordinary users to rely on it even if a development build exposes it.

## Factory Reset

Factory Reset is destructive and not a generic first troubleshooting step.

### Preflight

1. Confirm the user means **Help > Advanced > Factory Reset…**, not Reset Network Proxy or Reset all Certificates.
2. Export required debugging-tool rules to an approved external path. Confirm the export opens and contains expected rule families.
3. Export required captured logs separately; rule export does not include traffic.
4. Preserve original custom certificate/key/P12 sources and passphrases outside Proxyman-managed folders. Do not copy secrets into chat.
5. Use Open Backup Folder and copy any required backup outside Proxyman's Application Support tree.
6. Record App Settings and integrations that rule export does not cover.
7. Explain that every Factory Reset path first removes the current Proxyman certificates and resets App Settings/UserDefaults.

### Choose The Checkbox Scope

The confirmation includes **Include all debugging tools rules**:

- **Unchecked:** the reviewed implementation removes certificates, resets app preferences, preserves rule files, disables SSL Proxying/the gateway, and disables all debugging tools before offering restart. Treat rules as retained-but-disabled, not guaranteed active/recoverable.
- **Checked:** it removes certificates/preferences and deletes Proxyman-managed cache, main app data, certificate, addon, user-data, and backup folders. This includes debugging rules and the in-tree backups that might otherwise aid recovery.

There is no reviewed Factory Reset option that preserves the current certificate/trust identity. If that is a requirement, stop and plan a narrower repair instead.

### Execute And Verify

1. Show the chosen checkbox scope and backup evidence to the user.
2. Obtain immediate confirmation at the final Factory Reset dialog.
3. Let Proxyman remove Keychain certificates. If certificate removal/password authorization fails, the reviewed reset stops; inspect state before retrying.
4. After deletion, Proxyman offers a restart. Declining restart does not undo deletion.
5. Relaunch and verify default App Settings, certificate absence, tool state/rule inventory, and required data paths.
6. Restore only the approved rules/data/certificates. Reinstall and trust the new/restored CA on every dependent target, then verify a fresh HTTPS request.

Never automate Factory Reset through filesystem deletion, and never claim rollback is available unless the external backup and certificate sources were actually verified before reset.
