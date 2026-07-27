import { parse } from '@babel/parser'
import type { Node, Statement } from '@babel/types'
import { approxTokens, type ScannedFile } from './scan.js'

export interface Unit {
  name: string
  tokens: number
}

export interface FileShape {
  path: string
  tokens: number
  units: Unit[]
  /** Tokens not belonging to any top-level unit: imports, constants, types. */
  preambleTokens: number
  /** Share of the file taken by its single largest unit, 0–1. */
  largestShare: number
  /**
   * What a targeted edit costs once the file is split along its top-level
   * units — the median unit plus the preamble a reader still needs.
   */
  splitEditCost: number
}

const nameOf = (node: Node): string | null => {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      return node.id?.name ?? null
    case 'VariableDeclaration': {
      const first = node.declarations[0]
      if (!first) return null
      const init = first.init
      if (!init) return null
      const isCallable =
        init.type === 'ArrowFunctionExpression' ||
        init.type === 'FunctionExpression' ||
        init.type === 'CallExpression'
      if (!isCallable) return null
      return first.id.type === 'Identifier' ? first.id.name : null
    }
    default:
      return null
  }
}

const unwrapExport = (statement: Statement): Node | null => {
  if (statement.type === 'ExportNamedDeclaration') return statement.declaration ?? null
  if (statement.type === 'ExportDefaultDeclaration') {
    const d = statement.declaration
    if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') return d
    return null
  }
  return statement
}

const median = (values: number[]) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

export const shapeOfFile = (file: ScannedFile): FileShape => {
  const empty: FileShape = {
    path: file.path,
    tokens: file.tokens,
    units: [],
    preambleTokens: file.tokens,
    largestShare: 0,
    splitEditCost: file.tokens,
  }

  let ast
  try {
    ast = parse(file.source, {
      sourceType: 'module',
      errorRecovery: true,
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
    })
  } catch {
    return empty
  }

  const units: Unit[] = []
  for (const statement of ast.program.body) {
    const node = unwrapExport(statement)
    if (!node) continue
    const name = nameOf(node)
    if (!name) continue
    const start = statement.start ?? 0
    const end = statement.end ?? 0
    const tokens = approxTokens(file.source.slice(start, end))
    if (tokens < 10) continue
    units.push({ name, tokens })
  }

  if (units.length === 0) return empty

  const unitTokens = units.reduce((sum, u) => sum + u.tokens, 0)
  const preambleTokens = Math.max(0, file.tokens - unitTokens)
  const largest = Math.max(...units.map((u) => u.tokens))

  return {
    path: file.path,
    tokens: file.tokens,
    units: [...units].sort((a, b) => b.tokens - a.tokens),
    preambleTokens,
    largestShare: file.tokens ? largest / file.tokens : 0,
    splitEditCost: median(units.map((u) => u.tokens)) + preambleTokens,
  }
}

export interface EditCostOptions {
  /** Files at or below this cost are cheap enough to ignore. */
  editCostFloor?: number
  /** A file whose largest unit exceeds this share is monolithic, not splittable. */
  monolithShare?: number
  /** Drop test and spec files, which are large by nature and edited differently. */
  excludeTests?: boolean
}

const TEST_FILE = /(\.|-)(test|spec)\.[jt]sx?$|(^|\/)__(tests|mocks)__\//

export const isTestFile = (path: string) => TEST_FILE.test(path)

export interface EditCostReport {
  /** Cost of reading a file to change it, across the scanned files. */
  median: number
  p90: number
  max: number
  /** Files that would get materially cheaper to edit if split along their units. */
  splittable: FileShape[]
  /** Files dominated by one oversized unit — these need decomposition, not a split. */
  monolithic: FileShape[]
  /** Typical per-file saving when editing one of the splittable files. */
  medianSaving: number
  /** Sum of the per-file savings — the size of the opportunity, not one edit. */
  totalSaving: number
  /** Share of scanned tokens sitting in test files. */
  testShare: number
}

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0
}

export const analyzeEditCost = (
  allFiles: ScannedFile[],
  { editCostFloor = 1500, monolithShare = 0.6, excludeTests = false }: EditCostOptions = {},
): EditCostReport => {
  const scannedTokens = allFiles.reduce((sum, f) => sum + f.tokens, 0)
  const testTokens = allFiles.filter((f) => isTestFile(f.path)).reduce((sum, f) => sum + f.tokens, 0)

  const files = excludeTests ? allFiles.filter((f) => !isTestFile(f.path)) : allFiles
  const shapes = files.map(shapeOfFile)
  const costs = shapes.map((s) => s.tokens)

  const expensive = shapes.filter((s) => s.tokens > editCostFloor)
  const monolithic = expensive
    .filter((s) => s.units.length <= 1 || s.largestShare > monolithShare)
    .sort((a, b) => b.tokens - a.tokens)
  const splittable = expensive
    .filter((s) => !monolithic.includes(s) && s.splitEditCost < s.tokens * 0.75)
    .sort((a, b) => b.tokens - b.splitEditCost - (a.tokens - a.splitEditCost))

  const savings = splittable.map((s) => s.tokens - s.splitEditCost)

  return {
    median: median(costs),
    p90: percentile(costs, 0.9),
    max: Math.max(0, ...costs),
    splittable,
    monolithic,
    medianSaving: median(savings),
    totalSaving: savings.reduce((sum, n) => sum + n, 0),
    testShare: scannedTokens ? testTokens / scannedTokens : 0,
  }
}
