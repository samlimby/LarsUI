import { Button as BaseButton } from '@base-ui/react/button'
import { Select } from '@base-ui/react/select'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { Button, type ButtonShape, type ButtonVariant } from './components/Button'
import {
  Chip,
  type ChipIconPosition,
  type ChipSize,
  type ChipTypeface,
  type ChipVariant,
} from './components/Chip'
import { InlineSlider, type InlineSliderSize } from './components/InlineSlider'
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
  { label: 'Small · 12px', value: 'small' },
  { label: 'Medium · 14px', value: 'medium' },
  { label: 'Large · 16px', value: 'large' },
]
type Theme = 'light' | 'dark'
type ComponentRoute = 'inline-slider' | 'buttons' | 'chip'
type Route = 'home' | ComponentRoute
type NavigationDirection = -1 | 0 | 1

function getRouteFromHash(): Route {
  if (typeof window === 'undefined') return 'home'
  if (window.location.hash === '#/components/inline-slider') return 'inline-slider'
  if (window.location.hash === '#/components/buttons') return 'buttons'
  if (window.location.hash === '#/components/chip') return 'chip'
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

function LarsMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
      <path d="M13.2 2.4c-.769 0-1.504.304-2.048.847l-7.905 7.905A2.89 2.89 0 0 0 2.4 13.2c0 .457.109.904.307 1.301L14.501 2.707A2.89 2.89 0 0 0 13.2 2.4Zm-2.4 19.2c.769 0 1.504-.304 2.047-.848l7.905-7.905A2.89 2.89 0 0 0 21.6 10.8c0-.458-.109-.904-.308-1.301L9.499 21.292c.401.203.847.308 1.301.308Zm8.722-12.878a3 3 0 0 0-4.241-4.241l-10.8 10.8a3 3 0 1 0 4.241 4.241l10.8-10.8Z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path d="M12 2.4c.883 0 1.6.717 1.6 1.6v8c0 .883-.717 1.6-1.6 1.6H4A1.6 1.6 0 0 1 2.4 12V4A1.6 1.6 0 0 1 4 2.4h8ZM7.993 4C5.783 4 4 5.805 4 8.015c0 1.735 1.103 3.172 2.585 3.71.21.078.415-.062.415-.272v-.626a.96.96 0 0 1-.375.078c-.515 0-.82-.28-1.04-.805-.085-.21-.18-.335-.36-.36-.092-.007-.125-.047-.125-.095 0-.092.155-.165.313-.165.227 0 .422.14.624.43.156.227.32.327.516.327.194 0 .32-.07.5-.25.132-.132.234-.25.327-.327-1.033-.125-1.757-.867-1.757-1.827 0-.39.14-.813.374-1.096-.102-.257-.084-.804.03-1.03.313-.04.736.126.986.353.297-.093.61-.14.992-.14.382 0 .695.047.978.133.242-.22.672-.383.984-.346.11.21.126.758.023 1.023.25.297.383.695.383 1.103 0 .96-.728 1.687-1.773 1.82.265.172.445.547.445.977v.813c0 .234.195.367.43.272 1.415-.54 2.522-1.952 2.522-3.702 0-2.21-1.797-4.016-4.007-4.016L7.993 4Z" />
    </svg>
  )
}

function ThemeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path d="M12.8 8A4.8 4.8 0 0 0 8 3.2v9.6A4.8 4.8 0 0 0 12.8 8ZM1.6 8A6.4 6.4 0 1 1 8 14.4 6.4 6.4 0 0 1 1.6 8Z" />
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
      <ThemeIcon />
    </BaseButton>
  )
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size}>
      <path d="M8.8 12.8H3.2V7.2h1.2V5.6H3.2a1.6 1.6 0 0 0-1.6 1.6v5.6a1.6 1.6 0 0 0 1.6 1.6h5.6a1.6 1.6 0 0 0 1.6-1.6v-1.2H8.8v1.2Zm-1.6-2.4h5.6a1.6 1.6 0 0 0 1.6-1.6V3.2a1.6 1.6 0 0 0-1.6-1.6H7.2a1.6 1.6 0 0 0-1.6 1.6v5.6a1.6 1.6 0 0 0 1.6 1.6Z" />
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

  async function copyInstallCommand() {
    try {
      await navigator.clipboard.writeText('npm install larsui')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage">
      <BaseButton className="lars-copy" type="button" onClick={copyInstallCommand} aria-label="Copy install command">
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
    >
      {BUTTON_VARIANTS.map((variant) => (
        <Button
          aria-label={`${variant} button`}
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

  async function copyInstallCommand() {
    try {
      await navigator.clipboard.writeText('npm install larsui')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage">
      <BaseButton className="lars-copy" type="button" onClick={copyInstallCommand} aria-label="Copy install command">
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

  async function copyInstallCommand() {
    try {
      await navigator.clipboard.writeText('npm install larsui')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="lars-stage lars-stage--chip">
      <BaseButton className="lars-copy" type="button" onClick={copyInstallCommand} aria-label="Copy install command">
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
            <code>{highlightTsx(draft)}</code>
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
          <code>{highlightTsx(code)}</code>
        </pre>
      )}
    </section>
  )
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
}) {
  const controlId = useId()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="lars-property lars-property--segmented">
      <span>{label}</span>
      <div className="lars-segments" role="group" aria-label={label}>
        <LayoutGroup id={controlId}>
          {options.map((option) => {
            const isActive = value === option.value

            return (
              <BaseButton
                aria-pressed={isActive}
                className={isActive ? 'is-active' : ''}
                key={option.value}
                onClick={() => onChange(option.value)}
                type="button"
              >
                {isActive && (
                  <motion.span
                    className="lars-segments__indicator"
                    initial={false}
                    layoutId={`${controlId}-active-segment`}
                    style={{ borderRadius: 999 }}
                    transition={prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', duration: 0.32, bounce: 0 }}
                  />
                )}
                <span className="lars-segments__label">{option.label}</span>
              </BaseButton>
            )
          })}
        </LayoutGroup>
      </div>
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

function PropertySelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
}) {
  const menuOptions = options.filter((option) => option.value !== value)

  return (
    <div className="lars-property lars-property--stacked lars-property-select">
      <Select.Root
        items={[...options]}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onChange(nextValue)
        }}
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
            sideOffset={8}
          >
            <Select.Popup className="lars-property-select__popup">
              <Select.List className="lars-property-select__list">
                {menuOptions.map((option, index) => (
                  <Fragment key={option.value}>
                    {index > 0 && <Select.Separator className="lars-property-select__separator" />}
                    <Select.Item className="lars-property-select__item" value={option.value}>
                      <Select.ItemText>{option.label}</Select.ItemText>
                    </Select.Item>
                  </Fragment>
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

function ButtonConfigurator() {
  const [label, setLabel] = useState('View')
  const [variant, setVariant] = useState<ButtonVariant>('primary')
  const [icon, setIcon] = useState<'true' | 'false'>('false')
  const [iconOnly, setIconOnly] = useState(false)
  const [shape, setShape] = useState<ButtonShape>('full')
  const [disabled, setDisabled] = useState(false)
  const reduceMotion = useReducedMotion()
  const buttonLabel = label || 'Button'

  const code = `import { Button } from 'larsui'
import 'larsui/style.css'

<Button
${iconOnly ? `  aria-label=${JSON.stringify(buttonLabel)}
` : ''}  variant="${variant}"
  shape="${shape}"${iconOnly ? '\n  iconOnly' : ''}${disabled ? '\n  disabled' : ''}
>
  ${iconOnly ? '<span aria-hidden="true">→</span>' : `${buttonLabel}${icon === 'true' ? '\n  <span aria-hidden="true">→</span>' : ''}`}
</Button>`

  return (
    <>
      <div className="lars-configurator">
        <div className="lars-stage lars-component-canvas">
          <Button
            aria-label={iconOnly ? buttonLabel : undefined}
            className={!iconOnly && icon === 'true' ? 'lars-button--with-icon' : ''}
            disabled={disabled}
            iconOnly={iconOnly}
            shape={shape}
            variant={variant}
          >
            {iconOnly ? (
              <span aria-hidden="true">→</span>
            ) : (
              <>
                {buttonLabel}
                {icon === 'true' && <span aria-hidden="true">→</span>}
              </>
            )}
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

            <SegmentedControl
              label="Icon Only"
              onChange={(value) => setIconOnly(value === 'true')}
              options={[{ label: 'False', value: 'false' }, { label: 'True', value: 'true' }]}
              value={iconOnly ? 'true' : 'false'}
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
                  key="button-label-and-icon"
                  transition={{ duration: reduceMotion ? 0.14 : 0.18, ease: [0.19, 1, 0.22, 1] }}
                >
                  <label className="lars-property lars-property--stacked">
                    <span>Label</span>
                    <input value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
                  </label>

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
                options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
                value={disabled ? 'true' : 'false'}
              />
            </motion.div>
          </div>
        </aside>
      </div>

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

function HomePage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <div className="lars-shell">
      <header className="lars-header">
        <a className="lars-logo" href="#top" aria-label="LarsUI home"><LarsMark /></a>
        <nav className="lars-header__actions" aria-label="Project links">
          <a className="lars-github" href="https://github.com/samlimby/LarsUI" target="_blank" rel="noreferrer">
            <GitHubIcon />
            <span>Github</span>
          </a>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </nav>
      </header>

      <section className="lars-hero" id="top">
        <div className="lars-hero__content">
          <h1>LarsUI is a thoughtfully crafted library of React components, originally built as a personal collection and now open for everyone to use.</h1>
          <InstallCommand />
        </div>
        <div className="lars-divider" />
      </section>

      <section className="lars-showcase" aria-labelledby="inline-slider-title">
        <SliderStage />

        <div className="lars-showcase__meta">
          <div className="lars-showcase__copy">
            <h2 id="inline-slider-title">Inline Slider</h2>
            <p>Adjust values directly in context without interrupting the workflow.</p>
          </div>
          <a className="lars-view" href="#/components/inline-slider">View</a>
        </div>
      </section>

      <section className="lars-showcase lars-showcase--buttons" aria-labelledby="buttons-title">
        <ButtonStage />

        <div className="lars-showcase__meta">
          <div className="lars-showcase__copy">
            <h2 id="buttons-title">Buttons</h2>
            <p>A foundational element for interacting with any interface.</p>
          </div>
          <a className="lars-view" href="#/components/buttons">View</a>
        </div>
      </section>

      <section className="lars-showcase lars-showcase--chip" aria-labelledby="chip-title">
        <ChipStage />

        <div className="lars-showcase__meta">
          <div className="lars-showcase__copy">
            <h2 id="chip-title">Chip</h2>
            <p>A compact label for statuses, categories, and concise metadata.</p>
          </div>
          <a className="lars-view" href="#/components/chip">View</a>
        </div>
      </section>

      <footer className="lars-footer">
        <span>Made by Sam Limby</span>
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
  }
  const { description, title } = details[component]
  const reduceMotion = useReducedMotion()

  const scrollToChipFootnote = () => {
    const footnote = document.getElementById('chip-footnote-1')
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
          <h1 id="component-detail-title">
            {title}
            {component === 'chip' && (
              <sup>
                <a
                  aria-label="Read note 1"
                  href="#chip-footnote-1"
                  onClick={(event) => {
                    event.preventDefault()
                    scrollToChipFootnote()
                  }}
                >
                  1
                </a>
              </sup>
            )}
          </h1>
          <p>{description}</p>
        </header>

        {component === 'inline-slider' && <SliderConfigurator />}
        {component === 'buttons' && <ButtonConfigurator />}
        {component === 'chip' && <ChipConfigurator />}
      </section>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [navigation, setNavigation] = useState<{ direction: NavigationDirection; route: Route }>(() => ({
    direction: 0,
    route: getRouteFromHash(),
  }))
  const reduceMotion = useReducedMotion()
  const { direction, route } = navigation

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
            <HomePage theme={theme} onToggleTheme={toggleTheme} />
          ) : (
            <ComponentPage component={route} theme={theme} onToggleTheme={toggleTheme} />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
