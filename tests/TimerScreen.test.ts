import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import TimerScreen from '~/components/TimerScreen.vue'
import type { TimerConfig } from '~/types/timer'

const baseConfig: TimerConfig = {
  steps: [
    { id: 'w', kind: 'warmup', label: '', seconds: 5, repeat: false },
    { id: 'k', kind: 'work', label: '', seconds: 10, repeat: true },
    { id: 'r', kind: 'rest', label: '', seconds: 5, repeat: true },
  ],
  rounds: 1,
}

const quickDoneConfig: TimerConfig = {
  steps: [{ id: 'k', kind: 'work', label: '', seconds: 2, repeat: true }],
  rounds: 1,
}

describe('TimerScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the timer on mount and shows the first phase label', () => {
    const wrapper = mount(TimerScreen, { props: { config: baseConfig } })
    expect(wrapper.text()).toContain('Warm Up')
  })

  it('pausing swaps the Pause button for Resume', async () => {
    const wrapper = mount(TimerScreen, { props: { config: baseConfig } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Resume')
  })

  it('reset emits exit', async () => {
    const wrapper = mount(TimerScreen, { props: { config: baseConfig } })
    const resetButton = wrapper.findAll('button').at(-1)!
    await resetButton.trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows a Finish button and emits exit when the session completes', async () => {
    const wrapper = mount(TimerScreen, { props: { config: quickDoneConfig } })
    vi.advanceTimersByTime(2100)
    await nextTick()
    expect(wrapper.text()).toContain('Finish')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows a custom step label during that phase', () => {
    const wrapper = mount(TimerScreen, {
      props: {
        config: {
          steps: [{ id: 'c', kind: 'custom', label: 'Stretch', seconds: 10, repeat: true }],
          rounds: 1,
        },
      },
    })
    expect(wrapper.text()).toContain('Stretch')
  })
})
