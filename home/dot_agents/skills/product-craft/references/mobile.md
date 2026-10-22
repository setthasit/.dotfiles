# Mobile Checklist

Each item is a check a user would fail you on. Actions, states, and forms follow `web.md` sections "Every action answers" and "Forms". This file adds what a phone changes.

## Speed

- Cold start to the first usable screen has a stated target, measured on a mid-range Android device: https://developer.android.com/topic/performance/vitals/launch-time
- Lists scroll at the display's frame rate: virtualized, images cached and sized, no heavy work on the UI or JavaScript thread while scrolling
- Release builds are measured, never debug builds

## Touch

- Targets are at least 44 by 44 pt on iOS (Apple Human Interface Guidelines) and 48 by 48 dp on Android (Material Design)
- Every touchable shows a pressed state
- Haptics confirm a completed action and signal an error, used sparingly and through the platform's semantic feedback types
- Feeds refresh on pull. Swipe actions have a visible alternative

## Platform fit

- Android back and iOS edge swipe each go back one step
- Content respects safe areas. Inputs stay visible above the keyboard
- Text scales with the system font size without clipping. Dark mode follows the system
- Each control has an accessibility label, and the screen reader order matches the visual order

## Real-world conditions

- Offline and slow network each show a visible state. A request has a timeout, so a spinner never runs forever. Writes made offline queue or fail with a message
- A permission is asked in context, after a screen that says why. The denied path still works
- State survives backgrounding and process death. A deep link or a push notification opens the right screen
- Store assets: app icon at every size, launch screen, and a crash-free release build
