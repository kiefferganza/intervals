export type StepKind = 'warmup' | 'work' | 'rest' | 'custom'
export type PhaseName = StepKind | 'done'

export interface StepConfig {
  id: string
  kind: StepKind
  label: string
  seconds: number
  repeat: boolean
}

export interface TimerConfig {
  steps: StepConfig[]
  rounds: number
}

export interface PhaseInfo {
  name: PhaseName
  label: string
  color: string
  duration: number
  round: number | null
}
