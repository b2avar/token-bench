import type { ReactNode } from 'react'
import { cx, line, surface, text } from './tokens'

export interface Col<T> {
  key: string
  head: string
  cell?: (row: T) => ReactNode
  width?: string
}

interface TableProps<T> {
  rows: T[]
  cols: Col<T>[]
  onRow?: (row: T) => void
  empty?: string
}

const Table = <T extends { id: number | string }>({ rows, cols, onRow, empty = 'No records' }: TableProps<T>) => (
  <div className={cx('overflow-x-auto rounded-lg border border-solid', line.base)}>
    <table className="w-full border-collapse">
      <thead>
        <tr className={surface.header}>
          {cols.map((c) => (
            <th key={c.key} className={cx('p-4 text-left', text.head)} style={{ width: c.width }}>
              {c.head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={cols.length} className={cx('p-8 text-center', text.meta)}>
              {empty}
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr
            key={row.id}
            onClick={onRow && (() => onRow(row))}
            className={cx(
              'border-0 border-t border-solid',
              line.row,
              onRow && cx('cursor-pointer', surface.rowHover),
            )}
          >
            {cols.map((c) => (
              <td key={c.key} className={cx('p-4', text.cell)}>
                {c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default Table
