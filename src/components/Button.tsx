import { Button as BaseButton } from '@base-ui/react/button'
import { Atom, Blocks, Classic, Clock, Flip, Gather, Loading, Morph, Ring, Slide, Swirl, Trace } from 'loading-dev'
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactElement } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export type ButtonShape = 'full' | 'neat'
export type ButtonSize = 'medium' | 'large'
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

const VISUAL_TRANSITION_MS = 180

type ButtonLayout = {
  loading: boolean
  iconOnly: boolean
  width: number
  paddingLeft: string
  paddingRight: string
  anchorOffset: number | null
}

export type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
  className?: string
  /** Use the opposite of the page or system color theme. Defaults to false. */
  highContrast?: boolean
  iconOnly?: boolean
  /** Keeps focus on the button while preventing another action or form submit. */
  loading?: boolean
  /** Visible and announced loading label. */
  loadingText?: string
  shape?: ButtonShape
  /** Medium is 32px tall; Large is 44px tall with 20px icons and 12px vertical padding. */
  size?: ButtonSize
  /** A loading-dev effect name or a custom indicator. */
  spinner?: ButtonSpinner | ReactElement
  variant?: ButtonVariant
}

export function Button({
  'aria-busy': ariaBusy,
  'aria-disabled': ariaDisabled,
  children,
  className = '',
  highContrast = false,
  iconOnly = false,
  loading = false,
  loadingText = 'Loading',
  onClick,
  onKeyDown,
  shape = 'full',
  size = 'medium',
  spinner = 'ring',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const Spinner = typeof spinner === 'string' ? SPINNERS[spinner] : null
  const statusText = `${loadingText}${typeof children === 'string' ? ` ${children}` : ''}`
  const [retainSpinner, setRetainSpinner] = useState(loading)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousLayout = useRef<ButtonLayout | null>(null)
  const widthAnimation = useRef<Animation | null>(null)
  const contentAnimation = useRef<Animation | null>(null)

  useLayoutEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const previous = previousLayout.current
    const loadingChanged = previous !== null && previous.loading !== loading
    const iconOnlyChanged = previous !== null && previous.iconOnly !== iconOnly
    const layoutChanged = loadingChanged || iconOnlyChanged
    const widthWasAnimating = widthAnimation.current?.playState === 'running'
    const contentWasAnimating = contentAnimation.current?.playState === 'running'
    const content = button.querySelector<HTMLElement>(loading ? '.lars-button__status' : '.lars-button__idle')
    const anchor = content?.querySelector<HTMLElement | SVGElement>(loading
      ? '.lars-button__spinner'
      : ':scope > svg, :scope > [aria-hidden="true"]:not(.lars-button__label)')
    const currentWidth = button.getBoundingClientRect().width
    const currentStyle = window.getComputedStyle(button)
    const paddingBeforeChange = widthWasAnimating
      ? { left: currentStyle.paddingLeft, right: currentStyle.paddingRight }
      : { left: previous?.paddingLeft, right: previous?.paddingRight }
    const currentTransform = contentWasAnimating && content ? window.getComputedStyle(content).transform : 'none'
    const currentTranslation = currentTransform === 'none' ? 0 : new DOMMatrixReadOnly(currentTransform).m41
    const anchorBeforeChange = previous?.anchorOffset == null ? null : previous.anchorOffset + currentTranslation
    if (layoutChanged) {
      widthAnimation.current?.cancel()
      contentAnimation.current?.cancel()
    }
    const nextBounds = button.getBoundingClientRect()
    const nextWidth = nextBounds.width
    const nextStyle = window.getComputedStyle(button)
    const paddingLeft = nextStyle.paddingLeft
    const paddingRight = nextStyle.paddingRight
    const anchorBounds = anchor?.getBoundingClientRect()
    const nextAnchorOffset = anchorBounds ? anchorBounds.x + anchorBounds.width / 2 - (nextBounds.x + nextWidth / 2) : null
    const widthBeforeChange = widthWasAnimating ? currentWidth : previous?.width
    if (!layoutChanged && (widthWasAnimating || contentWasAnimating)) return
    previousLayout.current = { loading, iconOnly, width: nextWidth, paddingLeft, paddingRight, anchorOffset: nextAnchorOffset }

    if (!layoutChanged || widthBeforeChange == null || typeof button.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timing = { duration: VISUAL_TRANSITION_MS, easing: 'ease-in-out' }
    if (Math.abs(nextWidth - widthBeforeChange) >= 1 || paddingBeforeChange.left !== paddingLeft || paddingBeforeChange.right !== paddingRight) {
      // Padding and min-width must not force the button wider than its starting width.
      widthAnimation.current = button.animate(
        [
          { width: `${widthBeforeChange}px`, minWidth: 0, paddingLeft: paddingBeforeChange.left, paddingRight: paddingBeforeChange.right },
          { width: `${nextWidth}px`, minWidth: 0, paddingLeft, paddingRight },
        ],
        timing,
      )
    }
    if (iconOnlyChanged && !loadingChanged && content && anchorBeforeChange !== null && nextAnchorOffset !== null) {
      // Keep the icon at its previous visual position while the surrounding content reflows.
      const distance = anchorBeforeChange - nextAnchorOffset
      if (Math.abs(distance) >= 1) {
        contentAnimation.current = content.animate(
          [{ transform: `translateX(${distance}px)` }, { transform: 'translateX(0)' }],
          timing,
        )
      }
    }
  })

  useEffect(() => () => {
    widthAnimation.current?.cancel()
    contentAnimation.current?.cancel()
  }, [])

  useEffect(() => {
    if (loading) {
      setRetainSpinner(true)
      return
    }
    if (!retainSpinner) return
    const timeout = window.setTimeout(() => setRetainSpinner(false), VISUAL_TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [loading, retainSpinner])

  return (
    <>
      <BaseButton
        ref={buttonRef}
        aria-busy={loading || ariaBusy}
        aria-disabled={loading || ariaDisabled}
        className={`lars-button lars-button--${variant} lars-button--${shape} lars-button--${size}${highContrast ? ' lars-button--high-contrast' : ''}${iconOnly ? ' lars-button--icon-only' : ''}${loading ? ' lars-button--loading' : ''}${retainSpinner ? ' lars-button--retaining-spinner' : ''}${className ? ` ${className}` : ''}`}
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
            {loading || retainSpinner ? Spinner ? <Spinner size={size === 'large' ? 20 : 16} /> : spinner : null}
          </span>
          <span className="lars-button__spinner-static" aria-hidden="true" />
          <span aria-hidden={iconOnly || undefined} className="lars-button__label">{loadingText}</span>
        </span>
      </BaseButton>
      <span className="lars-button__announcement" role="status">{loading ? statusText : ''}</span>
    </>
  )
}
