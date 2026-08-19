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
