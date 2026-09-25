import { Menu } from '@base-ui/react/menu'
import { ScrollArea } from '@base-ui/react/scroll-area'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Chip } from './Chip'
import { SegmentedControl } from './SegmentedControl'
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

const TABLE_VARIANT_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
}
const EMPTY_FILTERABLE_COLUMNS: readonly string[] = []
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export type TableProps<RowData> = {
  columns: readonly TableColumn<RowData>[]
  rows: readonly RowData[]
  getRowId: (row: RowData) => string
  ariaLabel?: string
  className?: string
  selectable?: boolean
  stickyHeader?: boolean
  striped?: boolean
  /** Shows the Paper-style toolbar above the default and compact variants. */
  toolbar?: boolean
  /** Shows the toolbar's View toggle. */
  toolbarToggle?: boolean
  /** Shows the toolbar's filter and search actions. */
  toolbarActions?: boolean
  /** Shows the toolbar's item counter. */
  toolbarCounter?: boolean
  /** Columns whose unique cell values appear in the toolbar filter menu. */
  filterableColumns?: readonly (keyof RowData | string)[]
  /** Controls the table's vertical density and container treatment. */
  variant?: TableVariant
  selectedRowIds?: readonly string[]
  defaultSelectedRowIds?: readonly string[]
  onSelectedRowIdsChange?: (rowIds: string[]) => void
  /** Called when the row menu's View details item is chosen. */
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

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
      <path d="M2 5C2 4.447 2.448 4 3 4L17 4C17.554 4 18 4.447 18 5 18 5.554 17.554 6 17 6L3 6C2.448 6 2 5.554 2 5zM5 10C5 9.447 5.448 9 6 9L14 9C14.554 9 15 9.447 15 10 15 10.554 14.554 11 14 11L6 11C5.448 11 5 10.554 5 10zM12 15C12 15.554 11.554 16 11 16L9 16C8.448 16 8 15.554 8 15 8 14.447 8.448 14 9 14L11 14C11.554 14 12 14.447 12 15z" fill="currentColor" />
    </svg>
  )
}

function FilterCheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
      <path d="m2 6 2.5 2.5L10 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

function FilterCloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
      <path d="M3.433 2.576C3.199 2.342 2.818 2.342 2.584 2.576 2.349 2.811 2.349 3.191 2.584 3.426L5.16 6 2.586 8.576C2.351 8.811 2.351 9.191 2.586 9.426 2.82 9.66 3.201 9.66 3.435 9.426L6.009 6.849 8.586 9.424C8.82 9.658 9.201 9.658 9.435 9.424 9.669 9.189 9.669 8.809 9.435 8.574L6.859 6 9.433 3.424C9.667 3.189 9.667 2.809 9.433 2.574 9.199 2.34 8.818 2.34 8.584 2.574L6.009 5.151 3.433 2.576z" fill="currentColor" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
      <path d="M15 8.5C15 9.934 14.534 11.259 13.75 12.334L17.706 16.294C18.098 16.684 18.098 17.319 17.706 17.709 17.316 18.1 16.681 18.1 16.291 17.709L12.334 13.75C11.259 14.534 9.934 15 8.5 15 4.909 15 2 12.091 2 8.5 2 4.909 4.909 2 8.5 2 12.091 2 15 4.909 15 8.5zM8.5 13C10.984 13 13 10.984 13 8.5 13 6.016 10.984 4 8.5 4 6.016 4 4 6.016 4 8.5 4 10.984 6.016 13 8.5 13z" fill="currentColor" />
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
  toolbar = false,
  toolbarToggle = true,
  toolbarActions = true,
  toolbarCounter = true,
  filterableColumns = EMPTY_FILTERABLE_COLUMNS,
  variant = 'default',
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectedRowIdsChange,
  onRowAction,
  rowActionLabel = () => 'Open row actions',
  emptyMessage = 'No results',
}: TableProps<RowData>) {
  const prefersReducedMotion = useReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const itemCountRef = useRef<HTMLSpanElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const filterChipsRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  const [toolbarOccupied, setToolbarOccupied] = useState(44)
  const [chipsWrapped, setChipsWrapped] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [animateSearch, setAnimateSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchQueryClipped, setSearchQueryClipped] = useState(false)
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [activeView, setActiveView] = useState('2')
  const controlled = selectedRowIds !== undefined
  const [internalSelection, setInternalSelection] = useState<readonly string[]>(defaultSelectedRowIds)
  const selection = controlled ? selectedRowIds : internalSelection
  const selected = useMemo(() => new Set(selection), [selection])
  const showToolbar = toolbar && variant !== 'relaxed' && (toolbarToggle || toolbarActions || toolbarCounter)
  const filterSelected = toolbarActions && selectedOnly && selectable
  const filterGroups = useMemo(() => filterableColumns.flatMap((filterKey) => {
    const key = String(filterKey)
    const column = columns.find((candidate) => String(candidate.key) === key)
    if (!column) return []
    const values = [...new Set(rows.map((row) => (row as Record<string, unknown>)[key])
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .map(String)
      .filter(Boolean))]
    return values.length ? [{ key, label: typeof column.header === 'string' ? column.header : key, values }] : []
  }), [columns, filterableColumns, rows])
  const activeColumnFilters = useMemo(
    () => toolbarActions ? filterGroups.filter((group) => group.values.includes(columnFilters[group.key])) : [],
    [columnFilters, filterGroups, toolbarActions],
  )
  const hasActiveFilters = filterSelected || activeColumnFilters.length > 0
  const visibleRows = useMemo(() => {
    if (!showToolbar || (!hasActiveFilters && !searchQuery.trim())) return rows
    const query = toolbarActions ? searchQuery.trim().toLocaleLowerCase() : ''
    return rows.filter((row) => {
      if (filterSelected && !selected.has(getRowId(row))) return false
      if (activeColumnFilters.some((group) => String((row as Record<string, unknown>)[group.key] ?? '') !== columnFilters[group.key])) return false
      if (!query) return true
      return columns.some((column) => {
        const value = (row as Record<string, unknown>)[String(column.key)]
        return String(value ?? '').toLocaleLowerCase().includes(query)
      })
    })
  }, [activeColumnFilters, columnFilters, columns, filterSelected, getRowId, hasActiveFilters, rows, searchQuery, selected, showToolbar, toolbarActions])
  const rowIds = useMemo(() => visibleRows.map(getRowId), [getRowId, visibleRows])
  const selectedOnPage = rowIds.filter((id) => selected.has(id)).length
  const allSelected = visibleRows.length > 0 && selectedOnPage === visibleRows.length
  const partiallySelected = selectedOnPage > 0 && !allSelected

  useEffect(() => {
    if (searchOpen && showToolbar) searchInputRef.current?.focus()
  }, [searchOpen, showToolbar])

  useEffect(() => {
    if (toolbarActions) return
    setSearchOpen(false)
    setSearchQuery('')
    setSearchQueryClipped(false)
  }, [toolbarActions])

  useEffect(() => {
    if (!searchOpen || !showToolbar) return

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (searchRef.current?.contains(event.target as Node)) return
      setAnimateSearch(true)
      setSearchOpen(false)
      setSearchQuery('')
      setSearchQueryClipped(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [searchOpen, showToolbar])

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    const content = contentRef.current
    if (!root || !content) return

    // Resize the frame without scaling its rows, text, or controls. The content
    // retains its intrinsic height even while the scroll viewport is capped.
    const measure = () => {
      const style = getComputedStyle(root)
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      const maxHeight = parseFloat(style.maxHeight)
      const naturalHeight = content.getBoundingClientRect().height + border
      setHeight(Math.min(naturalHeight, Number.isFinite(maxHeight) ? maxHeight : Infinity))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [variant, toolbarOccupied])

  useIsomorphicLayoutEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar || !showToolbar) return

    const measure = () => {
      const occupied = Math.ceil(toolbar.getBoundingClientRect().height + parseFloat(getComputedStyle(toolbar).marginBottom))
      setToolbarOccupied((current) => current === occupied ? current : occupied)

      const chips = filterChipsRef.current
      const itemCount = itemCountRef.current
      const tools = toolsRef.current
      if (!chips || !tools) {
        setChipsWrapped(false)
        return
      }

      const gap = parseFloat(getComputedStyle(chips).columnGap) || 0
      const buttons = Array.from(chips.children) as HTMLElement[]
      const chipWidth = buttons.reduce((total, button) => total + button.getBoundingClientRect().width, 0)
        + Math.max(0, buttons.length - 1) * gap
      const filterLeft = tools.getBoundingClientRect().left + 12 + (searchOpen ? 0 : 100)
      const leftBoundary = itemCount?.getBoundingClientRect().right ?? toolbar.getBoundingClientRect().left + 12
      const available = filterLeft - leftBoundary - 16
      const shouldWrap = chipWidth > available
      setChipsWrapped((current) => current === shouldWrap ? current : shouldWrap)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(toolbar)
    if (filterChipsRef.current) observer.observe(filterChipsRef.current)
    if (itemCountRef.current) observer.observe(itemCountRef.current)
    if (toolsRef.current) observer.observe(toolsRef.current)
    return () => observer.disconnect()
  }, [activeColumnFilters, chipsWrapped, filterSelected, searchOpen, showToolbar])

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

  const filterChips = hasActiveFilters && (
    <div className="lars-table__filter-chips" aria-label="Active filters" ref={filterChipsRef} role="group">
      {filterSelected && (
        <button
          aria-label="Remove Selected rows filter"
          className="lars-table__filter-chip"
          onClick={() => setSelectedOnly(false)}
          title="Remove Selected rows filter"
          type="button"
        >
          <Chip icon={<FilterCloseIcon />} iconPosition="end" size="small" typeface="sans-serif" variant="default">
            Selected rows
          </Chip>
        </button>
      )}
      {activeColumnFilters.map((group) => {
        const label = `${group.label}: ${columnFilters[group.key]}`
        return (
          <button
            aria-label={`Remove ${label} filter`}
            className="lars-table__filter-chip"
            key={group.key}
            onClick={() => setColumnFilters((current) => {
              const next = { ...current }
              delete next[group.key]
              return next
            })}
            title={`Remove ${label} filter`}
            type="button"
          >
            <Chip icon={<FilterCloseIcon />} iconPosition="end" size="small" typeface="sans-serif" variant="default">
              {label}
            </Chip>
          </button>
        )
      })}
    </div>
  )

  return (
    <div
      className={`lars-table-frame${className ? ` ${className}` : ''}`}
      data-chips-wrapped={chipsWrapped || undefined}
      data-toolbar={showToolbar || undefined}
      data-variant={variant}
      ref={frameRef}
      style={{ '--lars-table-toolbar-occupied': `${toolbarOccupied}px` } as CSSProperties}
    >
      {showToolbar && (
        <div
          aria-label="Table tools"
          className="lars-table__toolbar"
          data-chips-wrapped={chipsWrapped || undefined}
          data-search-open={searchOpen || undefined}
          ref={toolbarRef}
          role="toolbar"
        >
          {toolbarCounter && (
            <span className="lars-table__item-count" ref={itemCountRef}>
              {visibleRows.length} {visibleRows.length === 1 ? 'item' : 'items'}
            </span>
          )}
          <div className="lars-table__toolbar-end">
            {toolbarActions && (
            <div className="lars-table__tools" data-animate={animateSearch || undefined} ref={toolsRef}>
              {!chipsWrapped && filterChips}
              <Menu.Root modal={false}>
                <Menu.Trigger
                  aria-label="Filter table"
                  className="lars-table__tool lars-table__filter"
                  data-filter-active={hasActiveFilters || undefined}
                  title="Filter table"
                >
                  <FilterIcon />
                </Menu.Trigger>
                <Menu.Portal container={frameRef}>
                  <Menu.Positioner align="start" className="lars-table__filter-positioner" side="bottom" sideOffset={8}>
                    <Menu.Popup className="lars-table__filter-menu">
                      <Menu.Group className="lars-table__filter-group">
                        <Menu.GroupLabel className="lars-table__filter-group-label">Selection</Menu.GroupLabel>
                        <Menu.CheckboxItem
                          checked={filterSelected}
                          className="lars-table__filter-item"
                          disabled={!selectable}
                          onCheckedChange={setSelectedOnly}
                        >
                          <span>Selected rows only</span>
                          <span aria-hidden="true" className="lars-table__filter-indicator-slot">
                            <Menu.CheckboxItemIndicator><FilterCheckIcon /></Menu.CheckboxItemIndicator>
                          </span>
                        </Menu.CheckboxItem>
                      </Menu.Group>
                      {filterGroups.map((group) => (
                        <Menu.Group className="lars-table__filter-group" key={group.key}>
                          <Menu.Separator className="lars-table__filter-separator" />
                          <Menu.GroupLabel className="lars-table__filter-group-label">{group.label}</Menu.GroupLabel>
                          <Menu.RadioGroup
                            onValueChange={(value) => setColumnFilters((current) => ({ ...current, [group.key]: String(value) }))}
                            value={columnFilters[group.key] ?? ''}
                          >
                            <Menu.RadioItem className="lars-table__filter-item" value="">
                              <span>All</span>
                              <span aria-hidden="true" className="lars-table__filter-indicator-slot">
                                <Menu.RadioItemIndicator><FilterCheckIcon /></Menu.RadioItemIndicator>
                              </span>
                            </Menu.RadioItem>
                            {group.values.map((value) => (
                              <Menu.RadioItem className="lars-table__filter-item" key={value} value={value}>
                                <span>{value}</span>
                                <span aria-hidden="true" className="lars-table__filter-indicator-slot">
                                  <Menu.RadioItemIndicator><FilterCheckIcon /></Menu.RadioItemIndicator>
                                </span>
                              </Menu.RadioItem>
                            ))}
                          </Menu.RadioGroup>
                        </Menu.Group>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
              <div
                className="lars-table__search"
                data-open={searchOpen || undefined}
                data-query-clipped={searchQueryClipped || undefined}
                ref={searchRef}
              >
                <span aria-hidden="true" className="lars-table__search-surface" />
                <button
                  aria-expanded={searchOpen}
                  aria-label={searchOpen ? 'Close search' : 'Search table'}
                  className="lars-table__search-icon"
                  onClick={() => {
                    setSearchOpen((current) => !current)
                    if (searchOpen) {
                      setSearchQuery('')
                      setSearchQueryClipped(false)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setAnimateSearch(false)
                  }}
                  onPointerDown={() => setAnimateSearch(true)}
                  ref={searchButtonRef}
                  type="button"
                >
                  <SearchIcon />
                </button>
                <input
                  aria-hidden={!searchOpen || undefined}
                  aria-label="Search table"
                  disabled={!searchOpen}
                  onChange={(event) => {
                    const input = event.currentTarget
                    setSearchQuery(input.value)
                    if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
                      input.scrollLeft = input.scrollWidth
                    }
                    setSearchQueryClipped(input.scrollLeft > 0)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setAnimateSearch(false)
                      setSearchOpen(false)
                      setSearchQuery('')
                      setSearchQueryClipped(false)
                      searchButtonRef.current?.focus()
                    }
                  }}
                  onScroll={(event) => setSearchQueryClipped(event.currentTarget.scrollLeft > 0)}
                  placeholder="Search table"
                  ref={searchInputRef}
                  tabIndex={searchOpen ? 0 : -1}
                  type="search"
                  value={searchQuery}
                />
              </div>
            </div>
            )}
            {toolbarToggle && <SegmentedControl
              className="lars-table__views"
              label="Table view"
              onValueChange={setActiveView}
              options={[
                { label: 'View #1', value: '1' },
                { label: 'View #2', value: '2' },
              ]}
              type="square"
              value={activeView}
            />}
          </div>
          {chipsWrapped && filterChips}
        </div>
      )}
    <ScrollArea.Root
      className="lars-table-wrap"
      data-sticky-header={stickyHeader || undefined}
      data-variant={variant}
      ref={rootRef}
      render={(
        <motion.div
          animate={{ height: height ?? 'auto' }}
          initial={false}
          transition={prefersReducedMotion ? { duration: 0 } : TABLE_VARIANT_TRANSITION}
        />
      )}
      style={{ borderRadius: variant === 'relaxed' ? 0 : 8 }}
    >
      <ScrollArea.Viewport className="lars-table__viewport">
        <ScrollArea.Content className="lars-table__scroll-content" ref={contentRef}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ filter: 'blur(0px)', opacity: 1 }}
              className="lars-table__variant-state"
              exit={prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0.08, ease: 'easeOut' } }
                : {
                    filter: 'blur(1.5px)',
                    opacity: 0,
                    transition: TABLE_VARIANT_TRANSITION,
                  }}
              initial={prefersReducedMotion
                ? { opacity: 0 }
                : { filter: 'blur(1.5px)', opacity: 0 }}
              key={variant}
              transition={prefersReducedMotion
                ? { duration: 0.1, ease: 'easeOut' }
                : TABLE_VARIANT_TRANSITION}
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
              {visibleRows.map((row) => {
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
                        <Menu.Root modal={false}>
                          <Menu.Trigger
                            aria-label={rowActionLabel(row)}
                            className="lars-table__action"
                          >
                            <KebabIcon />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Positioner align="end" className="lars-table__action-positioner" side="bottom" sideOffset={4}>
                              <Menu.Popup className="lars-table__filter-menu lars-table__action-menu">
                                <Menu.Item className="lars-table__filter-item" onClick={() => onRowAction(row)}>
                                  View details
                                </Menu.Item>
                                {selectable && (
                                  <Menu.Item className="lars-table__filter-item" onClick={() => toggleRow(rowId)}>
                                    {selected.has(rowId) ? 'Deselect row' : 'Select row'}
                                  </Menu.Item>
                                )}
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.Root>
                      )}
                    </td>
                  </tr>
                )
              })}
              {visibleRows.length === 0 && (
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
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="lars-table__scrollbar">
        <ScrollArea.Thumb className="lars-table__scrollbar-thumb" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar className="lars-table__scrollbar" orientation="horizontal">
        <ScrollArea.Thumb className="lars-table__scrollbar-thumb" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner className="lars-table__scrollbar-corner" />
    </ScrollArea.Root>
    </div>
  )
}
