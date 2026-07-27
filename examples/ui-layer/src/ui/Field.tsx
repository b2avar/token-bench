import { control, cx, text } from './tokens'

interface BaseProps {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  grow?: boolean
}

interface SelectProps extends BaseProps {
  options: { value: string; label: string }[]
}

export const Input = ({ label, value, onChange, placeholder, grow }: BaseProps) => (
  <label className={cx('flex flex-col gap-1', grow && 'flex-1')}>
    {label && <span className={text.label}>{label}</span>}
    <input
      className={cx(control.base, control.field)}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
)

export const Select = ({ label, value, onChange, options, grow }: SelectProps) => (
  <label className={cx('flex flex-col gap-1', grow && 'flex-1')}>
    {label && <span className={text.label}>{label}</span>}
    <select className={cx(control.base, control.field)} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
)
