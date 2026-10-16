import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import '../Input.css'

export type FieldSize = 'small' | 'large'
export type FieldAppearance = 'outline' | 'subtle' | 'filled'

export type SharedFieldProps = {
  size?: FieldSize
  appearance?: FieldAppearance
  /** An optional visible label associated with the control. */
  label?: ReactNode
  /** Mark the control invalid and replace helper text with error feedback. */
  error?: boolean
  /** Error feedback displayed when error is true. */
  errorText?: string
  /** Helper copy below the control. With a label or feedback present, className and style customize the field wrapper. */
  helperText?: string
  /** A decorative icon beside helperText. */
  helperIcon?: ReactNode
}

type FieldControlProps = Pick<ComponentPropsWithRef<'input'>, 'id' | 'className' | 'style' | 'aria-invalid' | 'aria-describedby'>
type FieldProps = Pick<SharedFieldProps, 'label' | 'error' | 'errorText' | 'helperText' | 'helperIcon'> & {
  variant: 'text' | 'dropdown' | 'textarea'
  controlProps: FieldControlProps & { required?: boolean }
  hasLeading?: boolean
  hasTrailing?: boolean
  onInvalidCapture?: ComponentPropsWithRef<'div'>['onInvalidCapture']
  onInvalid?: ComponentPropsWithRef<'div'>['onInvalid']
  renderControl: (props: FieldControlProps) => ReactNode
}

export function inputClassName(size: FieldSize, appearance: FieldAppearance, className = '') {
  return `lars-input lars-input--${size} lars-input--${appearance}${className ? ` ${className}` : ''}`
}

export function inputWrapperClassName(size: FieldSize, appearance: FieldAppearance, className = '') {
  return `lars-input-wrapper lars-input-wrapper--${size} lars-input-wrapper--${appearance}${className ? ` ${className}` : ''}`
}

function FieldHelper({ id, text, icon, error }: { id: string; text: string; icon?: ReactNode; error: boolean }) {
  const present = useIsPresent()
  const reduceMotion = useReducedMotion()
  return <motion.div
    id={id}
    className={`lars-input__helper${error ? ' lars-input__helper--error' : ''}`}
    aria-hidden={!present || undefined}
    role={error && present ? 'alert' : undefined}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: reduceMotion ? 0.1 : 0.16, ease: 'easeOut' }}
  >
    {error
      ? <span className="lars-input__helper-icon lars-input__helper-icon--error" aria-hidden="true"><span className="lars-input__error-icon" /></span>
      : icon !== undefined && icon !== null && icon !== false && <span className="lars-input__helper-icon" aria-hidden="true">{icon}</span>}
    <span className="lars-input__helper-text">{text}</span>
  </motion.div>
}

/** Shared field chrome and feedback for Input, Dropdown, and Textarea. */
export function Field({
  variant, controlProps: props, label, error = false, errorText, helperText, helperIcon,
  hasLeading = false, hasTrailing = false, onInvalidCapture, onInvalid, renderControl,
}: FieldProps) {
  const generatedId = useId()
  const helperId = `${generatedId}-helper`
  const hasLabel = label !== undefined && label !== null && label !== false && label !== ''
  const controlId = props.id ?? (hasLabel ? `${generatedId}-control` : undefined)
  const hasHelper = error || Boolean(helperText?.trim())
  const feedback = error ? errorText?.trim() || 'Please enter a valid value.' : helperText!
  const [helperPresent, setHelperPresent] = useState(hasHelper)
  const withFieldLayout = hasLabel || hasHelper || helperPresent
  useEffect(() => {
    if (hasHelper) setHelperPresent(true)
  }, [hasHelper])
  const describedBy = hasHelper
    ? [...new Set([...(props['aria-describedby']?.split(/\s+/).filter(Boolean) ?? []), helperId])].join(' ')
    : props['aria-describedby']
  const invalid = error || props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  return <div
    className={withFieldLayout ? `lars-input-field lars-input-field--${variant}${props.className ? ` ${props.className}` : ''}` : 'lars-input-field-shell'}
    style={withFieldLayout ? props.style : undefined}
    data-leading-slot={withFieldLayout && hasLeading || undefined}
    data-trailing-slot={withFieldLayout && hasTrailing || undefined}
    data-invalid={invalid || undefined}
    data-error={error || undefined}
    onInvalidCapture={onInvalidCapture}
    onInvalid={onInvalid}
  >
    {hasLabel && <label className="lars-input__label" htmlFor={controlId}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>}
    {renderControl({
      id: controlId,
      className: withFieldLayout ? undefined : props.className,
      style: withFieldLayout ? undefined : props.style,
      'aria-invalid': error ? true : props['aria-invalid'],
      'aria-describedby': describedBy,
    })}
    <AnimatePresence initial={false} onExitComplete={() => { if (!hasHelper) setHelperPresent(false) }}>
      {hasHelper && <FieldHelper key="helper" id={helperId} text={feedback} icon={helperIcon} error={error} />}
    </AnimatePresence>
  </div>
}
