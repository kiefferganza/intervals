import { describe, it, expect, vi, afterEach } from 'vitest'
import { useWakeLock } from '~/composables/useWakeLock'

describe('useWakeLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when the Wake Lock API is unsupported', async () => {
    const { isActive, acquire } = useWakeLock()
    await acquire()
    expect(isActive.value).toBe(false)
  })

  it('acquires a sentinel and sets isActive when supported', async () => {
    const mockSentinel = { release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() }
    vi.stubGlobal('navigator', {
      ...navigator,
      wakeLock: { request: vi.fn().mockResolvedValue(mockSentinel) }
    })

    const { isActive, acquire, release } = useWakeLock()
    await acquire()
    expect(isActive.value).toBe(true)

    await release()
    expect(mockSentinel.release).toHaveBeenCalled()
    expect(isActive.value).toBe(false)
  })
})
