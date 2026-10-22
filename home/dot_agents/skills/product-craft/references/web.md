# Web Checklist

Each item is a check a user would fail you on. Token, component, and layout fit to the design source is the design review's axis, not this file's.

## Speed

- Core Web Vitals at the "good" threshold, 75th percentile: LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.1 (https://web.dev/articles/vitals). Measured with Lighthouse or the `web-vitals` library on a throttled mobile profile
- A JavaScript budget per route, checked in the build
- Images are sized, carry width and height, use a modern format, and lazy-load below the fold. Fonts are preloaded and use `font-display`

## Every action answers

- A pending state shows within 100 ms of the press: the control disabled with a spinner, or an optimistic update that rolls back on failure. A second press never submits twice
- Success is confirmed where the user is looking. Failure says what happened and what to do next, in words, never a raw code
- Every view that loads data has four states: loading (a skeleton in the final layout), empty (what goes here and the action that fills it), error (with retry), and loaded
- A destructive action has undo, or a confirmation that names what is lost

## Forms

- Input survives an error and a reload
- Validation runs on blur and on submit. Each message sits next to its field and is announced to screen readers
- Fields use the right `type`, `autocomplete`, and `inputmode`, so mobile keyboards and password managers work

## Interaction

- WCAG 2.2 AA (https://www.w3.org/TR/WCAG22/): text contrast 4.5:1, interface contrast 3:1, targets at least 24 by 24 CSS px
- Every control works from the keyboard, focus is visible, Esc closes a dialog, and focus returns to what opened it
- State changes animate briefly, and `prefers-reduced-motion` turns the motion off
- Layout holds from 320 px wide to a wide desktop, with no horizontal page scroll

## Details a finished site has

- Every view has its own URL and title. Back and forward work. A deep link restores the view
- Real copy, one term per thing, no placeholder text
- Favicon, social preview metadata, and designed 404 and error pages
- Dark mode when the platform signals it, if the design has one
