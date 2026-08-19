# Custom Step List, mm:ss Input, Editable Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed Warm-up/Work/Rest/Rounds config with an ordered, user-editable list of steps (any kind, any label, once-or-repeating), and replace raw-seconds duration inputs with a microwave-style mm:ss digit-entry field.

**Architecture:** `TimerConfig` becomes `{ steps: StepConfig[], rounds: number }`. `utils/timerSequence.ts` splits `steps` into a once-only "pre" zone, a "loop body" zone (repeated `rounds` times), and a once-only "post" zone, based on the position of `repeat: true` steps. A new `DurationInput.vue` component owns mm:ss digit-buffer entry and emits plain seconds via `v-model`. `SetupScreen.vue` renders one card per step (kind, label, duration, once/repeat, reorder, remove) instead of four fixed fields. `useIntervalTimer.ts` and `TimerScreen.vue` are untouched — they already consume `PhaseInfo[]` generically.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, `@vueuse/core` (`useLocalStorage`), Vitest + `@vue/test-utils` + happy-dom, native `crypto.randomUUID()` (no new dependency).

## Global Constraints

- No new npm dependencies — use native `crypto.randomUUID()` for step ids.
- Storage key bumps from `interval-timer-config` to `interval-timer-config-v2`; no migration code (solo side project — old data is simply abandoned).
- Every source change is preceded by a failing test (TDD) per `superpowers:test-driven-development`.
- Follow existing import conventions: explicit `import ... from '~/types/timer'` / `~/utils/timerSequence'` (this codebase does NOT rely on Nuxt's utils auto-import — see `composables/useIntervalTimer.ts:2`); composables and components are consumed without import (Nuxt auto-import), matching existing usage of `useTimerConfig()` and `<CircularProgress>`.
- Commit after every task's tests pass.

---

### Task 1: Types + sequence builder (pre/loop/post zones)

**Files:**
- Modify: `types/timer.ts`
- Modify: `utils/timerSequence.ts`
- Modify: `tests/timerSequence.test.ts`

**Interfaces:**
- Produces: `StepKind = 'warmup' | 'work' | 'rest' | 'custom'`, `PhaseName = StepKind | 'done'`, `StepConfig { id: string; kind: StepKind; label: string; seconds: number; repeat: boolean }`, `TimerConfig { steps: StepConfig[]; rounds: number }`, `PhaseInfo` (shape unchanged: `{ name: PhaseName; label: string; color: string; duration: number; round: number | null }`)
- Produces: `defaultStepLabel(kind: StepKind): string`, `buildPhaseSequence(config: TimerConfig): PhaseInfo[]` (same name/signature as today, new input shape)

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/timerSequence.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPhaseSequence } from '~/utils/timerSequence'
import type { StepConfig, StepKind } from '~/types/timer'

let idCounter = 0
function step(kind: StepKind, seconds: number, opts: Partial<StepConfig> = {}): StepConfig {
  idCounter += 1
  return { id: `s${idCounter}`, kind, label: '', seconds, repeat: false, ...opts }
}

