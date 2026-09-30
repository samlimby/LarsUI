import { Dialog } from '@base-ui/react/dialog'
import { Popover } from '@base-ui/react/popover'
import { useEffect, useState, type ReactElement } from 'react'
import './AdaptiveTooltip.css'

export type AdaptiveTooltipStep = {
  title: string
  description: string
  /** Optional longer definition for the touch sheet. */
  touchDescription?: string
  /** Label for opening the next definition. Defaults to the next title. */
  nextLabel?: string
}

export type AdaptiveTooltipProps = {
  children: ReactElement
  steps: readonly AdaptiveTooltipStep[]
}

export function AdaptiveTooltip({ children, steps }: AdaptiveTooltipProps) {
  const [touchLayout, setTouchLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches,
  )
  const [open, setOpen] = useState(false)
  const [depth, setDepth] = useState(0)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    const update = () => {
      setOpen(false)
      setDepth(0)
      setTouchLayout(media.matches)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  if (steps.length === 0) return children

  const activeDepth = Math.min(depth, steps.length - 1)

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setDepth(0)
  }

  if (touchLayout) {
    const step = steps[activeDepth]
    return (
      <Dialog.Root open={open} onOpenChange={changeOpen}>
        <Dialog.Trigger render={children} />
        <Dialog.Portal>
          <Dialog.Backdrop className="lars-adaptive-tooltip__backdrop" />
          <Dialog.Popup className="lars-adaptive-tooltip__sheet">
            <span className="lars-adaptive-tooltip__grabber" aria-hidden="true" />
            <div className="lars-adaptive-tooltip__sheet-nav">
              {activeDepth > 0 ? (
                <button type="button" onClick={() => setDepth(activeDepth - 1)}>
                  ‹ {steps.slice(0, activeDepth).map((item) => item.title).join(' / ')}
                </button>
              ) : <span />}
              <Dialog.Close className="lars-adaptive-tooltip__close">Close</Dialog.Close>
            </div>
            <div className="lars-adaptive-tooltip__sheet-definition">
              <span className="lars-adaptive-tooltip__level">Level {activeDepth + 1} of {steps.length}</span>
              <Dialog.Title className="lars-adaptive-tooltip__sheet-title">{step.title}</Dialog.Title>
              <Dialog.Description className="lars-adaptive-tooltip__sheet-description">
                {step.touchDescription || step.description}
              </Dialog.Description>
            </div>
            {activeDepth < steps.length - 1 && (
              <div className="lars-adaptive-tooltip__sheet-footer">
                <button type="button" onClick={() => setDepth(activeDepth + 1)}>
                  {step.nextLabel || steps[activeDepth + 1].title} ↗
                </button>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger render={children} />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="center" sideOffset={12} className="lars-adaptive-tooltip__positioner">
          <Popover.Popup className="lars-adaptive-tooltip__popup">
            <Popover.Title className="lars-adaptive-tooltip__sr-only">{steps[0].title}</Popover.Title>
            <div className="lars-adaptive-tooltip__stack">
              {steps.slice(0, activeDepth + 1).map((step, index) => (
                <div className="lars-adaptive-tooltip__card" data-expanded={index < activeDepth ? '' : undefined} key={`${step.title}-${index}`}>
                  <div className="lars-adaptive-tooltip__card-heading">
                    <strong>{step.title}</strong>
                    <span>{index === 0 && activeDepth > 0 ? 'LOCKED' : String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <p>{step.description}</p>
                  {index < steps.length - 1 && (
                    <button type="button" onClick={() => setDepth(index + 1)}>
                      {step.nextLabel || steps[index + 1].title} ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
