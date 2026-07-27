import { cx, surface, text } from './tokens'

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

interface PersonProps {
  name: string
  sub?: string
  size?: number
}

const Person = ({ name, sub, size = 32 }: PersonProps) => (
  <div className="flex items-center gap-2">
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold', surface.avatar)}
    >
      {initials(name)}
    </div>
    <div className="flex flex-col">
      <span className={text.name}>{name}</span>
      {sub && <span className={cx(text.meta)}>{sub}</span>}
    </div>
  </div>
)

export default Person
