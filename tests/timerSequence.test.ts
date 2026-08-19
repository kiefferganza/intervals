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
