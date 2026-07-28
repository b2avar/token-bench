import { describe, expect, it } from 'vitest'
import { analyzeDarkMode, extractClassStrings, findClusters, isClassString } from '../src/classes.js'
import { file } from './helpers.js'

describe('isClassString', () => {
  it.each([
    'rounded-xl border border-gray-100 bg-white p-4 shadow-sm',
    'flex items-center gap-2',
    'dark:bg-slate-800/40 dark:text-slate-50',
  ])('recognizes %s', (value) => expect(isClassString(value)).toBe(true))

  it.each([
    'The quick brown fox jumps over the lazy dog',
    'application/json',
    'flex',
    'Save changes before leaving this page',
  ])('rejects %s', (value) => expect(isClassString(value)).toBe(false))
})

describe('findClusters', () => {
  const repeated = (n: number) =>
    file(
      'Panel.tsx',
      Array.from(
        { length: n },
        (_, i) => `const style${i} = 'rounded-xl border border-gray-100 bg-white p-4 shadow-sm'`,
      ).join('\n'),
    )

  it('reports a class string repeated across the codebase', () => {
    const [cluster] = findClusters([repeated(6)])

    expect(cluster?.count).toBe(6)
    expect(cluster?.savings).toBeGreaterThan(0)
  })

  it('treats a reordered class list as the same string', () => {
    const files = [
      file('A.tsx', `const a = 'rounded-xl border border-gray-100 bg-white p-4 shadow-sm'`),
      file('B.tsx', `const b = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100'`),
      file('C.tsx', `const c = 'border border-gray-100 shadow-sm bg-white rounded-xl p-4'`),
    ]
    const [cluster] = findClusters(files)

    expect(cluster?.count).toBe(3)
    expect(cluster?.files.sort()).toEqual(['A.tsx', 'B.tsx', 'C.tsx'])
  })

  it('ignores a repeat too small to pay for the component that would replace it', () => {
    // Twelve tokens repeated twice saves less than the 25 a component costs.
    const short = (name: string) => file(`${name}.tsx`, `const ${name} = 'flex items-center gap-2 rounded-lg px-3'`)

    expect(findClusters([short('a'), short('b')])).toEqual([])
    expect(findClusters([short('a'), short('b'), short('c'), short('d')])).toHaveLength(1)
  })

  it('drops strings the caller has already claimed elsewhere', () => {
    const files = [repeated(6)]

    expect(findClusters(files, { exclude: () => true })).toEqual([])
    expect(findClusters(files, { exclude: () => false })).toHaveLength(1)
  })

  it('ignores repetition too small to pay for a component', () => {
    expect(findClusters([repeated(2)], { minTokens: 100 })).toEqual([])
  })
})

describe('extractClassStrings', () => {
  it('picks class strings out of surrounding prose', () => {
    const source = `const label = 'Save your changes now'
const style = 'flex items-center gap-2'
`
    expect(extractClassStrings(source)).toEqual(['flex items-center gap-2'])
  })
})

describe('analyzeDarkMode', () => {
  it('counts variants and how far they are spread', () => {
    const report = analyzeDarkMode([
      file('a.tsx', `const a = 'dark:bg-slate-800 dark:text-slate-50'`),
      file('b.tsx', `const b = 'dark:border-slate-700'`),
      file('c.tsx', `const c = 'flex items-center'`),
    ])

    expect(report.totalOccurrences).toBe(3)
    expect(report.fileCount).toBe(2)
    expect(report.files[0]?.path).toBe('a.tsx')
  })

  it('reports full concentration when one file holds them all', () => {
    const report = analyzeDarkMode([file('tokens.ts', `const a = 'dark:bg-slate-800 dark:text-slate-50'`)])

    expect(report.concentration).toBe(1)
    expect(report.fileCount).toBe(1)
  })

  it('says nothing when there is no dark mode at all', () => {
    const report = analyzeDarkMode([file('a.tsx', `const a = 'flex items-center'`)])

    expect(report.totalOccurrences).toBe(0)
    expect(report.concentration).toBe(1)
  })
})
