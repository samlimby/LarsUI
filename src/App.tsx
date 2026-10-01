import { Button as BaseButton } from '@base-ui/react/button'
import { Select } from '@base-ui/react/select'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { memo, startTransition, useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AiComposer, type AiComposerMode, type AiComposerSize, type AiComposerSuggestion, type AiComposerVariant } from './components/AiComposer'
import { Button, type ButtonShape, type ButtonSpinner, type ButtonVariant } from './components/Button'
import './components/Focus.css'
import './components/ColorTokens.css'
import './components/Shadows.css'
import {
  Chip,
  type ChipIconPosition,
  type ChipSize,
  type ChipTypeface,
  type ChipVariant,
} from './components/Chip'
import { InlineSlider, type InlineSliderSize } from './components/InlineSlider'
import {
  SegmentedControl as LarsSegmentedControl,
  type SegmentedControlContent,
  type SegmentedControlOption,
  type SegmentedControlSize,
  type SegmentedControlType,
} from './components/SegmentedControl'
import {
  Table as LarsTable,
  type TableColumn,
  type TableVariant,
} from './components/Table'
import { Tooltip as LarsTooltip } from './components/Tooltip'
import './App.css'

const SIZE_STOPS = [200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440] as const
const DEMO_SIZE_RANGE = { min: 200, max: 440 } as const
const BUTTON_VARIANTS = ['primary', 'secondary', 'tertiary', 'danger'] as const
const CHIP_VARIANTS = ['neutral', 'default', 'warning', 'positive', 'error'] as const
const CHIP_VARIANT_OPTIONS: ReadonlyArray<{ label: string; value: ChipVariant }> = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Default', value: 'default' },
  { label: 'Warning', value: 'warning' },
  { label: 'Positive', value: 'positive' },
  { label: 'Error', value: 'error' },
]
const CHIP_ICON_POSITION_OPTIONS: ReadonlyArray<{ label: string; value: ChipIconPosition }> = [
  { label: 'Text only', value: 'none' },
  { label: 'Icon start', value: 'start' },
  { label: 'Icon end', value: 'end' },
]
const CHIP_SIZE_OPTIONS: ReadonlyArray<{ label: string; value: ChipSize }> = [
  { label: 'Small (12px)', value: 'small' },
  { label: 'Medium (14px)', value: 'medium' },
  { label: 'Large (16px)', value: 'large' },
]
const SEGMENT_LABELS = ['Overview', 'Details', 'Activity', 'Files', 'History'] as const
const SEGMENT_OPTIONS: readonly SegmentedControlOption[] = SEGMENT_LABELS.map((label) => ({
  label,
  value: label.toLowerCase(),
  icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.6 14.4 8 8 14.4 1.6 8 8 1.6Z" fill="currentColor" /></svg>,
}))
const INLINE_SLIDER_VIEW_CODE = `import { useState } from 'react'
import { InlineSlider } from 'larsui'
import 'larsui/style.css'

export function Example() {
  const [value, setValue] = useState(300)

  return (
    <InlineSlider
      label="Size"
      value={value}
      min={160}
      max={360}
      step={1}
      continuous
      showTicks={false}
      size="default"
      onValueChange={setValue}
    />
  )
}`
const BUTTON_VIEW_CODE = `import { Button } from 'larsui'
import 'larsui/style.css'

export function Example() {
  return (
    <Button variant="primary" shape="full">
      View
    </Button>
  )
}`
const CHIP_VIEW_CODE = `import { Chip } from 'larsui'
import 'larsui/style.css'

<Chip
  variant="default"
  iconPosition="start"
  size="small"
  typeface="monospace"
  burst={false}
>
  12%
</Chip>`
const SEGMENTED_CONTROL_VIEW_CODE = `import { useState } from 'react'
import { SegmentedControl } from 'larsui'
import 'larsui/style.css'

export function Example() {
  const [value, setValue] = useState('details')

  return (
    <SegmentedControl
      label="View"
      type="cornered"
      size="default"
      content="text-only"
      options={[
        { label: 'Overview', value: 'overview' },
        { label: 'Details', value: 'details' },
        { label: 'Activity', value: 'activity' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  )
}`
type TeamMember = {
  id: string
  name: string
  role: string
  team: string
  status: string
  location: string
  updated: string
}
const TABLE_COLUMNS: readonly TableColumn<TeamMember>[] = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  { key: 'team', header: 'Team' },
  { key: 'status', header: 'Status' },
  { key: 'location', header: 'Location' },
  { key: 'updated', header: 'Updated' },
]
const TABLE_FILTERABLE_COLUMNS = ['status'] as const
const TABLE_VIEW_OPTIONS = [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] as const
const TABLE_ROWS: readonly TeamMember[] = [
  { id: 'ada', name: 'Ada Lin', role: 'Design', team: 'Core', status: 'Active', location: 'London', updated: '2m ago' },
  { id: 'noah', name: 'Noah Kim', role: 'Engineer', team: 'Growth', status: 'Active', location: 'Seoul', updated: '12m ago' },
  { id: 'maya', name: 'Maya Roy', role: 'Research', team: 'Core', status: 'Away', location: 'Paris', updated: '1h ago' },
  { id: 'liam', name: 'Liam Fox', role: 'Product', team: 'Mobile', status: 'Active', location: 'Berlin', updated: '3h ago' },
  { id: 'sara', name: 'Sara Iqbal', role: 'Engineer', team: 'Core', status: 'Away', location: 'Lahore', updated: '1d ago' },
  { id: 'theo', name: 'Theo Park', role: 'Design', team: 'Growth', status: 'Active', location: 'Toronto', updated: '2d ago' },
]
const TABLE_PREVIEW_FIRST_NAMES = [
  'Aisha', 'Alex', 'Amara', 'Anika', 'Arjun', 'Avery', 'Camila', 'Chloe', 'Daniel', 'Elena',
  'Emi', 'Fatima', 'Grace', 'Hugo', 'Imani', 'Jasper', 'Keira', 'Leo', 'Mina', 'Omar',
]
const TABLE_PREVIEW_LAST_NAMES = [
  'Ahmed', 'Bennett', 'Chen', 'Das', 'Evans', 'Flores', 'Garcia', 'Hassan', 'Ito', 'Johnson',
  'Kaur', 'Lopez', 'Miller', 'Nguyen', 'Okafor', 'Patel', 'Quinn', 'Rivera', 'Singh', 'Wilson',
]
const TABLE_HOME_ROWS = TABLE_ROWS.slice(0, 5)
const TABLE_CONFIG_ROWS: readonly TeamMember[] = Array.from({ length: 100 }, (_, index) => {
  const source = TABLE_ROWS[index % TABLE_ROWS.length]
  // A fixed coprime stride varies the names without reshuffling them as row count changes.
  const nameIndex = (index * 73 + 17)
    % (TABLE_PREVIEW_FIRST_NAMES.length * TABLE_PREVIEW_LAST_NAMES.length)
  return {
    ...source,
    id: `member-${index + 1}`,
    name: index < TABLE_ROWS.length
      ? source.name
      : `${TABLE_PREVIEW_FIRST_NAMES[nameIndex % TABLE_PREVIEW_FIRST_NAMES.length]} ${TABLE_PREVIEW_LAST_NAMES[Math.floor(nameIndex / TABLE_PREVIEW_FIRST_NAMES.length)]}`,
  }
})
const getTeamMemberId = (row: TeamMember) => row.id
const getTeamMemberActionLabel = (row: TeamMember) => `Open actions for ${row.name}`
const noopRowAction = () => undefined
const MemoizedTeamTable = memo(LarsTable<TeamMember>)
const TABLE_VIEW_CODE = `import { useState } from 'react'
import { Table, type TableColumn } from 'larsui'
import 'larsui/style.css'

type Member = {
  id: string
  name: string
  role: string
  team: string
  status: string
  location: string
  updated: string
}

const columns: TableColumn<Member>[] = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  { key: 'team', header: 'Team' },
  { key: 'status', header: 'Status' },
  { key: 'location', header: 'Location' },
  { key: 'updated', header: 'Updated' },
]

const members: Member[] = [
  { id: 'ada', name: 'Ada Lin', role: 'Design', team: 'Core', status: 'Active', location: 'London', updated: '2m ago' },
  { id: 'noah', name: 'Noah Kim', role: 'Engineer', team: 'Growth', status: 'Active', location: 'Seoul', updated: '12m ago' },
  { id: 'maya', name: 'Maya Roy', role: 'Research', team: 'Core', status: 'Away', location: 'Paris', updated: '1h ago' },
  { id: 'liam', name: 'Liam Fox', role: 'Product', team: 'Mobile', status: 'Active', location: 'Berlin', updated: '3h ago' },
  { id: 'sara', name: 'Sara Iqbal', role: 'Engineer', team: 'Core', status: 'Away', location: 'Lahore', updated: '1d ago' },
]

export function Example() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  return (
    <Table
      ariaLabel="Team members"
      columns={columns}
      filterableColumns={['status']}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      rows={members}
      selectedRowIds={selectedRows}
      onSelectedRowIdsChange={setSelectedRows}
      stickyHeader
      onRowAction={(row) => window.alert(row.name)}
      rowActionLabel={(row) => 'Open actions for ' + row.name}
    />
  )
}`
const TOOLTIP_VIEW_CODE = `import { Tooltip } from 'larsui'
import 'larsui/style.css'

export function Example() {
  return (
    <p>
      Choose your <Tooltip anchor label="Export quality" description="Higher quality creates a larger file.">
        <button className="lars-tooltip-inline" type="button">export settings</button>
      </Tooltip> before downloading.
    </p>
  )
}`
type Theme = 'light' | 'dark'
type ComponentRoute = 'inline-slider' | 'buttons' | 'chip' | 'segmented-control' | 'table' | 'tooltip' | 'ai-composer'
type Route = 'home' | ComponentRoute
type NavigationDirection = -1 | 0 | 1

function getRouteFromHash(): Route {
  if (typeof window === 'undefined') return 'home'
  if (window.location.hash === '#/components/inline-slider') return 'inline-slider'
  if (window.location.hash === '#/components/buttons') return 'buttons'
  if (window.location.hash === '#/components/chip') return 'chip'
  if (window.location.hash === '#/components/segmented-control') return 'segmented-control'
  if (window.location.hash === '#/components/table') return 'table'
  if (window.location.hash === '#/components/tooltip') return 'tooltip'
  if (window.location.hash === '#/components/ai-composer') return 'ai-composer'
  return 'home'
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  let savedTheme: string | null = null
  try {
    savedTheme = window.localStorage.getItem('lars-theme')
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const APPEARANCE_LIGHT_PATH = 'M10 6.667C8.159 6.667 6.667 8.159 6.667 10 6.667 11.841 8.159 13.333 10 13.333V17.5C5.858 17.5 2.5 14.142 2.5 10 2.5 5.857 5.858 2.5 10 2.5V6.667ZM10 6.667C11.841 6.667 13.333 8.159 13.333 10 13.333 11.841 11.841 13.333 10 13.333V6.667Z'
const APPEARANCE_DARK_PATH = 'M10 6.667C11.841 6.667 13.333 8.159 13.333 10 13.333 11.841 11.841 13.333 10 13.333V17.5C14.143 17.5 17.5 14.142 17.5 10 17.5 5.857 14.143 2.5 10 2.5V6.667ZM10 6.667C8.159 6.667 6.667 8.159 6.667 10 6.667 11.841 8.159 13.333 10 13.333V6.667Z'

function ThemeIcon({ theme }: { theme: Theme }) {
  const reduceMotion = useReducedMotion()

  return (
    <svg aria-hidden="true" className="lars-theme__appearance" viewBox="0 0 20 20" width="20" height="20">
      <circle cx="10" cy="10" r="7.708" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <motion.path
        animate={{ d: theme === 'dark' ? APPEARANCE_DARK_PATH : APPEARANCE_LIGHT_PATH }}
        fill="currentColor"
        initial={false}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.645, 0.045, 0.355, 1] }}
      />
    </svg>
  )
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <BaseButton
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-pressed={theme === 'dark'}
      className="lars-theme"
      onClick={onToggle}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      type="button"
    >
      <ThemeIcon theme={theme} />
    </BaseButton>
  )
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M7 9H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="3" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}

