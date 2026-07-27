#!/usr/bin/env node
import { analyze } from './index.js'
import { printReport } from './report.js'

const HELP = `
  token-bench — measure how many tokens AI agents spend reading your codebase

  Usage
    npx token-bench [dir] [options]

  By default counts are approximate — computed locally with cl100k_base, which
  is OpenAI's tokenizer, not Claude's. Pass --exact to calibrate against
  Anthropic's count_tokens endpoint (requires ANTHROPIC_API_KEY or an
  \`ant auth login\` profile).

  Options
    --exact          Calibrate counts against Anthropic's count_tokens endpoint
    --model <id>     Model to calibrate against (default claude-opus-5)
    --sample <n>     Files to measure via the API when calibrating (default 8)
    --top <n>        Rows to show in each list (default 10)
    --min <n>        Minimum repetitions for a pattern to be reported (default 2)
    --min-tokens <n> Minimum token size for a class pattern to be reported (default 8)
    --min-block <n>  Minimum token size for a JSX block to be reported (default 20)
    --max-props <n>  Reject blocks varying in more places than this (default 10)
    --edit-floor <n> Files at or below this edit cost are ignored (default 1500)
    --no-tests       Exclude test and spec files from the edit-cost picture
    --ignore <a,b>   Extra directories to skip
    --ext <a,b>      Extensions to scan (default .ts,.tsx,.js,.jsx,.mjs,.cjs,.vue,.svelte)
    --json           Machine-readable output
    --max-file <n>   Exit 1 if any file costs more than n tokens to edit (for CI)
    --fail-over <n>  Exit 1 if recoverable duplication exceeds n tokens (for CI)
    -h, --help       Show this help

  Examples
    npx token-bench src                        one-off report
    npx token-bench src --exact --no-tests     real Claude counts, app code only
    npx token-bench src --max-file 6000        CI budget: no file over 6k tokens
    npx token-bench . --top 20 --json          machine-readable
`

const argv = process.argv.slice(2)

if (argv.includes('-h') || argv.includes('--help')) {
  console.log(HELP)
  process.exit(0)
}

const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? undefined : argv[i + 1]
}

const list = (name: string) =>
  flag(name)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const int = (name: string, fallback: number) => {
  const raw = flag(name)
  if (raw === undefined) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    console.error(`  Error: --${name} must be a number (got "${raw}")`)
    process.exit(2)
  }
  return parsed
}

const VALUE_FLAGS = new Set([
  '--top',
  '--min',
  '--min-tokens',
  '--ignore',
  '--ext',
  '--fail-over',
  '--max-file',
  '--model',
  '--sample',
  '--min-block',
  '--max-props',
  '--edit-floor',
])

const positionals: string[] = []
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]!
  if (VALUE_FLAGS.has(arg)) {
    i++
    continue
  }
  if (arg.startsWith('-')) continue
  positionals.push(arg)
}

const root = positionals[0] ?? '.'

const extensions = list('ext')?.map((e) => (e.startsWith('.') ? e : `.${e}`))

const exact = argv.includes('--exact')
const json = argv.includes('--json')

const result = await analyze({
  root,
  ignore: list('ignore'),
  extensions,
  minOccurrences: int('min', 2),
  minTokens: int('min-tokens', 8),
  minBlockTokens: int('min-block', 20),
  maxProps: int('max-props', 10),
  editCostFloor: int('edit-floor', 1500),
  excludeTests: argv.includes('--no-tests'),
  exact,
  model: flag('model'),
  sampleSize: int('sample', 8),
  onProgress:
    exact && !json
      ? (done, total) => process.stderr.write(`\r  calibrating ${done}/${total}…`)
      : undefined,
})

if (exact && !json) process.stderr.write('\r'.padEnd(30) + '\r')

if (json) {
  console.log(
    JSON.stringify(
      {
        root: result.root,
        calibration: result.calibration ?? null,
        calibrationError: result.calibrationError ?? null,
        approximate: !result.calibration,
        totalTokens: result.totalTokens,
        editCost: {
          median: result.editCost.median,
          p90: result.editCost.p90,
          max: result.editCost.max,
          medianSaving: result.editCost.medianSaving,
          totalSaving: result.editCost.totalSaving,
          testShare: result.editCost.testShare,
          splittable: result.editCost.splittable.map(({ units, ...s }) => ({ ...s, units: units.length })),
          monolithic: result.editCost.monolithic.map(({ units, ...s }) => ({ ...s, largest: units[0]?.name ?? null })),
        },
        classTokens: result.classTokens,
        blockSavings: result.blockSavings,
        classSavings: result.classSavings,
        marginalSavings: result.marginalSavings,
        recoverable: result.recoverable,
        fileCount: result.files.length,
        blocks: result.blocks.map(({ occurrences, ...b }) => ({ ...b, occurrences: occurrences.length })),
        files: result.files.map(({ path, tokens, chars }) => ({ path, tokens, chars })),
        clusters: result.clusters,
        darkMode: result.darkMode,
      },
      null,
      2,
    ),
  )
} else {
  printReport(result, int('top', 10))
}

let failed = false

const maxFile = flag('max-file')
if (maxFile !== undefined) {
  const budget = int('max-file', Infinity)
  const over = result.files.filter((f) => f.tokens > budget)
  if (over.length) {
    console.error(`\n  ${over.length} file(s) over the ${budget}-token edit budget:\n`)
    for (const f of over) console.error(`    ${String(f.tokens).padStart(8)}  ${f.path}`)
    console.error('')
    failed = true
  }
}

const failOver = flag('fail-over')
if (failOver !== undefined && result.recoverable > int('fail-over', Infinity)) {
  console.error(`  Recoverable duplication (${result.recoverable}) exceeded threshold (${failOver}).`)
  failed = true
}

if (failed) process.exit(1)
