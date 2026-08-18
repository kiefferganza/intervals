# Interval Timer PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Nuxt-based, installable, offline-capable interval timer PWA with a warmup + work/rest round sequence, big circular progress UI, audio/vibration cues, wake lock, and localStorage-persisted config.

**Architecture:** Nuxt 3 SPA (`ssr: false`) with `@vite-pwa/nuxt` for offline service-worker caching and installability. A single composable (`useIntervalTimer`) drives a timestamp-based phase state machine — no Pinia, no backend. Config persists via a singleton `useLocalStorage`-backed composable. Styling applied via the `design-taste-frontend-v1` skill after functional build.

**Tech Stack:** Nuxt 3, TypeScript, `@vite-pwa/nuxt`, `@vueuse/nuxt` (`useLocalStorage`, `tryOnUnmounted`), Vitest + `@nuxt/test-utils` + `@vue/test-utils` (component/composable tests), `sharp` (build-time icon generation only).

## Global Constraints

- SPA mode: `ssr: false` in `nuxt.config.ts` — no server-rendering, no backend, no API calls anywhere in the app.
- No Pinia — all shared state lives in composables (`useIntervalTimer`, `useTimerConfig`).
- Timer countdown MUST be timestamp-based (`endTime - Date.now()`), never a naive per-tick decrement — required for accuracy under `setInterval` throttling when backgrounded.
- Wake Lock, Vibration, and Web Audio APIs are all feature-detected; unsupported browsers get a silent no-op fallback, never a thrown error or visible error state.
- Setup config (warmup/work/rest/rounds) persists to `localStorage`; live run state (current phase/remaining/round) does NOT persist across reload.
- Visual styling is applied via the `design-taste-frontend-v1` skill (Task 13), not hand-rolled ad hoc in earlier tasks — earlier component tasks use plain, unstyled or minimally-styled markup focused on correct behavior.

---

### Task 1: Scaffold Nuxt Project

**Files:**
- Create: `package.json`
- Create: `nuxt.config.ts`
- Create: `tsconfig.json`
- Create: `app.vue`
- Create: `.gitignore`

**Interfaces:**
- Produces: a runnable Nuxt project (`npm run dev`, `npm run build`, `npm run generate` all functional) that every later task builds on.

- [ ] **Step 1: Create `.gitignore`**

```
node_modules
.nuxt
.output
dist
.env
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "intervals",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "test": "vitest run"
  },
  "devDependencies": {
    "nuxt": "^3.13.0"
  }
}
```

- [ ] **Step 3: Create `nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-08-19',
  devtools: { enabled: true }
})
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

- [ ] **Step 5: Create `app.vue`**

```vue
<template>
  <div>Interval Timer</div>
</template>
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: completes without errors, `node_modules` and `.nuxt` created.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: exits 0, `.output/` directory created, no errors in output.

- [ ] **Step 8: Commit**

```bash
git add package.json nuxt.config.ts tsconfig.json app.vue .gitignore package-lock.json
git commit -m "chore: scaffold Nuxt 3 SPA project"
```

---

### Task 2: Configure PWA Module + Generate Icons

**Files:**
- Modify: `nuxt.config.ts`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png` (generated, not hand-written)
- Create: `public/icons/icon-512.png` (generated)
- Create: `public/icons/icon-512-maskable.png` (generated)

**Interfaces:**
- Produces: installable PWA manifest + service worker on `npm run generate`, consumed by no other task directly but required for the offline requirement verified in Task 14.

- [ ] **Step 1: Install PWA module and icon generation dependency**

Run: `npm install @vite-pwa/nuxt && npm install -D sharp`
Expected: both added to `package.json` (`@vite-pwa/nuxt` under `dependencies`, `sharp` under `devDependencies`).

- [ ] **Step 2: Create icon generation script**

```js
// scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#111827"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#22c55e" stroke-width="9"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" stroke-width="9"
    stroke-dasharray="238" stroke-dashoffset="80" stroke-linecap="round" transform="rotate(-90 50 50)"/>
</svg>`

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-512-maskable.png', size: 512 }
]

for (const { file, size } of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`)
}

console.log('Icons generated in public/icons/')
```

- [ ] **Step 3: Run the icon generation script**

Run: `node scripts/generate-icons.mjs`
Expected: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png` created.

- [ ] **Step 4: Verify icon dimensions**

Run: `sips -g pixelWidth -g pixelHeight public/icons/icon-192.png public/icons/icon-512.png`
Expected: output shows `pixelWidth: 192 / pixelHeight: 192` for the first file and `512 / 512` for the second.

- [ ] **Step 5: Register the PWA module and manifest**

Modify `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-08-19',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Interval Timer',
      short_name: 'Intervals',
      description: 'Offline-first warmup/work/rest interval timer',
      theme_color: '#111827',
      background_color: '#111827',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}']
    }
  }
})
```

