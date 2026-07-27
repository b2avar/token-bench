import type { ReactNode } from 'react'
import { control, cx } from './tokens'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
}

const Button = ({ children, onClick, variant = 'primary', type = 'button', disabled }: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cx(
      control.base,
      'cursor-pointer font-medium',
      variant === 'primary' ? control.primary : control.ghost,
    )}
  >
    {children}
  </button>
)

export default Button
