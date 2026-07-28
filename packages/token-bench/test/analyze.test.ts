import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { analyze } from '../src/index.js'
import { CARD, remove, tree, VUE_COMPONENT } from './helpers.js'

const LESSONS = `export const LESSON_ONE = { id: 1, title: 'Introduction', body: 'The first lesson covers the basics of the subject in some detail.' }
export const LESSON_TWO = { id: 2, title: 'Structures', body: 'The second lesson covers data structures in some reasonable detail.' }
export const LESSON_THREE = { id: 3, title: 'Algorithms', body: 'The third lesson covers common algorithms in some reasonable detail.' }
`

const CARDS = `export const Panel = () => (
  <section>
${CARD('{a}')}
${CARD('{b}')}
${CARD('{c}')}
  </section>
)
`

const root = tree({
  'data/lessons.ts': LESSONS,
  'components/Cards.tsx': CARDS,
  'components/Card.vue': VUE_COMPONENT,
  'theme.ts': `export const surface = 'bg-white dark:bg-slate-800/40'\nexport const line = 'border-gray-100 dark:border-slate-700'\n`,
  'app.test.tsx': LESSONS,
  'node_modules/pkg/index.ts': LESSONS,
})

const options = { root, editCostFloor: 50, minBlockTokens: 10 }

afterAll(() => remove(root))
afterEach(() => vi.unstubAllGlobals())

describe('analyze', () => {
  it('makes no network call unless asked to calibrate', async () => {
    const fetch = vi.fn(() => {
      throw new Error('the default report must not touch the network')
    })
    vi.stubGlobal('fetch', fetch)

    const result = await analyze(options)

    expect(fetch).not.toHaveBeenCalled()
    expect(result.calibration).toBeUndefined()
    expect(result.calibrationError).toBeUndefined()
    expect(result.totalTokens).toBeGreaterThan(0)
  })

  it('falls back to approximate counts when calibration fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('no credentials here')))

    const result = await analyze({ ...options, exact: true })

    expect(result.calibration).toBeUndefined()
    expect(result.calibrationError).toBeTruthy()
    expect(result.totalTokens).toBeGreaterThan(0)
  })

  it('excludes dependencies and reports the pieces of the codebase', async () => {
    const result = await analyze(options)

    expect(result.files.map((f) => f.path)).not.toContain('node_modules/pkg/index.ts')
    expect(result.editCost.splittable.map((s) => s.path)).toContain('data/lessons.ts')
    expect(result.editCost.unparsed).toEqual(['components/Card.vue'])
    expect(result.blocks[0]?.count).toBe(3)
    expect(result.darkMode.totalOccurrences).toBe(2)
    expect(result.recoverable).toBe(result.blockSavings + result.classSavings)
  })

  it('wires excludeTests through to every pass', async () => {
    const kept = await analyze(options)
    const dropped = await analyze({ ...options, excludeTests: true })

    expect(kept.files.map((f) => f.path)).toContain('app.test.tsx')
    expect(dropped.files.map((f) => f.path)).not.toContain('app.test.tsx')
    expect(dropped.totalTokens).toBeLessThan(kept.totalTokens)
    expect(dropped.editCost.testShare).toBeGreaterThan(0)
  })

  it('counts class strings inside a claimed block only once', async () => {
    const result = await analyze(options)

    const claimedClasses = result.clusters.filter((c) => c.classes.includes('rounded-xl'))
    expect(claimedClasses).toEqual([])
  })
})
