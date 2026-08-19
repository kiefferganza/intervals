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
