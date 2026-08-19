import { describe, it, expect } from 'vitest'

describe('nuxt test environment', () => {
  it('auto-imports Vue reactivity APIs without explicit import', () => {
    const count = ref(0)
    count.value++
    expect(count.value).toBe(1)
  })
})
