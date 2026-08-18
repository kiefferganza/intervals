<!-- components/TimerScreen.vue -->
<script setup lang="ts">
import type { TimerConfig } from '~/types/timer'

const props = defineProps<{ config: TimerConfig }>()
const emit = defineEmits<{ exit: [] }>()

const timer = useIntervalTimer(props.config)
const { fireCue } = useTimerCues()
const wakeLock = useWakeLock()

timer.onPhaseChange((phase) => {
  fireCue(phase)
})

onMounted(() => {
  timer.start()
  wakeLock.acquire()
})

onUnmounted(() => {
  wakeLock.release()
})

function handleExit() {
  timer.reset()
  wakeLock.release()
  emit('exit')
}

function formatTime(seconds: number) {
  const total = Math.ceil(seconds)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="timer-screen">
    <CircularProgress :progress="timer.progress.value" :color="timer.phase.value.color">
      <text x="140" y="130" text-anchor="middle" class="phase-label">{{ timer.phase.value.label }}</text>
      <text x="140" y="170" text-anchor="middle" class="phase-time">{{ formatTime(timer.remaining.value) }}</text>
    </CircularProgress>
    <p v-if="timer.phase.value.round">Round {{ timer.phase.value.round }} / {{ timer.totalRounds.value }}</p>
    <div class="controls">
      <template v-if="!timer.isDone.value">
        <button v-if="!timer.isPaused.value" @click="timer.pause()">Pause</button>
        <button v-else @click="timer.resume()">Resume</button>
        <button @click="timer.skip()">Skip</button>
        <button @click="handleExit">Reset</button>
      </template>
      <button v-else @click="handleExit">Finish</button>
    </div>
  </div>
</template>
