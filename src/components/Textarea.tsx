import { type ComponentPropsWithRef } from 'react'
import { Field, inputClassName, type FieldSize, type FieldAppearance, type SharedFieldProps } from './field/Field'

export type TextareaSize = FieldSize
export type TextareaAppearance = FieldAppearance
export type TextareaProps = SharedFieldProps & ComponentPropsWithRef<'textarea'> & {
  onValueChange?: (value: string) => void
}

/** A multiline text field with shared label, helper, and error feedback. */
export function Textarea({
  size = 'small', appearance = 'outline', helperText, helperIcon, label, error, errorText,
  onChange, onValueChange, rows = 3, ...nativeProps
}: TextareaProps) {
  return <Field
    variant="textarea"
    controlProps={nativeProps}
    label={label}
    error={error}
    errorText={errorText}
    helperText={helperText}
    helperIcon={helperIcon}
    renderControl={(fieldProps) => <textarea
      {...nativeProps}
      {...fieldProps}
      rows={rows}
      className={`${inputClassName(size, appearance, fieldProps.className)} lars-input--textarea`}
      onChange={(event) => {
        onChange?.(event)
        onValueChange?.(event.currentTarget.value)
      }}
    />}
  />
}
