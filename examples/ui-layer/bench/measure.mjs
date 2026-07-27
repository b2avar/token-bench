import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEncoding } from 'js-tiktoken'

const enc = getEncoding('cl100k_base')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const count = (p) => enc.encode(readFileSync(join(root, p), 'utf8')).length

const A = 'bench/a-baseline/VisitorList.tsx'
const B = 'bench/b-optimized/VisitorList.tsx'

const layerFiles = readdirSync(join(root, 'src/ui'))
  .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'index.ts')
  .map((f) => `src/ui/${f}`)

const docs = count('src/ui/CONVENTIONS.md')

const a = count(A)
const b = count(B)
const layer = layerFiles.reduce((s, f) => s + count(f), 0)
const saved = a - b

const pct = (n, d) => `${Math.round((100 * n) / d)}%`
const pad = (s, n) => String(s).padStart(n)

console.log('\n  TOKENS PER SCREEN (same screen, same rendered output)')
console.log('  ' + '-'.repeat(52))
console.log(`  A  raw Tailwind            ${pad(a, 6)} token`)
console.log(`  B  semantic layer         ${pad(b, 6)} token`)
console.log(`     saved                  ${pad(saved, 6)} token   (${pct(saved, a)} less)`)

console.log('\n  ONE-OFF COST OF THE LAYER')
console.log('  ' + '-'.repeat(52))
for (const f of layerFiles) console.log(`  ${f.replace('src/ui/', '').padEnd(24)} ${pad(count(f), 6)} token`)
console.log(`  ${'TOTAL (code)'.padEnd(24)} ${pad(layer, 6)} token`)
console.log(`  ${'CONVENTIONS.md'.padEnd(24)} ${pad(docs, 6)} token   (per session)`)

const be = layer / saved
console.log(`\n  Break-even: ${be.toFixed(1)} screens`)

console.log('\n  AT SCALE (an agent reads each screen ~3x per session)')
console.log('  ' + '-'.repeat(64))
console.log(
  `  ${'screens'.padEnd(7)} ${'A'.padStart(9)} ${'B (src/ui)'.padStart(11)} ${'share'.padStart(6)} ${'B (npm)'.padStart(9)} ${'share'.padStart(6)}`,
)
for (const n of [1, 5, 10, 20, 50]) {
  const ca = a * n * 3
  const cSrc = b * n * 3 + layer
  const cNpm = b * n * 3 + docs
  console.log(
    `  ${String(n).padEnd(7)} ${pad(ca, 9)} ${pad(cSrc, 11)} ${pad(pct(ca - cSrc, ca), 6)} ${pad(cNpm, 9)} ${pad(pct(ca - cNpm, ca), 6)}`,
  )
}
console.log('\n  B (src/ui): layer in the repo, agent can read its source -> costs ' + layer)
console.log('  B (npm)   : layer in node_modules, agent reads only the doc -> costs ' + docs)
console.log()
