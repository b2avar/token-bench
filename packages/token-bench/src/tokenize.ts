import { getEncoding } from 'js-tiktoken'

const enc = getEncoding('cl100k_base')

/**
 * Local, offline count using OpenAI's cl100k_base.
 * Undercounts Claude tokens — never report this as an exact figure.
 */
export const approxTokens = (source: string) => enc.encode(source).length

export const DEFAULT_MODEL = 'claude-opus-5'

export interface Calibration {
  /** anthropicTokens / approxTokens, measured on a sample of real files. */
  ratio: number
  /** Number of files actually measured against the API. */
  sampleSize: number
  /** Model the sample was measured against. */
  model: string
  /** Total tokens the API reported for the sample. */
  sampleExactTokens: number
  /** Total tokens the local encoder reported for the same sample. */
  sampleApproxTokens: number
}

export interface Sample {
  path: string
  source: string
  approx: number
}

/**
 * Picks a spread of files across the size distribution rather than the
 * largest N, so the ratio is not dominated by one outlier file.
 */
export const pickSample = (files: Sample[], size: number): Sample[] => {
  if (files.length <= size) return files
  const sorted = [...files].sort((a, b) => a.approx - b.approx)
  const step = (sorted.length - 1) / (size - 1)
  const picked: Sample[] = []
  for (let i = 0; i < size; i++) {
    const item = sorted[Math.round(i * step)]
    if (item && !picked.includes(item)) picked.push(item)
  }
  return picked
}

export interface CalibrateOptions {
  files: Sample[]
  model?: string
  sampleSize?: number
  onProgress?: (done: number, total: number) => void
}

/**
 * Measures a sample of files against Anthropic's count_tokens endpoint and
 * returns the ratio between exact and locally-approximated counts.
 *
 * Throws if no credentials are available or the API is unreachable — callers
 * should fall back to approximate counts and say so in the output.
 */
export const calibrate = async ({
  files,
  model = DEFAULT_MODEL,
  sampleSize = 8,
  onProgress,
}: CalibrateOptions): Promise<Calibration> => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()

  const sample = pickSample(
    files.filter((f) => f.approx > 0),
    sampleSize,
  )
  if (sample.length === 0) throw new Error('nothing to calibrate against')

  let exact = 0
  let approx = 0

  for (const [index, file] of sample.entries()) {
    const response = await client.messages.countTokens({
      model,
      messages: [{ role: 'user', content: file.source }],
    })
    exact += response.input_tokens
    approx += file.approx
    onProgress?.(index + 1, sample.length)
  }

  return {
    ratio: exact / approx,
    sampleSize: sample.length,
    model,
    sampleExactTokens: exact,
    sampleApproxTokens: approx,
  }
}
