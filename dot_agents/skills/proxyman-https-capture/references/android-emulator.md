# Android Emulator Safety And Workflow

Android emulator capture can modify proxy/VPN state, the system CA store, and—for a Google Play AVD—the boot image. Identify the exact active AVD before doing anything.

## Classify The Image

- **Google APIs/AOSP-style image with `adb root`:** Proxyman's automatic path can use `adb root`, install the system CA, and configure proxying.
- **Android Studio Google Play image:** production-style images do not normally allow `adb root`; the reviewed Proxyman workflow can use a bundled, temporary Magisk route with explicit consent.
- **Third-party emulator or physical device:** do not force either workflow. Use its official/manual device path.

The reviewed built-in guidance says the Magisk route supports Google Play AVDs across API levels and has been tested on API 30–37. Treat that as a reviewed-build fact, not a guarantee for future images; confirm the current in-app guide and automation result.

## Preflight

1. List active adb targets and identify exactly one intended emulator serial/AVD.
2. Confirm it is an Android Studio emulator and classify the image.
3. Check that the correct Proxyman certificate exists and that a reachable host IPv4/port is available.
4. Warn the user that the emulator may stop/restart and that proxy, VPN, certificate, and boot state can change.
5. Make sure the user can afford to recreate the AVD or restore its state if it is disposable development infrastructure.

Do not continue when multiple active emulators make the target ambiguous.

## MCP Automation

1. Read `docs://setup/android-emulator` and call `answer_setup_question` with image type/API when known.
2. Discover `run_guided_setup` and the current action schema.
3. Explain which route the app selected.
4. For a Google Play AVD, let Proxyman show the Terminal explanation and require explicit consent before Magisk/root work. Never suppress or pre-answer that consent.
5. Run the override once.
6. Wait for the exact target to return, generate an HTTPS request, and verify flow client identity and body decryption.

## Revert

Revert is a separate user-authorized action:

1. Identify the same active AVD and record the prior override result.
2. Explain that generic revert clears Proxyman proxy/VPN changes.
3. If Proxyman detects its active temporary Magisk session, require the separate Terminal consent that restores the exact Play Store AVD to a stock boot image.
4. Run the live `android_emulator_revert` action only after confirmation.
5. Verify boot completion, stock/root state as reported by the workflow, cleared proxy, and normal network access.

Do not claim stock restoration if the exact AVD did not restart and pass verification.

## Manual Fallback

Use the current official automatic-script or Magisk page. Do not reproduce an old script from memory. Before running it:

- read it and identify destructive commands, target serial, files, boot image, proxy host, and certificate path;
- ensure it targets only the approved AVD;
- obtain confirmation;
- preserve its documented revert path.

Never adapt the emulator Magisk path to a physical device without an explicit, separately scoped request and authoritative device-specific instructions.

## Common Failures

- adb not found or unauthorized;
- multiple emulators/ambiguous target;
- stale global proxy or VPN state;
- host address unreachable from emulator;
- CA was installed but app uses certificate pinning/custom trust;
- user declined Magisk consent;
- unsupported third-party emulator;
- Play AVD changed after an SDK/system-image update.

Diagnose the exact failure before retrying. Repeated rooting/rebooting is not a substitute for evidence.
