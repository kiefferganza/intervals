import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupScreen from '~/components/SetupScreen.vue'

describe('SetupScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('disables Start when workSeconds is 0', async () => {
    const wrapper = mount(SetupScreen)
    const workInput = wrapper.findAll('input')[1]
    await workInput.setValue(0)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('enables Start when all values are valid and emits start on click', async () => {
    const wrapper = mount(SetupScreen)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue(10)
    await inputs[1].setValue(30)
    await inputs[2].setValue(15)
    await inputs[3].setValue(5)
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })
})
