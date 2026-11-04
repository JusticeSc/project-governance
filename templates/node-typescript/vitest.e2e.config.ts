import { defineConfig } from 'vitest/config'

// No tsconfig source aliases: subprocesses consume package exports and actual lib output.
export default defineConfig({
  test: {
    include: ['scripts/built-runtime.spec.ts', 'packages/*/*/tests/**/*.built.spec.{ts,tsx}', 'apps/*/tests/**/*.built.spec.{ts,tsx}'],
    pool: 'forks',
    maxWorkers: 1,
  },
})
