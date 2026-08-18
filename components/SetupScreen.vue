<script setup lang="ts">
const { config } = useTimerConfig()

const emit = defineEmits<{ start: [] }>()

const isValid = computed(() =>
  config.value.warmupSeconds >= 0 &&
  config.value.workSeconds > 0 &&
  config.value.restSeconds >= 0 &&
  config.value.rounds > 0
)
</script>

<template>
  <div class="setup">
    <header class="setup__head">
      <p class="setup__eyebrow">Offline interval trainer</p>
      <h1 class="setup__title">Interval Timer</h1>
      <p class="setup__lede">Dial in the clock once. Warm up, work, rest, repeat.</p>
    </header>

    <div class="setup__fields">
      <label class="field field--warmup">
        <span class="field__name">Warm Up</span>
        <input v-model.number="config.warmupSeconds" type="number" min="0" inputmode="numeric" />
        <span class="field__unit">sec</span>
      </label>
      <label class="field field--work">
        <span class="field__name">Work</span>
        <input v-model.number="config.workSeconds" type="number" min="1" inputmode="numeric" />
        <span class="field__unit">sec</span>
      </label>
      <label class="field field--rest">
        <span class="field__name">Rest</span>
        <input v-model.number="config.restSeconds" type="number" min="0" inputmode="numeric" />
        <span class="field__unit">sec</span>
      </label>
      <label class="field field--rounds">
        <span class="field__name">Rounds</span>
        <input v-model.number="config.rounds" type="number" min="1" inputmode="numeric" />
        <span class="field__unit">total</span>
      </label>
    </div>

    <button class="start" :disabled="!isValid" @click="emit('start')">Start</button>
  </div>
</template>

<style scoped>
.setup {
  min-height: 100dvh;
  display: grid;
  /* `safe` keeps the top of the form reachable when the viewport is short;
     browsers without it fall back to top-aligned + page scroll, which is fine. */
  align-content: safe center;
  gap: clamp(28px, 5vh, 44px);
  width: 100%;
  max-width: 620px;
  margin-inline: auto;
  padding: clamp(32px, 7vh, 64px) clamp(20px, 5vw, 32px)
    max(clamp(32px, 7vh, 64px), env(safe-area-inset-bottom));
}

/* --- Header: left-aligned, no centered-hero cliche ---------------------- */
.setup__head > * {
  margin: 0;
}

.setup__eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.setup__title {
  margin-top: 12px;
  font-size: clamp(2.1rem, 8vw, 2.9rem);
  font-weight: 660;
  letter-spacing: -0.045em;
  line-height: 0.98;
}

.setup__lede {
  margin-top: 12px;
  max-width: 34ch;
  font-size: 0.98rem;
  line-height: 1.5;
  color: var(--text-dim);
}

/* --- Fields: asymmetric fractional grid, single column on phones -------- */
.setup__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 560px) {
  .setup__fields {
    grid-template-columns: 1.18fr 0.82fr;
    gap: 14px;
  }
}

.field {
  --rail: var(--line-strong);
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 2px 10px;
  padding: 16px 20px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
  transition:
    border-color 0.4s var(--ease),
    background 0.4s var(--ease),
    transform 0.4s var(--ease);
}

.field::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--rail);
  transition: top 0.4s var(--ease), bottom 0.4s var(--ease);
}

.field:focus-within {
  background: var(--bg-raise);
  border-color: color-mix(in srgb, var(--rail) 50%, var(--line));
}

.field:focus-within::before {
  top: 10px;
  bottom: 10px;
}

.field--warmup { --rail: var(--warmup); }
.field--work { --rail: var(--work); }
.field--rest { --rail: var(--rest); }
.field--rounds { --rail: var(--done); }

.field__name {
  grid-column: 1 / -1;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.field input {
  grid-column: 1;
  width: 100%;
  min-height: 54px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: clamp(2.1rem, 7.5vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
  appearance: textfield;
  -moz-appearance: textfield;
}

.field input:focus {
  outline: none;
}

.field input::-webkit-outer-spin-button,
.field input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.field__unit {
  grid-column: 2;
  justify-self: end;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

/* --- Primary action ----------------------------------------------------- */
.start {
  min-height: 76px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: var(--accent);
  color: #062412;
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.26),
    0 14px 30px -24px rgba(34, 197, 94, 0.4);
  transition:
    transform 0.32s var(--ease),
    filter 0.32s var(--ease),
    background 0.32s var(--ease),
    box-shadow 0.32s var(--ease);
}

.start:hover:not(:disabled) {
  filter: brightness(1.06);
}

.start:active:not(:disabled) {
  transform: scale(0.985) translateY(1px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.start:disabled {
  background: var(--surface);
  border-color: var(--line);
  color: var(--text-faint);
  box-shadow: none;
  cursor: not-allowed;
}

/* --- Staggered load-in (transform/opacity only) -------------------------- */
@keyframes setup-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.setup__head,
.field,
.start {
  animation: setup-rise 0.6s var(--ease) both;
}

.field:nth-child(1) { animation-delay: 60ms; }
.field:nth-child(2) { animation-delay: 110ms; }
.field:nth-child(3) { animation-delay: 160ms; }
.field:nth-child(4) { animation-delay: 210ms; }
.start { animation-delay: 270ms; }
</style>
