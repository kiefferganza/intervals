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
