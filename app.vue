<script setup lang="ts">
const { config } = useTimerConfig()
const started = ref(false)
</script>

<template>
  <SetupScreen v-if="!started" @start="started = true" />
  <TimerScreen v-else :config="{ ...config }" @exit="started = false" />
</template>
