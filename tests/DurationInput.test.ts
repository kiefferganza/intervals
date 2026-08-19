import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DurationInput from '~/components/DurationInput.vue'

function inputEl(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('input').element as HTMLInputElement
}

describe('DurationInput', () => {
  it('shows 00:00 for a zero modelValue', () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    expect(inputEl(wrapper).value).toBe('00:00')
  })

  it('typing 3, 0, 0 displays 03:00 and emits 180 seconds', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: '0' })
    await input.trigger('keydown', { key: '0' })
    expect(inputEl(wrapper).value).toBe('03:00')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([180])
  })

  it('typing 2, 5, 0 displays 02:50 and emits 170 seconds', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '2' })
    await input.trigger('keydown', { key: '5' })
    await input.trigger('keydown', { key: '0' })
    expect(inputEl(wrapper).value).toBe('02:50')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([170])
  })

  it('a 5th typed digit drops the oldest one (right-to-left shift)', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    for (const key of ['1', '2', '3', '4', '5']) {
      await input.trigger('keydown', { key })
    }
    expect(inputEl(wrapper).value).toBe('23:45')
  })

  it('backspace removes the last digit', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: '0' })
    await input.trigger('keydown', { key: '0' })
    await input.trigger('keydown', { key: 'Backspace' })
    expect(inputEl(wrapper).value).toBe('00:30')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([30])
  })

  it('ignores non-digit, non-backspace keys', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: 'a' })
    expect(inputEl(wrapper).value).toBe('00:03')
  })

  it('resyncs its display when modelValue changes externally while unfocused', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    await wrapper.setProps({ modelValue: 65 })
    expect(inputEl(wrapper).value).toBe('01:05')
  })
})
