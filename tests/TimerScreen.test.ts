import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import TimerScreen from '~/components/TimerScreen.vue'

describe('TimerScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the timer on mount and shows the first phase label', () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 } }
    })
    expect(wrapper.text()).toContain('Warm Up')
  })

  it('pausing swaps the Pause button for Resume', async () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 } }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Resume')
  })

  it('reset emits exit', async () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 5, workSeconds: 10, restSeconds: 5, rounds: 1 } }
    })
    const resetButton = wrapper.findAll('button').at(-1)!
    await resetButton.trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows a Finish button and emits exit when the session completes', async () => {
    const wrapper = mount(TimerScreen, {
      props: { config: { warmupSeconds: 0, workSeconds: 2, restSeconds: 0, rounds: 1 } }
    })
    vi.advanceTimersByTime(2100)
    await nextTick()
    expect(wrapper.text()).toContain('Finish')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })
})
