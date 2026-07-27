import type { ReactNode } from 'react'
import { cx, text } from './tokens'

const GAP = ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6'] as const
const PAD = ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6'] as const
const COLS = ['', 'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5', 'xl:grid-cols-6'] as const

type Span = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface StackProps {
  children: ReactNode
  gap?: Span
  pad?: Span
  between?: boolean
  center?: boolean
  wrap?: boolean
  grow?: boolean
  className?: string
}

export const Row = ({ children, gap = 2, pad = 0, between, center, wrap, grow, className }: StackProps) => (
  <div
    className={cx(
      'flex',
      GAP[gap],
      PAD[pad],
      between && 'justify-between',
      center !== false && 'items-center',
      wrap && 'flex-wrap',
      grow && 'flex-1',
      className,
    )}
  >
    {children}
  </div>
)

export const Col = ({ children, gap = 2, pad = 0, between, center, grow, className }: StackProps) => (
  <div
    className={cx(
      'flex flex-col',
      GAP[gap],
      PAD[pad],
      between && 'justify-between',
      center && 'items-center',
      grow && 'flex-1',
      className,
    )}
  >
    {children}
  </div>
)

interface GridProps {
  children: ReactNode
  cols?: Span
  gap?: Span
  className?: string
}

export const Grid = ({ children, cols = 4, gap = 4, className }: GridProps) => (
  <div className={cx('grid grid-cols-1', COLS[cols], GAP[gap], className)}>{children}</div>
)

type TextVariant = keyof typeof text

interface TextProps {
  children: ReactNode
  as?: TextVariant
  className?: string
}

export const Text = ({ children, as = 'body', className }: TextProps) => (
  <span className={cx(text[as], className)}>{children}</span>
)

export const Title = ({ children }: { children: ReactNode }) => <h1 className={text.title}>{children}</h1>
export const H2 = ({ children }: { children: ReactNode }) => <h2 className={text.h2}>{children}</h2>
export const H3 = ({ children }: { children: ReactNode }) => <h3 className={text.h3}>{children}</h3>
