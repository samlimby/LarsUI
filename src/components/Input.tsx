import { Select } from '@base-ui/react/select'
import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react'
import './Input.css'

export type InputVariant = 'text' | 'dropdown' | 'textarea'
export type InputSize = 'small' | 'large'
export type InputAppearance = 'outline' | 'subtle' | 'filled'
export type InputOption = { label: string; value: string; disabled?: boolean }

type SharedProps = {
  size?: InputSize
  appearance?: InputAppearance
}

export type TextInputProps = SharedProps & Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  variant?: 'text'
  onValueChange?: (value: string) => void
}

export type TextareaInputProps = SharedProps & ComponentPropsWithRef<'textarea'> & {
  variant: 'textarea'
  onValueChange?: (value: string) => void
}

export type DropdownInputProps = SharedProps &
  Omit<ComponentPropsWithRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'children'> &
  Pick<Select.Root.Props<string>, 'value' | 'defaultValue' | 'onValueChange' | 'name' | 'form' | 'required' | 'readOnly' | 'autoComplete' | 'open' | 'defaultOpen' | 'onOpenChange'> & {
    variant: 'dropdown'
    options: readonly InputOption[]
    placeholder?: string
  }

export type InputProps = TextInputProps | DropdownInputProps | TextareaInputProps

function inputClassName(size: InputSize, appearance: InputAppearance, className = '') {
  return `lars-input lars-input--${size} lars-input--${appearance}${className ? ` ${className}` : ''}`
}

function inputMotionForEvent(event: Event): 'pointer' | 'instant' {
  if (event.type.startsWith('pointer') || event.type.startsWith('mouse') || event.type.startsWith('touch')) return 'pointer'
  if (event.type === 'click' && 'detail' in event && Number(event.detail) > 0) return 'pointer'
  return 'instant'
}

function DropdownInput({
  variant: _variant, size = 'small', appearance = 'outline', className,
  options, placeholder = 'Select an option', value, defaultValue, onValueChange,
  name, form, required, readOnly, disabled, autoComplete, id,
  open, defaultOpen, onOpenChange, ...triggerProps
}: DropdownInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? null)
  const [motion, setMotion] = useState<'pointer' | 'instant'>('instant')
  const inputRef = useRef<HTMLInputElement>(null)
  const controlled = value !== undefined

  useEffect(() => {
    const ownerForm = inputRef.current?.form
    if (!ownerForm || controlled) return
    const reset = (event: Event) => {
      queueMicrotask(() => {
        if (!event.defaultPrevented) setUncontrolledValue(defaultValue ?? null)
      })
    }
    ownerForm.addEventListener('reset', reset)
    return () => ownerForm.removeEventListener('reset', reset)
  }, [controlled, defaultValue, form])

  return (
    <Select.Root<string>
      items={options} value={controlled ? value : uncontrolledValue} inputRef={inputRef}
      onValueChange={(next, details) => {
        onValueChange?.(next, details)
        if (details.isCanceled) return
        setMotion(inputMotionForEvent(details.event))
        if (!controlled) setUncontrolledValue(next)
      }}
      name={name} form={form} required={required} readOnly={readOnly} disabled={disabled}
      autoComplete={autoComplete} id={id} open={open} defaultOpen={defaultOpen}
      onOpenChange={(next, details) => {
        onOpenChange?.(next, details)
        if (!details.isCanceled) setMotion(inputMotionForEvent(details.event))
      }} modal={false}
    >
      <Select.Trigger {...triggerProps} data-input-motion={motion} className={`${inputClassName(size, appearance, className)} lars-input--dropdown`}>
        <Select.Value className="lars-input__value" placeholder={placeholder} />
        <Select.Icon className="lars-input__chevron" aria-hidden="true">{''}</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner align="start" alignItemWithTrigger={false} sideOffset={4} className="lars-input__positioner">
          <Select.Popup data-input-motion={motion} className={`lars-input__popup lars-input__popup--${size}`}>
            <Select.List className="lars-input__list">
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} disabled={option.disabled} className="lars-input__option">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <span className="lars-input__indicator-slot" aria-hidden="true">
                    <Select.ItemIndicator keepMounted className="lars-input__check">{''}</Select.ItemIndicator>
                  </span>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

/** A single family of text fields, dropdowns and multiline fields. */
export function Input(props: InputProps) {
  if (props.variant === 'dropdown') return <DropdownInput {...props} />
  if (props.variant === 'textarea') {
    const { variant: _variant, size = 'small', appearance = 'outline', className, onChange, onValueChange, rows = 3, ...nativeProps } = props
    return <textarea {...nativeProps} rows={rows} className={`${inputClassName(size, appearance, className)} lars-input--textarea`} onChange={(event) => {
      onChange?.(event)
      onValueChange?.(event.currentTarget.value)
    }} />
  }
  const { variant: _variant, size = 'small', appearance = 'outline', className, onChange, onValueChange, ...nativeProps } = props
  return <input {...nativeProps} className={inputClassName(size, appearance, className)} onChange={(event) => {
    onChange?.(event)
    onValueChange?.(event.currentTarget.value)
  }} />
}
