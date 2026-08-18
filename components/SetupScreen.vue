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
  <div class="setup-screen">
    <h1>Interval Timer</h1>
    <label>
      Warm Up (sec)
      <input v-model.number="config.warmupSeconds" type="number" min="0" />
    </label>
    <label>
      Work (sec)
      <input v-model.number="config.workSeconds" type="number" min="1" />
    </label>
    <label>
      Rest (sec)
      <input v-model.number="config.restSeconds" type="number" min="0" />
    </label>
    <label>
      Rounds
      <input v-model.number="config.rounds" type="number" min="1" />
    </label>
    <button :disabled="!isValid" @click="emit('start')">Start</button>
  </div>
</template>
