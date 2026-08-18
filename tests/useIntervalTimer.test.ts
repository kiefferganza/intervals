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
    // vitest's fake clock reports Date.now() as 7.25s (not 7.0s) when the
    // overdue tick fires, since advanceTimersByTime moves Date.now() by the
    // full requested delta before/while running due callbacks. 10 - 7.25 = 2.75.
    expect(timer.remaining.value).toBeCloseTo(2.75, 1)
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
