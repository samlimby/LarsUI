import { Select } from '@base-ui/react/select'
import { useId, useRef, useState, type ComponentPropsWithRef, type ReactElement, type SyntheticEvent } from 'react'
import { Field, inputClassName, type FieldSize, type FieldAppearance, type SharedFieldProps } from './field/Field'
import { dropdownMotionForEvent } from './useDropdownGlide'
import { DropdownMenuList } from './DropdownMenuList'
import { useInputFormReset } from './useInputFormReset'

export type DropdownSize = FieldSize
export type DropdownAppearance = FieldAppearance
export type DropdownOption = { label: string; value: string; description?: string; disabled?: boolean }

type DropdownBaseProps = SharedFieldProps &
  Omit<ComponentPropsWithRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'children'> & {
    options: readonly DropdownOption[]
    placeholder?: string
  }

type DropdownRootProps<Multiple extends boolean> = Pick<
  Select.Root.Props<string, Multiple>,
  'value' | 'defaultValue' | 'onValueChange' | 'name' | 'form' | 'required' | 'readOnly' | 'autoComplete' | 'open' | 'defaultOpen' | 'onOpenChange'
>

export type DropdownSingleProps = DropdownBaseProps & DropdownRootProps<false> & {
  multiple?: false
  showSelectAll?: never
}
export type DropdownMultiProps = DropdownBaseProps & DropdownRootProps<true> & {
  multiple: true
  /** Show the bulk-selection row. Defaults to true. */
  showSelectAll?: boolean
}
export type DropdownProps = DropdownSingleProps | DropdownMultiProps

type DropdownDisplayProps = {
  size: DropdownSize
  appearance: DropdownAppearance
  className?: string
  options: readonly DropdownOption[]
  placeholder: string
  motion: 'pointer' | 'instant'
  multiple: boolean
  selectAll?: DropdownSelectAll
  triggerProps: Omit<ComponentPropsWithRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'children'>
}

type DropdownSelectAll = {
  value: symbol
  state: 'unchecked' | 'indeterminate' | 'checked'
  selectedCount: number
  totalCount: number
}

function DropdownDisplay({ size, appearance, className, options, placeholder, motion, multiple, selectAll, triggerProps }: DropdownDisplayProps) {
  return <>
    <Select.Trigger {...triggerProps} data-input-motion={motion} className={`${inputClassName(size, appearance, className)} lars-input--dropdown`}>
      <Select.Value className="lars-input__value" placeholder={placeholder} />
      <Select.Icon className="lars-input__chevron" aria-hidden="true">{''}</Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner align="start" alignItemWithTrigger={false} sideOffset={4} className="lars-input__positioner">
        <Select.Popup data-input-motion={motion} className={`lars-input__popup lars-input__popup--${size}`}>
          <DropdownOptions options={options} multiple={multiple} selectAll={selectAll} />
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </>
}

function SingleDropdownInput({
  multiple: _multiple, size = 'small', appearance = 'outline', className,
  options, placeholder = 'Select an option', value, defaultValue, onValueChange,
  name, form, required, readOnly, disabled, autoComplete, id,
  open, defaultOpen, onOpenChange, ...triggerProps
}: DropdownSingleProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? null)
  const [motion, setMotion] = useState<'pointer' | 'instant'>('instant')
  const inputRef = useRef<HTMLInputElement>(null)
  const controlled = value !== undefined

  useInputFormReset(inputRef, () => {
    if (!controlled) setUncontrolledValue(defaultValue ?? null)
  })

  return <Select.Root<string>
    items={options} value={controlled ? value : uncontrolledValue} inputRef={inputRef}
    onValueChange={(next, details) => {
      onValueChange?.(next, details)
      if (details.isCanceled) return
      setMotion(dropdownMotionForEvent(details.event))
      if (!controlled) setUncontrolledValue(next)
    }}
    name={name} form={form} required={required} readOnly={readOnly} disabled={disabled}
    autoComplete={autoComplete} id={id} open={open} defaultOpen={defaultOpen}
    onOpenChange={(next, details) => {
      onOpenChange?.(next, details)
      if (!details.isCanceled) setMotion(dropdownMotionForEvent(details.event))
    }} modal={false}
  >
    <DropdownDisplay size={size} appearance={appearance} className={className} options={options} placeholder={placeholder} motion={motion} multiple={false} triggerProps={triggerProps} />
  </Select.Root>
}

