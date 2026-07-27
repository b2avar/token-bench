import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { approxTokens } from './tokenize.js'

export { approxTokens } from './tokenize.js'

const DEFAULT_IGNORE = [
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.git',
  '.next',
  '.turbo',
  '.cache',
  '.vercel',
]

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte']

export interface ScannedFile {
  path: string
  source: string
  tokens: number
  chars: number
}

export interface ScanOptions {
  root: string
  ignore?: string[]
  extensions?: string[]
  maxFileBytes?: number
}

export const scan = ({
  root,
  ignore = [],
  extensions = DEFAULT_EXTENSIONS,
  maxFileBytes = 1_000_000,
}: ScanOptions): ScannedFile[] => {
  const skip = new Set([...DEFAULT_IGNORE, ...ignore])
  const files: ScannedFile[] = []

  const walk = (dir: string) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue
      if (skip.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        if (statSync(full).size > maxFileBytes) continue
        const source = readFileSync(full, 'utf8')
        files.push({
          path: relative(root, full),
          source,
          tokens: approxTokens(source),
          chars: source.length,
        })
      }
    }
  }

  walk(root)
  return files.sort((a, b) => b.tokens - a.tokens)
}