function InstallCommand() {
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText('npm install larsui')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-install">
      <pre><code><span aria-hidden="true">$ </span>npm install larsui</code></pre>
      <BaseButton
        aria-label="Copy npm install command"
        className="lars-install__copy"
        onClick={copyCommand}
        type="button"
      >
        {copied ? <span role="status">Copied</span> : <CopyIcon size={16} />}
      </BaseButton>
    </div>
  )
}

function SliderDemo({ mode }: { mode: 'freeform' | 'dotted' }) {
  const [size, setSize] = useState(300)

  return mode === 'freeform' ? (
    <InlineSlider
      label="Size"
      value={size}
      min={DEMO_SIZE_RANGE.min}
      max={DEMO_SIZE_RANGE.max}
      step={1}
      continuous
      showTicks={false}
      onValueChange={setSize}
    />
  ) : (
    <InlineSlider
      label="Size"
      value={size}
      min={DEMO_SIZE_RANGE.min}
      max={DEMO_SIZE_RANGE.max}
      step={20}
      stops={SIZE_STOPS}
      linearStops
      onValueChange={setSize}
    />
  )
}

function SliderStage() {
  const [mode, setMode] = useState<'freeform' | 'dotted'>('freeform')
  const [animateSelection, setAnimateSelection] = useState(true)
  const [copied, setCopied] = useState(false)

  async function copyComponentCode() {
    try {
      await navigator.clipboard.writeText(INLINE_SLIDER_VIEW_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage">
      <BaseButton className="lars-copy" type="button" onClick={copyComponentCode} aria-label="Copy Inline Slider code">
        {copied ? <span className="lars-copy__status" role="status">Copied</span> : <CopyIcon />}
      </BaseButton>
      <div className="lars-slider-card">
        <SliderDemo mode={mode} />
      </div>
      <div
        aria-label="Slider mode"
        className="lars-modes"
        data-animate={animateSelection}
        data-selected={mode === 'freeform' ? 'first' : 'second'}
      >
        <span className="lars-modes__indicator" aria-hidden="true" />
        <BaseButton
          aria-pressed={mode === 'freeform'}
          className={mode === 'freeform' ? 'is-active' : ''}
          onClick={(event) => {
            setAnimateSelection(event.detail !== 0)
            setMode('freeform')
          }}
          type="button"
        >
          Freeform
        </BaseButton>
        <BaseButton
          aria-pressed={mode === 'dotted'}
          className={mode === 'dotted' ? 'is-active' : ''}
          onClick={(event) => {
            setAnimateSelection(event.detail !== 0)
            setMode('dotted')
          }}
          type="button"
        >
          Dotted
        </BaseButton>
      </div>
    </div>
  )
}

function ButtonPreview({ animate, shape }: { animate: boolean; shape: ButtonShape }) {
  return (
    <div
      className="button-preview"
      aria-label={`${shape === 'full' ? 'Full' : 'Neat'} button variants`}
      data-animate={animate}
      data-shape={shape}
      role="group"
    >
      {BUTTON_VARIANTS.map((variant) => (
        <Button
          key={variant}
          shape={shape}
          type="button"
          variant={variant}
        >
          View
        </Button>
      ))}
    </div>
  )
}

function ButtonStage() {
  const [buttonShape, setButtonShape] = useState<ButtonShape>('full')
  const [animateSelection, setAnimateSelection] = useState(true)
  const [copied, setCopied] = useState(false)

  async function copyComponentCode() {
    try {
      await navigator.clipboard.writeText(BUTTON_VIEW_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage">
      <BaseButton className="lars-copy" type="button" onClick={copyComponentCode} aria-label="Copy Button code">
        {copied ? <span className="lars-copy__status" role="status">Copied</span> : <CopyIcon />}
      </BaseButton>

      <ButtonPreview animate={animateSelection} shape={buttonShape} />

      <div
        aria-label="Button shape"
        className="lars-modes"
        data-animate={animateSelection}
        data-selected={buttonShape === 'full' ? 'first' : 'second'}
      >
        <span className="lars-modes__indicator" aria-hidden="true" />
        <BaseButton
          aria-pressed={buttonShape === 'full'}
          className={buttonShape === 'full' ? 'is-active' : ''}
          onClick={(event) => {
            setAnimateSelection(event.detail !== 0)
            setButtonShape('full')
          }}
          type="button"
        >
          Full
        </BaseButton>
        <BaseButton
          aria-pressed={buttonShape === 'neat'}
          className={buttonShape === 'neat' ? 'is-active' : ''}
          onClick={(event) => {
            setAnimateSelection(event.detail !== 0)
            setButtonShape('neat')
          }}
          type="button"
        >
          Neat
        </BaseButton>
      </div>
    </div>
  )
}

function ChipPreview({ typeface }: { typeface: ChipTypeface }) {
  return (
    <div className="chip-preview" aria-label={`${typeface === 'monospace' ? 'Monospace' : 'Sans serif'} chip variants`}>
      <div className="chip-preview__row" aria-label="Medium chips with leading icons">
        {CHIP_VARIANTS.map((variant) => (
          <Chip
            iconPosition="start"
            key={variant}
            size="medium"
            typeface={typeface}
            variant={variant}
          >
            12%
          </Chip>
        ))}
      </div>
    </div>
  )
}

function ChipStage() {
  const [copied, setCopied] = useState(false)
  const [typeface, setTypeface] = useState<ChipTypeface>('sans-serif')
  const [animateSelection, setAnimateSelection] = useState(true)

  async function copyComponentCode() {
    try {
      await navigator.clipboard.writeText(CHIP_VIEW_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage lars-stage--chip">
      <BaseButton className="lars-copy" type="button" onClick={copyComponentCode} aria-label="Copy Chip code">
        {copied ? <span className="lars-copy__status" role="status">Copied</span> : <CopyIcon />}
      </BaseButton>
      <ChipPreview typeface={typeface} />
      <div
        aria-label="Chip typeface"
        className="lars-modes lars-modes--typeface"
        data-animate={animateSelection}
        data-selected={typeface === 'sans-serif' ? 'first' : 'second'}
      >
        <span className="lars-modes__indicator" aria-hidden="true" />
        <BaseButton
          aria-pressed={typeface === 'sans-serif'}
          className={typeface === 'sans-serif' ? 'is-active' : ''}
          onClick={(event) => {
            setAnimateSelection(event.detail !== 0)
            setTypeface('sans-serif')
          }}
          type="button"
        >
          Sans
        </BaseButton>
        <BaseButton
          aria-pressed={typeface === 'monospace'}
          className={typeface === 'monospace' ? 'is-active' : ''}
          onClick={(event) => {
            setAnimateSelection(event.detail !== 0)
            setTypeface('monospace')
          }}
          type="button"
        >
          Mono
        </BaseButton>
      </div>
    </div>
  )
}

function SegmentedControlStage() {
  const [type, setType] = useState<SegmentedControlType>('cornered')
  const [value, setValue] = useState('details')
  const [copied, setCopied] = useState(false)

  async function copyComponentCode() {
    try {
      await navigator.clipboard.writeText(SEGMENTED_CONTROL_VIEW_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage lars-stage--segmented-control">
      <BaseButton className="lars-copy" type="button" onClick={copyComponentCode} aria-label="Copy Segmented Control code">
        {copied ? <span className="lars-copy__status" role="status">Copied</span> : <CopyIcon />}
      </BaseButton>
      <LarsSegmentedControl
        content="text-only"
        label="Preview view"
        onValueChange={setValue}
        options={SEGMENT_OPTIONS.slice(0, 3)}
        size="default"
        type={type}
        value={value}
      />
      <div className="lars-modes" aria-label="Segmented control type" data-selected={type === 'cornered' ? 'first' : 'second'}>
        <span className="lars-modes__indicator" aria-hidden="true" />
        <BaseButton aria-pressed={type === 'cornered'} className={type === 'cornered' ? 'is-active' : ''} onClick={() => setType('cornered')} type="button">
          Cornered
        </BaseButton>
        <BaseButton aria-pressed={type === 'square'} className={type === 'square' ? 'is-active' : ''} onClick={() => setType('square')} type="button">
          Square
        </BaseButton>
      </div>
    </div>
  )
}

function TablePreview({
  rows = TABLE_ROWS,
  selectable = true,
  striped = true,
  variant = 'default',
}: {
  rows?: readonly TeamMember[]
  selectable?: boolean
  striped?: boolean
  variant?: TableVariant
}) {
  return (
    <LarsTable
      ariaLabel="Team members"
      className="lars-table-preview"
      columns={TABLE_COLUMNS}
      filterableColumns={TABLE_FILTERABLE_COLUMNS}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      onRowAction={() => undefined}
      rowActionLabel={(row) => `Open actions for ${row.name}`}
      rows={rows}
      selectable={selectable}
      stickyHeader
      striped={striped}
      variant={variant}
    />
  )
}

function TableStage() {
  const [copied, setCopied] = useState(false)
  const [variant, setVariant] = useState<TableVariant>('default')

  async function copyComponentCode() {
    try {
      const code = variant === 'default'
        ? TABLE_VIEW_CODE
        : TABLE_VIEW_CODE.replace('      rows={members}\n', `      rows={members}\n      variant="${variant}"\n`)
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage lars-stage--table">
      <BaseButton className="lars-copy" type="button" onClick={copyComponentCode} aria-label="Copy Table code">
        {copied ? <span className="lars-copy__status" role="status">Copied</span> : <CopyIcon />}
      </BaseButton>
      <TablePreview rows={TABLE_HOME_ROWS} variant={variant} />
      <div className="lars-table-stage__controls">
        <div
          aria-label="Table variant"
          className="lars-modes lars-modes--table-variant"
          data-selected={variant === 'default' ? 'first' : variant === 'compact' ? 'second' : 'third'}
          role="group"
        >
          <span className="lars-modes__indicator" aria-hidden="true" />
          {(['default', 'compact', 'relaxed'] as const).map((option) => (
            <BaseButton
              aria-pressed={variant === option}
              className={variant === option ? 'is-active' : ''}
              key={option}
              onClick={() => setVariant(option)}
              type="button"
            >
              {option[0].toUpperCase() + option.slice(1)}
            </BaseButton>
          ))}
        </div>
      </div>
    </div>
  )
}

function TooltipExample({
  anchor = false,
  description,
  highContrast = false,
  label,
  shortcut,
  shortcutStyle,
  side,
}: {
  anchor?: boolean
  description?: string
  highContrast?: boolean
  label: string
  shortcut?: string
  shortcutStyle?: 'plain' | 'keycap'
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <p className="lars-tooltip-example">
      Choose your{' '}
      <LarsTooltip
        anchor={anchor}
        description={description}
        highContrast={highContrast}
        label={label}
        shortcut={shortcut}
        shortcutStyle={shortcutStyle}
        side={side}
      >
        <button className="lars-tooltip-inline" type="button">export settings</button>
      </LarsTooltip>{' '}
      before downloading.
    </p>
  )
}

function TooltipStage() {
  const [copied, setCopied] = useState(false)

  async function copyComponentCode() {
    try {
      await navigator.clipboard.writeText(TOOLTIP_VIEW_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage lars-stage--tooltip">
      <BaseButton className="lars-copy" type="button" onClick={copyComponentCode} aria-label="Copy basic Tooltip code">
        {copied ? <span className="lars-copy__status" role="status">Copied</span> : <CopyIcon />}
      </BaseButton>
      <div className="lars-tooltip-stage-content">
        <TooltipExample anchor label="Export quality" description="Higher quality creates a larger file." />
      </div>
    </div>
  )
}

function CodeBlock({
  code,
  fileName,
  label,
  onChange,
}: {
  code: string
  fileName: string
  label: string
  onChange?: (code: string) => void
}) {
  const [draft, setDraft] = useState(code)
  const editing = useRef(false)
  const previewRef = useRef<HTMLPreElement>(null)
  const previousCode = useRef(code)
  const displayedCode = onChange ? draft : code
  const highlightedCode = useMemo(() => highlightTsx(displayedCode), [displayedCode])

  useEffect(() => {
    if (code === previousCode.current) return
    previousCode.current = code
    if (!editing.current) setDraft(code)
  }, [code])

  const updateDraft = (nextCode: string) => {
    setDraft(nextCode)
    onChange?.(nextCode)
  }

  return (
    <section className="lars-code-block" aria-label={label}>
      <header className="lars-code-block__header">{fileName}</header>
      {onChange ? (
        <div className="lars-code-editor">
          <pre ref={previewRef} aria-hidden="true" className="lars-code lars-code--preview" data-language="tsx">
            <code>{highlightedCode}</code>
          </pre>
          <textarea
            aria-label={`Edit ${fileName}`}
            autoCapitalize="none"
            autoCorrect="off"
            className="lars-code-input"
            onBlur={() => { editing.current = false }}
            onChange={(event) => updateDraft(event.currentTarget.value)}
            onFocus={() => { editing.current = true }}
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              event.preventDefault()
              const input = event.currentTarget
              const start = input.selectionStart
              const end = input.selectionEnd
              const nextCode = `${draft.slice(0, start)}  ${draft.slice(end)}`
              updateDraft(nextCode)
              window.requestAnimationFrame(() => input.setSelectionRange(start + 2, start + 2))
            }}
            onScroll={(event) => {
              if (!previewRef.current) return
              previewRef.current.scrollLeft = event.currentTarget.scrollLeft
              previewRef.current.scrollTop = event.currentTarget.scrollTop
            }}
            spellCheck={false}
            value={draft}
            wrap="off"
          />
        </div>
      ) : (
        <pre className="lars-code" data-language="tsx">
          <code>{highlightedCode}</code>
        </pre>
      )}
    </section>
  )
}

const MemoizedCodeBlock = memo(CodeBlock)

function SegmentedControl<T extends string>({
  className = '',
  label,
  onChange,
  options,
  value,
}: {
  className?: string
  label: string
  onChange: (value: T) => void
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
}) {
  return (
    <div className={`lars-property lars-property--segmented${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <LarsSegmentedControl
        animateSelection={true}
        className="lars-property__segmented-control"
        label={label}
        onValueChange={(nextValue) => {
          const nextOption = options.find((option) => option.value === nextValue)
          if (nextOption) onChange(nextOption.value)
        }}
        options={options}
        value={value}
      />
    </div>
  )
}

function SelectChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path d="M7.435 11.765C7.748 12.077 8.255 12.077 8.568 11.765L13.368 6.965C13.68 6.652 13.68 6.145 13.368 5.832 13.055 5.52 12.548 5.52 12.235 5.832L8 10.067 3.765 5.835C3.453 5.522 2.945 5.522 2.633 5.835 2.32 6.147 2.32 6.655 2.633 6.967L7.433 11.767z" />
    </svg>
  )
}

type PropertySelectProps<T extends string> = {
  label: string
  onChange: (value: T) => void
  options: ReadonlyArray<{ label: string; value: T }>
  popupClassName?: string
  popupSide?: 'top' | 'bottom'
  value: T
}

function PropertySelect<T extends string>(props: PropertySelectProps<T>) {
  if (props.options.length === 2) {
    return (
      <SegmentedControl
        className="lars-property--two-choice"
        label={props.label}
        onChange={props.onChange}
        options={props.options}
        value={props.value}
      />
    )
  }

  return <PropertyDropdown {...props} />
}

function PropertyDropdown<T extends string>({
  label,
  onChange,
  options,
  popupClassName = '',
  popupSide = 'bottom',
  value,
}: PropertySelectProps<T>) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lars-property lars-property--stacked lars-property-select">
      <Select.Root
        items={[...options]}
        modal={false}
        onOpenChange={(nextOpen) => setOpen(nextOpen)}
        onValueChange={(nextValue) => {
          if (nextValue !== null) {
            onChange(nextValue)
            setOpen(false)
          }
        }}
        open={open}
        value={value}
      >
        <Select.Label className="lars-property-select__label">{label}</Select.Label>
        <Select.Trigger className="lars-property-select__trigger">
          <Select.Value />
          <Select.Icon className="lars-property-select__icon">
            <SelectChevron />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner
            align="start"
            alignItemWithTrigger={false}
            className="lars-property-select__positioner"
            side={popupSide}
            sideOffset={8}
          >
            <Select.Popup className={`lars-property-select__popup${popupClassName ? ` ${popupClassName}` : ''}`}>
              <Select.List className="lars-property-select__list">
                {options.map((option) => (
                  <Select.Item
                    className="lars-property-select__item"
                    key={option.value}
                    value={option.value}
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}

type CodeTokenType =
  | 'attribute'
  | 'boolean'
  | 'comment'
  | 'function'
  | 'keyword'
  | 'number'
  | 'operator'
  | 'plain'
  | 'punctuation'
  | 'string'
  | 'tag'
  | 'type'

type CodeToken = { text: string; type: CodeTokenType }

const CODE_KEYWORDS = new Set([
  'const',
  'export',
  'from',
  'function',
  'import',
  'return',
])

function tokenizeTsx(code: string): CodeToken[] {
  const tokens: CodeToken[] = []
  let index = 0
  let inJsxTag = false
  let jsxExpressionDepth = 0
  let expectsTagName = false

  const push = (text: string, type: CodeTokenType) => tokens.push({ text, type })

  while (index < code.length) {
    const start = index
    const character = code[index]
    const nextCharacter = code[index + 1]

    if (/\s/.test(character)) {
      while (index < code.length && /\s/.test(code[index])) index += 1
      push(code.slice(start, index), 'plain')
      continue
    }

    if (character === '/' && nextCharacter === '/') {
      while (index < code.length && code[index] !== '\n') index += 1
      push(code.slice(start, index), 'comment')
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      index += 2
      while (index < code.length && !(code[index] === '*' && code[index + 1] === '/')) index += 1
      index = Math.min(index + 2, code.length)
      push(code.slice(start, index), 'comment')
      continue
    }

    if (character === "'" || character === '"' || character === '`') {
      const quote = character
      index += 1
      while (index < code.length) {
        if (code[index] === '\\') {
          index += 2
          continue
        }
        if (code[index] === quote) {
          index += 1
          break
        }
        index += 1
      }
      push(code.slice(start, index), 'string')
      continue
    }

    if (/\d/.test(character)) {
      while (index < code.length && /[\d._]/.test(code[index])) index += 1
      push(code.slice(start, index), 'number')
      continue
    }

    if (/[A-Za-z_$]/.test(character)) {
      index += 1
      while (index < code.length && /[\w$]/.test(code[index])) index += 1
      const text = code.slice(start, index)
      const nextNonWhitespace = code.slice(index).match(/^\s*(.)/)?.[1]
      let type: CodeTokenType = 'plain'

      if (CODE_KEYWORDS.has(text)) type = 'keyword'
      else if (text === 'true' || text === 'false') type = 'boolean'
      else if (inJsxTag && jsxExpressionDepth === 0 && expectsTagName) {
        type = 'tag'
        expectsTagName = false
      } else if (inJsxTag && jsxExpressionDepth === 0) type = 'attribute'
      else if (/^[A-Z]/.test(text)) type = 'type'
      else if (nextNonWhitespace === '(') type = 'function'

      push(text, type)
      continue
    }

    if (character === '<') {
      inJsxTag = true
      expectsTagName = true
      push(character, 'punctuation')
      index += 1
      continue
    }

    if (character === '>' && inJsxTag && jsxExpressionDepth === 0) {
      inJsxTag = false
      expectsTagName = false
      push(character, 'punctuation')
      index += 1
      continue
    }

    if (character === '{' && inJsxTag) jsxExpressionDepth += 1
    if (character === '}' && inJsxTag) jsxExpressionDepth = Math.max(0, jsxExpressionDepth - 1)

    if ('=+-'.includes(character)) push(character, 'operator')
    else if ('{}[](),.;:/'.includes(character)) push(character, 'punctuation')
    else push(character, 'plain')
    index += 1
  }

  return tokens
}

function highlightTsx(code: string) {
  return tokenizeTsx(code).map((token, index) => (
    token.type === 'plain' ? token.text : (
      <span className={`lars-code__token--${token.type}`} key={`${index}-${token.text}`}>
        {token.text}
      </span>
    )
  ))
}

const JSX_NUMBER = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?'

function readOpeningTag(code: string, component: string) {
  return code.match(new RegExp(`<${component}\\b([\\s\\S]*?)>`))?.[1] ?? null
}

function readStringProp(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`))
  if (!match) return null
  const [, quote, contents] = match
  if (quote === '"') {
    try {
      return JSON.parse(`"${contents}"`) as string
    } catch {
      return null
    }
  }
  return contents.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
}

function readNumberProp(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*\\{\\s*(${JSX_NUMBER})\\s*\\}`, 'i'))
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function readBooleanProp(attributes: string, name: string) {
  const explicit = attributes.match(new RegExp(`\\b${name}\\s*=\\s*\\{\\s*(true|false)\\s*\\}`))
  if (explicit) return explicit[1] === 'true'
  return new RegExp(`\\b${name}\\b`).test(attributes)
}

function parseButtonCode(code: string) {
  const attributes = readOpeningTag(code, 'Button')
  const body = code.match(/<Button\b[\s\S]*?>([\s\S]*?)<\/Button>/)?.[1]
  if (attributes === null || body === undefined) return null

  const variant = readStringProp(attributes, 'variant')
  const shape = readStringProp(attributes, 'shape')
  const iconOnly = readBooleanProp(attributes, 'iconOnly')
  const text = body.replace(/<span\b[\s\S]*?<\/span>/g, '').trim()

  return {
    disabled: readBooleanProp(attributes, 'disabled'),
    icon: /<span\b[^>]*aria-hidden=["']true["'][^>]*>\s*→\s*<\/span>/.test(body),
    iconOnly,
    label: iconOnly
      ? readStringProp(attributes, 'aria-label')
      : text && !/[<>]/.test(text) ? text : null,
    shape: shape === 'full' || shape === 'neat' ? shape as ButtonShape : null,
    variant: BUTTON_VARIANTS.includes(variant as ButtonVariant) ? variant as ButtonVariant : null,
  }
}

function parseSliderCode(code: string) {
  const attributes = readOpeningTag(code, 'InlineSlider')
  if (attributes === null) return null

  const stateValueMatch = code.match(new RegExp(`useState\\(\\s*(${JSX_NUMBER})\\s*\\)`, 'i'))
  const stateValue = stateValueMatch ? Number(stateValueMatch[1]) : null
  const size = readStringProp(attributes, 'size')

  return {
    continuous: readBooleanProp(attributes, 'continuous'),
    label: readStringProp(attributes, 'label'),
    max: readNumberProp(attributes, 'max'),
    min: readNumberProp(attributes, 'min'),
    showTicks: readBooleanProp(attributes, 'showTicks'),
    size: size === 'large' || size === 'default' ? size as InlineSliderSize : null,
    value: stateValue !== null && Number.isFinite(stateValue) ? stateValue : null,
  }
}

function parseChipCode(code: string) {
  const attributes = readOpeningTag(code, 'Chip')
  const body = code.match(/<Chip\b[\s\S]*?>([\s\S]*?)<\/Chip>/)?.[1]
  if (attributes === null || body === undefined) return null

  const variant = readStringProp(attributes, 'variant')
  const iconPosition = readStringProp(attributes, 'iconPosition')
  const size = readStringProp(attributes, 'size')
  const typeface = readStringProp(attributes, 'typeface')
  const label = body.trim()

  return {
    burst: readBooleanProp(attributes, 'burst'),
    iconPosition: CHIP_ICON_POSITION_OPTIONS.some((option) => option.value === iconPosition)
      ? iconPosition as ChipIconPosition
      : null,
    label: label && !/[<>]/.test(label) ? label : null,
    size: CHIP_SIZE_OPTIONS.some((option) => option.value === size) ? size as ChipSize : null,
    typeface: typeface === 'monospace' || typeface === 'sans-serif' ? typeface as ChipTypeface : null,
    variant: CHIP_VARIANTS.includes(variant as ChipVariant) ? variant as ChipVariant : null,
  }
}

function quoteTableString(value: string) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`
}

function parseTableString(raw: string, quote: string) {
  if (quote === '"') {
    try {
      return JSON.parse(`"${raw}"`) as string
    } catch {
      return null
    }
  }

  return raw.replace(/\\(\\|'|n|r|t)/g, (_, escaped: string) => {
    if (escaped === 'n') return '\n'
    if (escaped === 'r') return '\r'
    if (escaped === 't') return '\t'
    return escaped
  })
}

function parseTableColumnHeaders(code: string) {
  const columnBody = code.match(/\bconst\s+columns\b[\s\S]*?=\s*\[([\s\S]*?)\]/)?.[1]
  if (!columnBody) return null

  const knownKeys = new Set(TABLE_COLUMNS.map((column) => String(column.key)))
  const headers: Record<string, string> = {}
  const entries = columnBody.matchAll(/\{\s*key\s*:\s*(['"])([^'"\r\n]+)\1\s*,\s*header\s*:\s*(['"])((?:\\.|[^\\\r\n])*?)\3\s*,?\s*\}/g)

  for (const match of entries) {
    const [, , key, quote, rawHeader] = match
    if (!knownKeys.has(key)) continue
    const header = parseTableString(rawHeader, quote)
    if (header !== null) headers[key] = header
  }

  return headers
}

function parseTableMembers(code: string) {
  const memberBody = code.match(/\bconst\s+members\b[\s\S]*?=\s*\[([\s\S]*?)\n\]/)?.[1]
  if (!memberBody) return null

  const knownIds = new Set(TABLE_CONFIG_ROWS.map((row) => row.id))
  const memberKeys = ['id', 'name', 'role', 'team', 'status', 'location', 'updated'] as const
  const members: Record<string, TeamMember> = {}

  for (const line of memberBody.split('\n')) {
    const fields: Record<string, string> = {}
    const entries = line.matchAll(/\b(id|name|role|team|status|location|updated):\s*(['"])((?:\\.|[^\\\r\n])*?)\2/g)
    for (const [, key, quote, rawValue] of entries) {
      const value = parseTableString(rawValue, quote)
      if (value !== null) fields[key] = value
    }
    if (!knownIds.has(fields.id) || !memberKeys.every((key) => key in fields)) continue
    members[fields.id] = fields as TeamMember
  }

  return members
}

type ButtonLoadingMode = 'idle' | 'generating' | 'loading'

type ButtonLoadingEffect = ButtonSpinner

const BUTTON_EFFECT_OPTIONS: Record<
  Exclude<ButtonLoadingMode, 'idle'>,
  Record<ButtonShape, ReadonlyArray<{ label: string; value: ButtonLoadingEffect }>>
> = {
  generating: {
    neat: [
      { label: 'Gather', value: 'gather' },
      { label: 'Blocks', value: 'blocks' },
      { label: 'Slide', value: 'slide' },
    ],
    full: [
      { label: 'Atom', value: 'atom' },
      { label: 'Morph', value: 'morph' },
    ],
  },
  loading: {
    neat: [
      { label: 'Flip', value: 'flip' },
      { label: 'Trace', value: 'trace' },
      { label: 'Swirl', value: 'swirl' },
    ],
    full: [
      { label: 'Ring', value: 'ring' },
      { label: 'Loading', value: 'loading' },
      { label: 'Classic', value: 'classic' },
      { label: 'Clock', value: 'clock' },
    ],
  },
}

function usePropertyMenuFill(open: boolean) {
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return

    const menu = menuRef.current
    const panel = menu?.closest<HTMLElement>('.lars-properties')
    const fields = menu?.parentElement
    if (!menu || !panel || !fields) return

    const updateHeight = () => {
      const height = panel.getBoundingClientRect().bottom
        - menu.getBoundingClientRect().top
        - panel.scrollTop
        - 4
      const value = `${Math.max(36, height)}px`
      if (menu.style.getPropertyValue('--property-menu-fill-height') !== value) {
        menu.style.setProperty('--property-menu-fill-height', value)
      }
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(panel)
    observer.observe(fields)
    return () => observer.disconnect()
  }, [open])

  return menuRef
}

function ButtonLoadingProperties({
  generatingEffect,
  loadingEffect,
  mode,
  onGeneratingEffectChange,
  onLoadingEffectChange,
  onModeChange,
  shape,
}: {
  generatingEffect: ButtonLoadingEffect
  loadingEffect: ButtonLoadingEffect
  mode: ButtonLoadingMode
  onGeneratingEffectChange: (value: ButtonLoadingEffect) => void
  onLoadingEffectChange: (value: ButtonLoadingEffect) => void
  onModeChange: (value: ButtonLoadingMode) => void
  shape: ButtonShape
}) {
  const [open, setOpen] = useState(false)
  const [pointerFocus, setPointerFocus] = useState(false)
  const reduceMotion = useReducedMotion()
  const menuRef = usePropertyMenuFill(open)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupId = useId()
  const booleanOptions = [{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]
  const iconTransition = {
    duration: reduceMotion ? 0 : open ? 0.35 : 0.2,
    ease: [0.25, 0.1, 0.25, 1] as const,
  }

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="lars-button-loading-property" data-open={open || undefined} ref={menuRef}>
      <BaseButton
        aria-controls={open ? popupId : undefined}
        aria-expanded={open}
        className="lars-button-loading-property__trigger"
        data-pointer-focus={pointerFocus || undefined}
        onBlur={() => setPointerFocus(false)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') setPointerFocus(false)
        }}
        onPointerDown={() => setPointerFocus(true)}
        ref={triggerRef}
        type="button"
      >
        <span>Loading states</span>
      </BaseButton>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            aria-label="Loading state properties"
            animate={{ opacity: 1 }}
            className="lars-button-loading-property__popup"
            exit={{
              opacity: 0,
              transition: { duration: reduceMotion ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] },
            }}
            id={popupId}
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            key="loading-state-properties"
            role="group"
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="lars-button-loading-property__options">
              <SegmentedControl
                label="Generating"
                onChange={(next) => onModeChange(next === 'true' ? 'generating' : mode === 'generating' ? 'idle' : mode)}
                options={booleanOptions}
                value={mode === 'generating' ? 'true' : 'false'}
              />
              {mode === 'generating' && (
                <PropertyDropdown<ButtonLoadingEffect>
                  label="Generating effect"
                  onChange={onGeneratingEffectChange}
                  options={BUTTON_EFFECT_OPTIONS.generating[shape]}
                  popupClassName="lars-button-loading-property__effect-popup"
                  popupSide="top"
                  value={generatingEffect}
                />
              )}
              <SegmentedControl
                label="Loading"
                onChange={(next) => onModeChange(next === 'true' ? 'loading' : mode === 'loading' ? 'idle' : mode)}
                options={booleanOptions}
                value={mode === 'loading' ? 'true' : 'false'}
              />
              {mode === 'loading' && (
                <PropertySelect<ButtonLoadingEffect>
                  label="Loading effect"
                  onChange={onLoadingEffectChange}
                  options={BUTTON_EFFECT_OPTIONS.loading[shape]}
                  popupClassName="lars-button-loading-property__effect-popup"
                  popupSide="top"
                  value={loadingEffect}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <svg
        aria-hidden="true"
        className="lars-button-loading-property__icon"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        viewBox="0 0 16 16"
        width="16"
        height="16"
      >
        <motion.path
          animate={{ d: open ? 'M3.9 3.9L12.1 12.1' : 'M6.2 3.2L11 8' }}
          initial={false}
          transition={iconTransition}
        />
        <motion.path
          animate={{ d: open ? 'M12.1 3.9L3.9 12.1' : 'M11 8L6.2 12.8' }}
          initial={false}
          transition={iconTransition}
        />
      </svg>
    </div>
  )
}

function ButtonConfigurator() {
  const [label, setLabel] = useState('View')
  const [variant, setVariant] = useState<ButtonVariant>('primary')
  const [icon, setIcon] = useState<'true' | 'false'>('false')
  const [iconOnly, setIconOnly] = useState(false)
  const [shape, setShape] = useState<ButtonShape>('full')
  const [disabled, setDisabled] = useState(false)
  const [loadingMode, setLoadingMode] = useState<ButtonLoadingMode>('idle')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loadingEffects, setLoadingEffects] = useState<Record<ButtonShape, ButtonLoadingEffect>>({
    full: 'ring',
    neat: 'flip',
  })
  const [generatingEffects, setGeneratingEffects] = useState<Record<ButtonShape, ButtonLoadingEffect>>({
    full: 'atom',
    neat: 'gather',
  })

  useEffect(() => {
    if (!previewLoading) return
    const timeout = window.setTimeout(() => setPreviewLoading(false), 3500)
    return () => window.clearTimeout(timeout)
  }, [previewLoading])

  const reduceMotion = useReducedMotion()
  const buttonLabel = label || 'Button'
  const activeEffect = loadingMode === 'generating' ? generatingEffects[shape] : loadingEffects[shape]
  const statusLabel = loadingMode === 'generating' ? 'Generating' : 'Loading'
  const idleContent = iconOnly
    ? '<span aria-hidden="true">→</span>'
    : `${buttonLabel}${icon === 'true' ? '\n      <span aria-hidden="true">→</span>' : ''}`
  const buttonProps = `${iconOnly ? `\n      aria-label=${JSON.stringify(buttonLabel)}` : ''}\n      variant="${variant}"\n      shape="${shape}"${iconOnly ? '\n      iconOnly' : ''}${disabled ? '\n      disabled' : ''}`
  const code = loadingMode === 'idle'
    ? `import { Button } from 'larsui'
import 'larsui/style.css'

export function Example() {
  return (
    <Button${buttonProps}
    >
      ${idleContent}
    </Button>
  )
}`
    : `import { useEffect, useState } from 'react'
import { Button } from 'larsui'
import 'larsui/style.css'

export function Example() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loading) return
    const timeout = window.setTimeout(() => setLoading(false), 3500)
    return () => window.clearTimeout(timeout)
  }, [loading])

  return (
    <Button${buttonProps}
      loading={loading}
      loadingText="${statusLabel}"
      spinner="${activeEffect}"
      onClick={() => setLoading(true)}
    >
      ${idleContent}
    </Button>
  )
}`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas">
          <Button
            aria-label={iconOnly ? buttonLabel : undefined}
            className="lars-button-preview"
            disabled={disabled}
            iconOnly={iconOnly}
            loading={previewLoading}
            loadingText={statusLabel}
            onClick={() => {
              if (loadingMode !== 'idle') setPreviewLoading(true)
            }}
            shape={shape}
            spinner={activeEffect}
            type="button"
            variant={variant}
          >
            {iconOnly ? <span aria-hidden="true">→</span> : buttonLabel}
            {!iconOnly && icon === 'true' && <span aria-hidden="true">→</span>}
          </Button>
        </div>

        <aside className="lars-properties" aria-labelledby="button-properties-title">
          <header className="lars-properties__header">
            <h2 id="button-properties-title">Properties</h2>
          </header>

          <div className="lars-properties__fields">
            <PropertySelect
              label="Variant"
              onChange={setVariant}
              options={[
                { label: 'Primary', value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
                { label: 'Ghost', value: 'tertiary' },
                { label: 'Danger', value: 'danger' },
              ]}
              value={variant}
            />

            <AnimatePresence initial={false} mode="popLayout">
              {!iconOnly && (
                <motion.div
                  animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                  className="lars-properties__conditional"
                  exit={{
                    opacity: 0,
                    transform: reduceMotion ? 'translate3d(0, 0, 0)' : 'translate3d(0, -4px, 0)',
                  }}
                  initial={{
                    opacity: 0,
                    transform: reduceMotion ? 'translate3d(0, 0, 0)' : 'translate3d(0, -4px, 0)',
                  }}
                  key="button-label"
                  transition={{ duration: reduceMotion ? 0.14 : 0.18, ease: [0.19, 1, 0.22, 1] }}
                >
                  <label className="lars-property lars-property--stacked">
                    <span>Label</span>
                    <input value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout={!reduceMotion} transition={{ type: 'spring', duration: 0.26, bounce: 0 }}>
              <SegmentedControl
                label="Icon Only"
                onChange={(value) => setIconOnly(value === 'true')}
                options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
                value={iconOnly ? 'true' : 'false'}
              />
            </motion.div>

            <ButtonLoadingProperties
              generatingEffect={generatingEffects[shape]}
              loadingEffect={loadingEffects[shape]}
              mode={loadingMode}
              onGeneratingEffectChange={(value) => setGeneratingEffects((current) => ({ ...current, [shape]: value }))}
              onLoadingEffectChange={(value) => setLoadingEffects((current) => ({ ...current, [shape]: value }))}
              onModeChange={(nextMode) => {
                setPreviewLoading(false)
                setLoadingMode(nextMode)
              }}
              shape={shape}
            />

            <AnimatePresence initial={false} mode="popLayout">
              {!iconOnly && (
                <motion.div
                  animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                  className="lars-properties__conditional"
                  exit={{
                    opacity: 0,
                    transform: reduceMotion ? 'translate3d(0, 0, 0)' : 'translate3d(0, -4px, 0)',
                  }}
                  initial={{
                    opacity: 0,
                    transform: reduceMotion ? 'translate3d(0, 0, 0)' : 'translate3d(0, -4px, 0)',
                  }}
                  key="button-icon"
                  transition={{ duration: reduceMotion ? 0.14 : 0.18, ease: [0.19, 1, 0.22, 1] }}
                >
                  <SegmentedControl
                    label="Icon"
                    onChange={setIcon}
                    options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
                    value={icon}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout={!reduceMotion} transition={{ type: 'spring', duration: 0.26, bounce: 0 }}>
              <SegmentedControl
                label="Shape"
                onChange={setShape}
                options={[{ label: 'Full', value: 'full' }, { label: 'Neat', value: 'neat' }]}
                value={shape}
              />
            </motion.div>

            <motion.div layout={!reduceMotion} transition={{ type: 'spring', duration: 0.26, bounce: 0 }}>
              <SegmentedControl
                label="Disabled"
                onChange={(value) => setDisabled(value === 'true')}
                options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
                value={disabled ? 'true' : 'false'}
              />
            </motion.div>
          </div>
        </aside>
      </div>

      <div className="lars-code-with-footnote">
        <CodeBlock
          code={code}
          fileName="Button.tsx"
          label="Configured button usage code"
          onChange={(nextCode) => {
            const next = parseButtonCode(nextCode)
            if (!next) return
            if (next.variant) setVariant(next.variant)
            if (next.shape) setShape(next.shape)
            if (next.label !== null) setLabel(next.label)
            setIconOnly(next.iconOnly)
            setDisabled(next.disabled)
            if (!next.iconOnly) setIcon(next.icon ? 'true' : 'false')
          }}
        />

        <aside className="lars-footnotes" aria-label="Notes">
          <p id="button-footnote-1" tabIndex={-1}>
            <sup>1</sup>
            <span>
              The loading and generating states originate from{' '}
              <a href="https://loading.dev/" target="_blank" rel="noreferrer">
                loading.dev
              </a>.
            </span>
          </p>
        </aside>
      </div>
    </>
  )
}

function SliderConfigurator() {
  const [label, setLabel] = useState('Size')
  const [value, setValue] = useState(300)
  const [min, setMin] = useState(160)
  const [max, setMax] = useState(360)
  const [mode, setMode] = useState<'freeform' | 'dotted'>('freeform')
  const [showTicks, setShowTicks] = useState(false)
  const [size, setSize] = useState<InlineSliderSize>('default')
  const step = 1

  const code = `import { useState } from 'react'
import { InlineSlider } from 'larsui'
import 'larsui/style.css'

export function Example() {
  const [value, setValue] = useState(${value})

  return (
    <InlineSlider
      label=${JSON.stringify(label || 'Value')}
      value={value}
      min={${min}}
      max={${max}}
      step={${step}}${mode === 'freeform' ? '\n      continuous' : ''}
      showTicks={${showTicks}}
      size=${JSON.stringify(size)}
      onValueChange={setValue}
    />
  )
}`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas">
          <div className="lars-slider-card">
            <InlineSlider
              continuous={mode === 'freeform'}
              label={label || 'Value'}
              max={max}
              min={min}
              onValueChange={setValue}
              showTicks={showTicks}
              size={size}
              step={step}
              value={value}
            />
          </div>
        </div>

        <aside className="lars-properties" aria-labelledby="slider-properties-title">
          <header className="lars-properties__header">
            <h2 id="slider-properties-title">Properties</h2>
          </header>

          <div className="lars-properties__fields lars-properties__fields--slider">
            <PropertySelect
              label="Variant"
              onChange={(nextMode) => {
                setMode(nextMode)
                setShowTicks(nextMode === 'dotted')
              }}
              options={[
                { label: 'Freeform', value: 'freeform' },
                { label: 'Dotted', value: 'dotted' },
              ]}
              value={mode}
            />

            <SegmentedControl
              label="Size"
              onChange={setSize}
              options={[
                { label: 'Large', value: 'large' },
                { label: 'Default', value: 'default' },
              ]}
              value={size}
            />

            <label className="lars-property lars-property--stacked">
              <span>Label</span>
              <input value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
            </label>

            <label className="lars-property lars-property--stacked">
              <span>Minimum Value</span>
              <input
                max={max - step}
                onChange={(event) => {
                  const next = event.currentTarget.valueAsNumber
                  if (Number.isFinite(next) && next < max) {
                    setMin(next)
                    setValue((current) => Math.max(next, current))
                  }
                }}
                step={step}
                type="number"
                value={min}
              />
            </label>

            <label className="lars-property lars-property--stacked">
              <span>Maximum Value</span>
              <input
                min={min + step}
                onChange={(event) => {
                  const next = event.currentTarget.valueAsNumber
                  if (Number.isFinite(next) && next > min) {
                    setMax(next)
                    setValue((current) => Math.min(next, current))
                  }
                }}
                step={step}
                type="number"
                value={max}
              />
            </label>

            <SegmentedControl
              label="Show ticks"
              onChange={(nextValue) => setShowTicks(nextValue === 'true')}
              options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
              value={showTicks ? 'true' : 'false'}
            />
          </div>
        </aside>
      </div>

      <CodeBlock
        code={code}
        fileName="InlineSlider.tsx"
        label="Configured inline slider usage code"
        onChange={(nextCode) => {
          const next = parseSliderCode(nextCode)
          if (!next) return
          if (next.label !== null) setLabel(next.label)
          setMode(next.continuous ? 'freeform' : 'dotted')
          setShowTicks(next.showTicks)
          if (next.size) setSize(next.size)

          if (next.min !== null && next.max !== null && next.min < next.max) {
            setMin(next.min)
            setMax(next.max)
            setValue((current) => Math.min(next.max as number, Math.max(next.min as number, next.value ?? current)))
          }
        }}
      />
    </>
  )
}

function ChipConfigurator() {
  const [burst, setBurst] = useState(false)
  const [label, setLabel] = useState('12%')
  const [variant, setVariant] = useState<ChipVariant>('default')
  const [iconPosition, setIconPosition] = useState<ChipIconPosition>('start')
  const [size, setSize] = useState<ChipSize>('small')
  const [typeface, setTypeface] = useState<ChipTypeface>('monospace')
  const chipLabel = label || 'Label'

  const code = `import { Chip } from 'larsui'
import 'larsui/style.css'

<Chip
  variant="${variant}"
  iconPosition="${iconPosition}"
  size="${size}"
  typeface="${typeface}"
  burst={${burst}}
>
  ${chipLabel}
</Chip>`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas">
          <Chip
            burst={burst}
            iconPosition={iconPosition}
            size={size}
            typeface={typeface}
            variant={variant}
          >
            {chipLabel}
          </Chip>
        </div>

        <aside className="lars-properties" aria-labelledby="chip-properties-title">
          <header className="lars-properties__header">
            <h2 id="chip-properties-title">Properties</h2>
          </header>

          <div className="lars-properties__fields">
            <PropertySelect
              label="Variant"
              onChange={setVariant}
              options={CHIP_VARIANT_OPTIONS}
              value={variant}
            />

            <PropertySelect
              label="Size"
              onChange={setSize}
              options={CHIP_SIZE_OPTIONS}
              value={size}
            />

            <label className="lars-property lars-property--stacked">
              <span>Label</span>
              <input value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
            </label>

            <PropertySelect
              label="Content"
              onChange={setIconPosition}
              options={CHIP_ICON_POSITION_OPTIONS}
              value={iconPosition}
            />

            <SegmentedControl
              label="Typeface"
              onChange={setTypeface}
              options={[
                { label: 'Mono', value: 'monospace' },
                { label: 'Sans', value: 'sans-serif' },
              ]}
              value={typeface}
            />

            <SegmentedControl
              label="Burst"
              onChange={(value) => setBurst(value === 'true')}
              options={[
                { label: 'True', value: 'true' },
                { label: 'False', value: 'false' },
              ]}
              value={burst ? 'true' : 'false'}
            />
          </div>
        </aside>
      </div>

      <div className="lars-code-with-footnote">
        <CodeBlock
          code={code}
          fileName="Chip.tsx"
          label="Configured chip usage code"
          onChange={(nextCode) => {
            const next = parseChipCode(nextCode)
            if (!next) return
            setBurst(next.burst)
            if (next.variant) setVariant(next.variant)
            if (next.iconPosition) setIconPosition(next.iconPosition)
            if (next.size) setSize(next.size)
            if (next.typeface) setTypeface(next.typeface)
            if (next.label !== null) setLabel(next.label)
          }}
        />

        <aside className="lars-footnotes" aria-label="Notes">
          <p id="chip-footnote-1" tabIndex={-1}>
            <sup>1</sup>
            <span>
              Inspiration for the Monospace chip variants comes from{' '}
              <a href="https://x.com/AdityaSur11/status/2101695377267384457" target="_blank" rel="noreferrer">
                this tweet by Adi (@AdityaSur11)
              </a>.
            </span>
          </p>
        </aside>
      </div>
    </>
  )
}

function SegmentedControlConfigurator() {
  const [type, setType] = useState<SegmentedControlType>('cornered')
  const [size, setSize] = useState<SegmentedControlSize>('default')
  const [content, setContent] = useState<SegmentedControlContent>('text-only')
  const [quantity, setQuantity] = useState(3)
  const [value, setValue] = useState('details')
  const [disabled, setDisabled] = useState(false)
  const options = SEGMENT_OPTIONS.slice(0, quantity)
  const codeOptions = options.map(({ label, value: optionValue }) =>
    `    { label: '${label}', value: '${optionValue}'${content === 'text-icon' ? ', icon: <DiamondIcon />' : ''} },`
  ).join('\n')
  const code = `import { useState } from 'react'
import { SegmentedControl } from 'larsui'
import 'larsui/style.css'
${content === 'text-icon' ? `
function DiamondIcon() {
  return <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.6 14.4 8 8 14.4 1.6 8Z" /></svg>
}
` : ''}
export function Example() {
  const [value, setValue] = useState('${value}')

  return (
    <SegmentedControl
      label="View"
      type="${type}"
      size="${size}"
      content="${content}"${disabled ? '\n      disabled' : ''}
      options={[
${codeOptions}
      ]}
      value={value}
      onValueChange={setValue}
    />
  )
}`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas lars-segmented-canvas">
          <LarsSegmentedControl
            content={content}
            label="View"
            onValueChange={setValue}
            options={options}
            size={size}
            type={type}
            value={value}
            disabled={disabled}
          />
        </div>

        <aside className="lars-properties" aria-labelledby="segmented-control-properties-title">
          <header className="lars-properties__header">
            <h2 id="segmented-control-properties-title">Properties</h2>
          </header>
          <div className="lars-properties__fields">
            <SegmentedControl
              label="Size"
              onChange={setSize}
              options={[{ label: 'Default', value: 'default' }, { label: 'Large', value: 'large' }]}
              value={size}
            />
            <PropertySelect
              label="Type"
              onChange={setType}
              options={[{ label: 'Cornered', value: 'cornered' }, { label: 'Square', value: 'square' }]}
              value={type}
            />
            <PropertySelect
              label="Content"
              onChange={setContent}
              options={[{ label: 'Text only', value: 'text-only' }, { label: 'Text & icon', value: 'text-icon' }]}
              value={content}
            />
            <PropertySelect
              label="Quantity"
              onChange={(next) => {
                const count = Number(next)
                setQuantity(count)
                if (!SEGMENT_OPTIONS.slice(0, count).some((option) => option.value === value)) {
                  setValue(SEGMENT_OPTIONS[0].value)
                }
              }}
              options={[2, 3, 4, 5].map((count) => ({ label: String(count), value: String(count) }))}
              value={String(quantity)}
            />
            <SegmentedControl
              label="Disabled"
              onChange={(next) => setDisabled(next === 'true')}
              options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
              value={disabled ? 'true' : 'false'}
            />
          </div>
        </aside>
      </div>
      <CodeBlock code={code} fileName="SegmentedControl.tsx" label="Configured segmented control usage code" />
    </>
  )
}

function TableToolbarProperties({
  visible,
  floating,
  toggle,
  actions,
  counter,
  onVisibleChange,
  onFloatingChange,
  onToggleChange,
  onActionsChange,
  onCounterChange,
}: {
  visible: boolean
  floating: boolean
  toggle: boolean
  actions: boolean
  counter: boolean
  onVisibleChange: (value: boolean) => void
  onFloatingChange: (value: boolean) => void
  onToggleChange: (value: boolean) => void
  onActionsChange: (value: boolean) => void
  onCounterChange: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [pointerFocus, setPointerFocus] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const menuRef = usePropertyMenuFill(open)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupId = useId()
  const booleanOptions = [{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]
  const iconTransition = {
    duration: prefersReducedMotion ? 0 : open ? 0.35 : 0.2,
    ease: [0.25, 0.1, 0.25, 1] as const,
  }

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="lars-table-toolbar-property" data-open={open || undefined} ref={menuRef}>
      <BaseButton
        aria-controls={open ? popupId : undefined}
        aria-expanded={open}
        className="lars-table-toolbar-property__trigger"
        data-pointer-focus={pointerFocus || undefined}
        onBlur={() => setPointerFocus(false)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') setPointerFocus(false)
        }}
        onPointerDown={() => setPointerFocus(true)}
        ref={triggerRef}
        type="button"
      >
        <span>Toolbar</span>
      </BaseButton>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            aria-label="Toolbar properties"
            animate={{ opacity: 1 }}
            className="lars-table-toolbar-property__popup"
            exit={{
              opacity: 0,
              transition: { duration: prefersReducedMotion ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] },
            }}
            id={popupId}
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            key="toolbar-properties"
            role="group"
            transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
          <div className="lars-table-toolbar-property__options">
            <SegmentedControl label="Visible" onChange={(next) => onVisibleChange(next === 'true')} options={booleanOptions} value={visible ? 'true' : 'false'} />
            {visible && (
              <>
                <SegmentedControl label="Floating" onChange={(next) => onFloatingChange(next === 'true')} options={booleanOptions} value={floating ? 'true' : 'false'} />
                <SegmentedControl label="Toggle" onChange={(next) => onToggleChange(next === 'true')} options={booleanOptions} value={toggle ? 'true' : 'false'} />
                <SegmentedControl label="Actions" onChange={(next) => onActionsChange(next === 'true')} options={booleanOptions} value={actions ? 'true' : 'false'} />
                <SegmentedControl label="Counter" onChange={(next) => onCounterChange(next === 'true')} options={booleanOptions} value={counter ? 'true' : 'false'} />
              </>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
      <svg
        aria-hidden="true"
        className="lars-table-toolbar-property__icon"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        viewBox="0 0 16 16"
        width="16"
        height="16"
      >
        <motion.path
          animate={{ d: open ? 'M3.9 3.9L12.1 12.1' : 'M6.2 3.2L11 8' }}
          initial={false}
          transition={iconTransition}
        />
        <motion.path
          animate={{ d: open ? 'M12.1 3.9L3.9 12.1' : 'M11 8L6.2 12.8' }}
          initial={false}
          transition={iconTransition}
        />
      </svg>
    </div>
  )
}

function TableConfigurator() {
  const [striped, setStriped] = useState(true)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [toolbarFloating, setToolbarFloating] = useState(true)
  const [toolbarToggle, setToolbarToggle] = useState(false)
  const [toolbarActions, setToolbarActions] = useState(true)
  const [toolbarCounter, setToolbarCounter] = useState(true)
  const [selectable, setSelectable] = useState(true)
  const [variant, setVariant] = useState<TableVariant>('default')
  const [rowCount, setRowCount] = useState(4)
  const [codeRowCount, setCodeRowCount] = useState(4)
  const [columnCount, setColumnCount] = useState(6)
  const [showActions, setShowActions] = useState(true)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [activeView, setActiveView] = useState('all')
  const [columnHeaders, setColumnHeaders] = useState<Record<string, string>>({})
  const [memberValues, setMemberValues] = useState<Record<string, TeamMember>>({})
  const renderedRowCount = useDeferredValue(rowCount)
  const configuredColumns = useMemo(() => TABLE_COLUMNS.slice(0, columnCount).map((column) => ({
    ...column,
    header: columnHeaders[String(column.key)] ?? column.header,
  })), [columnCount, columnHeaders])
  const configuredRows = useMemo(() => TABLE_CONFIG_ROWS.slice(0, renderedRowCount)
    .map((row) => memberValues[row.id] ?? row), [renderedRowCount, memberValues])
  const viewEnabled = toolbarVisible && variant !== 'relaxed' && toolbarToggle
  const viewRows = useMemo(() => viewEnabled && activeView === 'active'
    ? configuredRows.filter((row) => row.status === 'Active')
    : configuredRows, [activeView, configuredRows, viewEnabled])
  const codeRows = useMemo(() => TABLE_CONFIG_ROWS.slice(0, codeRowCount)
    .map((row) => memberValues[row.id] ?? row), [codeRowCount, memberValues])
  const codeColumns = useMemo(() => configuredColumns
    .map((column) => `  { key: '${String(column.key)}', header: ${quoteTableString(String(column.header))} },`)
    .join('\n'), [configuredColumns])
  const codeMembers = useMemo(() => codeRows.slice(0, 6)
    .map((row) => `  { id: ${quoteTableString(row.id)}, name: ${quoteTableString(row.name)}, role: ${quoteTableString(row.role)}, team: ${quoteTableString(row.team)}, status: ${quoteTableString(row.status)}, location: ${quoteTableString(row.location)}, updated: ${quoteTableString(row.updated)} },`)
    .join('\n'), [codeRows])
  const usesState = selectable || viewEnabled
  const toolbarCode = variant === 'relaxed' ? '' : !toolbarVisible ? '      toolbar={false}' : [
    '      toolbar',
    ...(toolbarFloating ? ['      toolbarFloating'] : []),
    ...(!toolbarToggle ? ['      toolbarToggle={false}'] : []),
    ...(!toolbarActions ? ['      toolbarActions={false}'] : []),
    ...(!toolbarCounter ? ['      toolbarCounter={false}'] : []),
  ].join('\n')
  const generatedRows = codeRowCount > 6 ? `
const allMembers: Member[] = Array.from({ length: ${codeRowCount} }, (_, index) => {
  const member = members[index % members.length]
  return {
    ...member,
    id: 'member-' + (index + 1),
    name: index < members.length ? member.name : 'Member ' + (index + 1),
  }
})` : `
const allMembers = members`

  const code = `${usesState ? "import { useState } from 'react'\n" : ''}import { Table, type TableColumn } from 'larsui'
import 'larsui/style.css'

type Member = {
  id: string
  name: string
  role: string
  team: string
  status: string
  location: string
  updated: string
}

const columns: TableColumn<Member>[] = [
${codeColumns}
]

const members: Member[] = [
${codeMembers}
]
${generatedRows}

export function Example() {
${selectable ? '  const [selectedRows, setSelectedRows] = useState<string[]>([])\n' : ''}${viewEnabled ? "  const [view, setView] = useState('all')\n  const viewRows = view === 'active' ? allMembers.filter((row) => row.status === 'Active') : allMembers\n" : ''}
  return (
    <Table
      ariaLabel="Team members"
      columns={columns}
${toolbarVisible && toolbarActions ? "      filterableColumns={['status']}\n" : ''}      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      rows={${viewEnabled ? 'viewRows' : 'allMembers'}}
      stickyHeader${toolbarCode ? `
${toolbarCode}` : ''}${variant === 'default' ? '' : `
      variant="${variant}"`}${selectable ? `
      selectedRowIds={selectedRows}
      onSelectedRowIdsChange={setSelectedRows}` : `
      selectable={false}`}${striped || variant === 'relaxed' ? '' : `
      striped={false}`}${viewEnabled ? `
      view={view}
      viewOptions={[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }]}
      onViewChange={setView}` : ''}${showActions ? `
      onRowAction={(row) => window.alert(row.name)}
      rowActionLabel={(row) => 'Open actions for ' + row.name}` : ''}
    />
  )
}`

  const handleTableCodeChange = useCallback((nextCode: string) => {
    const nextHeaders = parseTableColumnHeaders(nextCode)
    if (nextHeaders && Object.keys(nextHeaders).length > 0) {
      setColumnHeaders((current) => {
        if (Object.entries(nextHeaders).every(([key, value]) => current[key] === value)) return current
        return { ...current, ...nextHeaders }
      })
    }

    const nextMembers = parseTableMembers(nextCode)
    if (nextMembers && Object.keys(nextMembers).length > 0) {
      setMemberValues((current) => {
        if (Object.entries(nextMembers).every(([id, member]) =>
          Object.entries(member).every(([key, value]) => current[id]?.[key as keyof TeamMember] === value)
        )) return current
        return { ...current, ...nextMembers }
      })
    }
  }, [])

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas lars-table-canvas">
          <MemoizedTeamTable
            ariaLabel="Team members preview"
            className="lars-table-preview"
            columns={configuredColumns}
            filterableColumns={TABLE_FILTERABLE_COLUMNS}
            getRowId={getTeamMemberId}
            getRowLabel={(row) => row.name}
            onRowAction={showActions ? noopRowAction : undefined}
            onSelectedRowIdsChange={setSelectedRows}
            rowActionLabel={getTeamMemberActionLabel}
            rows={viewRows}
            selectable={selectable}
            selectedRowIds={selectedRows}
            stickyHeader
            striped={striped}
            toolbar={toolbarVisible}
            toolbarActions={toolbarActions}
            toolbarCounter={toolbarCounter}
            toolbarFloating={toolbarFloating}
            toolbarToggle={toolbarToggle}
            variant={variant}
            view={activeView}
            viewOptions={TABLE_VIEW_OPTIONS}
            onViewChange={setActiveView}
          />
        </div>

        <aside className="lars-properties" aria-labelledby="table-properties-title">
          <header className="lars-properties__header">
            <h2 id="table-properties-title">Properties</h2>
          </header>
          <div className="lars-properties__fields">
            <SegmentedControl
              className="lars-property--table-variant"
              label="Variant"
              onChange={(next) => setVariant(next as TableVariant)}
              options={[
                { label: 'Default', value: 'default' },
                { label: 'Compact', value: 'compact' },
                { label: 'Relaxed', value: 'relaxed' },
              ]}
              value={variant}
            />
            <InlineSlider
              continuous
              label="Rows"
              max={100}
              min={1}
              onValueChange={setRowCount}
              onValueCommit={(next) => startTransition(() => setCodeRowCount(next))}
              showTicks={false}
              step={1}
              value={rowCount}
            />
            <InlineSlider
              label="Columns"
              linearStops
              max={6}
              min={2}
              onValueChange={setColumnCount}
              step={1}
              stops={[3, 4, 5]}
              value={columnCount}
            />
            {variant !== 'relaxed' && (
              <TableToolbarProperties
                actions={toolbarActions}
                counter={toolbarCounter}
                floating={toolbarFloating}
                visible={toolbarVisible}
                onActionsChange={setToolbarActions}
                onCounterChange={setToolbarCounter}
                onFloatingChange={setToolbarFloating}
                onToggleChange={setToolbarToggle}
                onVisibleChange={(nextVisible) => {
                  setToolbarVisible(nextVisible)
                  if (!nextVisible) setActiveView('all')
                }}
                toggle={toolbarToggle}
              />
            )}
            {variant !== 'relaxed' && (
              <SegmentedControl
                label="Striped"
                onChange={(next) => setStriped(next === 'true')}
                options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
                value={striped ? 'true' : 'false'}
              />
            )}
            <SegmentedControl
              label="Multi-select"
              onChange={(next) => setSelectable(next === 'true')}
              options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
              value={selectable ? 'true' : 'false'}
            />
            <SegmentedControl
              label="Kebab"
              onChange={(next) => setShowActions(next === 'true')}
              options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
              value={showActions ? 'true' : 'false'}
            />
          </div>
        </aside>
      </div>
      <div className="lars-code-with-footnote">
        <MemoizedCodeBlock
          code={code}
          fileName="Table.tsx"
          label="Editable table usage code"
          onChange={handleTableCodeChange}
        />
        <aside className="lars-footnotes" aria-label="Notes">
          <p id="table-footnote-1" tabIndex={-1}>
            <sup>1</sup>
            <span>
              The floating toolbar was inspired by an iteration featured in{' '}
              <a href="https://www.youtube.com/watch?v=neE6wOuBIP8" target="_blank" rel="noreferrer">
                Kole Jain’s video
              </a>.
            </span>
          </p>
        </aside>
      </div>
    </>
  )
}

function TooltipShortcutProperties({
  onShortcutChange,
  onShortcutStyleChange,
  onShowShortcutChange,
  shortcut,
  shortcutStyle,
  showShortcut,
}: {
  onShortcutChange: (value: string) => void
  onShortcutStyleChange: (value: 'plain' | 'keycap') => void
  onShowShortcutChange: (value: boolean) => void
  shortcut: string
  shortcutStyle: 'plain' | 'keycap'
  showShortcut: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pointerFocus, setPointerFocus] = useState(false)
  const reduceMotion = useReducedMotion()
  const menuRef = usePropertyMenuFill(open)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupId = useId()
  const iconTransition = {
    duration: reduceMotion ? 0 : open ? 0.35 : 0.2,
    ease: [0.25, 0.1, 0.25, 1] as const,
  }

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="lars-tooltip-shortcut-property" data-open={open || undefined} ref={menuRef}>
      <BaseButton
        aria-controls={open ? popupId : undefined}
        aria-expanded={open}
        className="lars-tooltip-shortcut-property__trigger"
        data-pointer-focus={pointerFocus || undefined}
        onBlur={() => setPointerFocus(false)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') setPointerFocus(false)
        }}
        onPointerDown={() => setPointerFocus(true)}
        ref={triggerRef}
        type="button"
      >
        <span>Shortcut</span>
      </BaseButton>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            aria-label="Shortcut properties"
            animate={{ opacity: 1 }}
            className="lars-tooltip-shortcut-property__popup"
            exit={{
              opacity: 0,
              transition: { duration: reduceMotion ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] },
            }}
            id={popupId}
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            key="tooltip-shortcut-properties"
            role="group"
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="lars-tooltip-shortcut-property__options">
              <PropertySelect
                label="Show shortcut"
                onChange={(next) => onShowShortcutChange(next === 'on')}
                options={[{ label: 'Off', value: 'off' }, { label: 'On', value: 'on' }]}
                value={showShortcut ? 'on' : 'off'}
              />
              {showShortcut && (
                <>
                  <label className="lars-property lars-property--stacked">
                    <span>Shortcut</span>
                    <input value={shortcut} onChange={(event) => onShortcutChange(event.currentTarget.value)} />
                  </label>
                  <PropertySelect
                    label="Shortcut style"
                    onChange={onShortcutStyleChange}
                    options={[{ label: 'Plain', value: 'plain' }, { label: 'Keycap', value: 'keycap' }]}
                    value={shortcutStyle}
                  />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <svg
        aria-hidden="true"
        className="lars-tooltip-shortcut-property__icon"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        viewBox="0 0 16 16"
        width="16"
        height="16"
      >
        <motion.path
          animate={{ d: open ? 'M3.9 3.9L12.1 12.1' : 'M6.2 3.2L11 8' }}
          initial={false}
          transition={iconTransition}
        />
        <motion.path
          animate={{ d: open ? 'M12.1 3.9L3.9 12.1' : 'M11 8L6.2 12.8' }}
          initial={false}
          transition={iconTransition}
        />
      </svg>
    </div>
  )
}

function TooltipConfigurator() {
  const [anchor, setAnchor] = useState<'triangle' | 'none'>('triangle')
  const [highContrast, setHighContrast] = useState(false)
  const [label, setLabel] = useState('Export quality')
  const [description, setDescription] = useState('Higher quality creates a larger file.')
  const [content, setContent] = useState<'description' | 'compact'>('description')
  const [showShortcut, setShowShortcut] = useState(true)
  const [shortcut, setShortcut] = useState('⌘ E')
  const [shortcutStyle, setShortcutStyle] = useState<'plain' | 'keycap'>('plain')
  const [side, setSide] = useState<'top' | 'right' | 'bottom' | 'left'>('top')
  const code = `import { Tooltip } from 'larsui'
import 'larsui/style.css'

export function Example() {
  return (
    <p>
      Choose your <Tooltip${anchor === 'triangle' ? ' anchor' : ''}${highContrast ? ' highContrast' : ''} label=${JSON.stringify(label || 'Tooltip label')}${content === 'description'
        ? ` description=${JSON.stringify(description)}`
        : showShortcut ? ` shortcut=${JSON.stringify(shortcut)} shortcutStyle="${shortcutStyle}"` : ''}${side !== 'top' ? ` side="${side}"` : ''}>
        <button className="lars-tooltip-inline" type="button">export settings</button>
      </Tooltip> before downloading.
    </p>
  )
}`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas lars-stage--tooltip">
          <TooltipExample
            anchor={anchor === 'triangle'}
            description={content === 'description' ? description : undefined}
            highContrast={highContrast}
            label={label || 'Tooltip label'}
            shortcut={content === 'compact' && showShortcut ? shortcut : undefined}
            shortcutStyle={shortcutStyle}
            side={side}
          />
        </div>

        <aside className="lars-properties" aria-labelledby="tooltip-properties-title">
          <header className="lars-properties__header">
            <h2 id="tooltip-properties-title">Properties</h2>
          </header>
          <div className="lars-properties__fields">
            <PropertySelect
              label="Content"
              onChange={setContent}
              options={[{ label: 'Descriptive', value: 'description' }, { label: 'Compact', value: 'compact' }]}
              value={content}
            />
            <label className="lars-property lars-property--stacked">
              <span>Label</span>
              <input value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
            </label>
            {content === 'description' ? (
              <label className="lars-property lars-property--stacked">
                <span>Description</span>
                <input value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
              </label>
            ) : (
              <TooltipShortcutProperties
                onShortcutChange={setShortcut}
                onShortcutStyleChange={setShortcutStyle}
                onShowShortcutChange={setShowShortcut}
                shortcut={shortcut}
                shortcutStyle={shortcutStyle}
                showShortcut={showShortcut}
              />
            )}
            <PropertySelect
              label="Side"
              onChange={setSide}
              options={[
                { label: 'Top', value: 'top' },
                { label: 'Right', value: 'right' },
                { label: 'Bottom', value: 'bottom' },
                { label: 'Left', value: 'left' },
              ]}
              value={side}
            />
            <PropertySelect
              label="Anchor"
              onChange={setAnchor}
              options={[{ label: 'True', value: 'triangle' }, { label: 'False', value: 'none' }]}
              value={anchor}
            />
            <PropertySelect
              label="High Contrast"
              onChange={(next) => setHighContrast(next === 'on')}
              options={[{ label: 'Off', value: 'off' }, { label: 'On', value: 'on' }]}
              value={highContrast ? 'on' : 'off'}
            />
          </div>
        </aside>
      </div>
      <div className="lars-code-with-footnote">
        <CodeBlock code={code} fileName="Tooltip.tsx" label="Configured tooltip usage code" />
        <aside className="lars-footnotes" aria-label="Notes">
          <p id="tooltip-footnote-1" tabIndex={-1}>
            <sup>1</sup>
            <span>
              The keypad styling for tooltip shortcuts was inspired by{' '}
              <a href="https://x.com/eyexayuh/status/2103948734094520340" target="_blank" rel="noreferrer">
                this post by Isaiah (@eyexayuh)
              </a>.
            </span>
          </p>
        </aside>
      </div>
    </>
  )
}

const aiComposerSuggestions: readonly AiComposerSuggestion[] = [
  { id: 'card-limit', label: 'Raise the limit on the marketing card' },
  { id: 'invoices', label: 'What invoices are still outstanding?' },
  { id: 'runway', label: 'How long is my cash runway?' },
]

function AiComposerExample({ variant, size = 'default', mode, onModeChange, rotatePlaceholder = true, showModelDropdown = true, showModelSelector = true, showSuggestions = false }: { variant: AiComposerVariant; size?: AiComposerSize; mode?: AiComposerMode; onModeChange?: (mode: AiComposerMode) => void; rotatePlaceholder?: boolean; showModelDropdown?: boolean; showModelSelector?: boolean; showSuggestions?: boolean }) {
  const [message, setMessage] = useState('')

  return (
    <div className="lars-ai-example">
      <AiComposer
        key={variant}
        mode={mode}
        onModeChange={onModeChange}
        onValueChange={setMessage}
        rotatePlaceholder={rotatePlaceholder}
        size={size}
        showModelDropdown={showModelDropdown}
        showModelSelector={showModelSelector}
        showSuggestions={showSuggestions}
        suggestions={aiComposerSuggestions}
        value={message}
        variant={variant}
      />
    </div>
  )
}

function AiComposerStage() {
  const [variant, setVariant] = useState<AiComposerVariant>('structured')

  return (
    <div className="lars-stage lars-stage--ai-composer" data-variant={variant}>
      <div className="lars-ai-stage__content">
        <AiComposerExample key={variant} showModelDropdown={false} showSuggestions={false} variant={variant} />
        <LarsSegmentedControl
          className="lars-ai-stage__switch"
          label="Composer variant"
          onValueChange={(next) => setVariant(next as AiComposerVariant)}
          options={[{ label: 'Structured', value: 'structured' }, { label: 'Unstructured', value: 'unstructured' }]}
          value={variant}
        />
      </div>
    </div>
  )
}

function AiComposerDetail() {
  const [variant, setVariant] = useState<AiComposerVariant>('unstructured')
  const [size, setSize] = useState<AiComposerSize>('default')
  const [showMode, setShowMode] = useState(true)
  const [composerMode, setComposerMode] = useState<AiComposerMode>('plan')
  const [showModelSelection, setShowModelSelection] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [rotatePlaceholder, setRotatePlaceholder] = useState(true)
  const submitExample = size === 'small'
    ? showModelSelection
      ? 'onSubmit={({ message, files, model }) => sendMessage(message, files, model)}'
      : 'onSubmit={({ message, files }) => sendMessage(message, files)}'
    : 'onSubmit={({ message, files, model, mode }) => sendMessage(message, files, model, mode)}'
  const code = `import { AiComposer } from 'larsui'
import 'larsui/style.css'

${size === 'default' ? `const suggestions = [
  { id: 'card-limit', label: 'Raise the limit on the marketing card' },
  { id: 'invoices', label: 'What invoices are still outstanding?' },
  { id: 'runway', label: 'How long is my cash runway?' },
]\n` : ''}

<AiComposer
  variant="${variant}"
  size="${size}"
  rotatePlaceholder={${rotatePlaceholder}}
  showModelDropdown={${showModelSelection}}${size === 'default' ? `
  showModelSelector={${showMode}}${showMode ? `
  defaultMode="${composerMode}"` : ''}
  showSuggestions={${showSuggestions}}
  suggestions={suggestions}` : ''}
  ${submitExample}
/>`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas lars-component-canvas--ai-composer">
          <AiComposerExample key={variant} mode={composerMode} onModeChange={setComposerMode} rotatePlaceholder={rotatePlaceholder} showModelDropdown={showModelSelection} showModelSelector={showMode} showSuggestions={showSuggestions} size={size} variant={variant} />
        </div>
        <aside className="lars-properties" aria-labelledby="ai-composer-properties-title">
          <header className="lars-properties__header">
            <h2 id="ai-composer-properties-title">Properties</h2>
          </header>
          <div className="lars-properties__fields">
            <SegmentedControl
              label="Size"
              onChange={setSize}
              options={[
                { label: 'Default', value: 'default' },
                { label: 'Small', value: 'small' },
              ]}
              value={size}
            />
            <PropertySelect
              label="Variant"
              onChange={setVariant}
              options={[
                { label: 'Unstructured', value: 'unstructured' },
                { label: 'Structured', value: 'structured' },
              ]}
              value={variant}
            />
            <SegmentedControl
              label="Model selection"
              onChange={(next) => setShowModelSelection(next === 'true')}
              options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
              value={showModelSelection ? 'true' : 'false'}
            />
            {size === 'default' && (
              <>
                <SegmentedControl
                  label="Mode toggle"
                  onChange={(next) => setShowMode(next === 'true')}
                  options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
                  value={showMode ? 'true' : 'false'}
                />
                <SegmentedControl
                  label="Suggestions"
                  onChange={(next) => setShowSuggestions(next === 'true')}
                  options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
                  value={showSuggestions ? 'true' : 'false'}
                />
              </>
            )}
            <SegmentedControl
              label="Animating placeholder"
              onChange={(next) => setRotatePlaceholder(next === 'true')}
              options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
              value={rotatePlaceholder ? 'true' : 'false'}
            />
          </div>
        </aside>
      </div>
      <div className="lars-code-with-footnote">
        <MemoizedCodeBlock code={code} fileName="AiComposer.tsx" label="AI Composer usage code" />
        <aside className="lars-footnotes" aria-label="Notes">
          <p id="ai-composer-footnote-1" tabIndex={-1}>
            <sup>1</sup>
            <span>
              “Shuffle suggestions 🎲” — the suggestions feature was inspired by{' '}
              <a href="https://x.com/timothymaarv/status/2104489312670867896" target="_blank" rel="noreferrer">
                Timothy M. (@timothymaarv)’s post
              </a>.
            </span>
          </p>
          <p id="ai-composer-footnote-2" tabIndex={-1}>
            <sup>2</sup>
            <span>
              “Here's how an AI input actually works, layer by layer.” The composer’s overall structure, features, and requirements were informed by{' '}
              <a href="https://ibelick.com/anatomy-ai-input" target="_blank" rel="noreferrer">
                Julien Thibeaut’s article, Anatomy of AI Input
              </a>.
            </span>
          </p>
        </aside>
      </div>
    </>
  )
}

const HOME_COMPONENTS = [
  { route: 'inline-slider', title: 'Inline Slider', description: 'Adjust values directly in context without interrupting the workflow.', keywords: 'range slider drag values input', Stage: SliderStage },
  { route: 'buttons', title: 'Buttons', description: 'A foundational element for interacting with any interface.', keywords: 'button click action', Stage: ButtonStage },
  { route: 'chip', title: 'Chip', description: 'A compact label for statuses, categories, and concise metadata.', keywords: 'chips tag status badge', Stage: ChipStage },
  { route: 'segmented-control', title: 'Segmented Control', description: 'Choose one view from a compact set of related options.', keywords: 'segments tabs toggle options', Stage: SegmentedControlStage },
  { route: 'tooltip', title: 'Tooltip', description: 'A quiet hint that appears from an inline action.', keywords: 'tooltips hover hint shortcut', Stage: TooltipStage },
  { route: 'table', title: 'Table', description: 'Organise dense information into clear, selectable rows.', keywords: 'data columns filters selection', Stage: TableStage },
  { route: 'ai-composer', title: 'AI Composer', description: 'Two compact ways to compose: an open prompt or a framed one.', keywords: 'ai chat prompt composer attachments models', Stage: AiComposerStage },
] as const

function HomePage({
  theme,
  onToggleTheme,
  searchFocusRequest,
}: {
  theme: Theme
  onToggleTheme: () => void
  searchFocusRequest: number
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchFocusRing, setShowSearchFocusRing] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchFocusViaKeyboardRef = useRef(false)
  const searchShortcut = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K'
  const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const isSearching = searchTerms.length > 0
  const visibleComponents = isSearching
    ? HOME_COMPONENTS.filter(({ title, description, keywords }) => {
        const searchable = `${title} ${description} ${keywords}`.toLowerCase()
        return searchTerms.every((term) => searchable.includes(term))
      })
    : HOME_COMPONENTS

  useEffect(() => {
    const trackTabNavigation = (event: KeyboardEvent) => {
      if (event.key === 'Tab') searchFocusViaKeyboardRef.current = true
    }
    window.addEventListener('keydown', trackTabNavigation, true)
    return () => window.removeEventListener('keydown', trackTabNavigation, true)
  }, [])

  useEffect(() => {
    if (searchFocusRequest === 0) return
    searchFocusViaKeyboardRef.current = true
    setShowSearchFocusRing(true)
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [searchFocusRequest])

  return (
    <div className="lars-shell" data-searching={isSearching || undefined} id="top">
      <header className="lars-header">
        <a className="lars-logo" href="#top" aria-label="LarsUI home">
          <span aria-hidden="true" className="lars-nav-icon lars-nav-icon--mark" />
        </a>
        <nav className="lars-header__actions" aria-label="Primary navigation">
          <form
            className="lars-header__search"
            data-has-query={searchQuery.length > 0 || undefined}
            data-keyboard-focus={showSearchFocusRing || undefined}
            onPointerDownCapture={() => {
              searchFocusViaKeyboardRef.current = false
              setShowSearchFocusRing(false)
            }}
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              if (isSearching && visibleComponents[0]) window.location.hash = `#/components/${visibleComponents[0].route}`
            }}
          >
            <span aria-hidden="true" className="lars-nav-icon lars-nav-icon--search" />
            <input
              aria-keyshortcuts="Meta+K Control+K"
              aria-label="Search components"
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              onBlur={() => setShowSearchFocusRing(false)}
              onFocus={() => setShowSearchFocusRing(searchFocusViaKeyboardRef.current)}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                event.preventDefault()
                if (searchQuery) setSearchQuery('')
                else event.currentTarget.blur()
              }}
              placeholder="Search library"
              ref={searchInputRef}
              type="search"
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <button
                aria-label="Clear search"
                className="lars-header__clear"
                onClick={() => {
                  setSearchQuery('')
                  searchInputRef.current?.focus()
                }}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" fill="none">
                  <path d="M2.75 2.75 9.25 9.25M9.25 2.75 2.75 9.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <kbd aria-hidden="true">{searchShortcut}</kbd>
          </form>
          <span aria-hidden="true" className="lars-header__divider" />
          <a className="lars-github" href="https://github.com/samlimby/LarsUI" target="_blank" rel="noreferrer" aria-label="GitHub">
            <span aria-hidden="true" className="lars-nav-icon lars-nav-icon--github" />
          </a>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </nav>
      </header>

      {isSearching ? (
        <section className="lars-search-results" aria-labelledby="search-results-title">
          <div className="lars-search-results__intro">
            <h1 id="search-results-title">Search results</h1>
            <p>
              {visibleComponents.length} {visibleComponents.length === 1 ? 'component' : 'components'} for “{searchQuery.trim()}”
            </p>
            <span className="visually-hidden" role="status">
              {visibleComponents.length} matching {visibleComponents.length === 1 ? 'component' : 'components'}
            </span>
          </div>
          <div className="lars-divider" />
          {visibleComponents.length === 0 && (
            <p className="lars-search-results__empty">No matching components. Try a different name or keyword.</p>
          )}
        </section>
      ) : (
        <section className="lars-hero">
          <div className="lars-hero__content">
            <h1>LarsUI is a thoughtfully crafted library of React components, originally built as a personal collection and now open for everyone to use.</h1>
            <InstallCommand />
          </div>
          <div className="lars-divider" />
        </section>
      )}

      {visibleComponents.map(({ route, title, description, Stage }) => (
        <section
          className={`lars-showcase${route === 'inline-slider' ? '' : ` lars-showcase--${route}`}`}
          aria-labelledby={`${route}-title`}
          key={route}
        >
          <Stage />
          <div className="lars-showcase__meta">
            <div className="lars-showcase__copy">
              <h2 id={`${route}-title`}>{title}</h2>
              <p>{description}</p>
            </div>
            <a className="lars-view" href={`#/components/${route}`}>View</a>
          </div>
        </section>
      ))}

      <footer className="lars-footer">
        <span>
          Made by{' '}
          <a
            className="lars-footer__author"
            href="https://www.samlimby.com"
            rel="noreferrer"
            target="_blank"
          >
            Sam Limby
          </a>
        </span>
        <div className="lars-footer__links">
          <a href="mailto:samlimby2@gmail.com">Feedback</a>
          <span aria-hidden="true">•</span>
          <span>Updated Sep 2026</span>
        </div>
      </footer>
    </div>
  )
}

