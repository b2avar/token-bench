import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync } from 'node:fs'
import Baseline from './a-baseline/VisitorList'
import Optimized from './b-optimized/VisitorList'

const split = (html: string) =>
  html
    .replace(/></g, '>\n<')
    .split('\n')
    .map((l) =>
      l.replace(/ class="([^"]*)"/g, (_, c: string) => ` class="${c.split(/\s+/).filter(Boolean).sort().join(' ')}"`),
    )

const a = split(renderToStaticMarkup(<Baseline />))
const b = split(renderToStaticMarkup(<Optimized />))

writeFileSync('bench/.a.html', a.join('\n'))
writeFileSync('bench/.b.html', b.join('\n'))

let shown = 0
for (let i = 0; i < Math.max(a.length, b.length) && shown < 12; i++) {
  if (a[i] !== b[i]) {
    console.log(`\n  satir ${i}:`)
    console.log(`  A: ${(a[i] ?? '—').slice(0, 200)}`)
    console.log(`  B: ${(b[i] ?? '—').slice(0, 200)}`)
    shown++
  }
}
console.log(`\n  toplam farkli satir: ${a.filter((l, i) => l !== b[i]).length} / ${a.length}\n`)
