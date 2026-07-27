import type { ReactNode } from 'react'
import { cx, line, surface, text } from './tokens'
import { Row } from './primitives'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

const Modal = ({ open, onClose, title, children, footer }: ModalProps) => {
  if (!open) return null
  return (
    <div className={cx('fixed inset-0 z-50 flex items-center justify-center p-4', surface.overlay)} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx('w-full max-w-lg rounded-xl border border-solid shadow-xl', line.soft, surface.card)}
      >
        <Row between pad={4} className={cx('border-0 border-b border-solid', line.soft)}>
          <h2 className={text.h2}>{title}</h2>
          <button onClick={onClose} className={cx('cursor-pointer border-0 bg-transparent', text.label)}>
            ✕
          </button>
        </Row>
        <div className="p-4">{children}</div>
        {footer && (
          <Row between pad={4} className={cx('border-0 border-t border-solid', line.soft)}>
            {footer}
          </Row>
        )}
      </div>
    </div>
  )
}

export default Modal
