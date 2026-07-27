import { cx, line, surface, text } from './tokens'

interface StatProps {
  label: string
  value: number | string
  hint?: string
  trend?: number
}

const Stat = ({ label, value, hint, trend }: StatProps) => (
  <div className={cx('rounded-xl border border-solid p-4 shadow-sm', line.soft, surface.card)}>
    <p className={text.head}>{label}</p>
    <p className={text.value}>{value}</p>
    {hint && <p className={text.meta}>{hint}</p>}
    {trend !== undefined && (
      <p className={cx('text-xs font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
      </p>
    )}
  </div>
)

export default Stat
