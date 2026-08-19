import type { PhaseInfo } from '~/types/timer'

type AudioContextCtor = typeof AudioContext

/**
 * One AudioContext for the whole app. Browsers cap the number of live hardware
 * contexts (Chrome throws past ~6), and a session fires a cue per phase change,
 * so creating one per beep would silence the rest of the workout mid-session.
 */
let sharedCtx: AudioContext | null = null

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  if (typeof w.AudioContext !== 'undefined' && w.AudioContext) return w.AudioContext
  if (typeof w.webkitAudioContext !== 'undefined' && w.webkitAudioContext) return w.webkitAudioContext
  return null
}

function supportsAudio() {
  return audioContextCtor() !== null
}

/** Lazily builds (and then reuses) the shared context. Null when unsupported. */
function getAudioContext(): AudioContext | null {
  // Re-check support on every call so a stubbed/absent Web Audio API is never
  // papered over by a context cached from an earlier call.
  if (!supportsAudio()) return null
  if (sharedCtx) return sharedCtx
  const Ctx = audioContextCtor()
  if (!Ctx) return null
  try {
    sharedCtx = new Ctx()
  } catch {
    sharedCtx = null
  }
  return sharedCtx
}

function playBeep(frequency: number, durationMs: number) {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // Audio is best-effort - a failed beep must never stop the vibration cue.
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function useTimerCues() {
  /**
   * Must be called from inside a user gesture handler (the Start tap). iOS
   * Safari only lets a context leave the 'suspended' state that way; without
   * this the app is silent for the whole session.
   */
  function unlockAudio() {
    const ctx = getAudioContext()
    if (!ctx) return
    try {
      if (typeof ctx.resume === 'function' && ctx.state !== 'running') void ctx.resume()
    } catch {
      // Unsupported / already-closed context: cues degrade to vibration only.
    }
  }

  function fireCue(phase: PhaseInfo) {
    if (phase.name === 'done') {
      playBeep(880, 400)
      vibrate([200, 100, 200, 100, 200])
    } else {
      playBeep(660, 200)
      vibrate(150)
    }
  }

  return { fireCue, unlockAudio }
}
