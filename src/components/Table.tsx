import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import './Table.css'

export type TableColumn<RowData> = {
  /** Stable key used for rendering and the default cell accessor. */
  key: keyof RowData | string
  header: ReactNode
  /** Custom cell renderer. Defaults to reading row[column.key]. */
  render?: (row: RowData) => ReactNode
  /** Optional CSS width. Without one, columns share the available data area. */
  width?: CSSProperties['width']
}

export type TableVariant = 'default' | 'compact' | 'relaxed'

export type TableProps<RowData> = {
  columns: readonly TableColumn<RowData>[]
  rows: readonly RowData[]
  getRowId: (row: RowData) => string
  ariaLabel?: string
  className?: string
  selectable?: boolean
  stickyHeader?: boolean
  striped?: boolean
  /** Controls the table's vertical density and container treatment. */
  variant?: TableVariant
  selectedRowIds?: readonly string[]
  defaultSelectedRowIds?: readonly string[]
  onSelectedRowIdsChange?: (rowIds: string[]) => void
  onRowAction?: (row: RowData) => void
  rowActionLabel?: (row: RowData) => string
  emptyMessage?: ReactNode
}

function Checkbox({
  checked,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  label: string
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'

  return (
    <span className="lars-table__checkbox-control" data-state={state}>
      <input
        aria-label={label}
        checked={checked}
        className="lars-table__checkbox"
        onChange={onChange}
        ref={inputRef}
        type="checkbox"
      />
      <PartialSelectionIcon />
      <SelectedIcon />
    </span>
  )
}

function PartialSelectionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="lars-table__checkbox-icon lars-table__checkbox-icon--partial"
      viewBox="0 0 12 12"
    >
      <path
        d="M12 10.285C12 11.232 11.232 12 10.285 12L1.715 12C0.768 12 0 11.232 0 10.285L0 1.715C0 0.768 0.768 0 1.715 0L10.285 0C11.232 0 12 0.768 12 1.715L12 10.285ZM1.715 1.285C1.478 1.285 1.285 1.478 1.285 1.715L1.285 10.285C1.285 10.522 1.478 10.715 1.715 10.715L10.285 10.715C10.522 10.715 10.715 10.522 10.715 10.285L10.715 1.715C10.715 1.478 10.522 1.285 10.285 1.285L1.715 1.285ZM3.643 5.357L8.357 5.357C8.713 5.357 9 5.645 9 6C9 6.355 8.713 6.643 8.357 6.643L3.643 6.643C3.287 6.643 3 6.355 3 6C3 5.645 3.287 5.357 3.643 5.357Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SelectedIcon() {
  return (
    <svg
      aria-hidden="true"
      className="lars-table__checkbox-icon lars-table__checkbox-icon--selected"
      viewBox="0 0 12 12"
    >
      <path
        d="M2.761 6.19C2.513 6.442 2.51 6.848 2.761 7.098L4.69 9.028C4.824 9.16 5.009 9.227 5.195 9.215C5.378 9.202 5.552 9.104 5.663 8.952L9.302 3.943C9.511 3.655 9.448 3.254 9.16 3.046C8.874 2.837 8.473 2.902 8.263 3.187L5.065 7.585L3.67 6.19C3.418 5.939 3.01 5.939 2.761 6.19ZM10.285 0C11.232 0 12 0.768 12 1.715L12 10.285C12 11.232 11.232 12 10.285 12L1.715 12C0.768 12 0 11.232 0 10.285L0 1.715C0 0.768 0.768 0 1.715 0L10.285 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function KebabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
      <path d="M6 3.9A1.05 1.05 0 1 0 6 1.8a1.05 1.05 0 0 0 0 2.1Zm0 4.2a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM7.05 6A1.05 1.05 0 1 1 4.95 6a1.05 1.05 0 0 1 2.1 0Z" />
    </svg>
  )
}

