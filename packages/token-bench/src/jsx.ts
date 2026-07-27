import { parse } from '@babel/parser'
import type { Node, JSXElement, JSXFragment, JSXAttribute, JSXOpeningElement } from '@babel/types'
import { approxTokens, type ScannedFile } from './scan.js'

export interface Range {
  path: string
  start: number
  end: number
}

export interface BlockOccurrence extends Range {
  tokens: number
  /** Source text of the parts that vary between occurrences (text nodes, expressions). */
  leaves: string[]
}

export interface BlockCluster {
  signature: string
  /** Human-readable shape, e.g. `div > p, p, p`. */
  shape: string
  count: number
  /** Median token size of one occurrence. */
  tokens: number
  leafCount: number
  files: string[]
  savings: number
  /** What each further reuse of this component saves, once it exists. */
  marginal: number
  occurrences: BlockOccurrence[]
}

const elementName = (node: JSXOpeningElement['name']): string => {
  switch (node.type) {
    case 'JSXIdentifier':
      return node.name
    case 'JSXMemberExpression':
      return `${elementName(node.object)}.${node.property.name}`
    case 'JSXNamespacedName':
      return `${node.namespace.name}:${node.name.name}`
  }
}

const attributeSignature = (attr: JSXAttribute | { type: 'JSXSpreadAttribute' }): string => {
  if (attr.type === 'JSXSpreadAttribute') return '...'
  const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : `${attr.name.namespace.name}:${attr.name.name.name}`
  const value = attr.value
  if (!value) return name
  if (value.type === 'StringLiteral') return `${name}="${value.value.trim().split(/\s+/).sort().join(' ')}"`
  return `${name}=~`
}

const isMeaningfulChild = (child: Node): boolean => {
  if (child.type === 'JSXText') return child.value.trim().length > 0
  return child.type !== 'JSXEmptyExpression'
}

/**
 * Structural signature of a JSX subtree.
 *
 * Static attribute values are part of the signature (two elements with
 * different Tailwind classes are genuinely different components), while text
 * and expression leaves collapse to `L` — those are exactly what becomes a
 * prop when the block is extracted.
 */
const signatureOf = (node: Node): string => {
  switch (node.type) {
    case 'JSXElement': {
      const name = elementName(node.openingElement.name)
      const attrs = node.openingElement.attributes.map(attributeSignature).sort().join(',')
      const children = node.children.filter(isMeaningfulChild).map(signatureOf).join(',')
      return `${name}[${attrs}](${children})`
    }
    case 'JSXFragment':
      return `<>(${node.children.filter(isMeaningfulChild).map(signatureOf).join(',')})`
    case 'JSXText':
    case 'JSXExpressionContainer':
      return 'L'
    default:
      return 'L'
  }
}

const shapeOf = (node: JSXElement | JSXFragment): string => {
  if (node.type === 'JSXFragment') return '<>'
  const name = elementName(node.openingElement.name)
  const children = node.children
    .filter(isMeaningfulChild)
    .map((c) => (c.type === 'JSXElement' ? elementName(c.openingElement.name) : '·'))
  return children.length ? `${name} > ${children.join(', ')}` : name
}

const leavesOf = (node: Node, source: string, out: string[] = []): string[] => {
  switch (node.type) {
    case 'JSXElement':
      for (const child of node.children.filter(isMeaningfulChild)) leavesOf(child, source, out)
      break
    case 'JSXFragment':
      for (const child of node.children.filter(isMeaningfulChild)) leavesOf(child, source, out)
      break
    case 'JSXText':
      out.push(node.value.trim())
      break
    case 'JSXExpressionContainer':
      out.push(source.slice(node.start ?? 0, node.end ?? 0))
      break
  }
  return out
}

const collectJsxElements = (root: Node, out: (JSXElement | JSXFragment)[] = []) => {
  const seen = new Set<Node>()
  const walk = (node: Node | null | undefined) => {
    if (!node || typeof node.type !== 'string' || seen.has(node)) return
    seen.add(node)
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') out.push(node)
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
      const value = (node as unknown as Record<string, unknown>)[key]
      if (Array.isArray(value)) {
        for (const item of value) if (item && typeof item === 'object') walk(item as Node)
      } else if (value && typeof value === 'object' && 'type' in value) {
        walk(value as Node)
      }
    }
  }
  walk(root)
  return out
}

