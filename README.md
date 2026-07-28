# token-bench

[![ci](https://github.com/b2avar/token-bench/actions/workflows/ci.yml/badge.svg)](https://github.com/b2avar/token-bench/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/token-bench)](https://www.npmjs.com/package/token-bench)

Measure what it costs an AI coding agent to work in your codebase.

```bash
npx token-bench src
```

## The idea

An agent reads a **whole file** to change any part of it.

So the real unit of cost isn't your repo size — it's the size of the file you have to open. A 7,000-token page component means every edit in it, however small, costs 7,000 tokens of reading.

Nothing in normal tooling shows you this. Line counts are a poor proxy: 300 lines of Tailwind classes and 300 lines of logic cost very different amounts.

`token-bench` measures it, in Claude's own tokens, and sorts the result into two piles:

- **Split candidates** — the file holds several independent top-level declarations. Moving them into their own files is mechanical.
- **Monolithic** — the file is one oversized declaration. Making it cheaper means decomposing a component, which is real work.

That's the whole tool. It measures; you decide.

## Example output

```
  COST TO EDIT  (tokens an agent reads to change one file)
  ──────────────────────────────────────────────────────────────────
  typical file              941
  p90                     4,349
  worst file             12,486

  SPLIT CANDIDATES  (several top-level units in one file)
       now     after  units  file
     6,741     3,092      3  pages/Library.js
     2,962       564     16  components/ui/menubar.jsx

  MONOLITHIC FILES  (one oversized unit — needs decomposing)
    tokens  largest  file
    12,486      72%  pages/Dashboard.js        Dashboard
```

If your codebase is already in good shape you get `0 split candidates`, which is also a useful answer.

## Repo layout

| path | what it is |
|---|---|
| [`packages/token-bench`](packages/token-bench) | the tool — [full docs here](packages/token-bench/README.md) |
| [`examples/ui-layer`](examples/ui-layer) | a worked example: the same CRUD screen written twice, raw Tailwind vs a small component layer, with the token difference measured |

## The example, briefly

`examples/ui-layer` builds one screen two ways and measures both against Anthropic's `count_tokens`:

```
A  raw Tailwind      5484 tokens
B  component layer   1452 tokens   → 74% less
```

Same rendered output — verified by comparing the server-rendered DOM of both versions. Run it yourself:

```bash
npm install
npm run dev     # A/B toggle in the browser
npm run bench   # the token comparison
```

## License

MIT
