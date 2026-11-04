import { describe, expect, it } from 'vitest'
import type { WorkspaceManifest } from './check-workspace-constraints.ts'
import { productUseErrors, type ProductUsePolicy } from './verify-product-use.ts'

const manifests: WorkspaceManifest[] = [
  { dir: 'apps/generator', manifest: { name: 'generator', dependencies: { '@scope/library': 'workspace:*' } } },
  { dir: 'packages/util/library', manifest: { name: '@scope/library' } },
  { dir: 'packages/test/helper', manifest: { name: '@scope/helper' } },
]

const policy: ProductUsePolicy = {
  roles: ['product', 'development-only', 'test-support'],
  entries: ['apps/generator'],
  packages: {
    'packages/util/library': { role: 'product', reason: 'The generator imports it at runtime.' },
    'packages/test/helper': { role: 'test-support', reason: 'Only tests mount it.' },
  },
}

describe('product-use roles', () => {
  it('accepts a runtime-reachable product package and an unreachable test package', () => {
    expect(productUseErrors(manifests, policy)).toEqual([])
  })

  it('rejects a misclassified product use and an unclassified package', () => {
    const errors = productUseErrors(manifests, {
      ...policy,
      packages: {
        'packages/util/library': { role: 'test-support', reason: 'Claims test-only use.' },
        'packages/test/helper': { role: 'product', reason: 'Claims product use without an edge.' },
      },
    })
    expect(errors).toEqual([
      'packages/util/library: classified test-support but a declared entry reaches it at runtime — product packages must use the product role',
      'packages/test/helper: classified product but no declared entry reaches it through runtime dependencies',
    ])
  })

  it('rejects a stale classification', () => {
    expect(productUseErrors(manifests, {
      ...policy,
      packages: { ...policy.packages, 'packages/gone/old': { role: 'product', reason: 'Stale.' } },
    })).toContain('packages/gone/old is not a package member — remove the stale classification')
  })
})
