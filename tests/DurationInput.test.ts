import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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

  // Android on-screen keyboards (notably Gboard) frequently report
  // key: 'Unidentified' on keydown, so onKeydown's digit check never fires.
  // beforeinput is the fallback path: it fires with a real inputType/data
  // even when keydown couldn't identify the key. jsdom's keydown events
  // always carry a correct event.key, so we can't reproduce the actual bug
  // here - but we can dispatch a real beforeinput event straight at the
  // input (bypassing keydown entirely) and prove that code path works.
  it('a beforeinput insertText event with no preceding keydown updates the buffer', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const el = inputEl(wrapper)
    const event = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: '3',
      bubbles: true,
      cancelable: true
    })
    el.dispatchEvent(event)
    await nextTick()
    expect(el.value).toBe('00:03')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([3])
  })

  it('a beforeinput deleteContentBackward event with no preceding keydown removes the last digit', async () => {
    const wrapper = mount(DurationInput, { props: { modelValue: 0 } })
    const el = inputEl(wrapper)
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: '3' })
    await input.trigger('keydown', { key: '0' })
    const event = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      bubbles: true,
      cancelable: true
    })
    el.dispatchEvent(event)
    await nextTick()
    expect(el.value).toBe('00:03')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([3])
  })
})
