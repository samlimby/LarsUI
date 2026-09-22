import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react'
import './Chip.css'

export type ChipVariant = 'neutral' | 'default' | 'warning' | 'positive' | 'error'
export type ChipIconPosition = 'none' | 'start' | 'end'
export type ChipSize = 'small' | 'medium' | 'large'
export type ChipTypeface = 'monospace' | 'sans-serif'

export type ChipProps = ComponentProps<'span'> & {
  burst?: boolean
  icon?: ReactNode
  iconPosition?: ChipIconPosition
  size?: ChipSize
  typeface?: ChipTypeface
  variant?: ChipVariant
}

type BurstParticle = {
  delay: number
  rotate: number
  startX: number
  startY: number
  x: number
  y: number
}

type BurstInstance = {
  id: number
  particles: BurstParticle[]
  variant: ChipVariant
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const BURST_EMOJIS: Record<ChipVariant, readonly string[]> = {
  neutral: ['😶', '💭', '⚪️', '✨'],
  default: ['ℹ️', '💙', '🫧', '✨'],
  warning: ['⚠️', '😮', '🔥', '🟠'],
  positive: ['😊', '🎉', '💚', '✨', '🙌'],
  error: ['😡', '💩', '💥', '❌'],
}

function createBurstParticles(width: number, height: number): BurstParticle[] {
  const particleCount = 8
  const angleStep = (Math.PI * 2) / particleCount
  const angleOffset = Math.random() * angleStep
  const halfWidth = Math.max(width / 2, 1)
  const halfHeight = Math.max(height / 2, 1)
  const sizeScale = Math.max(.9, Math.min(1.45, height / 26))

  return Array.from({ length: particleCount }, (_, index) => {
    const angleJitter = (Math.random() - .5) * .42
    const angle = angleOffset + index * angleStep + angleJitter
    const directionX = Math.cos(angle)
    const directionY = Math.sin(angle)
    const edgeDistance = Math.min(
      halfWidth / Math.max(Math.abs(directionX), .001),
      halfHeight / Math.max(Math.abs(directionY), .001),
    )
    const startDistance = Math.max(0, edgeDistance - Math.min(8, height * .25))
    const distance = edgeDistance + (18 + Math.random() * 12) * sizeScale

    return {
      delay: Math.random() * .04,
      rotate: (Math.random() - .5) * 52,
      startX: directionX * startDistance,
      startY: directionY * startDistance,
      x: directionX * distance,
      y: directionY * distance,
    }
  })
}

function EmojiBurst({
  burst,
  onComplete,
  reduceMotion,
}: {
  burst: BurstInstance
  onComplete: (id: number) => void
  reduceMotion: boolean
}) {
  const emojis = BURST_EMOJIS[burst.variant]
  const particles = reduceMotion ? burst.particles.slice(0, 1) : burst.particles

  return (
    <span aria-hidden="true" className="lars-chip__burst">
      {particles.map(({ delay: particleDelay, rotate, startX, startY, x, y }, index) => {
        const startTransform = reduceMotion
          ? `translate3d(${x}px, ${y}px, 0) rotate(0deg)`
          : `translate3d(${startX}px, ${startY}px, 0) rotate(0deg)`
        const midpointTransform = reduceMotion
          ? startTransform
          : `translate3d(${startX + (x - startX) * .42}px, ${startY + (y - startY) * .42}px, 0) rotate(${rotate * .25}deg)`
        const movingTransform = reduceMotion
          ? startTransform
          : `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`
        const delay = reduceMotion ? 0 : particleDelay
        const duration = reduceMotion ? .28 : .56

        return (
          <motion.span
            animate={{
              opacity: reduceMotion ? [0, 1, 0] : [0, 1, 1, .7, 0],
              transform: [startTransform, midpointTransform, movingTransform],
            }}
            className="lars-chip__particle"
            initial={{ opacity: 0, transform: startTransform }}
            key={`${burst.id}-${index}`}
            onAnimationComplete={index === particles.length - 1 ? () => onComplete(burst.id) : undefined}
            transition={{
              opacity: {
                delay,
                duration,
                ease: 'linear',
                times: reduceMotion ? [0, .28, 1] : [0, .12, .48, .76, 1],
              },
              transform: {
                delay,
                duration,
                ease: [0.19, 1, 0.22, 1],
                times: [0, reduceMotion ? .28 : .16, 1],
              },
            }}
          >
            {emojis[index % emojis.length]}
          </motion.span>
        )
      })}
    </span>
  )
}

function SemanticIcon({ variant }: { variant: ChipVariant }) {
  if (variant === 'default') {
    return (
      <svg viewBox="0 0 12 12">
        <path d="M6 10.8A4.8 4.8 0 1 0 6 1.2a4.8 4.8 0 0 0 0 9.6Zm-.6-6.6a.6.6 0 1 1 1.2 0 .6.6 0 0 1-1.2 0Zm-.15 1.2h.9c.25 0 .45.2.45.45V7.5h.15a.45.45 0 0 1 0 .9h-1.5a.45.45 0 0 1 0-.9h.45V6.3h-.45a.45.45 0 0 1 0-.9Z" fill="currentColor" />
      </svg>
    )
  }

  if (variant === 'warning') {
    return (
      <svg viewBox="0 0 12 12">
        <path d="M6 1.2c.276 0 .529.152.66.394l4.05 7.5a.75.75 0 0 1-.66 1.106h-8.1a.75.75 0 0 1-.66-1.106l4.05-7.5A.75.75 0 0 1 6 1.2Zm0 6.6a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2Zm0-3.6a.59.59 0 0 0-.589.632l.139 1.95a.45.45 0 0 0 .896 0l.139-1.95A.59.59 0 0 0 6 4.2Z" fill="currentColor" />
      </svg>
    )
  }

  if (variant === 'positive') {
    return (
      <svg viewBox="0 0 12 12">
        <path d="M9 1.8A1.2 1.2 0 0 1 10.2 3v6A1.2 1.2 0 0 1 9 10.2H3A1.2 1.2 0 0 1 1.8 9V3A1.2 1.2 0 0 1 3 1.8h6Zm-.787 2.132a.45.45 0 0 0-.629.099L5.346 7.11l-.977-.977a.45.45 0 0 0-.636.636l1.35 1.35a.45.45 0 0 0 .681-.053L8.312 4.56a.45.45 0 0 0-.099-.628Z" fill="currentColor" />
      </svg>
    )
  }

  if (variant === 'error') {
    return (
      <svg viewBox="0 0 12 12">
        <path d="M6 10.8A4.8 4.8 0 1 0 6 1.2a4.8 4.8 0 0 0 0 9.6ZM4.331 4.331a.45.45 0 0 1 .636 0l1.031 1.032L7.03 4.331a.45.45 0 1 1 .635.635L6.634 5.998l1.031 1.031a.45.45 0 1 1-.635.636L5.998 6.634 4.967 7.665a.45.45 0 1 1-.636-.636l1.032-1.031-1.032-1.032a.45.45 0 0 1 0-.635Z" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 12 12">
      <path d="M9.6 6A3.6 3.6 0 0 0 6 2.4v7.2A3.6 3.6 0 0 0 9.6 6ZM1.2 6a4.8 4.8 0 1 1 9.6 0 4.8 4.8 0 0 1-9.6 0Z" fill="currentColor" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="lars-chip__arrow" viewBox="0 0 12 12">
      <path d="M10.624 6.424a.6.6 0 0 0 0-.849l-3-3a.6.6 0 1 0-.849.849L8.751 5.4H1.8a.6.6 0 1 0 0 1.2h6.951L6.775 8.576a.6.6 0 1 0 .849.85l3-3.002Z" fill="currentColor" />
    </svg>
  )
}

function ChipIcon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="lars-chip__icon">{children}</span>
}

function ChipLabel({ children, typeface }: { children: ReactNode; typeface: ChipTypeface }) {
  const previousTypeface = useRef(typeface)
  const [animationKey, setAnimationKey] = useState(0)
  const isText = typeof children === 'string' || typeof children === 'number'

  useIsomorphicLayoutEffect(() => {
    if (previousTypeface.current === typeface) return
    previousTypeface.current = typeface
    setAnimationKey((current) => current + 1)
  }, [typeface])

  if (!isText) return <span className="lars-chip__label">{children}</span>

  const text = String(children)

  return (
    <span aria-label={text} className="lars-chip__label">
      <span
        aria-hidden="true"
        className={`lars-chip__characters${animationKey > 0 ? ' is-animating' : ''}`}
        key={animationKey}
      >
        {Array.from(text).map((character, index) => (
          <span
            className="lars-chip__character"
            key={`${character}-${index}`}
            style={{ '--chip-character-index': Math.min(index, 5) } as CSSProperties}
          >
            {character === ' ' ? '\u00a0' : character}
          </span>
        ))}
      </span>
    </span>
  )
}

export function Chip({
  burst = false,
  children,
  className = '',
  icon,
  iconPosition = 'none',
  onClick,
  onKeyDown,
  role,
  size = 'small',
  tabIndex,
  typeface = 'monospace',
  variant = 'default',
  ...props
}: ChipProps) {
  const reduceMotion = Boolean(useReducedMotion())
  const burstId = useRef(0)
  const [bursts, setBursts] = useState<BurstInstance[]>([])
  const defaultIcon = iconPosition === 'end' ? <ArrowIcon /> : <SemanticIcon variant={variant} />
  const renderedIcon = icon ?? defaultIcon
  const classes = [
    'lars-chip',
    `lars-chip--${variant}`,
    `lars-chip--${size}`,
    `lars-chip--${typeface}`,
    `lars-chip--icon-${iconPosition}`,
    className,
  ].filter(Boolean).join(' ')

  const triggerBurst = (target: HTMLSpanElement) => {
    if (!burst) return
    const { height, width } = target.getBoundingClientRect()
    burstId.current += 1
    const nextBurst = { id: burstId.current, particles: createBurstParticles(width, height), variant }
    setBursts((current) => [...current.slice(-2), nextBurst])
  }

  const removeBurst = (id: number) => {
    setBursts((current) => current.filter((item) => item.id !== id))
  }

  const handleClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    triggerBurst(event.currentTarget)
    onClick?.(event)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (burst && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      triggerBurst(event.currentTarget)
    }
    onKeyDown?.(event)
  }

  return (
    <span
      className={classes}
      data-burst={burst}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={burst ? role ?? 'button' : role}
      tabIndex={burst ? tabIndex ?? 0 : tabIndex}
      {...props}
    >
      <motion.span
        aria-hidden="true"
        className="lars-chip__surface"
        initial={false}
        layout={reduceMotion ? false : true}
        layoutDependency={typeface}
        style={{ borderRadius: 4 }}
        transition={{ type: 'spring', duration: .32, bounce: 0 }}
      />
      {iconPosition === 'start' && <ChipIcon>{renderedIcon}</ChipIcon>}
      <ChipLabel typeface={typeface}>{children}</ChipLabel>
      {iconPosition === 'end' && <ChipIcon>{renderedIcon}</ChipIcon>}
      {bursts.map((item) => (
        <EmojiBurst
          burst={item}
          key={item.id}
          onComplete={removeBurst}
          reduceMotion={reduceMotion}
        />
      ))}
    </span>
  )
}
