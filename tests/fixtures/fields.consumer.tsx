import { createRef } from 'react'
import {
  Input, Dropdown, Textarea,
  type InputProps, type TextInputProps, type TextareaInputProps,
  type DropdownInputProps, type DropdownSingleInputProps, type DropdownMultiInputProps,
  type InputOption, type InputVariant, type InputSize, type InputAppearance,
  type DropdownProps, type DropdownSingleProps, type DropdownMultiProps,
  type DropdownOption, type DropdownSize, type DropdownAppearance,
  type TextareaProps, type TextareaSize, type TextareaAppearance,
} from '../../dist/index.js'

const inputRef = createRef<HTMLInputElement>()
const textareaRef = createRef<HTMLTextAreaElement>()
const dropdownRef = createRef<HTMLButtonElement>()
const options: readonly DropdownOption[] = [{ label: 'Design', value: 'design', description: 'Design team' }]

const textProps: TextInputProps = {
  ref: inputRef, type: 'email', autoComplete: 'email', name: 'email', required: true,
  label: 'Email', error: true, errorText: 'Enter an email.', leading: '@', trailing: '.com',
}
const textareaProps: TextareaProps = {
  ref: textareaRef, rows: 4, cols: 40, maxLength: 200, name: 'notes', wrap: 'soft',
  label: 'Notes', helperText: 'Add a short note.', required: true,
}
const singleProps: DropdownSingleProps = { ref: dropdownRef, options, value: 'design', required: true }
const multiProps: DropdownMultiProps = { ref: dropdownRef, options, multiple: true, value: ['design'], showSelectAll: false }
const dropdownProps: DropdownProps[] = [singleProps, multiProps]
const sizes: [InputSize, DropdownSize, TextareaSize] = ['small', 'large', 'small']
const appearances: [InputAppearance, DropdownAppearance, TextareaAppearance] = ['outline', 'filled', 'subtle']
void [dropdownProps, sizes, appearances]

const standaloneFields = <>
  <Input onValueChange={next => {
    const value: string = next
    // @ts-expect-error An Input without a legacy variant infers a string value.
    const values: string[] = next
    void [value, values]
  }} onChange={event => {
    const field: HTMLInputElement = event.currentTarget
    // @ts-expect-error An Input without a legacy variant infers native input events.
    const textarea: HTMLTextAreaElement = event.currentTarget
    void [field, textarea]
  }} />
  <Input {...textProps} onChange={event => {
    const field: HTMLInputElement = event.currentTarget
    // @ts-expect-error Input events target an input, rather than a textarea.
    const textarea: HTMLTextAreaElement = event.currentTarget
    void [field, textarea]
  }} onValueChange={next => {
    const value: string = next
    // @ts-expect-error Native input values are strings.
    const values: string[] = next
    void [value, values]
  }} />
  <Textarea {...textareaProps} onChange={event => {
    const field: HTMLTextAreaElement = event.currentTarget
    // @ts-expect-error Textarea events target a textarea.
    const input: HTMLInputElement = event.currentTarget
    void [field, input]
  }} onValueChange={next => {
    const value: string = next
    // @ts-expect-error Textarea values are strings.
    const values: string[] = next
    void [value, values]
  }} />
  <Dropdown {...singleProps} onValueChange={(next, details) => {
    const value: string | null = next
    // @ts-expect-error A single dropdown does not report an array.
    const values: string[] = next
    details.cancel()
    void [value, values, details.event, details.reason]
  }} onClick={event => {
    const field: HTMLButtonElement = event.currentTarget
    void field
  }} />
  <Dropdown {...multiProps} onValueChange={(next, details) => {
    const values: string[] = next
    // @ts-expect-error A multi dropdown reports arrays.
    const value: string | null = next
    details.cancel()
    void [values, value, details.event, details.reason]
  }} />
  <Dropdown options={options} multiple value={['design']} onValueChange={next => {
    const values: string[] = next
    // @ts-expect-error Explicit multi selection also infers an array callback.
    const value: string | null = next
    void [values, value]
  }} />
</>
void standaloneFields

// Props passed through another component can retain their discriminated union.
function ForwardDropdown(props: DropdownProps) {
  return <Dropdown {...props} />
}
void ForwardDropdown