function MultiDropdownInput({
  multiple: _multiple, showSelectAll = true, size = 'small', appearance = 'outline', className,
  options, placeholder = 'Select an option', value, defaultValue, onValueChange,
  name, form, required, readOnly, disabled, autoComplete, id,
  open, defaultOpen, onOpenChange, ...triggerProps
}: DropdownMultiProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(defaultValue ?? [])
  const [selectAllValue] = useState(() => Symbol('all-options'))
  const [motion, setMotion] = useState<'pointer' | 'instant'>('instant')
  const inputRef = useRef<HTMLInputElement>(null)
  const controlled = value !== undefined
  const selectedValues = (controlled ? value : uncontrolledValue) ?? []
  const selected = new Set(selectedValues)
  const enabledValues = [...new Set(options.filter((option) => !option.disabled).map((option) => option.value))]
  const enabled = new Set(enabledValues)
  const selectedCount = enabledValues.filter((optionValue) => selected.has(optionValue)).length
  const allSelected = enabledValues.length > 0 && selectedCount === enabledValues.length
  const selectAll: DropdownSelectAll = {
    value: selectAllValue,
    state: allSelected ? 'checked' : selectedCount > 0 ? 'indeterminate' : 'unchecked',
    selectedCount,
    totalCount: enabledValues.length,
  }

  useInputFormReset(inputRef, () => {
    if (!controlled) setUncontrolledValue(defaultValue ?? [])
  })

  return <Select.Root<string | symbol, true>
    multiple items={options} value={selectedValues} inputRef={inputRef}
    onValueChange={(next, details) => {
      // The bulk row participates in Base UI's keyboard navigation, but its internal
      // value is translated before it reaches consumers, form data, or the trigger.
      const nextValues = showSelectAll && next.includes(selectAllValue)
        ? allSelected
          ? selectedValues.filter((optionValue) => !enabled.has(optionValue))
          : [...selectedValues, ...enabledValues.filter((optionValue) => !selected.has(optionValue))]
        : next.filter((optionValue): optionValue is string => typeof optionValue === 'string')
      onValueChange?.(nextValues, details)
      if (details.isCanceled) return
      setMotion(dropdownMotionForEvent(details.event))
      if (!controlled) setUncontrolledValue(nextValues)
    }}
    name={name} form={form} required={required} readOnly={readOnly} disabled={disabled}
    autoComplete={autoComplete} id={id} open={open} defaultOpen={defaultOpen}
    onOpenChange={(next, details) => {
      onOpenChange?.(next, details)
      if (!details.isCanceled) setMotion(dropdownMotionForEvent(details.event))
    }} modal={false}
  >
    <DropdownDisplay size={size} appearance={appearance} className={className} options={options} placeholder={placeholder} motion={motion} multiple selectAll={showSelectAll ? selectAll : undefined} triggerProps={triggerProps} />
  </Select.Root>
}

function DropdownControl(props: DropdownProps) {
  return props.multiple ? <MultiDropdownInput {...props} /> : <SingleDropdownInput {...props} />
}

function DropdownOptionIndicator({ multiple }: { multiple: boolean }) {
  return <span className={`lars-input__indicator-slot${multiple ? ' lars-input__indicator-slot--multiple' : ''}`} aria-hidden="true">
    <Select.ItemIndicator keepMounted className={`lars-input__check${multiple ? ' lars-input__check--multiple' : ''}`}>{''}</Select.ItemIndicator>
  </span>
}

