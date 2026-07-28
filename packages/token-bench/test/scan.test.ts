import { afterAll, describe, expect, it } from 'vitest'
import { scan } from '../src/scan.js'
import { remove, tree } from './helpers.js'

const root = tree({
  'app.tsx': 'export const App = () => <div>hello</div>\n',
  'nested/deep/util.ts': 'export const util = () => 1\n',
  'styles.css': '.a { color: red; }\n',
  'Card.vue': '<template><div /></template>\n',
  'node_modules/pkg/index.ts': 'export const dep = 1\n',
  'dist/bundle.js': 'export const built = 1\n',
  'coverage/report.js': 'export const covered = 1\n',
  '.hidden/secret.ts': 'export const secret = 1\n',
  'vendor/lib.ts': 'export const vendored = 1\n',
  'huge.ts': `export const big = '${'x'.repeat(2000)}'\n`,
})

afterAll(() => remove(root))

const paths = (files: { path: string }[]) => files.map((f) => f.path).sort()

describe('scan', () => {
  it('walks the tree and skips build output, dependencies and dotfiles', () => {
    expect(paths(scan({ root }))).toEqual([
      'Card.vue',
      'app.tsx',
      'huge.ts',
      'nested/deep/util.ts',
      'vendor/lib.ts',
    ])
  })

  it('honours extra ignored directories', () => {
    expect(paths(scan({ root, ignore: ['vendor', 'nested'] }))).toEqual(['Card.vue', 'app.tsx', 'huge.ts'])
  })

  it('honours an explicit extension list', () => {
    expect(paths(scan({ root, extensions: ['.tsx'] }))).toEqual(['app.tsx'])
  })

  it('skips files past the size limit', () => {
    expect(paths(scan({ root, maxFileBytes: 1000 }))).not.toContain('huge.ts')
  })

  it('returns paths relative to the root, heaviest first', () => {
    const files = scan({ root })

    expect(files.every((f) => !f.path.startsWith('/'))).toBe(true)
    for (let i = 1; i < files.length; i++) {
      expect(files[i - 1]!.tokens).toBeGreaterThanOrEqual(files[i]!.tokens)
    }
  })

  it('returns an empty list for a directory that is not there', () => {
    expect(scan({ root: `${root}/missing` })).toEqual([])
  })
})
