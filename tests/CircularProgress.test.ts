// tests/CircularProgress.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CircularProgress from '~/components/CircularProgress.vue'

describe('CircularProgress', () => {
  it('sets stroke-dashoffset proportional to progress', () => {
    const wrapper = mount(CircularProgress, { props: { progress: 0.5, color: '#22c55e' } })
    const ring = wrapper.findAll('circle')[1]
    expect(ring.attributes('stroke-dashoffset')).toBe('377')
  })

  it('shows a full ring (offset 0) at progress 1', () => {
    const wrapper = mount(CircularProgress, { props: { progress: 1, color: '#22c55e' } })
    const ring = wrapper.findAll('circle')[1]
    expect(ring.attributes('stroke-dashoffset')).toBe('0')
  })

  it('renders slot content inside the svg', () => {
    const wrapper = mount(CircularProgress, {
      props: { progress: 0.5, color: '#22c55e' },
      slots: { default: '<text>42</text>' }
    })
    expect(wrapper.find('svg text').text()).toBe('42')
  })
})