export function Table<RowData>({
  columns,
  rows,
  getRowId,
  ariaLabel = 'Data table',
  className = '',
  selectable = true,
  stickyHeader = false,
  striped = true,
  variant = 'default',
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectedRowIdsChange,
  onRowAction,
  rowActionLabel = () => 'Open row actions',
  emptyMessage = 'No results',
}: TableProps<RowData>) {
  const prefersReducedMotion = useReducedMotion()
  const controlled = selectedRowIds !== undefined
  const [internalSelection, setInternalSelection] = useState<readonly string[]>(defaultSelectedRowIds)
  const selection = controlled ? selectedRowIds : internalSelection
  const selected = useMemo(() => new Set(selection), [selection])
  const rowIds = useMemo(() => rows.map(getRowId), [getRowId, rows])
  const selectedOnPage = rowIds.filter((id) => selected.has(id)).length
  const allSelected = rows.length > 0 && selectedOnPage === rows.length
  const partiallySelected = selectedOnPage > 0 && !allSelected

  const updateSelection = (next: string[]) => {
    if (!controlled) setInternalSelection(next)
    onSelectedRowIdsChange?.(next)
  }

  const toggleAll = () => {
    const next = new Set(selected)
    if (allSelected) rowIds.forEach((id) => next.delete(id))
    else rowIds.forEach((id) => next.add(id))
    updateSelection([...next])
  }

  const toggleRow = (rowId: string) => {
    const next = new Set(selected)
    if (next.has(rowId)) next.delete(rowId)
    else next.add(rowId)
    updateSelection([...next])
  }

  return (
    <motion.div
      className={`lars-table-wrap${className ? ` ${className}` : ''}`}
      data-variant={variant}
      layout={prefersReducedMotion ? false : 'position'}
      style={{ borderRadius: variant === 'relaxed' ? 0 : 8 }}
      transition={{ layout: { type: 'spring', duration: 0.28, bounce: 0 } }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
          className="lars-table__variant-state"
          exit={prefersReducedMotion
            ? { opacity: 0, transition: { duration: 0.06, ease: 'easeOut' } }
            : {
                opacity: 0,
                transform: 'translateY(-2px) scale(0.995)',
                transition: { duration: 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
              }}
          initial={prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, transform: 'translateY(2px) scale(0.995)' }}
          key={variant}
          transition={prefersReducedMotion
            ? { duration: 0.1, ease: 'easeOut' }
            : { duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <table
            aria-label={ariaLabel}
            className="lars-table"
            data-selectable={selectable || undefined}
            data-sticky-header={stickyHeader || undefined}
            data-striped={striped || undefined}
            data-variant={variant}
            style={{
              '--table-column-count': columns.length,
              '--table-relaxed-min-width': `${columns.length * 90 + (selectable ? 104 : 52)}px`,
            } as CSSProperties}
          >
            <colgroup>
              {selectable && <col className="lars-table__selection-col" />}
              {columns.map((column) => (
                <col
                  key={String(column.key)}
                  style={column.width === undefined ? undefined : { width: column.width }}
                />
              ))}
              <col className="lars-table__action-col" />
            </colgroup>
            <thead>
              <tr>
                {selectable && (
                  <th className="lars-table__selection-cell" scope="col">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={partiallySelected}
                      label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th key={String(column.key)} scope="col">{column.header}</th>
                ))}
                <th
                  aria-hidden={!onRowAction || undefined}
                  aria-label={onRowAction ? 'Row actions' : undefined}
                  className="lars-table__action-cell"
                  scope="col"
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowId = getRowId(row)
                return (
                  <tr data-selected={selected.has(rowId) || undefined} key={rowId}>
                    {selectable && (
                      <td className="lars-table__selection-cell">
                        <Checkbox
                          checked={selected.has(rowId)}
                          label={`${selected.has(rowId) ? 'Deselect' : 'Select'} row ${rowId}`}
                          onChange={() => toggleRow(rowId)}
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = column.render
                        ? column.render(row)
                        : (row as Record<string, ReactNode>)[String(column.key)]
                      return <td key={String(column.key)}>{value}</td>
                    })}
                    <td aria-hidden={!onRowAction || undefined} className="lars-table__action-cell">
                      {onRowAction && (
                        <button
                          aria-label={rowActionLabel(row)}
                          className="lars-table__action"
                          onClick={() => onRowAction(row)}
                          type="button"
                        >
                          <KebabIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="lars-table__empty" colSpan={columns.length + (selectable ? 2 : 1)}>
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
