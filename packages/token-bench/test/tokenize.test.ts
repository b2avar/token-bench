import { describe, expect, it } from 'vitest'
import { approxTokens, pickSample } from '../src/tokenize.js'

describe('approxTokens', () => {
  it('is deterministic and grows with the source', () => {
    expect(approxTokens('const a = 1')).toBe(approxTokens('const a = 1'))
    expect(approxTokens('const a = 1\n'.repeat(10))).toBeGreaterThan(approxTokens('const a = 1'))
    expect(approxTokens('')).toBe(0)
  })
})

describe('pickSample', () => {
  const files = Array.from({ length: 100 }, (_, i) => ({
    path: `f${i}.ts`,
    source: 'x',
    approx: i + 1,
  }))

  it('returns everything when the sample is larger than the set', () => {
    expect(pickSample(files.slice(0, 3), 8)).toHaveLength(3)
  })

  it('spreads across the size distribution instead of taking the largest', () => {
    const sample = pickSample(files, 8)

    expect(sample).toHaveLength(8)
    expect(Math.min(...sample.map((f) => f.approx))).toBe(1)
    expect(Math.max(...sample.map((f) => f.approx))).toBe(100)

    // The largest-N sample would average 96; a spread lands near the middle.
    const mean = sample.reduce((sum, f) => sum + f.approx, 0) / sample.length
    expect(mean).toBeGreaterThan(30)
    expect(mean).toBeLessThan(70)
  })

  it('never returns the same file twice', () => {
    const sample = pickSample(files.slice(0, 9), 8)

    expect(new Set(sample.map((f) => f.path)).size).toBe(sample.length)
  })
})