describe('buildPhaseSequence', () => {
  it('runs a leading (non-repeating) step once before the repeating loop', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('warmup', 10),
        step('work', 20, { repeat: true }),
        step('rest', 5, { repeat: true }),
      ],
      rounds: 2,
    })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['warmup', 'work1', 'rest1', 'work2', 'rest2', 'done'])
  })

  it('omits a step with 0 seconds entirely', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('warmup', 0),
        step('work', 20, { repeat: true }),
        step('rest', 5, { repeat: true }),
      ],
      rounds: 1,
    })
    expect(sequence[0]).toMatchObject({ name: 'work', round: 1 })
  })

  it('omits repeating steps with 0 seconds on every round', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('work', 20, { repeat: true }),
        step('rest', 0, { repeat: true }),
      ],
      rounds: 2,
    })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['work1', 'work2', 'done'])
  })

  it('runs a trailing (non-repeating) step once after all rounds complete (cooldown)', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('warmup', 10),
        step('work', 20, { repeat: true }),
        step('rest', 5, { repeat: true }),
        step('custom', 15, { label: 'Cooldown' }),
      ],
      rounds: 2,
    })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['warmup', 'work1', 'rest1', 'work2', 'rest2', 'custom', 'done'])
    expect(sequence.find(p => p.label === 'Cooldown')).toMatchObject({ duration: 15, round: null })
  })

  it('a non-repeating step sandwiched between two repeating steps still repeats every round (documented edge case)', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('work', 20, { repeat: true }),
        step('custom', 5, { label: 'Stretch' }),
        step('rest', 10, { repeat: true }),
      ],
      rounds: 2,
    })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['work1', 'custom1', 'rest1', 'work2', 'custom2', 'rest2', 'done'])
  })

  it('when no step is flagged repeat, the whole list runs once regardless of rounds', () => {
    const sequence = buildPhaseSequence({
      steps: [step('custom', 10, { label: 'Just once' })],
      rounds: 5,
    })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['custom', 'done'])
  })

  it('always ends with a done phase of duration 0', () => {
    const sequence = buildPhaseSequence({
      steps: [step('work', 20, { repeat: true })],
      rounds: 1,
    })
    expect(sequence.at(-1)).toMatchObject({ name: 'done', duration: 0, round: null })
  })

  it('resolves the kind default label when a step label is empty, keeps a custom label otherwise', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('warmup', 10),
        step('work', 20, { repeat: true, label: 'Sprint' }),
      ],
      rounds: 1,
    })
    expect(sequence.find(p => p.name === 'warmup')?.label).toBe('Warm Up')
    expect(sequence.find(p => p.name === 'work')?.label).toBe('Sprint')
  })

  it('assigns each kind its own color', () => {
    const sequence = buildPhaseSequence({
      steps: [
        step('warmup', 5),
        step('work', 20, { repeat: true }),
        step('rest', 5, { repeat: true }),
      ],
      rounds: 1,
    })
    expect(sequence.find(p => p.name === 'warmup')?.color).toBe('#f59e0b')
    expect(sequence.find(p => p.name === 'work')?.color).toBe('#22c55e')
    expect(sequence.find(p => p.name === 'rest')?.color).toBe('#3b82f6')
    expect(sequence.find(p => p.name === 'done')?.color).toBe('#a855f7')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/timerSequence.test.ts`
Expected: FAIL (current `buildPhaseSequence` still expects the old `{ warmupSeconds, workSeconds, restSeconds, rounds }` shape — type errors / wrong output)

- [ ] **Step 3: Update `types/timer.ts`**

Replace the full contents of `types/timer.ts`:

```ts
export type StepKind = 'warmup' | 'work' | 'rest' | 'custom'
export type PhaseName = StepKind | 'done'

export interface StepConfig {
  id: string
  kind: StepKind
  label: string
  seconds: number
  repeat: boolean
}

export interface TimerConfig {
  steps: StepConfig[]
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

- [ ] **Step 4: Rewrite `utils/timerSequence.ts`**

Replace the full contents of `utils/timerSequence.ts`:

```ts
import type { PhaseInfo, StepConfig, StepKind, TimerConfig } from '~/types/timer'

const PHASE_COLOR: Record<StepKind, string> = {
  warmup: '#f59e0b',
  work: '#22c55e',
  rest: '#3b82f6',
  custom: '#ec4899',
}

const DEFAULT_LABEL: Record<StepKind, string> = {
  warmup: 'Warm Up',
  work: 'Work',
  rest: 'Rest',
  custom: '',
}

/** Custom-kind steps have no fallback label — an empty one is a validation error, not a default. */
export function defaultStepLabel(kind: StepKind): string {
  return DEFAULT_LABEL[kind]
}

function resolveLabel(step: StepConfig): string {
  return step.label.trim() !== '' ? step.label : defaultStepLabel(step.kind)
}

function toPhase(step: StepConfig, round: number | null): PhaseInfo {
  return {
    name: step.kind,
    label: resolveLabel(step),
    color: PHASE_COLOR[step.kind],
    duration: step.seconds,
    round,
  }
}

function pushIfTimed(sequence: PhaseInfo[], step: StepConfig, round: number | null) {
  // A zero-length step is not a phase: the engine would blow through it in a
  // single tick but still fire a cue, double-beeping every round.
  if (step.seconds > 0) sequence.push(toPhase(step, round))
}

export function buildPhaseSequence(config: TimerConfig): PhaseInfo[] {
  const { steps, rounds } = config
  const sequence: PhaseInfo[] = []

  const firstRepeatIdx = steps.findIndex(s => s.repeat)

  if (firstRepeatIdx === -1) {
    // No step repeats: the whole list is a one-shot sequence, rounds is meaningless.
    for (const step of steps) pushIfTimed(sequence, step, null)
  } else {
    let lastRepeatIdx = firstRepeatIdx
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].repeat) { lastRepeatIdx = i; break }
    }

    const pre = steps.slice(0, firstRepeatIdx)
    const body = steps.slice(firstRepeatIdx, lastRepeatIdx + 1)
    const post = steps.slice(lastRepeatIdx + 1)

    for (const step of pre) pushIfTimed(sequence, step, null)

    for (let round = 1; round <= rounds; round++) {
      for (const step of body) pushIfTimed(sequence, step, round)
    }

    for (const step of post) pushIfTimed(sequence, step, null)
  }

  sequence.push({ name: 'done', label: 'Done', color: '#a855f7', duration: 0, round: null })

  return sequence
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/timerSequence.test.ts`
Expected: PASS (all 9 tests)

- [ ] **Step 6: Commit**

```bash
git add types/timer.ts utils/timerSequence.ts tests/timerSequence.test.ts
git commit -m "feat: model timer config as a step list with pre/loop/post sequencing"
```

---

### Task 2: `useTimerConfig` — steps-based defaults, bumped storage key

**Files:**
- Modify: `composables/useTimerConfig.ts`
- Modify: `tests/useTimerConfig.test.ts`

**Interfaces:**
- Consumes: `TimerConfig`, `StepConfig` from `~/types/timer` (Task 1)
- Produces: `defaultTimerConfig: TimerConfig`, `useTimerConfig(): { config: Ref<TimerConfig> }` (same export names as today)

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/useTimerConfig.test.ts`:

```ts
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

  it('persists changes to localStorage under the v2 key', () => {
    const { config } = useTimerConfig()
    config.value.steps[0].seconds = 45
    expect(JSON.parse(localStorage.getItem('interval-timer-config-v2')!).steps[0].seconds).toBe(45)
  })

  it('returns the same reactive instance across multiple calls (singleton)', () => {
    const a = useTimerConfig()
    const b = useTimerConfig()
    a.config.value.rounds = 3
    expect(b.config.value.rounds).toBe(3)
  })

  it('mutating one call site does not mutate the exported defaultTimerConfig template', () => {
    const { config } = useTimerConfig()
    config.value.steps.push({ id: 'extra', kind: 'custom', label: 'Extra', seconds: 5, repeat: true })
    expect(defaultTimerConfig.steps).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/useTimerConfig.test.ts`
Expected: FAIL (`defaultTimerConfig` still has the old `warmupSeconds`/`workSeconds`/... shape)

- [ ] **Step 3: Rewrite `composables/useTimerConfig.ts`**

Replace the full contents of `composables/useTimerConfig.ts`:

```ts
import { useLocalStorage } from '@vueuse/core'
import type { TimerConfig } from '~/types/timer'

const STORAGE_KEY = 'interval-timer-config-v2'

export const defaultTimerConfig: TimerConfig = {
  steps: [
    { id: 'default-warmup', kind: 'warmup', label: '', seconds: 30, repeat: false },
    { id: 'default-work', kind: 'work', label: '', seconds: 40, repeat: true },
    { id: 'default-rest', kind: 'rest', label: '', seconds: 20, repeat: true },
  ],
  rounds: 8,
}

let sharedConfig: ReturnType<typeof useLocalStorage<TimerConfig>> | null = null

function cloneDefaultConfig(): TimerConfig {
  return {
    steps: defaultTimerConfig.steps.map(step => ({ ...step })),
    rounds: defaultTimerConfig.rounds,
  }
}

export function useTimerConfig() {
  if (!sharedConfig) {
    sharedConfig = useLocalStorage<TimerConfig>(STORAGE_KEY, cloneDefaultConfig(), { deep: true, flush: 'sync' })
  }
  return { config: sharedConfig }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/useTimerConfig.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add composables/useTimerConfig.ts tests/useTimerConfig.test.ts
git commit -m "feat: store timer config as a step list under a bumped storage key"
```

---

### Task 3: `useIntervalTimer` tests — adapt to the step-list config shape

No source change: `useIntervalTimer.ts` already consumes `TimerConfig` opaquely via `buildPhaseSequence`. Only the test fixtures change shape.

**Files:**
- Modify: `tests/useIntervalTimer.test.ts`

**Interfaces:**
- Consumes: `TimerConfig`, `StepConfig` from `~/types/timer` (Task 1); `useIntervalTimer(config: TimerConfig)` from `composables/useIntervalTimer.ts` (unchanged signature)

- [ ] **Step 1: Rewrite the test file**

Replace the full contents of `tests/useIntervalTimer.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useIntervalTimer } from '~/composables/useIntervalTimer'
import type { StepConfig, TimerConfig } from '~/types/timer'

function makeConfig(opts: { warmup?: number; work: number; rest?: number; rounds: number }): TimerConfig {
  const steps: StepConfig[] = []
  if (opts.warmup) steps.push({ id: 'w', kind: 'warmup', label: '', seconds: opts.warmup, repeat: false })
  steps.push({ id: 'k', kind: 'work', label: '', seconds: opts.work, repeat: true })
  if (opts.rest) steps.push({ id: 'r', kind: 'rest', label: '', seconds: opts.rest, repeat: true })
  return { steps, rounds: opts.rounds }
}

describe('useIntervalTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts on the first phase with full duration', () => {
    const timer = useIntervalTimer(makeConfig({ warmup: 5, work: 10, rest: 5, rounds: 1 }))
    timer.start()
    expect(timer.phase.value.name).toBe('warmup')
    expect(timer.remaining.value).toBe(5)
  })

  it('counts down remaining time as ticks pass', () => {
    const timer = useIntervalTimer(makeConfig({ warmup: 5, work: 10, rest: 5, rounds: 1 }))
    timer.start()
    vi.advanceTimersByTime(2000)
    expect(timer.remaining.value).toBeCloseTo(3, 1)
  })

  it('auto-advances to the next phase when remaining hits zero', () => {
    const timer = useIntervalTimer(makeConfig({ warmup: 2, work: 10, rest: 5, rounds: 1 }))
    timer.start()
    vi.advanceTimersByTime(2100)
    expect(timer.phase.value.name).toBe('work')
  })

  it('stays accurate after a large time jump (simulated background throttle)', () => {
    const timer = useIntervalTimer(makeConfig({ work: 10, rest: 5, rounds: 1 }))
    timer.start()
    vi.setSystemTime(new Date('2026-01-01T00:00:07Z'))
    vi.advanceTimersByTime(250)
    // vitest's fake clock reports Date.now() as 7.25s (not 7.0s) when the
    // overdue tick fires, since advanceTimersByTime moves Date.now() by the
    // full requested delta before/while running due callbacks. 10 - 7.25 = 2.75.
    expect(timer.remaining.value).toBeCloseTo(2.75, 1)
  })

  it('pauses and resumes without losing remaining time', () => {
    const timer = useIntervalTimer(makeConfig({ work: 10, rest: 5, rounds: 1 }))
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

  it('pause recomputes remaining at a non-tick-aligned instant (not stale from the last tick)', () => {
    const timer = useIntervalTimer(makeConfig({ work: 10, rest: 5, rounds: 1 }))
    timer.start()
    vi.advanceTimersByTime(3120) // not a multiple of the 250ms tick interval
    timer.pause()
    expect(timer.remaining.value).toBeCloseTo(10 - 3.12, 1)
  })

  it('skip immediately advances to the next phase', () => {
    const timer = useIntervalTimer(makeConfig({ work: 10, rest: 5, rounds: 2 }))
    timer.start()
    timer.skip()
    expect(timer.phase.value.name).toBe('rest')
  })

  it('reset returns to the first phase and stops running', () => {
    const timer = useIntervalTimer(makeConfig({ warmup: 5, work: 10, rest: 5, rounds: 1 }))
    timer.start()
    vi.advanceTimersByTime(2000)
    timer.reset()
    expect(timer.isRunning.value).toBe(false)
    expect(timer.phase.value.name).toBe('warmup')
    expect(timer.remaining.value).toBe(5)
  })

  it('reaches done after the final phase and stops running', () => {
    const timer = useIntervalTimer(makeConfig({ work: 2, rounds: 1 }))
    timer.start()
    vi.advanceTimersByTime(2100)
    expect(timer.phase.value.name).toBe('done')
    expect(timer.isRunning.value).toBe(false)
    expect(timer.isDone.value).toBe(true)
  })

  it('fires onPhaseChange exactly once per transition, including entry into the first phase', () => {
    const timer = useIntervalTimer(makeConfig({ warmup: 1, work: 1, rounds: 1 }))
    const seen: string[] = []
    timer.onPhaseChange(p => seen.push(p.name))
    timer.start()
    vi.advanceTimersByTime(2500)
    expect(seen).toEqual(['warmup', 'work', 'done'])
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/useIntervalTimer.test.ts`
Expected: PASS (all 10 tests) — confirms Task 1's sequence builder is a drop-in for the tick engine

- [ ] **Step 3: Commit**

```bash
git add tests/useIntervalTimer.test.ts
git commit -m "test: adapt useIntervalTimer tests to the step-list config shape"
```

---

### Task 4: `DurationInput.vue` — microwave-style mm:ss digit entry

**Files:**
- Create: `components/DurationInput.vue`
- Test: `tests/DurationInput.test.ts`

**Interfaces:**
- Produces: `<DurationInput v-model="seconds: number" />` — a Vue component with prop `modelValue: number`, emit `update:modelValue: [number]`, rendering a single `<input class="duration-input">` whose displayed value is always `MM:SS`.

Digit-buffer rule: keeps up to 4 raw digits. Each new digit is appended and the buffer is truncated to the last 4 (oldest drops off the left). The last 2 buffer digits are seconds, the rest are minutes — e.g. buffer `"300"` → `03:00` (3 min 0 sec); buffer `"250"` → `02:50` (2 min 50 sec). Backspace pops the last digit. No renormalization (buffer `"9999"` displays `99:99` literally, like a real countdown timer).

- [ ] **Step 1: Write the failing tests**

Create `tests/DurationInput.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DurationInput from '~/components/DurationInput.vue'

function inputEl(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('input').element as HTMLInputElement
}

describe('DurationInput', () => {
  it('shows 00:00 for a zero modelValue', () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    expect(inputEl(wrapper).value).toBe('00:00')
  })

  it('typing 3, 0, 0 displays 03:00 and emits 180 seconds', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: '0' })
    await input.trigger('keydown', { key: '0' })
    expect(inputEl(wrapper).value).toBe('03:00')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([180])
  })

  it('typing 2, 5, 0 displays 02:50 and emits 170 seconds', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '2' })
    await input.trigger('keydown', { key: '5' })
    await input.trigger('keydown', { key: '0' })
    expect(inputEl(wrapper).value).toBe('02:50')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([170])
  })

  it('a 5th typed digit drops the oldest one (right-to-left shift)', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    for (const key of ['1', '2', '3', '4', '5']) {
      await input.trigger('keydown', { key })
    }
    expect(inputEl(wrapper).value).toBe('23:45')
  })

  it('backspace removes the last digit', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: '0' })
    await input.trigger('keydown', { key: '0' })
    await input.trigger('keydown', { key: 'Backspace' })
    expect(inputEl(wrapper).value).toBe('00:30')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([30])
  })

  it('ignores non-digit, non-backspace keys', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: 'a' })
    expect(inputEl(wrapper).value).toBe('00:03')
  })

  it('resyncs its display when modelValue changes externally while unfocused', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    await wrapper.setProps({ modelValue: 65 })
    expect(inputEl(wrapper).value).toBe('01:05')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/DurationInput.test.ts`
Expected: FAIL with "Cannot find module '~/components/DurationInput.vue'" (or similar — the component doesn't exist yet)

- [ ] **Step 3: Create `components/DurationInput.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()

function secondsToDigits(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const raw = `${minutes}${seconds.toString().padStart(2, '0')}`
  return raw.replace(/^0+(?=\d)/, '').slice(-4)
}

function digitsToSeconds(value: string): number {
  const padded = value.padStart(4, '0')
  const minutes = Number(padded.slice(0, 2))
  const seconds = Number(padded.slice(2, 4))
  return minutes * 60 + seconds
}

const digits = ref(secondsToDigits(props.modelValue))
const focused = ref(false)

const display = computed(() => {
  const padded = digits.value.padStart(4, '0')
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`
})

// A parent-driven reset (e.g. loading a saved config) must resync the buffer,
// but only while the user isn't mid-entry, or their keystrokes would fight it.
watch(() => props.modelValue, (value) => {
  if (focused.value) return
  digits.value = secondsToDigits(value)
})

function commit(nextDigits: string) {
  digits.value = nextDigits
  emit('update:modelValue', digitsToSeconds(nextDigits))
}

function onKeydown(event: KeyboardEvent) {
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault()
    commit((digits.value + event.key).slice(-4))
    return
  }
  if (event.key === 'Backspace') {
    event.preventDefault()
    commit(digits.value.slice(0, -1))
    return
  }
  if (event.key !== 'Tab') {
    event.preventDefault()
  }
}
</script>

<template>
  <input
    class="duration-input"
    type="text"
    inputmode="numeric"
    :value="display"
    @keydown="onKeydown"
    @focus="focused = true"
    @blur="focused = false"
  />
</template>

<style scoped>
.duration-input {
  width: 100%;
  min-height: 54px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: clamp(1.6rem, 6vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: left;
}
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/DurationInput.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add components/DurationInput.vue tests/DurationInput.test.ts
git commit -m "feat: add microwave-style mm:ss digit-entry DurationInput component"
```

---

### Task 5: `SetupScreen.vue` — dynamic step-list UI

**Files:**
- Modify: `components/SetupScreen.vue`
- Modify: `tests/SetupScreen.test.ts`
- Modify: `app.vue` (add `--custom` color token)

**Interfaces:**
- Consumes: `StepConfig`, `StepKind` from `~/types/timer` (Task 1); `defaultStepLabel` from `~/utils/timerSequence` (Task 1); `useTimerConfig()` (Task 2); `<DurationInput>` (Task 4, Nuxt auto-imported by filename)
- Produces: same `SetupScreen` component contract as today — emits `start: []`, disables its `.start` button via the same `isValid` intent, now checked against the step list

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/SetupScreen.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupScreen from '~/components/SetupScreen.vue'

describe('SetupScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders one step card per configured step', () => {
    const wrapper = mount(SetupScreen)
    expect(wrapper.findAll('.step')).toHaveLength(3)
  })

  it('shows the kind default as a label placeholder when the label is empty', () => {
    const wrapper = mount(SetupScreen)
    const labels = wrapper.findAll('.step__label')
    expect(labels[0].attributes('placeholder')).toBe('Warm Up')
    expect(labels[1].attributes('placeholder')).toBe('Work')
    expect(labels[2].attributes('placeholder')).toBe('Rest')
  })

  it('disables Start when a step has 0 seconds', async () => {
    const wrapper = mount(SetupScreen)
    const workDuration = wrapper.findAll('.step')[1].find('.duration-input')
    await workDuration.trigger('keydown', { key: 'Backspace' })
    await workDuration.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.find('.start').attributes('disabled')).toBeDefined()
  })

  it('enables Start and emits start when every step is valid', async () => {
    const wrapper = mount(SetupScreen)
    const workDuration = wrapper.findAll('.step')[1].find('.duration-input')
    await workDuration.trigger('keydown', { key: '4' })
    await workDuration.trigger('keydown', { key: '0' })
    expect(wrapper.find('.start').attributes('disabled')).toBeUndefined()
    await wrapper.find('.start').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('a custom step needs a non-empty label even once its duration is valid', async () => {
    const wrapper = mount(SetupScreen)
    await wrapper.find('.add-step').trigger('click')
    const newStep = wrapper.findAll('.step').at(-1)!
    const newDuration = newStep.find('.duration-input')
    await newDuration.trigger('keydown', { key: '1' })
    await newDuration.trigger('keydown', { key: '0' })
    expect(wrapper.find('.start').attributes('disabled')).toBeDefined()

    await newStep.find('.step__label').setValue('Stretch')
    expect(wrapper.find('.start').attributes('disabled')).toBeUndefined()
  })

  it('removing a step drops its card from the list', async () => {
    const wrapper = mount(SetupScreen)
    const before = wrapper.findAll('.step').length
    await wrapper.findAll('.step__remove')[0].trigger('click')
    expect(wrapper.findAll('.step')).toHaveLength(before - 1)
  })

  it('moving a step up swaps its order with the previous step', async () => {
    const wrapper = mount(SetupScreen)
    const kindsBefore = wrapper.findAll('.step__kind').map(el => (el.element as HTMLSelectElement).value)
    await wrapper.findAll('.step')[1].find('button').trigger('click') // first action button is "Up"
    const kindsAfter = wrapper.findAll('.step__kind').map(el => (el.element as HTMLSelectElement).value)
    expect(kindsAfter[0]).toBe(kindsBefore[1])
    expect(kindsAfter[1]).toBe(kindsBefore[0])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/SetupScreen.test.ts`
Expected: FAIL (current `SetupScreen.vue` renders four fixed `<input>` fields, no `.step` cards)

- [ ] **Step 3: Rewrite `components/SetupScreen.vue`**

Replace the full contents of `components/SetupScreen.vue`:

```vue
<script setup lang="ts">
import type { StepConfig, StepKind } from '~/types/timer'
import { defaultStepLabel } from '~/utils/timerSequence'

const { config } = useTimerConfig()

const emit = defineEmits<{ start: [] }>()

const KIND_OPTIONS: { value: StepKind; label: string }[] = [
  { value: 'warmup', label: 'Warm-up' },
  { value: 'work', label: 'Work' },
  { value: 'rest', label: 'Rest' },
  { value: 'custom', label: 'Custom' },
]

function labelPlaceholder(step: StepConfig) {
  return step.kind === 'custom' ? 'Label' : defaultStepLabel(step.kind)
}

function addStep() {
  config.value.steps.push({
    id: crypto.randomUUID(),
    kind: 'custom',
    label: '',
    seconds: 0,
    repeat: true,
  })
}

function removeStep(id: string) {
  config.value.steps = config.value.steps.filter(step => step.id !== id)
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= config.value.steps.length) return
  const steps = [...config.value.steps]
  const [moved] = steps.splice(index, 1)
  steps.splice(target, 0, moved)
  config.value.steps = steps
}

const isValid = computed(() =>
  config.value.steps.length > 0 &&
  config.value.steps.every(step =>
    step.seconds > 0 && (step.kind !== 'custom' || step.label.trim() !== '')
  ) &&
  config.value.rounds > 0
)
</script>

<template>
  <div class="setup">
    <header class="setup__head">
      <p class="setup__eyebrow">Offline interval trainer</p>
      <h1 class="setup__title">Interval Timer</h1>
      <p class="setup__lede">Build your sequence, set the rounds, go.</p>
    </header>

    <div class="setup__steps">
      <div v-for="(step, index) in config.steps" :key="step.id" class="step" :class="`step--${step.kind}`">
        <div class="step__row">
          <select v-model="step.kind" class="step__kind">
            <option v-for="option in KIND_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <input
            v-model="step.label"
            class="step__label"
            type="text"
            :placeholder="labelPlaceholder(step)"
          />
        </div>

        <div class="step__row">
          <DurationInput v-model="step.seconds" />
          <label class="step__repeat">
            <input v-model="step.repeat" type="checkbox" />
            Repeat every round
          </label>
        </div>

        <div class="step__actions">
          <button type="button" :disabled="index === 0" @click="moveStep(index, -1)">Up</button>
          <button type="button" :disabled="index === config.steps.length - 1" @click="moveStep(index, 1)">Down</button>
          <button type="button" class="step__remove" @click="removeStep(step.id)">Remove</button>
        </div>
      </div>
    </div>

    <button type="button" class="add-step" @click="addStep">+ Add step</button>

    <label class="field field--rounds">
      <span class="field__name">Rounds</span>
      <input v-model.number="config.rounds" type="number" min="1" inputmode="numeric" />
      <span class="field__unit">total</span>
    </label>

    <button class="start" :disabled="!isValid" @click="emit('start')">Start</button>
  </div>
</template>

<style scoped>
.setup {
  min-height: 100dvh;
  display: grid;
  align-content: safe center;
  gap: clamp(20px, 4vh, 32px);
  width: 100%;
  max-width: 620px;
  margin-inline: auto;
  padding: clamp(32px, 7vh, 64px) clamp(20px, 5vw, 32px)
    max(clamp(32px, 7vh, 64px), env(safe-area-inset-bottom));
}

.setup__head > * {
  margin: 0;
}

.setup__eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.setup__title {
  margin-top: 12px;
  font-size: clamp(2.1rem, 8vw, 2.9rem);
  font-weight: 660;
  letter-spacing: -0.045em;
  line-height: 0.98;
}

.setup__lede {
  margin-top: 12px;
  max-width: 34ch;
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--text-dim);
}

.setup__steps {
  display: grid;
  gap: 12px;
}

.step {
  --rail: var(--line-strong);
  position: relative;
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--rail);
}

.step--warmup { --rail: var(--warmup); }
.step--work { --rail: var(--work); }
.step--rest { --rail: var(--rest); }
.step--custom { --rail: var(--custom); }

.step__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step__kind {
  flex: 0 0 auto;
  background: var(--bg-raise);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 0.85rem;
}

.step__label {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  padding: 8px 2px;
  font-size: 0.95rem;
}

.step__repeat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-dim);
  white-space: nowrap;
}

.step__actions {
  display: flex;
  gap: 8px;
}

.step__actions button {
  background: var(--bg-raise);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 0.78rem;
  color: var(--text-dim);
}

.step__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step__remove {
  margin-left: auto;
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.35);
}

