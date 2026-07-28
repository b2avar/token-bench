import { afterAll, describe, expect, it, vi } from 'vitest'
import { analyze } from '../src/index.js'
import { approxTokens } from '../src/scan.js'
import { calibrate, pickSample } from '../src/tokenize.js'
import { remove, tree } from './helpers.js'

/**
 * Stands in for the API so the arithmetic can be checked without credentials.
 * Reporting one "token" per character gives a ratio well above 1, like the
 * real endpoint does against the local encoder.
 */
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      countTokens: vi.fn(async ({ messages }: { messages: { content: string }[] }) => ({
        input_tokens: messages[0]!.content.length,
      })),
    }
  },
}))

const LESSONS = `export const LESSON_ONE = { id: 1, title: 'Introduction', body: 'The first lesson covers the basics of the subject in some detail.' }
export const LESSON_TWO = { id: 2, title: 'Structures', body: 'The second lesson covers data structures in some reasonable detail.' }
export const LESSON_THREE = { id: 3, title: 'Algorithms', body: 'The third lesson covers common algorithms in some reasonable detail.' }
`

const root = tree({
  'data/lessons.ts': LESSONS,
  'components/Panel.tsx': `export const Panel = () => <section className="p-6 bg-white">{children}</section>\n`,
  'theme.ts': `export const surface = 'bg-white dark:bg-slate-800/40'\n`,
})

afterAll(() => remove(root))

const sample = (sources: string[]) =>
  sources.map((source, i) => ({ path: `f${i}.ts`, source, approx: approxTokens(source) }))

describe('calibrate', () => {
  it('returns the ratio between measured and approximated counts', async () => {
    const files = sample([LESSONS, 'const a = 1\n', 'export const b = () => 2\n'])

    const result = await calibrate({ files, sampleSize: 3 })

    const chars = files.reduce((sum, f) => sum + f.source.length, 0)
    expect(result.ratio).toBeCloseTo(chars / files.reduce((sum, f) => sum + f.approx, 0), 6)
    expect(result.sampleSize).toBe(3)
    expect(result.model).toBe('claude-opus-5')
    expect(result.sampleExactTokens).toBe(chars)
  })

  it('measures only the sample it was asked for, and reports progress', async () => {
    const files = sample(Array.from({ length: 20 }, (_, i) => `const value${i} = ${'x'.repeat(i + 1)}\n`))
    const seen: number[] = []

    const result = await calibrate({ files, sampleSize: 4, onProgress: (done) => seen.push(done) })

    expect(result.sampleSize).toBe(4)
    expect(seen).toEqual([1, 2, 3, 4])
    expect(result.sampleApproxTokens).toBe(
      pickSample(files, 4).reduce((sum, f) => sum + f.approx, 0),
    )
  })

  it('refuses to divide by an empty sample', async () => {
    await expect(calibrate({ files: sample(['']) })).rejects.toThrow('nothing to calibrate against')
  })
})

describe('analyze --exact', () => {
  it('scales every reported figure by the measured ratio', async () => {
    const options = { root, editCostFloor: 50, minBlockTokens: 10 }

    const approximate = await analyze(options)
    const calibrated = await analyze({ ...options, exact: true, sampleSize: 3 })

    const ratio = calibrated.calibration?.ratio
    expect(ratio).toBeGreaterThan(1)
    expect(calibrated.calibrationError).toBeUndefined()

    expect(calibrated.totalTokens).toBeGreaterThan(approximate.totalTokens)
    expect(calibrated.editCost.max).toBe(Math.round(approximate.editCost.max * ratio!))
    expect(calibrated.editCost.median).toBe(Math.round(approximate.editCost.median * ratio!))

    const before = approximate.editCost.splittable[0]!
    const after = calibrated.editCost.splittable[0]!
    expect(after.path).toBe(before.path)
    expect(after.splitEditCost).toBe(Math.round(before.splitEditCost * ratio!))
    expect(after.tokens).toBe(Math.round(before.tokens * ratio!))
  })
})
