import { approxTokens, type ScannedFile } from './scan.js'

const BARE_UTILITIES = new Set([
  'flex', 'grid', 'block', 'inline', 'hidden', 'absolute', 'relative', 'fixed', 'sticky',
  'static', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase', 'capitalize',
  'rounded', 'border', 'shadow', 'container', 'transition', 'transform', 'invisible',
])

const PART = /^[a-z0-9@!\-/[\].:%_&*+()#,'"=<>~]+$/

const looksLikeClassPart = (part: string) =>
  PART.test(part) && (part.includes('-') || part.includes(':') || BARE_UTILITIES.has(part))

export const isClassString = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return false
  if (!parts.every((p) => PART.test(p))) return false
  const utilityish = parts.filter(looksLikeClassPart).length
  return utilityish >= 2 && utilityish / parts.length >= 0.6
}

const STRING_LITERAL = /'([^'\\\n]{4,})'|"([^"\\\n]{4,})"|`([^`$\\]{4,})`/g

export interface ClassOccurrence {
  value: string
  start: number
  end: number
}

export const findClassStrings = (source: string): ClassOccurrence[] => {
  const found: ClassOccurrence[] = []
  for (const match of source.matchAll(STRING_LITERAL)) {
    const value = match[1] ?? match[2] ?? match[3]
    if (!value || !isClassString(value)) continue
    const start = match.index ?? 0
    found.push({
      value: value.trim().replace(/\s+/g, ' '),
      start,
      end: start + match[0].length,
    })
  }
  return found
}

export const extractClassStrings = (source: string): string[] =>
  findClassStrings(source).map((o) => o.value)

export const normalizeClasses = (value: string) => value.split(/\s+/).filter(Boolean).sort().join(' ')

export interface Cluster {
  classes: string
  count: number
  tokens: number
  files: string[]
  savings: number
}

const COMPONENT_OVERHEAD = 25

export interface ClusterOptions {
  minOccurrences?: number
  minTokens?: number
  /** Skip class strings falling inside these source ranges (already counted as JSX blocks). */
  exclude?: (path: string, start: number, end: number) => boolean
}

export const findClusters = (
  files: ScannedFile[],
  { minOccurrences = 2, minTokens = 8, exclude }: ClusterOptions = {},
): Cluster[] => {
  const groups = new Map<string, { sample: string; count: number; files: Set<string> }>()

  for (const file of files) {
    for (const occurrence of findClassStrings(file.source)) {
      if (exclude?.(file.path, occurrence.start, occurrence.end)) continue
      const key = normalizeClasses(occurrence.value)
      const group = groups.get(key) ?? { sample: occurrence.value, count: 0, files: new Set<string>() }
      group.count++
      group.files.add(file.path)
      groups.set(key, group)
    }
  }

  const clusters: Cluster[] = []
  for (const [key, group] of groups) {
    if (group.count < minOccurrences) continue
    const tokens = approxTokens(key)
    if (tokens < minTokens) continue
    const savings = (group.count - 1) * tokens - COMPONENT_OVERHEAD
    if (savings <= 0) continue
    clusters.push({
      classes: group.sample,
      count: group.count,
      tokens,
      files: [...group.files],
      savings,
    })
  }

  return clusters.sort((a, b) => b.savings - a.savings)
}

export interface DarkModeReport {
  totalOccurrences: number
  fileCount: number
  files: { path: string; count: number }[]
  concentration: number
}

export const analyzeDarkMode = (files: ScannedFile[]): DarkModeReport => {
  const hits = files
    .map((f) => ({ path: f.path, count: (f.source.match(/\bdark:/g) ?? []).length }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count)

  const total = hits.reduce((sum, f) => sum + f.count, 0)
  return {
    totalOccurrences: total,
    fileCount: hits.length,
    files: hits,
    concentration: total === 0 ? 1 : (hits[0]?.count ?? 0) / total,
  }
}
