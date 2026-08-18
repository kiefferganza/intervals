import type { PhaseInfo } from '~/types/timer'

function supportsAudio() {
  return typeof window !== 'undefined' &&
    (typeof (window as unknown as { AudioContext?: unknown }).AudioContext !== 'undefined' ||
     typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined')
}

function playBeep(frequency: number, durationMs: number) {
  if (!supportsAudio()) return
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    .AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function useTimerCues() {
  function fireCue(phase: PhaseInfo) {
    if (phase.name === 'done') {
      playBeep(880, 400)
      vibrate([200, 100, 200, 100, 200])
    } else {
      playBeep(660, 200)
      vibrate(150)
    }
  }

  return { fireCue }
}
