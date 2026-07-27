import { resolve } from 'node:path'
import { scan, approxTokens, type ScanOptions } from './scan.js'
import { findClusters, analyzeDarkMode, extractClassStrings, type ClusterOptions } from './classes.js'
import { findBlockClusters, claimedRanges, isInsideClaimed, type BlockOptions } from './jsx.js'
import { analyzeEditCost, isTestFile, type EditCostOptions } from './units.js'
import { calibrate, DEFAULT_MODEL, type Calibration } from './tokenize.js'
import type { Analysis } from './report.js'

export interface AnalyzeOptions
  extends Partial<ScanOptions>,
    ClusterOptions,
    BlockOptions,
    EditCostOptions {
  root: string
  /** Measure a sample against Anthropic's count_tokens and scale every figure by the result. */
  exact?: boolean
  /** Model to calibrate against. Only meaningful with `exact`. */
  model?: string
  /** How many files to measure against the API. Only meaningful with `exact`. */
  sampleSize?: number
  onProgress?: (done: number, total: number) => void
}

export const analyze = async ({
  root,
  ignore,
  extensions,
  exact,
  model = DEFAULT_MODEL,
  sampleSize,
  onProgress,
  minBlockTokens,
  maxProps,
  editCostFloor,
  monolithShare,
  excludeTests,
  ...clusterOptions
}: AnalyzeOptions): Promise<Analysis> => {
  const absolute = resolve(root)
  const scanned = scan({ root: absolute, ignore, extensions })

  // The edit-cost pass reports the test share from everything it saw, so it
  // takes the unfiltered list; every other pass sees the filtered one.
  const editCost = analyzeEditCost(scanned, { editCostFloor, monolithShare, excludeTests })
  const files = excludeTests ? scanned.filter((f) => !isTestFile(f.path)) : scanned

  const blocks = findBlockClusters(files, {
    minOccurrences: clusterOptions.minOccurrences,
    minBlockTokens,
    maxProps,
  })
  const claimed = claimedRanges(blocks)

  const clusters = findClusters(files, {
    ...clusterOptions,
    exclude: (path, start, end) => isInsideClaimed({ path, start, end }, claimed),
  })

  let calibration: Calibration | undefined
  let calibrationError: string | undefined

  if (exact) {
    try {
      calibration = await calibrate({
        files: files.map((f) => ({ path: f.path, source: f.source, approx: f.tokens })),
        model,
        sampleSize,
        onProgress,
      })
    } catch (error) {
      calibrationError = error instanceof Error ? error.message : String(error)
    }
  }

  const ratio = calibration?.ratio ?? 1
  const applyRatio = (n: number) => Math.round(n * ratio)

  const scaledFiles = files.map((f) => ({ ...f, tokens: applyRatio(f.tokens) }))
  const scaledClusters = clusters.map((c) => ({
    ...c,
    tokens: applyRatio(c.tokens),
    savings: applyRatio(c.savings),
  }))
  const scaledBlocks = blocks.map((b) => ({
    ...b,
    tokens: applyRatio(b.tokens),
    savings: applyRatio(b.savings),
    marginal: applyRatio(b.marginal),
  }))

  const classTokens = files.reduce(
    (sum, f) => sum + extractClassStrings(f.source).reduce((s, v) => s + approxTokens(v), 0),
    0,
  )

  const blockSavings = scaledBlocks.reduce((sum, b) => sum + b.savings, 0)
  const classSavings = scaledClusters.reduce((sum, c) => sum + c.savings, 0)

  const scaleShape = <T extends { tokens: number; splitEditCost: number; preambleTokens: number }>(s: T) => ({
    ...s,
    tokens: applyRatio(s.tokens),
    splitEditCost: applyRatio(s.splitEditCost),
    preambleTokens: applyRatio(s.preambleTokens),
  })

  const scaledEditCost = {
    ...editCost,
    median: applyRatio(editCost.median),
    p90: applyRatio(editCost.p90),
    max: applyRatio(editCost.max),
    medianSaving: applyRatio(editCost.medianSaving),
    totalSaving: applyRatio(editCost.totalSaving),
    splittable: editCost.splittable.map(scaleShape),
    monolithic: editCost.monolithic.map(scaleShape),
  }

  return {
    root,
    files: scaledFiles,
    editCost: scaledEditCost,
    clusters: scaledClusters,
    blocks: scaledBlocks,
    darkMode: analyzeDarkMode(files),
    totalTokens: scaledFiles.reduce((sum, f) => sum + f.tokens, 0),
    classTokens: applyRatio(classTokens),
    blockSavings,
    classSavings,
    marginalSavings: scaledBlocks.reduce((sum, b) => sum + b.marginal, 0),
    recoverable: blockSavings + classSavings,
    calibration,
    calibrationError,
  }
}

export { scan, approxTokens } from './scan.js'
export { findBlockClusters, claimedRanges, isInsideClaimed } from './jsx.js'
export { analyzeEditCost, shapeOfFile, isTestFile } from './units.js'
export type { BlockCluster, BlockOccurrence } from './jsx.js'
export type { EditCostReport, FileShape, Unit } from './units.js'
export { calibrate, pickSample, DEFAULT_MODEL } from './tokenize.js'
export { findClusters, analyzeDarkMode, extractClassStrings, isClassString } from './classes.js'
export { printReport } from './report.js'
export type { Analysis } from './report.js'
export type { Calibration } from './tokenize.js'
export type { Cluster, DarkModeReport } from './classes.js'
export type { ScannedFile } from './scan.js'
