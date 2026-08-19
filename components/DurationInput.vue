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

function onKeydown(event: KeyboardEvent) {
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault()
    commit((digits.value + event.key).slice(-4))
    return
  }
  if (event.key === 'Backspace') {
    event.preventDefault()
    commit(digits.value.slice(0, -1))
    return
  }
  if (event.key !== 'Tab') {
    event.preventDefault()
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
