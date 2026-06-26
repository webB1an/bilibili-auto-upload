import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/services/__tests__/**/*.test.ts']
  }
})