- [ ] **Step 6: Verify service worker and manifest are generated**

Run: `npm run generate`
Expected: exits 0; `.output/public/sw.js` and `.output/public/manifest.webmanifest` both exist.

Run: `ls .output/public/sw.js .output/public/manifest.webmanifest`
Expected: both paths printed, no "No such file" error.

- [ ] **Step 7: Commit**

```bash
git add nuxt.config.ts scripts/generate-icons.mjs public/icons package.json package-lock.json
git commit -m "feat: add PWA manifest, service worker, and app icons"
```

---

### Task 3: Configure Vitest Testing Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test` command with Nuxt auto-imports available inside test files, required by every composable/component task from Task 4 onward.

- [ ] **Step 1: Install test dependencies**

Run: `npm install -D vitest @nuxt/test-utils @vue/test-utils happy-dom`
Expected: all four added under `devDependencies`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt'
  }
})
```

- [ ] **Step 3: Write the smoke test**

```ts
// tests/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('nuxt test environment', () => {
  it('auto-imports Vue reactivity APIs without explicit import', () => {
    const count = ref(0)
    count.value++
    expect(count.value).toBe(1)
  })
})
```

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: 1 test file, 1 test, PASS. If `ref is not defined`, the `environment: 'nuxt'` setting in `vitest.config.ts` is not taking effect — verify `@nuxt/test-utils` installed correctly.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts package.json package-lock.json
git commit -m "test: configure Vitest with Nuxt test environment"
```

---

### Task 4: Timer Types & Phase Sequence Builder

**Files:**
- Create: `types/timer.ts`
- Create: `utils/timerSequence.ts`
- Test: `tests/timerSequence.test.ts`

**Interfaces:**
- Produces:
  - `type PhaseName = 'warmup' | 'work' | 'rest' | 'done'`
  - `interface TimerConfig { warmupSeconds: number; workSeconds: number; restSeconds: number; rounds: number }`
  - `interface PhaseInfo { name: PhaseName; label: string; color: string; duration: number; round: number | null }`
  - `function buildPhaseSequence(config: TimerConfig): PhaseInfo[]`
- Consumed by: Task 5 (`useIntervalTimer`), Task 6 (`useTimerConfig` default), Task 8 (`useTimerCues`), Task 9–11 (components).

**Design decision:** the final round's rest phase is omitted (no reason to wait after the last work interval before finishing). Sequence shape for `rounds = 3` with warmup: `[warmup, work1, rest1, work2, rest2, work3, done]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/timerSequence.test.ts
import { describe, it, expect } from 'vitest'
import { buildPhaseSequence } from '~/utils/timerSequence'

