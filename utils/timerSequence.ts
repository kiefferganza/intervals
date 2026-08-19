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
