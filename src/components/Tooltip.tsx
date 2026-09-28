import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { useId, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import './Tooltip.css'

export type TooltipProps = {
  children: ReactElement
  content: ReactNode
  delay?: number
  closeDelay?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

/** A short, noninteractive hint for an existing focusable trigger. */
export function Tooltip({ children, content, delay = 200, closeDelay = 150, side = 'top', align = 'center' }: TooltipProps) {
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  return (
    <BaseTooltip.Provider delay={delay} closeDelay={closeDelay}>
      <BaseTooltip.Root disableHoverablePopup onOpenChange={setOpen}>
        <BaseTooltip.Trigger render={children} ref={setTrigger} aria-describedby={open ? tooltipId : undefined} />
        <BaseTooltip.Portal container={trigger?.closest<HTMLElement>('[data-theme]') ?? undefined}>
          <BaseTooltip.Positioner side={side} align={align} sideOffset={8} className="lars-tooltip-positioner">
            <BaseTooltip.Popup id={tooltipId} role="tooltip" className="lars-tooltip">{content}</BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  )
}
