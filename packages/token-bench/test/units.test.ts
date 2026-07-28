import { describe, expect, it } from 'vitest'
import { analyzeEditCost, isTestFile, shapeOfFile } from '../src/units.js'
import { file, SVELTE_COMPONENT, VUE_COMPONENT } from './helpers.js'

const LESSON_DATA = `export const LESSON_ONE = { id: 1, title: 'Introduction', body: 'The first lesson covers the basics of the subject in some detail.' }
export const LESSON_TWO = { id: 2, title: 'Structures', body: 'The second lesson covers data structures in some reasonable detail.' }
export const LESSON_THREE = { id: 3, title: 'Algorithms', body: 'The third lesson covers common algorithms in some reasonable detail.' }
`

const THREE_COMPONENTS = `import { useState } from 'react'

export const Header = () => {
  const [open, setOpen] = useState(false)
  return <header onClick={() => setOpen(!open)}>{open ? 'close' : 'open'}</header>
}

export const Sidebar = () => {
  const [active, setActive] = useState('home')
  return <aside onClick={() => setActive('away')}>{active === 'home' ? 'a' : 'b'}</aside>
}

export const Footer = () => {
  const [year, setYear] = useState(2026)
  return <footer onClick={() => setYear(year + 1)}>{year > 2000 ? year : 'old'}</footer>
}
`

describe('shapeOfFile', () => {
  it('counts data declarations as units', () => {
    const shape = shapeOfFile(file('data/lessons.ts', LESSON_DATA))

    expect(shape.parsed).toBe(true)
    expect(shape.units.map((u) => u.name).sort()).toEqual(['LESSON_ONE', 'LESSON_THREE', 'LESSON_TWO'])
    expect(shape.splitEditCost).toBeLessThan(shape.tokens)
  })

  it('sees through export wrappers', () => {
    const shape = shapeOfFile(
      file(
        'mixed.ts',
        `export function alpha() { return 'a longer body so the unit clears the size floor' }
class Beta { method() { return 'another body long enough to clear the size floor here' } }
export default function Gamma() { return 'a third body long enough to clear the floor' }
`,
      ),
    )

    expect(shape.units.map((u) => u.name).sort()).toEqual(['Beta', 'Gamma', 'alpha'])
  })

  it('charges everything outside a unit to the preamble', () => {
    const shape = shapeOfFile(
      file(
        'withImports.ts',
        `import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve, relative, dirname } from 'node:path'

${LESSON_DATA}`,
      ),
    )

    expect(shape.preambleTokens).toBeGreaterThan(0)
    expect(shape.splitEditCost).toBeGreaterThan(shape.preambleTokens)
  })

  it('ignores declarations too small to be worth moving', () => {
    const shape = shapeOfFile(file('tiny.ts', 'export const a = 1\nexport const b = 2\n'))

    expect(shape.units).toEqual([])
    expect(shape.parsed).toBe(true)
  })

  it.each([
    ['vue', VUE_COMPONENT],
    ['svelte', SVELTE_COMPONENT],
  ])('reports a %s single-file component as unparsed rather than empty', (ext, source) => {
    const shape = shapeOfFile(file(`Card.${ext}`, source))

    expect(shape.parsed).toBe(false)
    expect(shape.units).toEqual([])
    // Edit cost stays exact for these — that figure is just file size.
    expect(shape.tokens).toBeGreaterThan(0)
    expect(shape.splitEditCost).toBe(shape.tokens)
  })
})

describe('analyzeEditCost', () => {
  const options = { editCostFloor: 50 }

  it('calls a file of independent declarations a split candidate', () => {
    const report = analyzeEditCost([file('data/lessons.ts', LESSON_DATA)], options)

    expect(report.splittable.map((s) => s.path)).toEqual(['data/lessons.ts'])
    expect(report.monolithic).toEqual([])
    expect(report.medianSaving).toBeGreaterThan(0)
  })

  it('calls a file dominated by one declaration monolithic', () => {
    const body = "'padding that makes this one component dominate the whole file'"
    const report = analyzeEditCost(
      [file('Dashboard.tsx', `export const Dashboard = () => {\n  return [${Array(40).fill(body).join(', ')}]\n}\n`)],
      options,
    )

    expect(report.monolithic.map((s) => s.path)).toEqual(['Dashboard.tsx'])
    expect(report.splittable).toEqual([])
  })

  it('never classifies a file it could not parse', () => {
    const report = analyzeEditCost(
      [file('Card.vue', VUE_COMPONENT.repeat(8)), file('components.tsx', THREE_COMPONENTS)],
      options,
    )

    expect(report.unparsed).toEqual(['Card.vue'])
    expect([...report.splittable, ...report.monolithic].map((s) => s.path)).not.toContain('Card.vue')
  })

  it('leaves cheap files alone', () => {
    const report = analyzeEditCost([file('data/lessons.ts', LESSON_DATA)], { editCostFloor: 10_000 })

    expect(report.splittable).toEqual([])
    expect(report.monolithic).toEqual([])
  })

  it('separates the typical saving from the total opportunity', () => {
    const report = analyzeEditCost(
      [file('a.ts', LESSON_DATA), file('b.ts', LESSON_DATA), file('c.ts', LESSON_DATA)],
      options,
    )

    expect(report.splittable).toHaveLength(3)
    expect(report.totalSaving).toBeGreaterThan(report.medianSaving)
    expect(report.totalSaving).toBe(
      report.splittable.reduce((sum, s) => sum + (s.tokens - s.splitEditCost), 0),
    )
  })

  it('measures the test share against everything scanned, not the filtered set', () => {
    const files = [file('app.tsx', THREE_COMPONENTS), file('app.test.tsx', THREE_COMPONENTS)]

    const kept = analyzeEditCost(files, options)
    const dropped = analyzeEditCost(files, { ...options, excludeTests: true })

    expect(dropped.testShare).toBeCloseTo(kept.testShare, 5)
    expect(dropped.testShare).toBeGreaterThan(0)
    expect([...dropped.splittable, ...dropped.monolithic].map((s) => s.path)).not.toContain('app.test.tsx')
  })
})

describe('isTestFile', () => {
  it.each(['a.test.ts', 'a.spec.tsx', 'a-test.js', 'src/__tests__/a.ts', 'src/__mocks__/a.ts'])(
    'recognizes %s',
    (path) => expect(isTestFile(path)).toBe(true),
  )

  it.each(['src/latest.ts', 'src/inspector.ts', 'src/testing-utils.ts'])('leaves %s alone', (path) =>
    expect(isTestFile(path)).toBe(false),
  )
})
