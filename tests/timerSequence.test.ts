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

  it('omits rest phases entirely when restSeconds is 0', () => {
    const sequence = buildPhaseSequence({ warmupSeconds: 0, workSeconds: 20, restSeconds: 0, rounds: 2 })
    const names = sequence.map(p => `${p.name}${p.round ?? ''}`)
    expect(names).toEqual(['work1', 'work2', 'done'])
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
