<script setup lang="ts">
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [number] }>()

function secondsToDigits(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const raw = `${minutes}${seconds.toString().padStart(2, '0')}`
  return raw.replace(/^0+(?=\d)/, '').slice(-4)
}

function digitsToSeconds(value: string): number {
  const padded = value.padStart(4, '0')
  const minutes = Number(padded.slice(0, 2))
  const seconds = Number(padded.slice(2, 4))
  return minutes * 60 + seconds
}

const digits = ref(secondsToDigits(props.modelValue))
const focused = ref(false)

const display = computed(() => {
  const padded = digits.value.padStart(4, '0')
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`
})

// A parent-driven reset (e.g. loading a saved config) must resync the buffer,
// but only while the user isn't mid-entry, or their keystrokes would fight it.
watch(() => props.modelValue, (value) => {
  if (focused.value) return
  digits.value = secondsToDigits(value)
})

function commit(nextDigits: string) {
  digits.value = nextDigits
  emit('update:modelValue', digitsToSeconds(nextDigits))
}

function appendDigit(digit: string) {
  commit((digits.value + digit).slice(-4))
}

function removeLastDigit() {
  commit(digits.value.slice(0, -1))
}

function onKeydown(event: KeyboardEvent) {
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault()
    appendDigit(event.key)
    return
  }
  if (event.key === 'Backspace') {
    event.preventDefault()
    removeLastDigit()
    return
  }
  if (event.key !== 'Tab') {
    event.preventDefault()
  }
}

// Fallback for mobile on-screen keyboards (notably Android Gboard) that
// report key: 'Unidentified' on keydown, so onKeydown's digit check never
// fires and the field silently stops responding. beforeinput fires before
// the DOM mutates and carries the real inserted data even in that case, so
// we can still read the intended keystroke here.
//
// We always preventDefault - this is a fully controlled component and must
// never let the browser mutate the DOM value directly. In the normal case
// (desktop/iOS, or Android when keydown DID resolve a usable key), onKeydown
// already called preventDefault() on the keydown event, which suppresses the
// input mutation that would have triggered this beforeinput - so this
// handler only ever does work in the Android/Unidentified-key scenario.
function onBeforeInput(event: InputEvent) {
  event.preventDefault()
  if (event.inputType === 'insertText' && event.data && /^[0-9]$/.test(event.data)) {
    appendDigit(event.data)
    return
  }
  if (event.inputType === 'deleteContentBackward') {
    removeLastDigit()
  }
}
</script>

<template>
  <input
    class="duration-input"
    type="text"
    inputmode="numeric"
    :value="display"
    @keydown="onKeydown"
    @beforeinput="onBeforeInput"
    @focus="focused = true"
    @blur="focused = false"
  />
</template>

<style scoped>
.duration-input {
  width: 100%;
  min-height: 54px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: clamp(1.6rem, 6vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: left;
}
</style>
