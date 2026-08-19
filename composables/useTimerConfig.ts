import { useLocalStorage } from '@vueuse/core'
import type { TimerConfig } from '~/types/timer'

const STORAGE_KEY = 'interval-timer-config-v2'

export const defaultTimerConfig: TimerConfig = {
  steps: [
    { id: 'default-warmup', kind: 'warmup', label: '', seconds: 30, repeat: false },
    { id: 'default-work', kind: 'work', label: '', seconds: 40, repeat: true },
    { id: 'default-rest', kind: 'rest', label: '', seconds: 20, repeat: true },
  ],
  rounds: 8,
}

let sharedConfig: ReturnType<typeof useLocalStorage<TimerConfig>> | null = null

function cloneDefaultConfig(): TimerConfig {
  return {
    steps: defaultTimerConfig.steps.map(step => ({ ...step })),
    rounds: defaultTimerConfig.rounds,
  }
}

export function useTimerConfig() {
  if (!sharedConfig) {
    sharedConfig = useLocalStorage<TimerConfig>(STORAGE_KEY, cloneDefaultConfig(), { deep: true, flush: 'sync' })
  }
  return { config: sharedConfig }
}
