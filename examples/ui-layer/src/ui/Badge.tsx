import { cx, tone, type Tone } from './tokens'

interface BadgeProps {
  children: string
  tone?: Tone
}

const Badge = ({ children, tone: t = 'neutral' }: BadgeProps) => (
  <span className={cx('rounded-full border border-solid px-2 py-0.5 text-xs font-medium whitespace-nowrap', tone[t])}>
    {children}
  </span>
)

export default Badge
