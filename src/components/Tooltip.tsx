import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useRef, useState, type ReactElement } from 'react'
import './Tooltip.css'

export type TooltipProps = {
  /** Show the small triangle pointing from the tooltip to its trigger. */
  anchor?: boolean
  /** Focusable trigger. Custom components must forward DOM props and ref; icon-only triggers need an accessible name. */
  children: ReactElement
  /** Additional class name for the popup. Style the trigger through children. */
  className?: string
  /** Optional explanatory text, visually truncated after four lines. */
  description?: string
  /** Delay before a pointer hover opens the tooltip, in milliseconds. Defaults to 300. */
  delay?: number
  /** Show the opposite of the page or system color theme. Defaults to false. */
  highContrast?: boolean
  /** Primary text, visually truncated to one line. */
  label: string
  /** Which side of the trigger to prefer. The popup flips near viewport edges. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Optional keyboard shortcut shown after the label when description is absent. */
  shortcut?: string
  /** Render the shortcut as a raised keycap instead of plain text. */
  shortcutStyle?: 'plain' | 'keycap'
}

export function Tooltip({
  anchor = false,
  children,
  className = '',
  description,
  delay = 300,
  highContrast = false,
  label,
  side = 'top',
  shortcut,
  shortcutStyle = 'plain',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const arrowVisualRef = useRef<SVGSVGElement>(null)
  const reduceMotion = useReducedMotion()
  const arrowTarget = useMotionValue(0)
  const tipTarget = useMotionValue(0)
  const arrowShift = useSpring(arrowTarget, { stiffness: 190, damping: 18, mass: 0.55 })
  const tipBend = useSpring(tipTarget, { stiffness: 340, damping: 20, mass: 0.5 })
  const arrowPath = useTransform(tipBend, (bend) => `M0 0 ${6 + bend} 6 12 0`)

  function resetArrow() {
    arrowTarget.set(0)
    tipTarget.set(0)
  }

  return (
    <BaseTooltip.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetArrow()
      }}
    >
      <BaseTooltip.Trigger
        closeOnClick={false}
        delay={delay}
        onClick={() => {
          // Hover is unavailable on touch screens; tapping the inline trigger opens it.
          if (window.matchMedia('(hover: none)').matches) setOpen(true)
        }}
        onPointerLeave={resetArrow}
        onPointerMove={(event) => {
          const arrow = arrowVisualRef.current
          if (!anchor || !open || !arrow || event.pointerType === 'touch' || reduceMotion) return

          const sideInUse = arrow.parentElement?.dataset.side ?? side
          const horizontal = sideInUse === 'top' || sideInUse === 'bottom'
          const bounds = event.currentTarget.getBoundingClientRect()
          const cursor = horizontal ? event.clientX - bounds.left : event.clientY - bounds.top
          const extent = horizontal ? bounds.width : bounds.height
          if (!extent) return
          const direction = sideInUse === 'bottom' || sideInUse === 'left' ? -1 : 1
          const pull = Math.max(-1, Math.min(1, (cursor / extent - 0.5) * 2)) * direction

          arrowTarget.set(pull * 4)
          tipTarget.set(pull * 1.2)
        }}
        render={children}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="lars-tooltip__positioner">
          <BaseTooltip.Popup className={`lars-tooltip__popup${description ? ' lars-tooltip__popup--rich' : ''}${highContrast ? ' lars-tooltip__popup--high-contrast' : ''}${className ? ` ${className}` : ''}`}>
            {anchor && (
              <BaseTooltip.Arrow className="lars-tooltip__arrow">
                <svg aria-hidden="true" ref={arrowVisualRef} viewBox="0 0 12 6">
                  {reduceMotion ? (
                    <path d="M0 0 6 6 12 0" />
                  ) : (
                    <motion.g style={{ x: arrowShift }}>
                      <motion.path d={arrowPath} />
                    </motion.g>
                  )}
                </svg>
              </BaseTooltip.Arrow>
            )}
            <span className="lars-tooltip__label">{label}</span>
            {description && <span className="lars-tooltip__description">{description}</span>}
            {!description && shortcut && (
              <span className={shortcutStyle === 'keycap' ? 'lars-tooltip__keycap' : 'lars-tooltip__shortcut'}>
                {shortcut}
              </span>
            )}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
