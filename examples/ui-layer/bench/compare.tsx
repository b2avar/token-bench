import { renderToStaticMarkup } from 'react-dom/server'
import Baseline from './a-baseline/VisitorList'
import Optimized from './b-optimized/VisitorList'

const normalize = (html: string) =>
  html
    .replace(/ class="([^"]*)"/g, (_, c: string) => ` class="${c.split(/\s+/).filter(Boolean).sort().join(' ')}"`)
    .replace(/>\s+</g, '><')
    .trim()

const a = normalize(renderToStaticMarkup(<Baseline />))
const b = normalize(renderToStaticMarkup(<Optimized />))

const tags = (html: string) => (html.match(/<[a-z]+/g) ?? []).length
const textOf = (html: string) => html.replace(/<[^>]+>/g, '|').split('|').filter((s) => s.trim()).join('|')

console.log(`\n  A  DOM eleman sayisi : ${tags(a)}`)
console.log(`  B  DOM eleman sayisi : ${tags(b)}`)
console.log(`  Gorunen metin ayni   : ${textOf(a) === textOf(b) ? 'EVET' : 'HAYIR'}`)
console.log(`  Markup birebir ayni  : ${a === b ? 'EVET' : 'HAYIR'}`)

if (a !== b) {
  const at = textOf(a).split('|')
  const bt = textOf(b).split('|')
  const onlyA = at.filter((t) => !bt.includes(t))
  const onlyB = bt.filter((t) => !at.includes(t))
  if (onlyA.length) console.log(`  Sadece A'da: ${onlyA.join(', ')}`)
  if (onlyB.length) console.log(`  Sadece B'de: ${onlyB.join(', ')}`)
}
console.log()