.add-step {
  justify-self: start;
  background: transparent;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.field {
  --rail: var(--done);
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 2px 10px;
  padding: 16px 20px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.field__name {
  grid-column: 1 / -1;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.field input {
  grid-column: 1;
  width: 100%;
  min-height: 54px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: clamp(2.1rem, 7.5vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
  appearance: textfield;
}

.field__unit {
  grid-column: 2;
  justify-self: end;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.start {
  min-height: 76px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: var(--accent);
  color: #062412;
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.start:disabled {
  background: var(--surface);
  border-color: var(--line);
  color: var(--text-faint);
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 4: Add the `--custom` color token**

In `app.vue`, inside the `:root` block, add a `--custom` token next to the existing phase colors (`app.vue:38-41`):

```css
  --warmup: #f59e0b;
  --work: #22c55e;
  --rest: #3b82f6;
  --done: #a855f7;
  --custom: #ec4899;
  --accent: var(--work);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/SetupScreen.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 6: Commit**

```bash
git add components/SetupScreen.vue tests/SetupScreen.test.ts app.vue
git commit -m "feat: replace fixed setup fields with an editable, reorderable step list"
```

---

### Task 6: `TimerScreen` tests — adapt to the step-list config shape

No source change: `TimerScreen.vue` already renders `PhaseInfo` generically (`phase.value.label`, `phase.value.color`, `phase.value.round`). Only the test fixtures change shape.

**Files:**
- Modify: `tests/TimerScreen.test.ts`

**Interfaces:**
- Consumes: `TimerConfig`, `StepConfig` from `~/types/timer` (Task 1)

- [ ] **Step 1: Rewrite the test file**

Replace the full contents of `tests/TimerScreen.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import TimerScreen from '~/components/TimerScreen.vue'
import type { TimerConfig } from '~/types/timer'

const baseConfig: TimerConfig = {
  steps: [
    { id: 'w', kind: 'warmup', label: '', seconds: 5, repeat: false },
    { id: 'k', kind: 'work', label: '', seconds: 10, repeat: true },
    { id: 'r', kind: 'rest', label: '', seconds: 5, repeat: true },
  ],
  rounds: 1,
}

const quickDoneConfig: TimerConfig = {
  steps: [{ id: 'k', kind: 'work', label: '', seconds: 2, repeat: true }],
  rounds: 1,
}

describe('TimerScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the timer on mount and shows the first phase label', () => {
    const wrapper = mount(TimerScreen, { props: { config: baseConfig } })
    expect(wrapper.text()).toContain('Warm Up')
  })

  it('pausing swaps the Pause button for Resume', async () => {
    const wrapper = mount(TimerScreen, { props: { config: baseConfig } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Resume')
  })

  it('reset emits exit', async () => {
    const wrapper = mount(TimerScreen, { props: { config: baseConfig } })
    const resetButton = wrapper.findAll('button').at(-1)!
    await resetButton.trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows a Finish button and emits exit when the session completes', async () => {
    const wrapper = mount(TimerScreen, { props: { config: quickDoneConfig } })
    vi.advanceTimersByTime(2100)
    await nextTick()
    expect(wrapper.text()).toContain('Finish')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows a custom step label during that phase', () => {
    const wrapper = mount(TimerScreen, {
      props: {
        config: {
          steps: [{ id: 'c', kind: 'custom', label: 'Stretch', seconds: 10, repeat: true }],
          rounds: 1,
        },
      },
    })
    expect(wrapper.text()).toContain('Stretch')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/TimerScreen.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/TimerScreen.test.ts
git commit -m "test: adapt TimerScreen tests to the step-list config shape"
```

---

### Task 7: Full suite + manual smoke check

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, all files (including `tests/smoke.test.ts` and `tests/CircularProgress.test.ts`, both untouched and unaffected by this change)

- [ ] **Step 2: Manual smoke check in the browser**

Run: `npm run dev`

Open the app and verify by hand:
- Default screen shows 3 step cards (Warm-up/Work/Rest) with correct placeholder labels and mm:ss durations (00:30, 00:40, 00:20)
- Typing digits into a duration field shifts right-to-left as designed (e.g. typing `1`,`3`,`0` shows `01:30`)
- Adding a step, leaving its label blank, keeps Start disabled; typing a label enables it (once duration is set)
- Reordering (Up/Down) and removing a step all update the list immediately
- Start launches `TimerScreen` and phases play through in list order with correct labels/colors, matching the pre/loop/post rule from the spec (e.g. add a non-repeating step after the repeating ones and confirm it plays once, at the end, after all rounds)

- [ ] **Step 3: Commit** (only if the manual check surfaced a fix)

If everything works as-is, no commit is needed for this task — it's verification only.