function ComponentPage({
  component,
  theme,
  onToggleTheme,
}: {
  component: ComponentRoute
  theme: Theme
  onToggleTheme: () => void
}) {
  const details: Record<ComponentRoute, { description: string; title: string }> = {
    'inline-slider': {
      description: 'Adjust values directly in context without interrupting the workflow.',
      title: 'Inline Slider',
    },
    buttons: {
      description: 'A foundational element for interacting with any interface.',
      title: 'Buttons',
    },
    chip: {
      description: 'A compact label for statuses, categories, and concise metadata.',
      title: 'Chip',
    },
    'segmented-control': {
      description: 'Choose one view from a compact set of related options.',
      title: 'Segmented Control',
    },
    table: {
      description: 'Organise dense information into clear, selectable rows.',
      title: 'Table',
    },
    tooltip: {
      description: 'A quiet hint that appears from an inline action.',
      title: 'Tooltip',
    },
    'ai-composer': {
      description: 'Compose in an open or framed prompt with file attachments.',
      title: 'AI Composer',
    },
  }
  const { description, title } = details[component]
  const reduceMotion = useReducedMotion()
  const footnoteIds = component === 'ai-composer'
    ? ['ai-composer-footnote-1', 'ai-composer-footnote-2']
    : component === 'buttons'
      ? ['button-footnote-1']
      : component === 'chip'
        ? ['chip-footnote-1']
        : component === 'table'
          ? ['table-footnote-1']
          : component === 'tooltip'
            ? ['tooltip-footnote-1']
            : []

  const scrollToFootnote = (footnoteId: string) => {
    const footnote = document.getElementById(footnoteId)
    if (!footnote) return
    footnote.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    footnote.focus({ preventScroll: true })
  }

  return (
    <div className="lars-shell lars-detail-shell">
      <header className="lars-detail-header">
        <nav className="lars-breadcrumbs" aria-label="Breadcrumb">
          <a href="#top">Components</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      <section className="lars-detail" aria-labelledby="component-detail-title">
        <header className="lars-detail__intro">
          <div className="lars-detail__title">
            <h1 id="component-detail-title">{title}</h1>
            {footnoteIds.length > 0 && (
              <sup>
                {footnoteIds.map((footnoteId, index) => (
                  <a
                    aria-label={`Read note ${index + 1}`}
                    href={`#${footnoteId}`}
                    key={footnoteId}
                    onClick={(event) => {
                      event.preventDefault()
                      scrollToFootnote(footnoteId)
                    }}
                  >
                    {index > 0 ? ', ' : ''}{index + 1}
                  </a>
                ))}
              </sup>
            )}
          </div>
          <p>{description}</p>
        </header>

        {component === 'inline-slider' && <SliderConfigurator />}
        {component === 'buttons' && <ButtonConfigurator />}
        {component === 'chip' && <ChipConfigurator />}
        {component === 'segmented-control' && <SegmentedControlConfigurator />}
        {component === 'table' && <TableConfigurator />}
        {component === 'tooltip' && <TooltipConfigurator />}
        {component === 'ai-composer' && <AiComposerDetail />}
      </section>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [searchFocusRequest, setSearchFocusRequest] = useState(0)
  const [navigation, setNavigation] = useState<{ direction: NavigationDirection; route: Route }>(() => ({
    direction: 0,
    route: getRouteFromHash(),
  }))
  const reduceMotion = useReducedMotion()
  const { direction, route } = navigation

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.shiftKey) return
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setSearchFocusRequest((current) => current + 1)
      if (getRouteFromHash() !== 'home') window.location.hash = '#top'
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = getRouteFromHash()
      setNavigation((current) => {
        if (current.route === nextRoute) return current
        const nextDirection: NavigationDirection = current.route === 'home'
          ? 1
          : nextRoute === 'home'
            ? -1
            : 0
        return { direction: nextDirection, route: nextRoute }
      })
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try {
      window.localStorage.setItem('lars-theme', theme)
    } catch {
      // The toggle still works for the current session without persistence.
    }
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light')
  const routeVariants = {
    enter: (travel: NavigationDirection) => ({
      opacity: 0,
      transform: reduceMotion ? 'translate3d(0, 0, 0)' : `translate3d(${travel * 8}px, 0, 0)`,
    }),
    center: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
      transition: reduceMotion
        ? { duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] as const }
        : {
            opacity: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] as const },
            transform: { duration: 0.24, ease: [0.19, 1, 0.22, 1] as const },
          },
    },
    exit: (travel: NavigationDirection) => ({
      opacity: 0,
      transform: reduceMotion ? 'translate3d(0, 0, 0)' : `translate3d(${travel * -6}px, 0, 0)`,
      transition: {
        duration: reduceMotion ? 0.12 : 0.16,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    }),
  }

  return (
    <main className="lars-page" data-theme={theme}>
      <AnimatePresence custom={direction} initial={false} mode="wait">
        <motion.div
          animate="center"
          className="lars-route-view"
          custom={direction}
          exit="exit"
          initial="enter"
          key={route}
          variants={routeVariants}
        >
          {route === 'home' ? (
            <HomePage theme={theme} onToggleTheme={toggleTheme} searchFocusRequest={searchFocusRequest} />
          ) : (
            <ComponentPage component={route} theme={theme} onToggleTheme={toggleTheme} />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
