import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only the suite itself — fixtures under test/ are sample code, not tests.
    include: ['test/*.test.ts'],
  },
})