// Legacy aliases and variant-based call sites remain valid during migration.
const oldOptions: readonly InputOption[] = options
const oldText: InputProps = { variant: 'text', ref: inputRef, defaultValue: 'Saved' }
const oldTextarea: TextareaInputProps = { variant: 'textarea', ref: textareaRef, rows: 3 }
const oldSingle: DropdownSingleInputProps = { variant: 'dropdown', options: oldOptions, ref: dropdownRef, defaultValue: 'design' }
const oldMulti: DropdownMultiInputProps = { variant: 'dropdown', options: oldOptions, multiple: true, defaultValue: ['design'] }
const oldDropdowns: DropdownInputProps[] = [oldSingle, oldMulti]
const variant: InputVariant = 'text'
const legacyFields = <>
  <Input {...oldText} />
  <Input {...oldTextarea} />
  <Input {...oldSingle} />
  <Input {...oldMulti} />
  <Input variant={variant} />
  <Input variant="dropdown" options={options} multiple onValueChange={next => {
    const values: string[] = next
    // @ts-expect-error Legacy multi selection retains an array callback.
    const value: string | null = next
    void [values, value]
  }} />
</>
void [oldDropdowns, legacyFields]

// @ts-expect-error Textarea exposes textarea-native refs.
const wrongTextareaRef = <Textarea ref={inputRef} />
// @ts-expect-error Dropdown exposes a button-native ref.
const wrongDropdownRef = <Dropdown options={options} ref={inputRef} />
// @ts-expect-error Plain Input exposes an input-native ref.
const wrongInputRef = <Input ref={textareaRef} />
// @ts-expect-error Input rows require the legacy textarea variant or standalone Textarea.
const wrongInputRows = <Input rows={4} />
// @ts-expect-error Slots belong to Input.
const wrongTextareaSlot = <Textarea leading="$" />
// @ts-expect-error Textarea does not accept an input type.
const wrongTextareaType = <Textarea type="email" />
// @ts-expect-error Options belong to Dropdown.
const wrongTextareaOptions = <Textarea options={options} />
// @ts-expect-error Dropdown cannot accept text-input slots.
const wrongDropdownSlot = <Dropdown options={options} trailing=".com" />
// @ts-expect-error Standalone components do not use the old variant selector.
const wrongDropdownVariant = <Dropdown options={options} variant="dropdown" />
// @ts-expect-error Standalone Textarea does not use the old variant selector.
const wrongTextareaVariant = <Textarea variant="textarea" />
// @ts-expect-error Dropdown uses onValueChange instead of a native text-input onChange.
const wrongDropdownOnChange = <Dropdown options={options} onChange={() => {}} />
// @ts-expect-error Dropdown options are required.
const missingOptions = <Dropdown />
// @ts-expect-error Single dropdowns accept scalar selections.
const wrongSingleValue = <Dropdown options={options} value={['design']} />
// @ts-expect-error Multi dropdowns accept arrays of selections.
const wrongMultiValue = <Dropdown options={options} multiple value="design" />
// @ts-expect-error Default multi dropdown selections also use arrays.
const wrongMultiDefault = <Dropdown options={options} multiple defaultValue="design" />
// @ts-expect-error Select all is specific to multi selection.
const wrongSingleBulk = <Dropdown options={options} showSelectAll />
// @ts-expect-error Array callbacks are specific to multi selection.
const wrongSingleCallback = <Dropdown options={options} onValueChange={(next: string[]) => void next} />
// @ts-expect-error Scalar callbacks cannot handle multi selection.
const wrongMultiCallback = <Dropdown options={options} multiple onValueChange={(next: string | null) => void next} />
void [wrongTextareaRef, wrongDropdownRef, wrongInputRef, wrongInputRows, wrongTextareaSlot,
  wrongTextareaType, wrongTextareaOptions, wrongDropdownSlot, wrongDropdownVariant,
  wrongTextareaVariant, wrongDropdownOnChange,
  missingOptions, wrongSingleValue, wrongMultiValue, wrongMultiDefault, wrongSingleBulk,
  wrongSingleCallback, wrongMultiCallback]
