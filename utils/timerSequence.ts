import type { PhaseInfo, TimerConfig } from '~/types/timer'

export function buildPhaseSequence(config: TimerConfig): PhaseInfo[] {
  const sequence: PhaseInfo[] = []

  if (config.warmupSeconds > 0) {
    sequence.push({ name: 'warmup', label: 'Warm Up', color: '#f59e0b', duration: config.warmupSeconds, round: null })
  }

  for (let round = 1; round <= config.rounds; round++) {
    sequence.push({ name: 'work', label: 'Work', color: '#22c55e', duration: config.workSeconds, round })
    if (round < config.rounds) {
      sequence.push({ name: 'rest', label: 'Rest', color: '#3b82f6', duration: config.restSeconds, round })
    }
  }

  sequence.push({ name: 'done', label: 'Done', color: '#a855f7', duration: 0, round: null })

  return sequence
}
