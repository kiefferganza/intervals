import { useLocalStorage } from '@vueuse/core'
import type { TimerConfig } from '~/types/timer'

const STORAGE_KEY = 'interval-timer-config'

export const defaultTimerConfig: TimerConfig = {
  warmupSeconds: 30,
  workSeconds: 40,
  restSeconds: 20,
  rounds: 8
}

let sharedConfig: ReturnType<typeof useLocalStorage<TimerConfig>> | null = null

export function useTimerConfig() {
  if (!sharedConfig) {
    sharedConfig = useLocalStorage<TimerConfig>(STORAGE_KEY, { ...defaultTimerConfig }, { deep: true, flush: 'sync' })
  }
  return { config: sharedConfig }
}
