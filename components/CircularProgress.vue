<script setup lang="ts">
defineProps<{
  progress: number
  color: string
  size?: number
}>()
</script>

<template>
  <svg class="ring" :width="size ?? 280" :height="size ?? 280" viewBox="0 0 280 280">
    <circle class="ring__track" cx="140" cy="140" r="120" fill="none" stroke-width="16" />
    <circle
      class="ring__value"
      cx="140" cy="140" r="120" fill="none"
      :stroke="color" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="754"
      :stroke-dashoffset="754 * (1 - progress)"
      transform="rotate(-90 140 140)"
    />
    <!-- Hairline inset edge: simulates the inner refraction of a physical dial.
         Declared after the value arc so circle indexes stay track=0, value=1. -->
    <circle class="ring__inner" cx="140" cy="140" r="104" fill="none" stroke-width="1" />
    <slot />
  </svg>
</template>

<style scoped>
.ring {
  display: block;
  max-width: 100%;
  height: auto;
}

.ring__track {
  /* Overridable by the host so a phase can tint the empty portion of the dial. */
  stroke: var(--ring-track, rgba(255, 255, 255, 0.06));
  transition: stroke 0.6s var(--ease);
}

.ring__value {
  transition:
    stroke-dashoffset 0.24s linear,
    stroke 0.5s var(--ease);
}

.ring__inner {
  stroke: rgba(255, 255, 255, 0.05);
}
</style>
