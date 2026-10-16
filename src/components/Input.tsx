import { useEffect, useImperativeHandle, useRef, useState, type ComponentPropsWithRef, type MouseEventHandler, type ReactNode } from 'react'
import { Dropdown, type DropdownProps, type DropdownSingleProps, type DropdownMultiProps, type DropdownOption } from './Dropdown'
import { Textarea, type TextareaProps } from './Textarea'
import { Field, inputClassName, inputWrapperClassName, type FieldSize, type FieldAppearance, type SharedFieldProps } from './field/Field'
import { useInputFormReset } from './useInputFormReset'

export type InputVariant = 'text' | 'dropdown' | 'textarea'
export type InputSize = FieldSize
export type InputAppearance = FieldAppearance
/** @deprecated Use DropdownOption for Dropdown options. */
export type InputOption = DropdownOption

export type TextInputProps = SharedFieldProps & Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  variant?: 'text'
  onValueChange?: (value: string) => void
  /** Content in a separate compartment before the editable field, such as a prefix or icon. */
  leading?: ReactNode
  /** Content in a separate compartment after the editable field, such as a copy or send button. */
  trailing?: ReactNode
}

/** @deprecated Use TextareaProps and the Textarea component. */
export type TextareaInputProps = TextareaProps & { variant: 'textarea' }
/** @deprecated Use DropdownSingleProps and the Dropdown component. */
export type DropdownSingleInputProps = DropdownSingleProps & { variant: 'dropdown' }
/** @deprecated Use DropdownMultiProps and the Dropdown component. */
export type DropdownMultiInputProps = DropdownMultiProps & { variant: 'dropdown' }
/** @deprecated Use DropdownProps and the Dropdown component. */
export type DropdownInputProps = DropdownProps & { variant: 'dropdown' }

export type InputProps = TextInputProps | DropdownInputProps | TextareaInputProps

function ClearInputButton({ label, onClick }: { label: string; onClick: MouseEventHandler<HTMLButtonElement> }) {
  return <button type="button" className="lars-input__clear" aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>
    <span className="lars-input__close-icon" aria-hidden="true" />
  </button>
}

function TextInputControl({ variant: _variant, size = 'small', appearance = 'outline', className, style, ref, value, defaultValue, onChange, onValueChange, disabled, readOnly, leading, trailing, ...nativeProps }: TextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasLeading = leading !== undefined && leading !== null && leading !== false
  const hasTrailing = trailing !== undefined && trailing !== null && trailing !== false
  const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ''))
  const controlled = value !== undefined
  const populated = String(controlled ? value ?? '' : uncontrolledValue).length > 0
  const clearable = populated && !disabled && !readOnly && ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(nativeProps.type ?? 'text')
  useImperativeHandle(ref, () => inputRef.current!, [])

  useEffect(() => {
    const input = inputRef.current
    if (!input || controlled) return
    setUncontrolledValue(input.value)
  }, [controlled, defaultValue, nativeProps.type])
  useInputFormReset(inputRef, () => {
    if (!controlled && inputRef.current) setUncontrolledValue(inputRef.current.value)
  })

  return <div className={inputWrapperClassName(size, appearance, className)} style={style} data-clearable={clearable || undefined} data-leading-slot={hasLeading || undefined} data-trailing-slot={hasTrailing || undefined} data-disabled={disabled || undefined}>
    {hasLeading && <span className="lars-input__slot lars-input__slot--leading" inert={disabled || undefined}>{leading}</span>}
    <input {...nativeProps} ref={inputRef} value={value} defaultValue={defaultValue} disabled={disabled} readOnly={readOnly} className={inputClassName(size, appearance)} onChange={(event) => {
      if (!controlled) setUncontrolledValue(event.currentTarget.value)
      onChange?.(event)
      onValueChange?.(event.currentTarget.value)
    }} />
    {clearable && <ClearInputButton label="Clear input" onClick={() => {
      const input = inputRef.current
      const view = input?.ownerDocument.defaultView
      if (!input || !view || disabled || readOnly) return
      input.focus()
      // Dispatch a native edit so both React onChange and onValueChange receive it.
      Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set?.call(input, '')
      input.dispatchEvent(new view.Event('input', { bubbles: true }))
    }} />}
    {hasTrailing && <span className="lars-input__slot lars-input__slot--trailing" inert={disabled || undefined}>{trailing}</span>}
  </div>
}

/** A single-line input. Legacy dropdown and textarea variants remain supported. */
export function Input(props: InputProps) {
  if (props.variant === 'dropdown') {
    const { variant: _variant, ...dropdownProps } = props
    return <Dropdown {...dropdownProps} />
  }
  if (props.variant === 'textarea') {
    const { variant: _variant, ...textareaProps } = props
    return <Textarea {...textareaProps} />
  }
  const { helperText, helperIcon, label, error, errorText, ...controlProps } = props
  const hasLeading = controlProps.leading !== undefined && controlProps.leading !== null && controlProps.leading !== false
  const hasTrailing = controlProps.trailing !== undefined && controlProps.trailing !== null && controlProps.trailing !== false
  return <Field
    variant="text"
    controlProps={controlProps}
    label={label}
    error={error}
    errorText={errorText}
    helperText={helperText}
    helperIcon={helperIcon}
    hasLeading={hasLeading}
    hasTrailing={hasTrailing}
    renderControl={(fieldProps) => <TextInputControl {...controlProps} {...fieldProps} />}
  />
}
