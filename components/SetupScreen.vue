<script setup lang="ts">
import type { StepConfig, StepKind } from '~/types/timer'
import { defaultStepLabel } from '~/utils/timerSequence'

const { config } = useTimerConfig()

const emit = defineEmits<{ start: [] }>()

const KIND_OPTIONS: { value: StepKind; label: string }[] = [
  { value: 'warmup', label: 'Warm-up' },
  { value: 'work', label: 'Work' },
  { value: 'rest', label: 'Rest' },
  { value: 'custom', label: 'Custom' },
]

function labelPlaceholder(step: StepConfig) {
  return step.kind === 'custom' ? 'Label' : defaultStepLabel(step.kind)
}

function addStep() {
  config.value.steps.push({
    id: crypto.randomUUID(),
    kind: 'custom',
    label: '',
    seconds: 0,
    repeat: true,
  })
}

function removeStep(id: string) {
  config.value.steps = config.value.steps.filter(step => step.id !== id)
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= config.value.steps.length) return
  const steps = [...config.value.steps]
  const [moved] = steps.splice(index, 1)
  steps.splice(target, 0, moved)
  config.value.steps = steps
}

const isValid = computed(() =>
  config.value.steps.length > 0 &&
  config.value.steps.every(step =>
    step.seconds > 0 && (step.kind !== 'custom' || step.label.trim() !== '')
  ) &&
  config.value.rounds > 0
)
</script>

<template>
  <div class="setup">
    <header class="setup__head">
      <p class="setup__eyebrow">Offline interval trainer</p>
      <h1 class="setup__title">Interval Timer</h1>
      <p class="setup__lede">Build your sequence, set the rounds, go.</p>
    </header>

    <div class="setup__steps">
      <div v-for="(step, index) in config.steps" :key="step.id" class="step" :class="`step--${step.kind}`">
        <div class="step__row">
          <select v-model="step.kind" class="step__kind">
            <option v-for="option in KIND_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <input
            v-model="step.label"
            class="step__label"
            type="text"
            :placeholder="labelPlaceholder(step)"
          />
        </div>

        <div class="step__row">
          <DurationInput v-model="step.seconds" />
          <label class="step__repeat">
            <input v-model="step.repeat" type="checkbox" />
            Repeat every round
          </label>
        </div>

        <div class="step__actions">
          <button type="button" :disabled="index === 0" @click="moveStep(index, -1)">Up</button>
          <button type="button" :disabled="index === config.steps.length - 1" @click="moveStep(index, 1)">Down</button>
          <button type="button" class="step__remove" @click="removeStep(step.id)">Remove</button>
        </div>
      </div>
    </div>

    <button type="button" class="add-step" @click="addStep">+ Add step</button>

    <label class="field field--rounds">
      <span class="field__name">Rounds</span>
      <input v-model.number="config.rounds" type="number" min="1" inputmode="numeric" />
      <span class="field__unit">total</span>
    </label>

    <button class="start" :disabled="!isValid" @click="emit('start')">Start</button>
  </div>
</template>

<style scoped>
.setup {
  min-height: 100dvh;
  display: grid;
  align-content: safe center;
  gap: clamp(20px, 4vh, 32px);
  width: 100%;
  max-width: 620px;
  margin-inline: auto;
  padding: clamp(32px, 7vh, 64px) clamp(20px, 5vw, 32px)
    max(clamp(32px, 7vh, 64px), env(safe-area-inset-bottom));
}

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

.setup__steps {
  display: grid;
  gap: 12px;
}

.step {
  --rail: var(--line-strong);
  position: relative;
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--rail);
}

.step--warmup { --rail: var(--warmup); }
.step--work { --rail: var(--work); }
.step--rest { --rail: var(--rest); }
.step--custom { --rail: var(--custom); }

.step__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step__kind {
  flex: 0 0 auto;
  background: var(--bg-raise);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 0.85rem;
}

.step__label {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  padding: 8px 2px;
  font-size: 0.95rem;
}

.step__repeat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-dim);
  white-space: nowrap;
}

.step__actions {
  display: flex;
  gap: 8px;
}

.step__actions button {
  background: var(--bg-raise);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 0.78rem;
  color: var(--text-dim);
}

.step__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step__remove {
  margin-left: auto;
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.35);
}

.add-step {
  justify-self: start;
  background: transparent;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.field {
  --rail: var(--done);
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 2px 10px;
  padding: 16px 20px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

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
}

.field__unit {
  grid-column: 2;
  justify-self: end;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.start {
  min-height: 76px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: var(--accent);
  color: #062412;
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.start:disabled {
  background: var(--surface);
  border-color: var(--line);
  color: var(--text-faint);
  cursor: not-allowed;
}
</style>
