import { defineConfig } from 'tsdown'

// Consume compiler output, never source, so the artifact plane is independent.
export default defineConfig({
  workspace: ['packages/*/*'],
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