function DropdownOptionItem({ option, multiple }: { option: DropdownOption; multiple: boolean }) {
  const id = useId()
  const descriptionId = option.description ? `${id}-description` : undefined
  return <Select.Item
    value={option.value}
    label={option.label}
    disabled={option.disabled}
    aria-labelledby={`${id}-label`}
    aria-describedby={descriptionId}
    className={`lars-input__option${multiple ? ' lars-input__option--multiple' : ''}${descriptionId ? ' lars-input__option--with-description' : ''}`}
  >
    {multiple && <DropdownOptionIndicator multiple />}
    <div className="lars-input__option-content">
      <Select.ItemText id={`${id}-label`}>{option.label}</Select.ItemText>
      {descriptionId && <span id={descriptionId} className="lars-input__option-description">{option.description}</span>}
    </div>
    {!multiple && <DropdownOptionIndicator multiple={false} />}
  </Select.Item>
}

function DropdownOptions({ options, multiple, selectAll }: { options: readonly DropdownOption[]; multiple: boolean; selectAll?: DropdownSelectAll }) {
  return <DropdownMenuList items={options} renderList={(props) => <Select.List {...props} />}>
    {selectAll && (
      <Select.Item
        value={selectAll.value}
        label="All options"
        aria-label={`All options (${selectAll.selectedCount} of ${selectAll.totalCount})${selectAll.state === 'indeterminate' ? ', partially selected' : ''}`}
        aria-selected={selectAll.state === 'checked'}
        disabled={selectAll.totalCount === 0}
        data-state={selectAll.state}
        className="lars-input__option lars-input__option--multiple lars-input__option--all"
      >
        <span className="lars-input__indicator-slot lars-input__indicator-slot--multiple" aria-hidden="true">
          <span className="lars-input__check lars-input__check--multiple" />
        </span>
        <Select.ItemText>All options <strong>({selectAll.selectedCount} of {selectAll.totalCount})</strong></Select.ItemText>
      </Select.Item>
    )}
    {options.map((option) => <DropdownOptionItem key={option.value} option={option} multiple={multiple} />)}
  </DropdownMenuList>
}

function forwardDropdownInvalid(event: SyntheticEvent<HTMLDivElement>, handler: DropdownBaseProps['onInvalid']) {
  if (!handler) return
  const wrapper = event.currentTarget
  const trigger = wrapper.querySelector<HTMLButtonElement>('.lars-input--dropdown')
  if (!trigger || event.target !== wrapper.querySelector(':scope > input[aria-hidden="true"]')) return
  // Validation belongs to Base UI's native input, while the public ref and native
  // button handlers belong to its trigger. Keep the original event and propagation.
  const forwardedEvent = event as SyntheticEvent<Element>
  forwardedEvent.currentTarget = trigger
  try {
    handler(event as unknown as SyntheticEvent<HTMLButtonElement>)
  } finally {
    forwardedEvent.currentTarget = wrapper
  }
}

/** A single- or multiple-selection dropdown. */
export function Dropdown(props: DropdownSingleProps): ReactElement
export function Dropdown(props: DropdownMultiProps): ReactElement
export function Dropdown(props: DropdownProps): ReactElement
export function Dropdown({ helperText, helperIcon, label, error, errorText, ...props }: DropdownProps) {
  const controlProps = { ...props, onInvalid: undefined, onInvalidCapture: undefined }
  return <Field
    variant="dropdown"
    controlProps={props}
    label={label}
    error={error}
    errorText={errorText}
    helperText={helperText}
    helperIcon={helperIcon}
    onInvalidCapture={(event) => forwardDropdownInvalid(event, props.onInvalidCapture)}
    onInvalid={(event) => forwardDropdownInvalid(event, props.onInvalid)}
    renderControl={(fieldProps) => <DropdownControl {...controlProps} {...fieldProps} />}
  />
}
