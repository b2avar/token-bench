# token-bench

Measure what it costs an AI coding agent to work in your codebase.

```bash
npx token-bench src
```

## Why

An agent reads a whole file to change any part of it. So the practical unit of cost is not your repo size — it's **the size of the file you have to open to make a change**. A 7,000-token page component means every edit in it, however small, costs 7,000 tokens of reading.

`token-bench` measures that, then tells you which files are worth restructuring and which are already fine.

It does **not** measure bundle size, runtime performance, or dependencies. Library code in `node_modules` is invisible to agents and is deliberately excluded.

### Measured on real codebases

| codebase | median edit cost | worst file | split candidates | monolithic |
|---|---|---|---|---|
| a shipped research app | 557 | 7,393 | 5 | 7 |
| vercel/commerce | 299 | 1,992 | 0 | 1 |
| novel | 454 | 2,763 | 0 | 3 |
| tremor | 799 | 7,700 | 9 | 13 |
| shadcn-ui/ui | 310 | 7,769 | 42 | 16 |

File weight varies enormously between codebases; duplication came back at 0–6% across all of them. That's why edit cost is the headline metric and duplication is a secondary check — though a 0% there is a useful answer in its own right.

### The prediction has been checked against reality

`SPLIT CANDIDATES` claims a file will cost less to edit once split. That claim was tested end to end on a shipped app: a 4,266-line lesson-data module measured at 75,518 tokens, with a predicted post-split cost of 6,567.

It was then actually split — one file per lesson, plus a barrel re-exporting the same names. Measured against `count_tokens`, the median resulting file came to **6,281 tokens: 4% off the prediction**. All fourteen declarations came out byte-identical, the build passed, all 48 tests passed, and every chunk in the production bundle kept the same size. Editing one lesson went from 75,518 tokens to 6,281 — a 12× reduction, for 1,137 tokens (1.5%) of duplicated imports and barrel overhead.

## Output

```
  COST TO EDIT  (tokens an agent reads to change one file)
  ──────────────────────────────────────────────────────────────────
  typical file              557
  p90                     2,575
  worst file              7,393

     7,393   12%  pages/Dashboard.js
     4,269    7%  pages/Collections.js

  SPLIT CANDIDATES  (several top-level units in one file)
  ──────────────────────────────────────────────────────────────────
       now     after  units  file
     3,991     1,831      3  pages/Library.js
     1,754       334     16  components/ui/menubar.jsx

  MONOLITHIC FILES  (one oversized unit — needs decomposing)
  ──────────────────────────────────────────────────────────────────
    tokens  largest  file
     7,393      72%  pages/Dashboard.js        Dashboard
     2,575      96%  pages/Landing.js          Landing
```

The two lists are deliberately separate. A **split candidate** holds several independent top-level declarations — moving them into their own files is mechanical and safe. A **monolithic file** is one oversized declaration; making it cheaper means decomposing a component, which is real design work. Lumping them together would make the easy win look as expensive as the hard one.

## Getting started

**1. Look, once.** No install, no config:

```bash
npx token-bench src
```

Thirty seconds later you either have a list of files worth restructuring, or you have `0 split candidates` — which is a real answer, and means you can stop thinking about this.

**2. Get real numbers.** The default count is approximate (see *How the numbers are produced*). For counts that match what Claude actually charges:

```bash
brew install anthropics/tap/ant && ant auth login   # or export ANTHROPIC_API_KEY
npx token-bench src --exact --no-tests
```

`--exact` measures 8 files against `count_tokens` and scales the rest. On the codebases we tested this moved figures by 1.24×–1.69×, so the approximate mode understates your real cost — sometimes badly.

**3. Keep it from coming back.** The one-off tells you where you are; a budget stops new monsters from landing. Add it as a CI step:

```yaml
# .github/workflows/token-budget.yml
name: token budget
on: pull_request
jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx token-bench src --no-tests --max-file 6000
```

The job fails with the offending files named:

```
  1 file(s) over the 6000-token edit budget:

        7393  pages/Dashboard.js
```

Pick the budget from your own p90, not from ours — run the report first and set the bar just above where you are, then ratchet down.

**4. Let the agent check itself.** If you use Claude Code, add a line to `CLAUDE.md`:

> Before finishing a task that added significant code to a file, run `npx token-bench <dir> --max-file 6000` and split the file if it fails.

The agent then keeps its own working set cheap, without you policing it.

## Options

