import type { ReactNode } from 'react'
import { cx, line, surface, text } from './tokens'
import { Row } from './primitives'

interface CardProps {
  children: ReactNode
  title?: string
  action?: ReactNode
  pad?: boolean
  className?: string
}

const Card = ({ children, title, action, pad = true, className }: CardProps) => (
  <div className={cx('rounded-xl border border-solid shadow-sm', line.soft, surface.card, className)}>
    {(title || action) && (
      <Row between pad={4} className={cx('border-0 border-b border-solid', line.soft)}>
        <h2 className={text.h2}>{title}</h2>
        {action}
      </Row>
    )}
    <div className={pad ? 'p-4' : undefined}>{children}</div>
  </div>
)

export default Card
