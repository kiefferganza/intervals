# Interval Timer PWA — Design

**Date:** 2026-08-19
**Status:** Approved

## Overview

A Nuxt-based interval timer app for structured workouts (warmup + work/rest rounds). Installable as a PWA and fully usable offline. Single-config editing (no saved presets) — the user edits warmup/work/rest/rounds each time, with the last-used values persisted locally.

## Architecture

- **Framework:** Nuxt 3, SPA mode (`ssr: false`). Pure client-side app — no backend, no API calls, offline by default once assets are cached.
- **PWA:** `@vite-pwa/nuxt` module. Service worker precaches the app shell and static assets. Web app manifest for installability (standalone display, icons).
- **State management:** No Pinia — a single composable (`useIntervalTimer`) holds all timer state. The app is one screen's worth of logic; a store would be unnecessary overhead.
- **Styling:** Design system and visual polish applied via the `design-taste-frontend-v1` skill at implementation time.

## Timer Engine (`useIntervalTimer` composable)

Phase state machine:

```
idle → warmup → work ⇄ rest (loop for N rounds) → done → idle
```

- Each phase is `{ label, duration, color }`.
- **Timestamp-based countdown** (not naive decrement): on phase start, store `endTime = Date.now() + duration * 1000`. A `setInterval` tick (250ms, for smooth ring animation) computes `remaining = Math.max(0, endTime - Date.now())`. This avoids drift from `setInterval` throttling when the tab is backgrounded/inactive — accuracy is derived from wall-clock time, not tick count.
- Phase auto-advances at `remaining === 0`, firing a cue callback on every transition (including into `done`).

### Controls

- **Pause/Resume** — on pause, freeze `remaining`; on resume, recompute `endTime = Date.now() + remaining`.
- **Skip** — force current phase to end immediately, triggering the same transition logic as a natural phase completion.
- **Reset** — return to `idle`, clear any active phase/timer state, return to the setup screen.

## Components

- **`SetupScreen.vue`** — number inputs for warmup, work, rest (seconds) and round count. Start button disabled until all values are positive integers.
- **`TimerScreen.vue`** — large circular SVG progress ring (`stroke-dasharray` driven by `remaining / duration`), large digit readout in the center, phase label, and a color per phase (warmup = amber, work = green, rest = blue, done = purple). Controls row: Pause/Resume, Skip, Reset.

## Cues & Device Integration

- **Audio:** Web Audio API beep on every phase transition; a distinct tone on reaching `done`. Audio context is unlocked by the Start button tap (satisfies browser autoplay-gesture requirements).
- **Vibration:** `navigator.vibrate(...)` paired with each audio cue, feature-detected. iOS Safari lacks the Vibration API — silently no-ops there; sound still fires.
- **Wake Lock:** `navigator.wakeLock.request('screen')` acquired when the timer starts, released on pause, done, or reset. Feature-detected with a silent fallback if unsupported.

## Persistence

- Setup config (warmup/work/rest/rounds) is saved to `localStorage` on change and restored on load, so the user doesn't re-enter values each session.
- Live run state (current phase, remaining time, round index) is **not** persisted. Closing or reloading mid-run returns to the setup screen. This was an explicit scope decision — no resume-after-close complexity.

## Error Handling

- Setup form validation blocks Start until all values are valid positive integers; no invalid-state handling needed downstream.
- Wake Lock and Vibration APIs are feature-detected; unsupported browsers get a silent fallback with no user-facing error.
- No network calls exist anywhere in the app, so there is no offline-specific error handling needed beyond the service worker's precaching — offline works by not needing the network at all.

## Testing

- **Manual:** Desktop browser dev testing; mobile PWA install (Add to Home Screen); airplane-mode reload to confirm offline behavior.
- **Unit:** Pure phase-transition logic in `useIntervalTimer` (given a config, assert the expected phase sequence and durations) — testable without real timers using fake-timer utilities, independent of the DOM.

## Out of Scope

- Multiple saved presets (single-config editing only, per explicit decision).
- Resume-after-close mid-run state.
- Backend/sync/accounts — fully local, single-device app.