| flag | meaning |
|---|---|
| `--exact` | calibrate counts against Anthropic's `count_tokens` endpoint |
| `--model <id>` | model to calibrate against (default `claude-opus-5`) |
| `--sample <n>` | files to measure via the API when calibrating (default 8) |
| `--no-tests` | exclude test and spec files |
| `--edit-floor <n>` | files at or below this cost are ignored (default 1500) |
| `--top <n>` | rows per list (default 10) |
| `--min <n>` | minimum repetitions for a duplication pattern (default 2) |
| `--min-block <n>` | minimum token size for a JSX block (default 20) |
| `--max-props <n>` | reject blocks varying in more places than this (default 10) |
| `--ignore <a,b>` | extra directories to skip |
| `--ext <a,b>` | extensions to scan (default `.ts,.tsx,.js,.jsx,.mjs,.cjs,.vue,.svelte`) |
| `--json` | machine-readable output |
| `--fail-over <n>` | exit 1 if recoverable tokens exceed `n` — for CI |

`node_modules`, `dist`, `build`, `out`, `coverage`, `.git`, `.next`, `.turbo`, `.cache` and dotfiles are skipped by default.

**Test files matter.** In library repos they are often the heaviest files on disk and will dominate the report — in shadcn-ui/ui they move the worst file from 7,769 to 16,117. They are also edited under a different workflow. The report warns when they exceed 25% of scanned tokens; use `--no-tests` for the picture an agent faces in application code.

## Programmatic API

```ts
import { analyze } from 'token-bench'

const result = await analyze({ root: 'src', excludeTests: true })

console.log(result.editCost.median, result.editCost.p90)
for (const f of result.editCost.splittable) {
  console.log(f.path, f.tokens, '→', f.splitEditCost, `(${f.units.length} units)`)
}
```

Also exported: `scan`, `approxTokens`, `analyzeEditCost`, `shapeOfFile`, `isTestFile`, `findBlockClusters`, `findClusters`, `analyzeDarkMode`, `calibrate`, `printReport`.

## How the numbers are produced

**Tokenizer — two modes.**

*Default (approximate).* Counts use `cl100k_base` via [`js-tiktoken`](https://github.com/dqbd/tiktoken) — OpenAI's tokenizer, not Anthropic's. Measured against `count_tokens` on five real codebases, it undercounts Claude by **1.24×–1.69×** — far more than the ~15–20% Anthropic documents for prose, and the factor varies enough between codebases that a fixed multiplier would be wrong. Rankings and ratios still hold. The report labels itself approximate whenever this mode is used.

*`--exact` (calibrated).* Counting every file through the API would mean one request per file, so `token-bench` calibrates instead: it counts everything locally, measures a sample (default 8 files, spread across the size distribution rather than the largest N) against `POST /v1/messages/count_tokens`, derives the exact-to-approximate ratio, and scales every figure by it. The report prints the model, sample size, and measured ratio. Requires `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, or an `ant auth login` profile; without credentials the run falls back to approximate and says why rather than failing.

**Edit cost** is simply the file's token count — an agent reads all of it to change any of it. Reported as median, p90, and max across the scanned files.

**Units.** Files are parsed with `@babel/parser` (`jsx` + `typescript`, error recovery on) and top-level function, arrow-function, and class declarations are measured individually. Whatever is left — imports, constants, types — is the preamble a reader needs regardless. `splitEditCost` is the median unit plus that preamble: what a targeted edit would cost after splitting. A file is a **split candidate** when that lands below 75% of its current cost, and **monolithic** when it has one unit or its largest unit exceeds 60% of the file.

**Duplication (secondary).** JSX subtrees are reduced to a structural signature — tag names, sorted attribute names, static attribute values — with text and expression leaves wildcarded. Two subtrees sharing a signature are the same component written twice. A leaf holding the same value in every occurrence stays inside the component; only leaves that *differ* are charged as props, so five copy-pasted screens differing in one heading are a 1-prop component, not a 29-prop one. Blocks varying in more than `--max-props` places are rejected — that's a page, not a component — which lets the genuine repeats nested inside surface. Nesting is claimed outermost-first so nothing is counted twice, and class strings inside a claimed block are excluded from the class-string section.

Savings are net of the work: `N·T − Σ(call sites) − (T + 22 + 4P)` for `N` occurrences of a `T`-token block with `P` props.

**Single-file components.** `.vue` and `.svelte` are scanned by default and their **edit cost is exact** — that figure is just file size. But the parser is a JS/TS parser, so it cannot read the structure of a single-file component: no units, no split candidates, no duplication for those files. The report says so explicitly rather than showing an empty result that reads as "clean", and such files are kept out of the split/monolithic lists entirely, since neither label would be a claim the tool can support.

**What this doesn't measure.** File content only, and only what is visible in the scanned scope. An agent's real session also spends tokens on the system prompt, tool output, and conversation history — and prompt caching discounts re-reads to roughly 0.1×, so the practical win of a smaller file is more about context headroom than about the bill.

## License

MIT
