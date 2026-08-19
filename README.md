# Interval Timer

Offline-first interval timer PWA. Build your own step sequence, repeat it, go.

Add warm-up, work, rest, or custom steps in any order, give each one a label, an mm:ss duration, and mark it to run once or repeat every round, then set a round count and hit Start. Big circular progress ring, audio + vibration cues on every phase change, screen stays awake while running, and your settings persist across sessions. Installable to your home screen and fully usable with no network connection.

## Stack

- [Nuxt 3](https://nuxt.com) (SPA mode)
- [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt.html) — offline service worker + installable manifest
- [@vueuse/nuxt](https://vueuse.org) — `useLocalStorage`
- [Vitest](https://vitest.dev) + `@nuxt/test-utils` + `@vue/test-utils`

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Production build

```bash
npm run generate   # static build to .output/public
npx serve .output/public
```

## Design

Timer engine is timestamp-based (`endTime - Date.now()`), not a per-tick decrement, so it stays accurate even when the browser throttles `setInterval` in a backgrounded tab. Wake Lock, Vibration, and Web Audio are all feature-detected with a silent fallback on unsupported browsers.

Full design spec and implementation plan: [`docs/superpowers/specs/`](docs/superpowers/specs/) and [`docs/superpowers/plans/`](docs/superpowers/plans/).