/** Cost of one `<Component prop={...} />` call site, beyond the leaf values themselves. */
const CALL_SITE_BASE = 6
const CALL_SITE_PER_PROP = 3
/** Cost of the component wrapper: signature line, props destructuring, export. */
const DEFINITION_BASE = 22
const DEFINITION_PER_PROP = 4

export interface BlockOptions {
  minOccurrences?: number
  minBlockTokens?: number
  /**
   * A block whose occurrences vary in more places than this isn't a component,
   * it's a page. Rejecting it lets the genuine repeats nested inside surface.
   */
  maxProps?: number
}

/**
 * Leaf positions whose value differs between occurrences. Those become props;
 * leaves that are identical everywhere stay inside the component.
 */
const varyingLeafIndices = (occurrences: BlockOccurrence[]): number[] => {
  const width = Math.min(...occurrences.map((o) => o.leaves.length))
  const varying: number[] = []
  for (let i = 0; i < width; i++) {
    const first = occurrences[0]?.leaves[i]
    if (occurrences.some((o) => o.leaves[i] !== first)) varying.push(i)
  }
  // A ragged tail (occurrences with extra leaves) also varies by definition.
  const widest = Math.max(...occurrences.map((o) => o.leaves.length))
  for (let i = width; i < widest; i++) varying.push(i)
  return varying
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const overlaps = (a: Range, b: Range) => a.path === b.path && a.start < b.end && b.start < a.end

export const findBlockClusters = (
  files: ScannedFile[],
  { minOccurrences = 2, minBlockTokens = 20, maxProps = 10 }: BlockOptions = {},
): BlockCluster[] => {
  const groups = new Map<string, { node: JSXElement | JSXFragment; occurrences: BlockOccurrence[]; shape: string }>()

  for (const file of files) {
    let ast
    try {
      ast = parse(file.source, {
        sourceType: 'module',
        errorRecovery: true,
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
      })
    } catch {
      continue
    }

    for (const element of collectJsxElements(ast.program)) {
      const start = element.start ?? 0
      const end = element.end ?? 0
      const text = file.source.slice(start, end)
      const tokens = approxTokens(text)
      if (tokens < minBlockTokens) continue

      const signature = signatureOf(element)
      const group = groups.get(signature) ?? { node: element, occurrences: [], shape: shapeOf(element) }
      group.occurrences.push({
        path: file.path,
        start,
        end,
        tokens,
        leaves: leavesOf(element, file.source),
      })
      groups.set(signature, group)
    }
  }

  const clusters: BlockCluster[] = []
  for (const [signature, group] of groups) {
    const { occurrences } = group
    if (occurrences.length < minOccurrences) continue

    const varying = varyingLeafIndices(occurrences)
    const propCount = varying.length
    if (propCount > maxProps) continue

    const blockTokens = median(occurrences.map((o) => o.tokens))
    const total = occurrences.reduce((sum, o) => sum + o.tokens, 0)
    const callSites = occurrences.reduce(
      (sum, o) =>
        sum +
        CALL_SITE_BASE +
        CALL_SITE_PER_PROP * propCount +
        varying.reduce((s, i) => s + approxTokens(o.leaves[i] ?? ''), 0),
      0,
    )
    const definition = blockTokens + DEFINITION_BASE + DEFINITION_PER_PROP * propCount
    const savings = total - callSites - definition
    if (savings <= 0) continue

    clusters.push({
      signature,
      shape: group.shape,
      count: occurrences.length,
      tokens: blockTokens,
      leafCount: propCount,
      files: [...new Set(occurrences.map((o) => o.path))],
      savings,
      marginal: Math.max(0, blockTokens - Math.round(callSites / occurrences.length)),
      occurrences,
    })
  }

  // A repeated outer block contains repeated inner blocks. Keep the outermost
  // one in each nesting chain so savings are not counted twice.
  clusters.sort((a, b) => b.tokens - a.tokens)
  const claimed: Range[] = []
  const kept: BlockCluster[] = []
  for (const cluster of clusters) {
    if (cluster.occurrences.some((o) => claimed.some((c) => overlaps(o, c)))) continue
    claimed.push(...cluster.occurrences)
    kept.push(cluster)
  }

  return kept.sort((a, b) => b.savings - a.savings)
}

export const claimedRanges = (clusters: BlockCluster[]): Range[] =>
  clusters.flatMap((c) => c.occurrences.map(({ path, start, end }) => ({ path, start, end })))

export const isInsideClaimed = (range: Range, claimed: Range[]) =>
  claimed.some((c) => c.path === range.path && range.start >= c.start && range.end <= c.end)
