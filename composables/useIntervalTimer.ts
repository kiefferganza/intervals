import { tryOnUnmounted } from '@vueuse/core'
import { buildPhaseSequence } from '~/utils/timerSequence'
import type { PhaseInfo, TimerConfig } from '~/types/timer'

const TICK_MS = 250

export function useIntervalTimer(config: TimerConfig) {
  const sequence = buildPhaseSequence(config)
  const phaseIndex = ref(0)
  const phase = computed<PhaseInfo>(() => sequence[phaseIndex.value])
  const remaining = ref(sequence[0]?.duration ?? 0)
  const isRunning = ref(false)
  const isPaused = ref(false)
  const isDone = computed(() => phase.value?.name === 'done')
  const totalRounds = ref(config.rounds)

  const progress = computed(() => {
    const duration = phase.value?.duration ?? 0
    return duration > 0 ? remaining.value / duration : 0
  })

  let endTime = 0
  let intervalId: ReturnType<typeof setInterval> | null = null
  const listeners: Array<(phase: PhaseInfo) => void> = []

  function onPhaseChange(cb: (phase: PhaseInfo) => void) {
    listeners.push(cb)
  }

  function notify() {
    for (const cb of listeners) cb(phase.value)
  }

  function clearTick() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function armPhase() {
    const current = phase.value
    remaining.value = current.duration
    endTime = Date.now() + current.duration * 1000
  }

  function advance() {
    if (phaseIndex.value >= sequence.length - 1) return
    phaseIndex.value += 1
    armPhase()
    notify()
    if (phase.value.name === 'done') {
      clearTick()
      isRunning.value = false
    }
  }

  function tick() {
    remaining.value = Math.max(0, (endTime - Date.now()) / 1000)
    if (remaining.value <= 0) advance()
  }

  function start() {
    if (isRunning.value) return
    phaseIndex.value = 0
    isRunning.value = true
    isPaused.value = false
    armPhase()
    notify()
    clearTick()
    intervalId = setInterval(tick, TICK_MS)
  }

  function pause() {
    if (!isRunning.value || isPaused.value) return
    isPaused.value = true
    clearTick()
  }

  function resume() {
    if (!isRunning.value || !isPaused.value) return
    isPaused.value = false
    endTime = Date.now() + remaining.value * 1000
    intervalId = setInterval(tick, TICK_MS)
  }

  function skip() {
    if (!isRunning.value) return
    advance()
  }

  function reset() {
    clearTick()
    isRunning.value = false
    isPaused.value = false
    phaseIndex.value = 0
    remaining.value = sequence[0]?.duration ?? 0
  }

  tryOnUnmounted(clearTick)

  return {
    phase, phaseIndex, remaining, progress, isRunning, isPaused, isDone,
    totalRounds, onPhaseChange, start, pause, resume, skip, reset
  }
}
