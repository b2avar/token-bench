import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { approxTokens } from '../src/scan.js'
import type { ScannedFile } from '../src/scan.js'

/** Builds a ScannedFile without touching disk — most passes take these directly. */
export const file = (path: string, source: string): ScannedFile => ({
  path,
  source,
  tokens: approxTokens(source),
  chars: source.length,
})

/** Writes a tree of files to a fresh temp directory and returns its root. */
export const tree = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'token-bench-'))
  for (const [path, source] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, source, 'utf8')
  }
  return root
}

export const remove = (root: string) => rmSync(root, { recursive: true, force: true })

export const CARD = (text: string) => `      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">${text}</h3>
        <p className="text-sm text-gray-600">A short description line.</p>
      </div>`

export const VUE_COMPONENT = `<template>
  <div class="card"><span>{{ title }}</span></div>
</template>

<script setup>
const props = defineProps({ title: String })
</script>

<style scoped>
.card { color: red; padding: 4px; }
</style>
`

export const SVELTE_COMPONENT = `<script>
  export let title = ''
</script>

<div class="card">{title}</div>

<style>
  .card { color: red; }
</style>
`
