<script setup lang="ts">
defineProps<{
  progress: number
  color: string
  size?: number
}>()
</script>

<template>
  <svg :width="size ?? 280" :height="size ?? 280" viewBox="0 0 280 280">
    <circle cx="140" cy="140" r="120" fill="none" stroke="#1f2937" stroke-width="16" />
    <circle
      cx="140" cy="140" r="120" fill="none"
      :stroke="color" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="754"
      :stroke-dashoffset="754 * (1 - progress)"
      transform="rotate(-90 140 140)"
    />
    <slot />
  </svg>
</template>
