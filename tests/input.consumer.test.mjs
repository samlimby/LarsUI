import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLButtonElement', 'HTMLFormElement', 'Element', 'Node', 'Document', 'DocumentFragment', 'MutationObserver', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = globalThis.ResizeObserver
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, createRef, useState, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { Input } = await import('../dist/index.js')
let host, root
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(() => root.unmount()); host.remove() })
const options = [{ label: 'Design', value: 'design' }, { label: 'Engineering', value: 'engineering' }, { label: 'Unavailable', value: 'unavailable', disabled: true }]
const render = (element) => act(() => root.render(element))
const formValues = () => new dom.window.FormData(host.querySelector('form'))
const activateOption = (label) => act(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(option => option.textContent.includes(label))
  // Base UI differentiates explicit assistive activations from the synthetic
  // no-pointer clicks JSDOM produces. Include pointer data as browsers do.
  const event = new window.MouseEvent('click', { bubbles: true, detail: 0 })
  Object.defineProperty(event, 'pointerType', { value: '' })
  item.dispatchEvent(event)
})

for (const variant of ['text', 'textarea']) {
  test(`${variant} forwards native fields and refs, participates in forms, and resets`, async () => {
    const ref = createRef()
    await render(h('form', null, h('label', { htmlFor: 'notes' }, 'Notes'), h(Input, { variant, id: 'notes', name: 'notes', defaultValue: 'Saved', maxLength: 80, required: true, ref, 'aria-describedby': 'hint' })))
    const field = ref.current
    assert.equal(field.tagName, variant === 'text' ? 'INPUT' : 'TEXTAREA')
    assert.equal(field.labels[0].textContent, 'Notes')
    assert.equal(field.maxLength, 80)
    assert.equal(field.required, true)
    assert.equal(field.getAttribute('aria-describedby'), 'hint')
    field.value = 'Edited'
    assert.equal(formValues().get('notes'), 'Edited')
    await act(() => host.querySelector('form').reset())
    assert.equal(field.value, 'Saved')
  })

  test(`${variant} supports controlled changes without losing native onChange`, async () => {
    const values = [], changes = []
    function Consumer() {
      const [value, setValue] = useState('')
      return h(Input, { variant, value, onChange: event => changes.push(event.currentTarget.value), onValueChange: next => { values.push(next); setValue(next) } })
    }
    await render(h(Consumer))
    const field = host.querySelector(variant === 'text' ? 'input' : 'textarea')
    const prototype = variant === 'text' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
    await act(() => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, 'Hello')
      field.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    assert.equal(field.value, 'Hello')
    assert.deepEqual(values, ['Hello'])
    assert.deepEqual(changes, ['Hello'])
  })
}

test('dropdown exposes its label and ref, submits option values, and resets its selection', async () => {
  const ref = createRef()
  await render(h('form', null, h('label', { htmlFor: 'team' }, 'Team'), h(Input, { variant: 'dropdown', id: 'team', name: 'team', options, defaultValue: 'design', ref })))
  assert.equal(ref.current.getAttribute('role'), 'combobox')
  assert.equal(ref.current.labels[0].textContent, 'Team')
  assert.match(ref.current.textContent, /Design/)
  assert.equal(formValues().get('team'), 'design')
  await act(() => ref.current.click())
  await activateOption('Unavailable')
  assert.equal(formValues().get('team'), 'design')
  await activateOption('Engineering')
  assert.equal(formValues().get('team'), 'engineering')
  await act(() => host.querySelector('form').reset())
  assert.equal(formValues().get('team'), 'design')
})

test('dropdown placeholder, controlled selection and read-only state work together', async () => {
  let calls = []
  function Consumer({ readOnly = false }) {
    const [value, setValue] = useState(null)
    return h(Input, { variant: 'dropdown', 'aria-label': 'Team', options, placeholder: 'Choose team', value, readOnly, onValueChange: next => { calls.push(next); setValue(next) } })
  }
  await render(h(Consumer))
  const trigger = host.querySelector('[role="combobox"]')
  assert.match(trigger.textContent, /Choose team/)
  await act(() => trigger.click())
  await activateOption('Design')
  assert.match(trigger.textContent, /Design/)
  assert.deepEqual(calls, ['design'])
  await render(h(Consumer, { readOnly: true }))
  await act(() => trigger.click())
  assert.equal(trigger.getAttribute('aria-readonly'), 'true')
  if (trigger.getAttribute('aria-expanded') === 'true') await activateOption('Engineering')
  assert.match(trigger.textContent, /Design/)
  assert.deepEqual(calls, ['design'])
})

test('disabled dropdown is unavailable and omitted from form data', async () => {
  await render(h('form', null, h(Input, { variant: 'dropdown', name: 'team', options, defaultValue: 'design', disabled: true })))
  const trigger = host.querySelector('[role="combobox"]')
  assert.equal(trigger.disabled, true)
  assert.equal(formValues().has('team'), false)
})
