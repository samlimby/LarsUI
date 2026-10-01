import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import './SegmentedControl.css'

export type SegmentedControlType = 'cornered' | 'square'
export type SegmentedControlSize = 'default' | 'large'
export type SegmentedControlContent = 'text-only' | 'text-icon' | 'icon-only'

export type SegmentedControlOption = {
  value: string
  label: string
  icon?: ReactNode
}

export type SegmentedControlProps = {
  /** Accessible name for the group of choices. */
  label: string
  /** Between 2 and 5 choices. Invalid counts render nothing. */
  options: readonly SegmentedControlOption[]
  /** Falls back visually to the first option when it is not in options. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  type?: SegmentedControlType
  size?: SegmentedControlSize
  /** Icon-only choices keep their labels accessible; choices without icons show their label. */
  content?: SegmentedControlContent
  name?: string
  disabled?: boolean
  /** Disable the selected indicator's layout animation. */
  animateSelection?: boolean
  className?: string
}

export function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  type = 'cornered',
  size = 'default',
  content = 'text-only',
  name,
  disabled = false,
  animateSelection = true,
  className = '',
}: SegmentedControlProps) {
  const id = useId()
  const prefersReducedMotion = useReducedMotion()
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? '')

  if (options.length < 2 || options.length > 5) {
    if (import.meta.env.DEV) {
      console.warn('SegmentedControl requires between 2 and 5 options; nothing was rendered.')
    }
    return null
  }

  const requestedValue = value ?? internalValue
  const selectedValue = options.some((option) => option.value === requestedValue)
    ? requestedValue
    : options[0].value

  return (
    <fieldset
      className={`lars-segmented-control lars-segmented-control--${type} lars-segmented-control--${size}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      data-content={content}
    >
      <legend className="lars-segmented-control__legend">{label}</legend>
      <LayoutGroup id={id}>
        {options.map((option, index) => {
          const selected = selectedValue === option.value
          return (
            <label
              className="lars-segmented-control__segment"
              data-icon-only={content === 'icon-only' && Boolean(option.icon) || undefined}
              key={option.value}
            >
              <input
                checked={selected}
                className="lars-segmented-control__input"
                name={name ?? id}
                onChange={() => {
                  if (value === undefined) setInternalValue(option.value)
                  onValueChange?.(option.value)
                }}
                type="radio"
                value={option.value}
              />
              {selected && (!animateSelection || prefersReducedMotion ? (
                <span aria-hidden="true" className="lars-segmented-control__indicator" />
              ) : (
                <motion.span
                  aria-hidden="true"
                  animate={{ borderRadius: type === 'cornered' ? 999 : 6 }}
                  className="lars-segmented-control__indicator"
                  initial={false}
                  layoutId={`${id}-selection`}
                  transition={{ type: 'spring', duration: 0.32, bounce: 0 }}
                />
              ))}
              <span className="lars-segmented-control__content">
                {content !== 'text-only' && option.icon && (
                  <span aria-hidden="true" className="lars-segmented-control__icon">{option.icon}</span>
                )}
                <span className={content === 'icon-only' && option.icon ? 'lars-segmented-control__label--hidden' : undefined}>{option.label}</span>
              </span>
              {index < options.length - 1 && <span aria-hidden="true" className="lars-segmented-control__divider" />}
            </label>
          )
        })}
      </LayoutGroup>
    </fieldset>
  )
}
