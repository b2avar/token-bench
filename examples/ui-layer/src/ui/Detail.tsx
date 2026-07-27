import type { ReactNode } from 'react'
import { text } from './tokens'

interface DetailProps {
  items: [string, ReactNode][]
  cols?: 1 | 2
}

const Detail = ({ items, cols = 2 }: DetailProps) => (
  <dl className={cols === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
    {items.map(([label, value]) => (
      <div key={label} className="flex flex-col gap-0.5">
        <dt className={text.head}>{label}</dt>
        <dd className={text.body}>{value}</dd>
      </div>
    ))}
  </dl>
)

export default Detail
