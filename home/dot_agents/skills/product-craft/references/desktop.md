# Desktop Checklist

Each item is a check a user would fail you on. Actions, states, and forms follow `web.md` sections "Every action answers" and "Forms". This file adds what a desktop app changes. Platform guidance: macOS https://developer.apple.com/design/human-interface-guidelines/designing-for-macos, Windows https://learn.microsoft.com/en-us/windows/apps/design/. Electron: https://www.electronjs.org/docs/latest/tutorial/performance.

## Speed

- Cold start to a usable window has a stated target, measured from a release build on named minimum hardware
- The window shows its frame before data loads. No blank or white flash on open
- Heavy work runs off the UI thread. The window never reaches the system's not-responding state
- An idle window has a stated CPU and memory ceiling, measured after an hour open

## Platform fit

- macOS has a menu bar with the standard App, Edit, Window, and Help menus. Standard shortcuts work on every platform: copy, paste, undo, close, quit, settings
- Window size, position, and maximised state persist across launches. A window restored onto a missing monitor moves onto a visible one
- Sharp at every scale factor, and after moving between monitors with different scales
- Dark mode follows the system, if the design has one
- Native file dialogs. Drag and drop of files wherever the app takes files
- Every control works from the keyboard, with visible focus, and has a screen reader label (VoiceOver, Narrator)

## Files and data

- Closing or quitting with unsaved changes asks first. A crash loses no more than the last few seconds of work
- Data lives in the platform's app-data location (`~/Library/Application Support`, `%APPDATA%`, the XDG directories), never beside the binary
- A file opened from outside the app (double-click, Open With) opens in the running instance

## Shipping

- Signed and notarised on macOS, signed on Windows, so the first launch shows no unknown-developer warning
- Updates download in the background and apply on restart. A failed update leaves the old version working: https://www.electronjs.org/docs/latest/tutorial/updates
- Uninstall removes what install added
