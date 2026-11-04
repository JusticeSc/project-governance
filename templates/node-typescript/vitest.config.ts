import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import { standardDecoratorPlugin, vitestExecArgv } from './vitest.shared.ts'
import { COVERAGE_PARTITION_MODE_ENV, COVERAGE_TEST_TIMEOUT_ENV, coverageTestTimeoutOptions } from './scripts/coverage-partitions.ts'
import { LOCAL_TEST_PARALLELISM_CAP, defaultParallelism } from './scripts/parallelism.ts'

const pathsPlugin = () => tsconfigPaths({ projects: ['./tsconfig.base.json'] })
const testIncludes = ['packages/*/*/tests/**/*.spec.ts', 'apps/*/tests/**/*.spec.ts', 'scripts/**/*.spec.ts']
// These suites mutate worker-global process state or spawn process trees.
const processBoundTests = ['scripts/run-gates.spec.ts', 'scripts/install-lefthook.spec.ts', 'scripts/oxlint-contract.spec.ts']
// Built consumers are a separate output-only plane and fail without artifacts.
const artifactTests = ['scripts/built-runtime.spec.ts', 'packages/*/*/tests/**/*.built.spec.ts', 'apps/*/tests/**/*.built.spec.ts']
const partitionRaw = process.env[COVERAGE_PARTITION_MODE_ENV]
if (partitionRaw !== undefined && partitionRaw !== '' && partitionRaw !== '1') {
  throw new Error('vitest config: ' + COVERAGE_PARTITION_MODE_ENV + ' must be 1 or unset')
}
const partitionMode = partitionRaw === '1'
const laneTestBudget = coverageTestTimeoutOptions(process.env[COVERAGE_TEST_TIMEOUT_ENV])
const maxWorkers = defaultParallelism(process.env, undefined, LOCAL_TEST_PARALLELISM_CAP)
const uncovered = fileURLToPath(new URL('./scripts/coverage-uncovered-locations.cjs', import.meta.url))

export default defineConfig({
  plugins: [pathsPlugin(), standardDecoratorPlugin()],
  test: {
    maxWorkers,
    projects: [
      {
        plugins: [pathsPlugin(), standardDecoratorPlugin()],
        test: { name: 'thread-safe', pool: 'forks', execArgv: vitestExecArgv, ...laneTestBudget,
          include: testIncludes, exclude: [...processBoundTests, ...artifactTests] },
      },
      {
        plugins: [pathsPlugin(), standardDecoratorPlugin()],
        test: { name: 'process-bound', pool: 'forks', execArgv: vitestExecArgv, ...laneTestBudget,
          include: processBoundTests },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/*/src/**/*.ts'],
      // A killed executable lint-contract test can leave a non-product source probe behind;
      // a partition that finalizes while that probe exists must not report it as uncovered source.
      exclude: ['packages/*/*/src/oxlint-contract-*.ts'],
      ...(partitionMode ? {} : { thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 } }),
      reporter: partitionMode ? [] : process.env.CI ? ['text', uncovered] : ['text', 'html', uncovered],
    },
  },
})