describe('buildPhaseSequence', () => {
  it('includes warmup first when warmupSeconds > 0', () => {
    const sequence = buildPhaseSequence({ warmupSeconds: 10, workSeconds: 20, restSeconds: 5, rounds: 2 })
    expect(sequence[0]).toMatchObject({ name: 'warmup', duration: 10, round: null })
  })

  it('omits warmup when warmupSeconds is 0', () => {
    const sequence = buildPhaseSequence({ warmupSeconds: 0, workSeconds: 20, restSeconds: 5, rounds: 2 })
    expect(sequence[0]).toMatchObject({ name: 'work', round: 1 })
  })

  it('alternates work/rest per round and omits the trailing rest after the final round', () => {
    const sequence = buildPhaseSequence({ warmupSeconds: 0, workSeconds: 20, restSeconds: 5, rounds: 3 })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['work1', 'rest1', 'work2', 'rest2', 'work3', 'done'])
  })

  it('always ends with a done phase of duration 0', () => {
    const sequence = buildPhaseSequence({ warmupSeconds: 0, workSeconds: 20, restSeconds: 5, rounds: 1 })
    expect(sequence.at(-1)).toMatchObject({ name: 'done', duration: 0, round: null })
  })

  it('assigns each work/rest phase the correct color', () => {
    const sequence = buildPhaseSequence({ warmupSeconds: 5, workSeconds: 20, restSeconds: 5, rounds: 1 })
    expect(sequence.find(p => p.name === 'warmup')?.color).toBe('#f59e0b')
    expect(sequence.find(p => p.name === 'work')?.color).toBe('#22c55e')
    expect(sequence.find(p => p.name === 'done')?.color).toBe('#a855f7')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/timerSequence.test.ts`
Expected: FAIL — `Cannot find module '~/utils/timerSequence'` (file doesn't exist yet).

- [ ] **Step 3: Create the types file**

```ts
// types/timer.ts
export type PhaseName = 'warmup' | 'work' | 'rest' | 'done'

export interface TimerConfig {
  warmupSeconds: number
  workSeconds: number
  restSeconds: number
  rounds: number
}

export interface PhaseInfo {
  name: PhaseName
  label: string
  color: string
  duration: number
  round: number | null
}
```

- [ ] **Step 4: Implement `buildPhaseSequence`**

```ts
// utils/timerSequence.ts
import type { PhaseInfo, TimerConfig } from '~/types/timer'

export function buildPhaseSequence(config: TimerConfig): PhaseInfo[] {
  const sequence: PhaseInfo[] = []

  if (config.warmupSeconds > 0) {
    sequence.push({ name: 'warmup', label: 'Warm Up', color: '#f59e0b', duration: config.warmupSeconds, round: null })
  }

  for (let round = 1; round <= config.rounds; round++) {
    sequence.push({ name: 'work', label: 'Work', color: '#22c55e', duration: config.workSeconds, round })
    if (round < config.rounds) {
      sequence.push({ name: 'rest', label: 'Rest', color: '#3b82f6', duration: config.restSeconds, round })
    }
  }

  sequence.push({ name: 'done', label: 'Done', color: '#a855f7', duration: 0, round: null })

  return sequence
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/timerSequence.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add types/timer.ts utils/timerSequence.ts tests/timerSequence.test.ts
git commit -m "feat: add timer types and pure phase sequence builder"
```

---

### Task 5: `useIntervalTimer` Composable

**Files:**
- Create: `composables/useIntervalTimer.ts`
- Test: `tests/useIntervalTimer.test.ts`

**Interfaces:**
- Consumes: `buildPhaseSequence(config: TimerConfig): PhaseInfo[]` from `~/utils/timerSequence`; `TimerConfig`, `PhaseInfo` from `~/types/timer`.
- Produces: `function useIntervalTimer(config: TimerConfig)` returning:
  ```ts
  {
    phase: Ref<PhaseInfo>
    phaseIndex: Ref<number>
    remaining: Ref<number>        // seconds, fractional
    progress: ComputedRef<number> // 0..1
    isRunning: Ref<boolean>
    isPaused: Ref<boolean>
    isDone: ComputedRef<boolean>
    totalRounds: Ref<number>
    onPhaseChange: (cb: (phase: PhaseInfo) => void) => void
    start: () => void
    pause: () => void
    resume: () => void
    skip: () => void
    reset: () => void
  }
  ```
  Consumed by Task 11 (`TimerScreen.vue`).

- [ ] **Step 1: Install `@vueuse/nuxt`**

Run: `npm install @vueuse/nuxt`
Modify `nuxt.config.ts` — add `'@vueuse/nuxt'` to the `modules` array (alongside `'@vite-pwa/nuxt'`):

```ts
  modules: ['@vite-pwa/nuxt', '@vueuse/nuxt'],
```

- [ ] **Step 2: Write the failing tests**

```ts
// tests/useIntervalTimer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useIntervalTimer } from '~/composables/useIntervalTimer'

describe('useIntervalTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts on the first phase with full duration', () => {
    const timer = useIntervalTimer({ warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 })
    timer.start()
    expect(timer.phase.value.name).toBe('warmup')
    expect(timer.remaining.value).toBe(5)
  })

  it('counts down remaining time as ticks pass', () => {
    const timer = useIntervalTimer({ warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 })
    timer.start()
    vi.advanceTimersByTime(2000)
    expect(timer.remaining.value).toBeCloseTo(3, 1)
  })

  it('auto-advances to the next phase when remaining hits zero', () => {
    const timer = useIntervalTimer({ warmupSeconds: 2, workSeconds: 10, restSeconds: 5, rounds: 1 })
    timer.start()
    vi.advanceTimersByTime(2100)
    expect(timer.phase.value.name).toBe('work')
  })

  it('stays accurate after a large time jump (simulated background throttle)', () => {
    const timer = useIntervalTimer({ warmupSeconds: 0, workSeconds: 10, restSeconds: 5, rounds: 1 })
    timer.start()
    vi.setSystemTime(new Date('2026-01-01T00:00:07Z'))
    vi.advanceTimersByTime(250)
    expect(timer.remaining.value).toBeCloseTo(3, 1)
  })

  it('pauses and resumes without losing remaining time', () => {
    const timer = useIntervalTimer({ warmupSeconds: 0, workSeconds: 10, restSeconds: 5, rounds: 1 })
    timer.start()
    vi.advanceTimersByTime(3000)
    timer.pause()
    const remainingAtPause = timer.remaining.value
    vi.advanceTimersByTime(5000)
    expect(timer.remaining.value).toBeCloseTo(remainingAtPause, 1)
    timer.resume()
    vi.advanceTimersByTime(1000)
    expect(timer.remaining.value).toBeCloseTo(remainingAtPause - 1, 1)
  })

  it('skip immediately advances to the next phase', () => {
    const timer = useIntervalTimer({ warmupSeconds: 0, workSeconds: 10, restSeconds: 5, rounds: 2 })
    timer.start()
    timer.skip()
    expect(timer.phase.value.name).toBe('rest')
  })

  it('reset returns to the first phase and stops running', () => {
    const timer = useIntervalTimer({ warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 })
    timer.start()
    vi.advanceTimersByTime(2000)
    timer.reset()
    expect(timer.isRunning.value).toBe(false)
    expect(timer.phase.value.name).toBe('warmup')
    expect(timer.remaining.value).toBe(5)
  })

  it('reaches done after the final phase and stops running', () => {
    const timer = useIntervalTimer({ warmupSeconds: 0, workSeconds: 2, restSeconds: 0, rounds: 1 })
    timer.start()
    vi.advanceTimersByTime(2100)
    expect(timer.phase.value.name).toBe('done')
    expect(timer.isRunning.value).toBe(false)
    expect(timer.isDone.value).toBe(true)
  })

  it('fires onPhaseChange exactly once per transition, including entry into the first phase', () => {
    const timer = useIntervalTimer({ warmupSeconds: 1, workSeconds: 1, restSeconds: 0, rounds: 1 })
    const seen: string[] = []
    timer.onPhaseChange(p => seen.push(p.name))
    timer.start()
    vi.advanceTimersByTime(2500)
    expect(seen).toEqual(['warmup', 'work', 'done'])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/useIntervalTimer.test.ts`
Expected: FAIL — `Cannot find module '~/composables/useIntervalTimer'`.

- [ ] **Step 4: Implement the composable**

```ts
// composables/useIntervalTimer.ts
import { tryOnUnmounted } from '@vueuse/core'
import { buildPhaseSequence } from '~/utils/timerSequence'
import type { PhaseInfo, TimerConfig } from '~/types/timer'

const TICK_MS = 250

export function useIntervalTimer(config: TimerConfig) {
  const sequence = buildPhaseSequence(config)
  const phaseIndex = ref(0)
  const phase = computed<PhaseInfo>(() => sequence[phaseIndex.value])
  const remaining = ref(sequence[0]?.duration ?? 0)
  const isRunning = ref(false)
  const isPaused = ref(false)
  const isDone = computed(() => phase.value?.name === 'done')
  const totalRounds = ref(config.rounds)

  const progress = computed(() => {
    const duration = phase.value?.duration ?? 0
    return duration > 0 ? remaining.value / duration : 0
  })

  let endTime = 0
  let intervalId: ReturnType<typeof setInterval> | null = null
  const listeners: Array<(phase: PhaseInfo) => void> = []

  function onPhaseChange(cb: (phase: PhaseInfo) => void) {
    listeners.push(cb)
  }

  function notify() {
    for (const cb of listeners) cb(phase.value)
  }

  function clearTick() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function armPhase() {
    const current = phase.value
    remaining.value = current.duration
    endTime = Date.now() + current.duration * 1000
  }

  function advance() {
    if (phaseIndex.value >= sequence.length - 1) return
    phaseIndex.value += 1
    armPhase()
    notify()
    if (phase.value.name === 'done') {
      clearTick()
      isRunning.value = false
    }
  }

  function tick() {
    remaining.value = Math.max(0, (endTime - Date.now()) / 1000)
    if (remaining.value <= 0) advance()
  }

  function start() {
    if (isRunning.value) return
    phaseIndex.value = 0
    isRunning.value = true
    isPaused.value = false
    armPhase()
    notify()
    clearTick()
    intervalId = setInterval(tick, TICK_MS)
  }

  function pause() {
    if (!isRunning.value || isPaused.value) return
    isPaused.value = true
    clearTick()
  }

  function resume() {
    if (!isRunning.value || !isPaused.value) return
    isPaused.value = false
    endTime = Date.now() + remaining.value * 1000
    intervalId = setInterval(tick, TICK_MS)
  }

  function skip() {
    if (!isRunning.value) return
    advance()
  }

  function reset() {
    clearTick()
    isRunning.value = false
    isPaused.value = false
    phaseIndex.value = 0
    remaining.value = sequence[0]?.duration ?? 0
  }

  tryOnUnmounted(clearTick)

  return {
    phase, phaseIndex, remaining, progress, isRunning, isPaused, isDone,
    totalRounds, onPhaseChange, start, pause, resume, skip, reset
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/useIntervalTimer.test.ts`
Expected: 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add composables/useIntervalTimer.ts tests/useIntervalTimer.test.ts nuxt.config.ts package.json package-lock.json
git commit -m "feat: add timestamp-based useIntervalTimer composable"
```

---

### Task 6: `useTimerConfig` Composable

**Files:**
- Create: `composables/useTimerConfig.ts`
- Test: `tests/useTimerConfig.test.ts`

**Interfaces:**
- Consumes: `TimerConfig` from `~/types/timer`; `useLocalStorage` (auto-imported via `@vueuse/nuxt`, installed in Task 5).
- Produces: `export const defaultTimerConfig: TimerConfig`; `function useTimerConfig(): { config: Ref<TimerConfig> }` — returns the **same shared ref instance** on every call (singleton), so all components stay in sync without an extra store. Consumed by Task 10 (`SetupScreen.vue`) and Task 12 (`app.vue`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/useTimerConfig.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimerConfig, defaultTimerConfig } from '~/composables/useTimerConfig'

describe('useTimerConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the default config when nothing is stored', () => {
    const { config } = useTimerConfig()
    expect(config.value).toEqual(defaultTimerConfig)
  })

  it('persists changes to localStorage', () => {
    const { config } = useTimerConfig()
    config.value.workSeconds = 45
    expect(JSON.parse(localStorage.getItem('interval-timer-config')!).workSeconds).toBe(45)
  })

  it('returns the same reactive instance across multiple calls (singleton)', () => {
    const a = useTimerConfig()
    const b = useTimerConfig()
    a.config.value.rounds = 3
    expect(b.config.value.rounds).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/useTimerConfig.test.ts`
Expected: FAIL — `Cannot find module '~/composables/useTimerConfig'`.

- [ ] **Step 3: Implement the composable**

```ts
// composables/useTimerConfig.ts
import type { TimerConfig } from '~/types/timer'

const STORAGE_KEY = 'interval-timer-config'

export const defaultTimerConfig: TimerConfig = {
  warmupSeconds: 30,
  workSeconds: 40,
  restSeconds: 20,
  rounds: 8
}

let sharedConfig: ReturnType<typeof useLocalStorage<TimerConfig>> | null = null

export function useTimerConfig() {
  if (!sharedConfig) {
    sharedConfig = useLocalStorage<TimerConfig>(STORAGE_KEY, { ...defaultTimerConfig })
  }
  return { config: sharedConfig }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/useTimerConfig.test.ts`
Expected: 3 tests PASS. Note: since `localStorage.clear()` doesn't reset the module-level `sharedConfig` variable between tests, this relies on Vitest re-evaluating the module per test file (default behavior) — if tests were split across files sharing this module within one run, `sharedConfig` would persist. That's fine here since all three assertions intentionally rely on the singleton behavior within this one file.

- [ ] **Step 5: Commit**

```bash
git add composables/useTimerConfig.ts tests/useTimerConfig.test.ts
git commit -m "feat: add singleton useTimerConfig composable with localStorage persistence"
```

---

### Task 7: `useWakeLock` Composable

**Files:**
- Create: `composables/useWakeLock.ts`
- Test: `tests/useWakeLock.test.ts`

**Interfaces:**
- Produces: `function useWakeLock(): { isActive: Ref<boolean>; acquire: () => Promise<void>; release: () => Promise<void> }`. Consumed by Task 11 (`TimerScreen.vue`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/useWakeLock.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useWakeLock } from '~/composables/useWakeLock'

describe('useWakeLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when the Wake Lock API is unsupported', async () => {
    const { isActive, acquire } = useWakeLock()
    await acquire()
    expect(isActive.value).toBe(false)
  })

  it('acquires a sentinel and sets isActive when supported', async () => {
    const mockSentinel = { release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() }
    vi.stubGlobal('navigator', {
      ...navigator,
      wakeLock: { request: vi.fn().mockResolvedValue(mockSentinel) }
    })

    const { isActive, acquire, release } = useWakeLock()
    await acquire()
    expect(isActive.value).toBe(true)

    await release()
    expect(mockSentinel.release).toHaveBeenCalled()
    expect(isActive.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/useWakeLock.test.ts`
Expected: FAIL — `Cannot find module '~/composables/useWakeLock'`.

- [ ] **Step 3: Implement the composable**

```ts
// composables/useWakeLock.ts
export function useWakeLock() {
  const isActive = ref(false)
  let sentinel: WakeLockSentinel | null = null

  async function acquire() {
    if (!('wakeLock' in navigator)) return
    try {
      sentinel = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request('screen')
      isActive.value = true
      sentinel?.addEventListener('release', () => {
        isActive.value = false
      })
    } catch {
      isActive.value = false
    }
  }

  async function release() {
    if (sentinel) {
      await sentinel.release()
      sentinel = null
    }
    isActive.value = false
  }

  return { isActive, acquire, release }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/useWakeLock.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add composables/useWakeLock.ts tests/useWakeLock.test.ts
git commit -m "feat: add feature-detected useWakeLock composable"
```

---

### Task 8: `useTimerCues` Composable

**Files:**
- Create: `composables/useTimerCues.ts`
- Test: `tests/useTimerCues.test.ts`

**Interfaces:**
- Consumes: `PhaseInfo` from `~/types/timer`.
- Produces: `function useTimerCues(): { fireCue: (phase: PhaseInfo) => void }`. Consumed by Task 11 (`TimerScreen.vue`) via `timer.onPhaseChange(fireCue)`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/useTimerCues.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useTimerCues } from '~/composables/useTimerCues'

describe('useTimerCues', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls navigator.vibrate with a short pattern on a normal phase change', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { ...navigator, vibrate })

    const { fireCue } = useTimerCues()
    fireCue({ name: 'work', label: 'Work', color: '#22c55e', duration: 40, round: 1 })

    expect(vibrate).toHaveBeenCalledWith(150)
  })

  it('calls navigator.vibrate with a longer pattern on done', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { ...navigator, vibrate })

    const { fireCue } = useTimerCues()
    fireCue({ name: 'done', label: 'Done', color: '#a855f7', duration: 0, round: null })

    expect(vibrate).toHaveBeenCalledWith([200, 100, 200, 100, 200])
  })

  it('does not throw when the Vibration API is unsupported', () => {
    const nav = { ...navigator } as Partial<Navigator>
    delete nav.vibrate
    vi.stubGlobal('navigator', nav)

    const { fireCue } = useTimerCues()
    expect(() => fireCue({ name: 'work', label: 'Work', color: '#22c55e', duration: 40, round: 1 })).not.toThrow()
  })

  it('does not throw when the Web Audio API is unsupported', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    const { fireCue } = useTimerCues()
    expect(() => fireCue({ name: 'work', label: 'Work', color: '#22c55e', duration: 40, round: 1 })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/useTimerCues.test.ts`
Expected: FAIL — `Cannot find module '~/composables/useTimerCues'`.

- [ ] **Step 3: Implement the composable**

```ts
// composables/useTimerCues.ts
import type { PhaseInfo } from '~/types/timer'

function supportsAudio() {
  return typeof window !== 'undefined' &&
    (typeof (window as unknown as { AudioContext?: unknown }).AudioContext !== 'undefined' ||
     typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined')
}

function playBeep(frequency: number, durationMs: number) {
  if (!supportsAudio()) return
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    .AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function useTimerCues() {
  function fireCue(phase: PhaseInfo) {
    if (phase.name === 'done') {
      playBeep(880, 400)
      vibrate([200, 100, 200, 100, 200])
    } else {
      playBeep(660, 200)
      vibrate(150)
    }
  }

  return { fireCue }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/useTimerCues.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add composables/useTimerCues.ts tests/useTimerCues.test.ts
git commit -m "feat: add feature-detected useTimerCues composable (audio + vibration)"
```

---

### Task 9: `CircularProgress` Component

**Files:**
- Create: `components/CircularProgress.vue`
- Test: `tests/CircularProgress.test.ts`

**Interfaces:**
- Produces: `<CircularProgress :progress="number 0..1" :color="string" :size="number?">` with a default `<slot />` rendered inside the `<svg>` for center content (label/digits). Ring circumference is fixed at `754` (radius 120). Consumed by Task 11 (`TimerScreen.vue`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/CircularProgress.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CircularProgress from '~/components/CircularProgress.vue'

describe('CircularProgress', () => {
  it('sets stroke-dashoffset proportional to progress', () => {
    const wrapper = mount(CircularProgress, { props: { progress: 0.5, color: '#22c55e' } })
    const ring = wrapper.findAll('circle')[1]
    expect(ring.attributes('stroke-dashoffset')).toBe('377')
  })

  it('shows a full ring (offset 0) at progress 1', () => {
    const wrapper = mount(CircularProgress, { props: { progress: 1, color: '#22c55e' } })
    const ring = wrapper.findAll('circle')[1]
    expect(ring.attributes('stroke-dashoffset')).toBe('0')
  })

  it('renders slot content inside the svg', () => {
    const wrapper = mount(CircularProgress, {
      props: { progress: 0.5, color: '#22c55e' },
      slots: { default: '<text>42</text>' }
    })
    expect(wrapper.find('svg text').text()).toBe('42')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/CircularProgress.test.ts`
Expected: FAIL — module `~/components/CircularProgress.vue` not found.

- [ ] **Step 3: Implement the component**

```vue
<!-- components/CircularProgress.vue -->
<script setup lang="ts">
defineProps<{
  progress: number
  color: string
  size?: number
}>()
</script>

<template>
  <svg :width="size ?? 280" :height="size ?? 280" viewBox="0 0 280 280">
    <circle cx="140" cy="140" r="120" fill="none" stroke="#1f2937" stroke-width="16" />
    <circle
      cx="140" cy="140" r="120" fill="none"
      :stroke="color" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="754"
      :stroke-dashoffset="754 * (1 - progress)"
      transform="rotate(-90 140 140)"
    />
    <slot />
  </svg>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/CircularProgress.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/CircularProgress.vue tests/CircularProgress.test.ts
git commit -m "feat: add CircularProgress SVG ring component"
```

---

### Task 10: `SetupScreen` Component

**Files:**
- Create: `components/SetupScreen.vue`
- Test: `tests/SetupScreen.test.ts`

**Interfaces:**
- Consumes: `useTimerConfig()` from Task 6.
- Produces: `<SetupScreen @start="() => void">`. Renders 4 number inputs (order: warmup, work, rest, rounds) bound to `config.value`, a Start button disabled until `workSeconds > 0 && rounds > 0 && warmupSeconds >= 0 && restSeconds >= 0`. Consumed by Task 12 (`app.vue`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/SetupScreen.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupScreen from '~/components/SetupScreen.vue'

describe('SetupScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('disables Start when workSeconds is 0', async () => {
    const wrapper = mount(SetupScreen)
    const workInput = wrapper.findAll('input')[1]
    await workInput.setValue(0)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('enables Start when all values are valid and emits start on click', async () => {
    const wrapper = mount(SetupScreen)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue(10)
    await inputs[1].setValue(30)
    await inputs[2].setValue(15)
    await inputs[3].setValue(5)
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/SetupScreen.test.ts`
Expected: FAIL — module `~/components/SetupScreen.vue` not found.

- [ ] **Step 3: Implement the component**

```vue
<!-- components/SetupScreen.vue -->
<script setup lang="ts">
const { config } = useTimerConfig()

const emit = defineEmits<{ start: [] }>()

const isValid = computed(() =>
  config.value.warmupSeconds >= 0 &&
  config.value.workSeconds > 0 &&
  config.value.restSeconds >= 0 &&
  config.value.rounds > 0
)
</script>

<template>
  <div class="setup-screen">
    <h1>Interval Timer</h1>
    <label>
      Warm Up (sec)
      <input v-model.number="config.warmupSeconds" type="number" min="0" />
    </label>
    <label>
      Work (sec)
      <input v-model.number="config.workSeconds" type="number" min="1" />
    </label>
    <label>
      Rest (sec)
      <input v-model.number="config.restSeconds" type="number" min="0" />
    </label>
    <label>
      Rounds
      <input v-model.number="config.rounds" type="number" min="1" />
    </label>
    <button :disabled="!isValid" @click="emit('start')">Start</button>
  </div>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/SetupScreen.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/SetupScreen.vue tests/SetupScreen.test.ts
git commit -m "feat: add SetupScreen component with validated config form"
```

---

### Task 11: `TimerScreen` Component

**Files:**
- Create: `components/TimerScreen.vue`
- Test: `tests/TimerScreen.test.ts`

**Interfaces:**
- Consumes: `useIntervalTimer(config: TimerConfig)` (Task 5), `useTimerCues()` (Task 8), `useWakeLock()` (Task 7), `<CircularProgress>` (Task 9), `TimerConfig` type (Task 4).
- Produces: `<TimerScreen :config="TimerConfig" @exit="() => void">`. Consumed by Task 12 (`app.vue`).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/TimerScreen.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import TimerScreen from '~/components/TimerScreen.vue'

describe('TimerScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the timer on mount and shows the first phase label', () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 } }
    })
    expect(wrapper.text()).toContain('Warm Up')
  })

  it('pausing swaps the Pause button for Resume', async () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 } }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Resume')
  })

  it('reset emits exit', async () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 } }
    })
    const resetButton = wrapper.findAll('button').at(-1)!
    await resetButton.trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows a Finish button and emits exit when the session completes', async () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 0, workSeconds: 2, restSeconds: 0, rounds: 1 } }
    })
    vi.advanceTimersByTime(2100)
    await nextTick()
    expect(wrapper.text()).toContain('Finish')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/TimerScreen.test.ts`
Expected: FAIL — module `~/components/TimerScreen.vue` not found.

- [ ] **Step 3: Implement the component**

```vue
<!-- components/TimerScreen.vue -->
<script setup lang="ts">
import type { TimerConfig } from '~/types/timer'

const props = defineProps<{ config: TimerConfig }>()
const emit = defineEmits<{ exit: [] }>()

const timer = useIntervalTimer(props.config)
const { fireCue } = useTimerCues()
const wakeLock = useWakeLock()

timer.onPhaseChange((phase) => {
  fireCue(phase)
})

onMounted(() => {
  timer.start()
  wakeLock.acquire()
})

onUnmounted(() => {
  wakeLock.release()
})

function handleExit() {
  timer.reset()
  wakeLock.release()
  emit('exit')
}

function formatTime(seconds: number) {
  const total = Math.ceil(seconds)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="timer-screen">
    <CircularProgress :progress="timer.progress.value" :color="timer.phase.value.color">
      <text x="140" y="130" text-anchor="middle" class="phase-label">{{ timer.phase.value.label }}</text>
      <text x="140" y="170" text-anchor="middle" class="phase-time">{{ formatTime(timer.remaining.value) }}</text>
    </CircularProgress>
    <p v-if="timer.phase.value.round">Round {{ timer.phase.value.round }} / {{ timer.totalRounds.value }}</p>
    <div class="controls">
      <template v-if="!timer.isDone.value">
        <button v-if="!timer.isPaused.value" @click="timer.pause()">Pause</button>
        <button v-else @click="timer.resume()">Resume</button>
        <button @click="timer.skip()">Skip</button>
        <button @click="handleExit">Reset</button>
      </template>
      <button v-else @click="handleExit">Finish</button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/TimerScreen.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/TimerScreen.vue tests/TimerScreen.test.ts
git commit -m "feat: add TimerScreen wiring timer engine, cues, wake lock, and controls"
```

---

### Task 12: App Root Wiring

**Files:**
- Modify: `app.vue`

**Interfaces:**
- Consumes: `useTimerConfig()` (Task 6), `<SetupScreen>` (Task 10), `<TimerScreen>` (Task 11).
- Produces: the complete app entry point — no further consumers.

- [ ] **Step 1: Replace `app.vue` placeholder with real screen switching**

```vue
<!-- app.vue -->
<script setup lang="ts">
const { config } = useTimerConfig()
const started = ref(false)
</script>

<template>
  <SetupScreen v-if="!started" @start="started = true" />
  <TimerScreen v-else :config="{ ...config }" @exit="started = false" />
</template>
```

- [ ] **Step 2: Verify full test suite still passes**

Run: `npm test`
Expected: all test files PASS (no regressions from wiring change).

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`

Using the Claude Browser tool: navigate to `http://localhost:3000`, confirm the Setup screen renders with 4 inputs and a Start button. Fill in valid values, click Start, confirm the Timer screen renders with the circular ring, phase label, countdown, and Pause/Skip/Reset controls. Click Reset, confirm it returns to the Setup screen with the previously entered values still present (persisted).

- [ ] **Step 4: Commit**

```bash
git add app.vue
git commit -m "feat: wire app root to switch between Setup and Timer screens"
```

---

### Task 13: Visual Design Polish

**Files:**
- Modify: `app.vue`
- Modify: `components/SetupScreen.vue`
- Modify: `components/TimerScreen.vue`
- Modify: `components/CircularProgress.vue`

**Interfaces:**
- No new exports or props — this task restyles existing markup only. Component prop/emit contracts defined in Tasks 9–12 MUST remain unchanged so existing tests keep passing.

- [ ] **Step 1: Invoke the design skill**

Invoke Skill `design-taste-frontend-v1` to apply a "big, bold circular progress" visual treatment across `SetupScreen.vue`, `TimerScreen.vue`, `CircularProgress.vue`, and `app.vue` — large touch-friendly inputs, prominent Start button, full-bleed dark background behind the ring, phase-colored accents (amber/green/blue/purple matching `PhaseInfo.color`), large legible digit readout.

- [ ] **Step 2: Run the full test suite to confirm no behavioral regressions**

Run: `npm test`
Expected: all tests still PASS — styling changes must not alter component logic, props, or emitted events.

- [ ] **Step 3: Manually verify visually in the browser**

Run: `npm run dev`

Using the Claude Browser tool: navigate to `http://localhost:3000`, take a screenshot of the Setup screen, start a timer, take a screenshot of the Timer screen mid-countdown. Confirm the ring is large and prominent, phase color is visible, text is legible at a glance (this app is used mid-workout).

- [ ] **Step 4: Commit**

```bash
git add app.vue components/
git commit -m "style: apply big bold circular design polish"
```

---

### Task 14: PWA Offline & Install Verification

**Files:** none (verification-only task).

**Interfaces:** none — this task validates the Global Constraints requirement that the app works fully offline once installed.

- [ ] **Step 1: Build the static production output**

Run: `npm run generate`
Expected: exits 0, `.output/public/sw.js` and `.output/public/manifest.webmanifest` present (already checked structurally in Task 2 — this re-confirms after all app code exists).

- [ ] **Step 2: Serve the static output**

Run: `npx serve .output/public -l 4173` (run in background/separate terminal)
Expected: server prints a local URL (e.g. `http://localhost:4173`).

- [ ] **Step 3: Verify the app loads and registers a service worker**

Using the Claude Browser tool: navigate to `http://localhost:4173`. Confirm the Setup screen renders. Use `javascript_tool` to run:

```js
navigator.serviceWorker.getRegistrations().then(r => r.length)
```

Expected: returns `1` (one active service worker registration).

- [ ] **Step 4: Verify offline reload works**

Stop the `npx serve` process (Ctrl+C or kill the background task). With the server stopped, reload the page in the Claude Browser tool.

Expected: the page still loads and renders the Setup screen (served from the service worker cache), instead of a network error — confirming the app works fully offline once the service worker has activated once.

- [ ] **Step 5: Record verification result**

No commit needed for this task (verification-only, no file changes). If offline reload fails, treat it as a bug: re-check the `workbox.globPatterns` in `nuxt.config.ts` (Task 2, Step 5) covers all built asset types, fix, re-run Task 14 from Step 1.
