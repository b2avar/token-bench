import type { Cluster, DarkModeReport } from './classes.js'
import type { ScannedFile } from './scan.js'
import type { Calibration } from './tokenize.js'
import type { BlockCluster } from './jsx.js'
import type { EditCostReport } from './units.js'

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
}

const num = (n: number) => n.toLocaleString('en-US')
const pad = (v: string | number, n: number) => String(v).padStart(n)
const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + '…')

/**
 * Paths are truncated from the left: in a deep tree the filename is the part
 * you need to act on, and cutting the tail throws it away.
 */
const truncatePath = (path: string, n: number) => (path.length <= n ? path : '…' + path.slice(-(n - 1)))

export interface Analysis {
  root: string
  files: ScannedFile[]
  editCost: EditCostReport
  clusters: Cluster[]
  blocks: BlockCluster[]
  darkMode: DarkModeReport
  totalTokens: number
  classTokens: number
  blockSavings: number
  classSavings: number
  marginalSavings: number
  recoverable: number
  calibration?: Calibration
  calibrationError?: string
}

export const printReport = (a: Analysis, top: number) => {
  const out: string[] = ['']

  out.push(C.bold(`  token-bench  ${a.root}`))
  out.push(C.dim(`  ${a.files.length} files · ${num(a.totalTokens)} tokens`))

  if (a.calibration) {
    const { model, sampleSize, ratio } = a.calibration
    out.push(
      C.green(`  Calibrated against ${model} — ${sampleSize} files measured via count_tokens`),
    )
    out.push(
      C.dim(
        `  Local encoder undercounts this codebase by ${Math.round((ratio - 1) * 100)}%; all figures scaled by ${ratio.toFixed(3)}×`,
      ),
    )
  } else {
    out.push(C.yellow('  Approximate — counted with cl100k_base (OpenAI), not Claude\'s tokenizer.'))
    if (a.calibrationError) {
      out.push(C.dim(`  Calibration unavailable: ${truncate(a.calibrationError, 60)}`))
    } else {
      out.push(C.dim('  Run with --exact and ANTHROPIC_API_KEY set for Claude-accurate counts.'))
    }
  }
  out.push('')

  const ec = a.editCost

  out.push(C.bold('  COST TO EDIT') + C.dim('  (tokens an agent reads to change one file)'))
  out.push(C.dim('  ' + '─'.repeat(66)))
  out.push(`  ${'typical file'.padEnd(20)} ${pad(num(ec.median), 8)}`)
  out.push(`  ${'p90'.padEnd(20)} ${pad(num(ec.p90), 8)}`)
  out.push(`  ${'worst file'.padEnd(20)} ${pad(num(ec.max), 8)}`)
  out.push('')
  for (const f of a.files.slice(0, top)) {
    const share = a.totalTokens ? Math.round((100 * f.tokens) / a.totalTokens) : 0
    out.push(`  ${pad(num(f.tokens), 8)}  ${pad(share + '%', 4)}  ${C.dim(truncatePath(f.path, 52))}`)
  }
  out.push('')

  if (ec.splittable.length) {
    out.push(C.bold('  SPLIT CANDIDATES') + C.dim('  (several top-level units in one file)'))
    out.push(C.dim('  ' + '─'.repeat(66)))
    out.push(C.dim(`  ${pad('now', 8)}  ${pad('after', 8)}  ${pad('units', 5)}  file`))
    for (const f of ec.splittable.slice(0, top)) {
      out.push(
        `  ${pad(num(f.tokens), 8)}  ${C.green(pad(num(f.splitEditCost), 8))}  ${pad(f.units.length, 5)}  ${C.dim(truncatePath(f.path, 40))}`,
      )
    }
    out.push('')
  }

  if (ec.monolithic.length) {
    out.push(C.bold('  MONOLITHIC FILES') + C.dim('  (one oversized unit — needs decomposing)'))
    out.push(C.dim('  ' + '─'.repeat(66)))
    out.push(C.dim(`  ${pad('tokens', 8)}  ${pad('largest', 7)}  file`))
    for (const f of ec.monolithic.slice(0, top)) {
      const biggest = f.units[0]
      out.push(
        `  ${pad(num(f.tokens), 8)}  ${pad(biggest ? Math.round(f.largestShare * 100) + '%' : '—', 7)}  ${C.dim(truncatePath(f.path, 40))}${biggest ? C.dim(`  ${biggest.name}`) : C.dim('  (no top-level units)')}`,
      )
    }
    out.push('')
  }

  if (a.classTokens > 0) {
    const share = Math.round((100 * a.classTokens) / a.totalTokens)
    out.push(C.bold('  CLASS STRING COST'))
    out.push(C.dim('  ' + '─'.repeat(66)))
    out.push(`  Tailwind class strings account for ${num(a.classTokens)} tokens (${share}% of total)`)
    out.push('')
  }

  if (a.blocks.length) {
    out.push(C.bold('  REPEATED JSX BLOCKS') + C.dim('  (extractable into components)'))
    out.push(C.dim('  ' + '─'.repeat(66)))
    out.push(C.dim(`  ${pad('saves', 8)}  ${pad('×', 4)}  ${pad('tokens', 6)}  ${pad('props', 5)}  shape`))
    for (const b of a.blocks.slice(0, top)) {
      out.push(
        `  ${C.green(pad(num(b.savings), 8))}  ${pad(b.count, 4)}  ${pad(b.tokens, 6)}  ${pad(b.leafCount, 5)}  ${C.dim(truncate(b.shape, 38))}`,
      )
    }
    out.push('')
  }

  if (a.clusters.length) {
    out.push(C.bold('  REPEATED CLASS STRINGS') + C.dim('  (outside the blocks above)'))
    out.push(C.dim('  ' + '─'.repeat(66)))
    out.push(C.dim(`  ${pad('saves', 8)}  ${pad('×', 4)}  ${pad('tokens', 6)}  pattern`))
    for (const c of a.clusters.slice(0, top)) {
      out.push(
        `  ${C.green(pad(num(c.savings), 8))}  ${pad(c.count, 4)}  ${pad(c.tokens, 6)}  ${C.dim(truncate(c.classes, 44))}`,
      )
    }
    out.push('')
  }

  const dm = a.darkMode
  if (dm.totalOccurrences > 0) {
    out.push(C.bold('  DARK MODE SPREAD'))
    out.push(C.dim('  ' + '─'.repeat(66)))
    out.push(`  ${dm.totalOccurrences} ${C.cyan('dark:')} variants across ${dm.fileCount} file(s)`)
    if (dm.fileCount > 1) {
      out.push(C.yellow('  Collect these in a single theme module so screen files carry no dark: at all.'))
      for (const f of dm.files.slice(0, 5)) {
        out.push(C.dim(`    ${pad(f.count, 5)}  ${truncatePath(f.path, 55)}`))
      }
    } else if (a.files.length > 1) {
      out.push(C.green(`  Centralized in one file (${dm.files[0]?.path}).`))
    } else {
      out.push(C.dim('  Single file scanned — scan the whole source tree to judge the spread.'))
    }
    out.push('')
  }

  out.push(C.bold('  SUMMARY'))
  out.push(C.dim('  ' + '─'.repeat(66)))
  const pct = (n: number) => (a.totalTokens ? Math.round((100 * n) / a.totalTokens) : 0)

  if (ec.splittable.length > 0) {
    out.push(
      `  Editing one of the ${ec.splittable.length} split candidates costs ${C.green(C.bold(num(ec.medianSaving) + ' tokens'))} less once split`,
    )
    out.push(
      C.dim(`  (median). Across all of them that is ${num(ec.totalSaving)} tokens of standing weight —`),
    )
    out.push(C.dim('  the size of the opportunity, not the cost of any single edit.'))
    out.push('')
  }

  if (ec.testShare > 0.25) {
    out.push(
      C.yellow(`  ${Math.round(ec.testShare * 100)}% of the scanned tokens are test files.`) +
        C.dim(' Re-run with --no-tests'),
    )
    out.push(C.dim('  to see the picture an agent faces when editing application code.'))
    out.push('')
  }

  if (a.recoverable > 0) {
    out.push(`  Repeated JSX blocks        ${pad(num(a.blockSavings), 8)} tokens  (${pct(a.blockSavings)}%)`)
    out.push(`  Repeated class strings     ${pad(num(a.classSavings), 8)} tokens  (${pct(a.classSavings)}%)`)
    if (a.marginalSavings > 0) {
      out.push(
        C.dim(`  Reusing every one of those components once more would save a further ${num(a.marginalSavings)}`),
      )
      out.push(C.dim('  on top, since their definitions are already paid for.'))
    }
  } else {
    out.push(C.dim('  No significant duplication — the repetition lever does not apply here.'))
  }

  out.push('')
  out.push(C.dim('  Edit cost is the whole file: an agent reads all of it to change any of it.'))
  out.push(C.dim('  Split candidates hold several independent top-level units, so the split is'))
  out.push(C.dim('  mechanical. Monolithic files are one oversized unit — those need decomposing,'))
  out.push(C.dim('  which is real work, so they are listed separately rather than scored.'))
  out.push('')

  console.log(out.join('\n'))
}
