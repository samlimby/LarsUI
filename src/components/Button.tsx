import { Button as BaseButton } from '@base-ui/react/button'
import { Atom, Blocks, Classic, Clock, Flip, Gather, Loading, Morph, Ring, Slide, Swirl, Trace } from 'loading-dev'
import { useEffect, useState, type ComponentProps, type ReactElement } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export type ButtonShape = 'full' | 'neat'
export type ButtonSpinner = 'atom' | 'blocks' | 'classic' | 'clock' | 'flip' | 'gather' | 'loading' | 'morph' | 'ring' | 'slide' | 'swirl' | 'trace'

const SPINNERS = {
  atom: Atom,
  blocks: Blocks,
  classic: Classic,
  clock: Clock,
  flip: Flip,
  gather: Gather,
  loading: Loading,
  morph: Morph,
  ring: Ring,
  slide: Slide,
  swirl: Swirl,
  trace: Trace,
}

export type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
  className?: string
  iconOnly?: boolean
  /** Keeps focus on the button while preventing another action or form submit. */
  loading?: boolean
  /** Visible and announced loading label. */
  loadingText?: string
  shape?: ButtonShape
  /** A loading-dev effect name or a custom indicator. */
  spinner?: ButtonSpinner | ReactElement
  variant?: ButtonVariant
}

export function Button({
  'aria-busy': ariaBusy,
  'aria-disabled': ariaDisabled,
  children,
  className = '',
  iconOnly = false,
  loading = false,
  loadingText = 'Loading',
  onClick,
  onKeyDown,
  shape = 'full',
  spinner = 'ring',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const Spinner = typeof spinner === 'string' ? SPINNERS[spinner] : null
  const statusText = `${loadingText}${typeof children === 'string' ? ` ${children}` : ''}`
  const [retainSpinner, setRetainSpinner] = useState(loading)

  useEffect(() => {
    if (loading) {
      setRetainSpinner(true)
      return
    }
    if (!retainSpinner) return
    const timeout = window.setTimeout(() => setRetainSpinner(false), 160)
    return () => window.clearTimeout(timeout)
  }, [loading, retainSpinner])

  return (
    <>
      <BaseButton
        aria-busy={loading || ariaBusy}
        aria-disabled={loading || ariaDisabled}
        className={`lars-button lars-button--${variant} lars-button--${shape}${iconOnly ? ' lars-button--icon-only' : ''}${loading ? ' lars-button--loading' : ''}${className ? ` ${className}` : ''}`}
        onClick={(event) => {
          if (loading) {
            event.preventDefault()
            event.stopPropagation()
            return
          }
          onClick?.(event)
        }}
        onKeyDown={(event) => {
          if (loading && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            return
          }
          onKeyDown?.(event)
        }}
        {...props}
      >
        <span aria-hidden={loading || undefined} className="lars-button__idle">{children}</span>
        <span aria-hidden={!loading || undefined} className="lars-button__status">
          <span className="lars-button__spinner" aria-hidden="true">
            {loading || retainSpinner ? Spinner ? <Spinner size={16} /> : spinner : null}
          </span>
          <span className="lars-button__spinner-static" aria-hidden="true" />
          {!iconOnly && <span>{loadingText}</span>}
        </span>
      </BaseButton>
      <span className="lars-button__announcement" role="status">{loading ? statusText : ''}</span>
    </>
  )
}
