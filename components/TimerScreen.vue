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
  <div
    class="timer-screen"
    :class="{ 'is-paused': timer.isPaused.value, 'is-done': timer.isDone.value }"
    :style="{ '--phase': timer.phase.value.color }"
  >
    <header class="topbar">
      <span class="topbar__mark">
        <span class="topbar__dot" />
        Intervals
      </span>
      <p v-if="timer.phase.value.round" class="topbar__round">
        Round <span class="topbar__round-now">{{ timer.phase.value.round }}</span>
        <span class="topbar__round-sep">/</span>{{ timer.totalRounds.value }}
      </p>
    </header>

    <div class="stage">
      <CircularProgress :progress="timer.progress.value" :color="timer.phase.value.color">
        <text x="140" y="102" text-anchor="middle" class="phase-label">{{ timer.phase.value.label }}</text>
        <text x="140" y="167" text-anchor="middle" class="phase-time">{{ formatTime(timer.remaining.value) }}</text>
      </CircularProgress>
    </div>

    <div class="controls">
      <template v-if="!timer.isDone.value">
        <button v-if="!timer.isPaused.value" class="ctrl ctrl--primary" @click="timer.pause()">Pause</button>
        <button v-else class="ctrl ctrl--primary" @click="timer.resume()">Resume</button>
        <button class="ctrl" @click="timer.skip()">Skip</button>
        <button class="ctrl ctrl--ghost" @click="handleExit">Reset</button>
      </template>
      <button v-else class="ctrl ctrl--finish" @click="handleExit">Finish</button>
    </div>
  </div>
</template>

<style scoped>
.timer-screen {
  --phase: var(--work);
  --ring-track: rgba(255, 255, 255, 0.06);

  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: clamp(16px, 3vh, 28px);
  width: 100%;
  max-width: 560px;
  margin-inline: auto;
  padding: clamp(20px, 4vh, 32px) clamp(18px, 5vw, 28px)
    max(clamp(22px, 4vh, 34px), env(safe-area-inset-bottom));
}

.timer-screen.is-done {
  --ring-track: color-mix(in srgb, var(--phase) 26%, transparent);
}

/* --- Top bar ------------------------------------------------------------ */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 34px;
}

.topbar__mark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.topbar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--phase);
  transition: background 0.5s var(--ease);
  animation: dot-breathe 2.4s ease-in-out infinite;
}

.is-paused .topbar__dot,
.is-done .topbar__dot {
  animation: none;
}

.is-paused .topbar__dot {
  background: var(--text-faint);
}

@keyframes dot-breathe {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.42; transform: scale(0.82); }
}

.topbar__round {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: var(--text-faint);
}

.topbar__round-now {
  color: var(--text);
  font-weight: 600;
}

.topbar__round-sep {
  margin: 0 0.35ch;
  color: var(--text-faint);
}

/* --- The dial: the whole point of the screen ---------------------------- */
.stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
}

/* Soft phase-tinted ambience behind the dial. Transform-animated only. */
.stage::before {
  content: "";
  position: absolute;
  width: min(88vw, 60vh, 620px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--phase) 14%, transparent),
    transparent 74%
  );
  animation: stage-breathe 5.6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes stage-breathe {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.07); opacity: 0.62; }
}

.stage :deep(svg) {
  position: relative;
  width: min(80vw, 52vh, 520px);
  height: auto;
}

.phase-label {
  fill: var(--phase);
  font-family: var(--font-sans);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 3.4px;
  text-transform: uppercase;
  transition: fill 0.5s var(--ease);
}

.phase-time {
  fill: var(--text);
  font-family: var(--font-mono);
  font-size: 60px;
  font-weight: 600;
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
}

/* Paused: dim the dial and stop the ambience, so the state is unmistakable
   from across a room without reading a word. */
.is-paused .stage {
  animation: stage-fade 2s ease-in-out infinite;
}

.is-paused .stage::before {
  animation: none;
  opacity: 0.35;
}

@keyframes stage-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* --- Controls: thumb-sized, weighted toward the primary action ---------- */
.controls {
  display: grid;
  grid-template-columns: 1.35fr 1fr 1fr;
  gap: 10px;
}

.is-done .controls {
  grid-template-columns: 1fr;
}

.ctrl {
  min-height: 68px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    transform 0.28s var(--ease),
    background 0.28s var(--ease),
    border-color 0.28s var(--ease),
    color 0.28s var(--ease);
}

.ctrl:active {
  transform: scale(0.975) translateY(1px);
}

.ctrl--primary {
  background: color-mix(in srgb, var(--phase) 16%, var(--surface));
  border-color: color-mix(in srgb, var(--phase) 34%, var(--line));
  color: var(--phase);
  font-size: 1.06rem;
  font-weight: 700;
}

.ctrl--ghost {
  background: transparent;
  color: var(--text-dim);
  box-shadow: none;
}

.ctrl--ghost:hover {
  color: var(--text);
  border-color: var(--line-strong);
}

.ctrl--finish {
  min-height: 76px;
  border-color: transparent;
  border-radius: var(--radius-lg);
  background: var(--phase);
  color: #14031f;
  font-size: 1.18rem;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

/* --- Entry ------------------------------------------------------------- */
@keyframes timer-in {
  from { opacity: 0; transform: scale(0.965); }
  to { opacity: 1; transform: none; }
}

.stage {
  animation: timer-in 0.55s var(--ease) both;
}

.controls {
  animation: timer-in 0.55s var(--ease) 0.1s both;
}
</style>
