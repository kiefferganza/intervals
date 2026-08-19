export type PhaseName = 'warmup' | 'work' | 'rest' | 'done'

export interface TimerConfig {
  warmupSeconds: number
  workSeconds: number
  restSeconds: number
  rounds: number
}

export interface PhaseInfo {
  name: PhaseName
  label: string
  color: string
  duration: number
  round: number | null
}
