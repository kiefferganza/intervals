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
