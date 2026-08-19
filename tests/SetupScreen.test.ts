import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupScreen from '~/components/SetupScreen.vue'

describe('SetupScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders one step card per configured step', () => {
    const wrapper = mount(SetupScreen)
    expect(wrapper.findAll('.step')).toHaveLength(3)
  })

  it('shows the kind default as a label placeholder when the label is empty', () => {
    const wrapper = mount(SetupScreen)
    const labels = wrapper.findAll('.step__label')
    expect(labels[0].attributes('placeholder')).toBe('Warm Up')
    expect(labels[1].attributes('placeholder')).toBe('Work')
    expect(labels[2].attributes('placeholder')).toBe('Rest')
  })

  it('disables Start when a step has 0 seconds', async () => {
    const wrapper = mount(SetupScreen)
    const workDuration = wrapper.findAll('.step')[1].find('.duration-input')
    await workDuration.trigger('keydown', { key: 'Backspace' })
    await workDuration.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.find('.start').attributes('disabled')).toBeDefined()
  })

  it('enables Start and emits start when every step is valid', async () => {
    const wrapper = mount(SetupScreen)
    const workDuration = wrapper.findAll('.step')[1].find('.duration-input')
    await workDuration.trigger('keydown', { key: '4' })
    await workDuration.trigger('keydown', { key: '0' })
    expect(wrapper.find('.start').attributes('disabled')).toBeUndefined()
    await wrapper.find('.start').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('a custom step needs a non-empty label even once its duration is valid', async () => {
    const wrapper = mount(SetupScreen)
    await wrapper.find('.add-step').trigger('click')
    const newStep = wrapper.findAll('.step').at(-1)!
    const newDuration = newStep.find('.duration-input')
    await newDuration.trigger('keydown', { key: '1' })
    await newDuration.trigger('keydown', { key: '0' })
    expect(wrapper.find('.start').attributes('disabled')).toBeDefined()

    await newStep.find('.step__label').setValue('Stretch')
    expect(wrapper.find('.start').attributes('disabled')).toBeUndefined()
  })

  it('removing a step drops its card from the list', async () => {
    const wrapper = mount(SetupScreen)
    const before = wrapper.findAll('.step').length
    await wrapper.findAll('.step__remove')[0].trigger('click')
    expect(wrapper.findAll('.step')).toHaveLength(before - 1)
  })

  it('moving a step up swaps its order with the previous step', async () => {
    const wrapper = mount(SetupScreen)
    const kindsBefore = wrapper.findAll('.step__kind').map(el => (el.element as HTMLSelectElement).value)
    await wrapper.findAll('.step')[1].find('button').trigger('click') // first action button is "Up"
    const kindsAfter = wrapper.findAll('.step__kind').map(el => (el.element as HTMLSelectElement).value)
    expect(kindsAfter[0]).toBe(kindsBefore[1])
    expect(kindsAfter[1]).toBe(kindsBefore[0])
  })
})
