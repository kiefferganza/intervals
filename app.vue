<script setup lang="ts">
const { config } = useTimerConfig()
const started = ref(false)
</script>

<template>
  <div class="app-shell">
    <SetupScreen v-if="!started" @start="started = true" />
    <TimerScreen v-else :config="{ ...config }" @exit="started = false" />
  </div>
</template>

<style>
/* ---------------------------------------------------------------------------
   Design tokens. Neutral zinc base, off-black (never #000), one accent for
   chrome (the "work" green). Phase hues are data-driven and come from
   utils/timerSequence.ts - they are mirrored here for the setup screen rails.
--------------------------------------------------------------------------- */
:root {
  color-scheme: dark;

  --bg: #0a0b0d;
  --bg-raise: #101318;
  --surface: #15181e;
  --line: rgba(255, 255, 255, 0.07);
  --line-strong: rgba(255, 255, 255, 0.14);

  --text: #f2f3f5;
  --text-dim: #9aa1ab;
  --text-faint: #5f646d;

  --warmup: #f59e0b;
  --work: #22c55e;
  --rest: #3b82f6;
  --done: #a855f7;
  --accent: var(--work);

  --radius-lg: 26px;
  --radius-md: 18px;
  --radius-sm: 12px;

  --ease: cubic-bezier(0.16, 1, 0.3, 1);

  --font-sans: "Geist", "Satoshi", "Cabinet Grotesk", ui-sans-serif, system-ui,
    -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "Geist Mono", "JetBrains Mono", "SF Mono", Menlo,
    Consolas, monospace;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  height: 100%;
}

body {
  margin: 0;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

button,
input {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

/* Full-bleed ambient backdrop. Static gradients only - no repaint cost. */
.app-shell {
  min-height: 100dvh;
  background:
    radial-gradient(120% 78% at 8% -12%, rgba(255, 255, 255, 0.05), transparent 58%),
    radial-gradient(96% 62% at 104% 0%, rgba(255, 255, 255, 0.028), transparent 54%);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
</style>
