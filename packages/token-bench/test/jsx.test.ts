import { describe, expect, it } from 'vitest'
import { claimedRanges, findBlockClusters, isInsideClaimed } from '../src/jsx.js'
import { CARD, file } from './helpers.js'

const panel = (texts: string[]) => `export const Panel = () => (
  <section>
${texts.map(CARD).join('\n')}
  </section>
)
`

const page = (name: string, extraLeaves: number) => `export const Page${name} = () => (
  <main className="p-6">
${Array.from({ length: extraLeaves }, (_, i) => `    <p className="text-sm">{value${name}${i}}</p>`).join('\n')}
${CARD('{x}')}
${CARD('{y}')}
  </main>
)
`

describe('findBlockClusters', () => {
  it('charges only the leaves that differ as props', () => {
    const [cluster] = findBlockClusters([file('Cards.tsx', panel(['{a}', '{b}', '{c}']))], {
      minBlockTokens: 10,
    })

    expect(cluster?.count).toBe(3)
    // The description line is identical in all three, so it stays inside the
    // component; only the heading varies. A per-leaf count would say 6.
    expect(cluster?.leafCount).toBe(1)
    expect(cluster?.savings).toBeGreaterThan(0)
  })

  it('treats different static classes as different components', () => {
    const other = CARD('{a}').replace('bg-white', 'bg-slate-900')
    const clusters = findBlockClusters(
      [file('Mixed.tsx', `export const P = () => (<section>\n${CARD('{a}')}\n${other}\n</section>)\n`)],
      { minBlockTokens: 10 },
    )

    expect(clusters).toEqual([])
  })

  it('counts a repeat nested inside another repeat only once', () => {
    const files = [file('A.tsx', page('A', 1)), file('B.tsx', page('B', 1))]
    const clusters = findBlockClusters(files, { minBlockTokens: 10 })

    expect(clusters).toHaveLength(1)
    expect(clusters[0]?.shape.startsWith('main')).toBe(true)
  })

  it('lets inner blocks surface when the outer one is too variable to be a component', () => {
    const files = [file('A.tsx', page('A', 4)), file('B.tsx', page('B', 4))]

    const asPage = findBlockClusters(files, { minBlockTokens: 10, maxProps: 10 })
    expect(asPage[0]?.shape.startsWith('main')).toBe(true)

    const rejected = findBlockClusters(files, { minBlockTokens: 10, maxProps: 3 })
    expect(rejected[0]?.shape).toBe('div > h3, p')
    expect(rejected[0]?.count).toBe(4)
  })

  it('respects the repetition and size floors', () => {
    const files = [file('Cards.tsx', panel(['{a}', '{b}']))]

    expect(findBlockClusters(files, { minBlockTokens: 10, minOccurrences: 3 })).toEqual([])
    expect(findBlockClusters(files, { minBlockTokens: 10_000 })).toEqual([])
  })

  it('reports which files a block spans', () => {
    const files = [file('A.tsx', panel(['{a}', '{b}'])), file('B.tsx', panel(['{c}', '{d}']))]
    const [cluster] = findBlockClusters(files, { minBlockTokens: 10 })

    expect(cluster?.files.sort()).toEqual(['A.tsx', 'B.tsx'])
  })
})

describe('claimedRanges', () => {
  it('covers the source spans of every occurrence', () => {
    const source = panel(['{a}', '{b}', '{c}'])
    const clusters = findBlockClusters([file('Cards.tsx', source)], { minBlockTokens: 10 })
    const claimed = claimedRanges(clusters)

    expect(claimed).toHaveLength(3)

    const inside = claimed[0]!
    expect(isInsideClaimed({ path: 'Cards.tsx', start: inside.start + 1, end: inside.end - 1 }, claimed)).toBe(true)
    expect(isInsideClaimed({ path: 'Other.tsx', start: inside.start + 1, end: inside.end - 1 }, claimed)).toBe(false)
    expect(isInsideClaimed({ path: 'Cards.tsx', start: 0, end: 1 }, claimed)).toBe(false)
  })
})
