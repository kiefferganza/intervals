# Custom step list, mm:ss input, editable labels — Design

## Context

Today `TimerConfig` is a fixed shape: `warmupSeconds`, `workSeconds`, `restSeconds`, `rounds`.
`SetupScreen.vue` has one raw-seconds numeric input per field. `utils/timerSequence.ts` always
builds Warm-up → (Work → Rest) × rounds → Done, with fixed labels "Warm Up"/"Work"/"Rest".

Goals:
1. Duration inputs accept mm:ss digit entry (typing `300` → 3:00, `250` → 2:50) instead of raw seconds.
2. Users can add arbitrary extra steps beyond Warm-up/Work/Rest (e.g. a Stretch or Cooldown step).
3. Work and Rest labels are user-editable text, defaulting to "Work"/"Rest" when left blank.

## Data model (`types/timer.ts`)

Replace the fixed-shape config with an ordered step list:

```ts
export type StepKind = 'warmup' | 'work' | 'rest' | 'custom'

export interface StepConfig {
  id: string        // uuid, stable identity for list rendering / v-model
  kind: StepKind
  label: string      // user text; '' allowed for warmup/work/rest (falls back to kind default)
  seconds: number    // total duration, derived from mm:ss digit entry
  repeat: boolean    // true = repeats every round, false = runs once
}

export interface TimerConfig {
  steps: StepConfig[]
  rounds: number
}
```

`PhaseInfo` keeps its current shape (`name`, `label`, `color`, `duration`, `round`), but `name`
becomes `StepKind | 'done'` and is populated per-step from `kind` (multiple `custom` steps can
coexist, distinguished by their resolved `label`).

Default label resolution happens at sequence-build time, never stored:
- `warmup` → "Warm Up", `work` → "Work", `rest` → "Rest" when `label === ''`
- `custom` → no fallback; empty label is a validation error (see Validation)

## Sequence builder (`utils/timerSequence.ts`)

Split `steps` into three zones based on the position of `repeat: true` steps:

- `firstRepeatIdx` = index of the first `repeat: true` step
- `lastRepeatIdx` = index of the last `repeat: true` step
- If no step has `repeat: true`, the whole list just runs once, in order; `rounds` is ignored.

Given those indices:
- **pre** — steps before `firstRepeatIdx` (always `repeat: false` there) → emitted once, in list order, before the loop. Covers Warm-up.
- **loop body** — steps from `firstRepeatIdx` to `lastRepeatIdx` inclusive → emitted `rounds` times, in list order. A `repeat: false` step that falls inside this band (between two repeating steps) still executes on every round pass — this is a known, accepted edge case; the common cases (warm-up before, cooldown after) don't hit it.
- **post** — steps after `lastRepeatIdx` (always `repeat: false` there) → emitted once, in list order, after the loop finishes. Covers Cooldown.

`PhaseInfo.round` is set to the current round number (1-based) for loop-body phases, `null` for pre/post phases.

Zero-duration steps are skipped entirely (same guard that exists today for zero-length rest), to
avoid a same-tick double-cue.

The terminal `done` phase (`duration: 0`) is still appended at the end.

## mm:ss digit-entry input

New component `components/DurationInput.vue`, microwave-style single text field, replacing the
raw-seconds `<input type="number">` for every step's duration:

- Keeps an internal raw digit buffer, max 4 digits.
- Each typed digit pushes onto the right of the buffer; once the buffer holds 4 digits, the next
  digit drops the oldest (leftmost) one — a right-to-left shift, matching microwave/stopwatch
  digit entry.
- Displayed as `MM:SS`, live, on every keystroke: last 2 buffer digits = seconds, remaining
  digits = minutes (e.g. buffer `300` → `03:00`; buffer `250` → `02:50`).
- Backspace pops the last digit off the buffer (right side), reformats immediately.
- Non-digit keys ignored. No manual cursor positioning — it's an append/pop buffer, not a normal
  text field.
- `v-model` emits/accepts plain `seconds: number` (`minutes * 60 + secondsPart`); the component
  owns the digit-buffer-to-display translation internally.
- `rounds` stays a plain `<input type="number">` — it's a count, not a duration.

## SetupScreen.vue

Steps render as a list of cards, each with:
- Kind selector — segmented control: Warm-up / Work / Rest / Custom
- Label text input — placeholder shows the kind's default (e.g. "Work") when label is empty; empty
  stays stored as `''` so it keeps tracking the kind's default if the kind changes later. Custom
  kind has no placeholder-as-fallback; it's a required field.
- `DurationInput` for `seconds`
- Once/Repeat toggle (`repeat: boolean`)
- Delete button

Below the list: "+ Add step" button appends a new step (`kind: 'custom'`, `repeat: true`,
`seconds: 0`, blank label). Up/down buttons per card reorder within the list (no drag library).
Global `rounds` field stays below the step list, same visual style as today.

### Validation (replacing current `isValid`)

- Every step: `seconds > 0` (drop today's warmup/rest-can-be-0 allowance — with an editable list,
  a 0-second step is just deleted instead)
- Every `custom`-kind step: `label.trim() !== ''`
- `rounds > 0`
- At least one step in the list

## Storage / migration (`composables/useTimerConfig.ts`)

Bump `STORAGE_KEY` to `'interval-timer-config-v2'`. No migration from the old key — solo side
project, not worth the complexity; old-format data is simply abandoned in localStorage under its
old key.

`defaultTimerConfig` becomes the current defaults expressed as steps:

```ts
export const defaultTimerConfig: TimerConfig = {
  steps: [
    { id: '...', kind: 'warmup', label: '', seconds: 30, repeat: false },
    { id: '...', kind: 'work',   label: '', seconds: 40, repeat: true },
    { id: '...', kind: 'rest',   label: '', seconds: 20, repeat: true },
  ],
  rounds: 8,
}
```

## Cues / colors

`useTimerCues.fireCue` is unchanged — it already only distinguishes `done` vs everything else, and
`kind` doesn't need to drive distinct sounds. Colors stay per-kind via existing CSS vars
(`--warmup`, `--work`, `--rest`, `--done`); `custom` kind gets one new neutral color var
(e.g. `--custom`).

## Testing

Existing test files touch every layer being changed and need updating alongside the implementation:
- `tests/useTimerConfig.test.ts` — new default shape, new storage key
- `tests/timerSequence.test.ts` — pre/loop/post zone splitting, round numbering, zero-duration skip
- `tests/useIntervalTimer.test.ts` — sequence built from step list
- `tests/SetupScreen.test.ts` — add/remove/reorder steps, label fallback, validation rules
- `tests/TimerScreen.test.ts` — label display for custom steps
- New: a `DurationInput.vue` component + test file for the digit-buffer entry behavior
