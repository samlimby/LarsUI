import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLButtonElement', 'HTMLFormElement', 'SVGElement', 'Element', 'Node', 'Document', 'DocumentFragment', 'MutationObserver', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
// JSDOM lacks PointerEvent; Base UI uses a pointer-typed click for keyboard activation.
window.PointerEvent ??= class PointerEvent extends window.MouseEvent {
  constructor(type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType ?? ''
  }
}
globalThis.PointerEvent = window.PointerEvent
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = globalThis.ResizeObserver
// ScrollArea inspects running browser animations; JSDOM has no Web Animations API.
window.HTMLElement.prototype.getAnimations ??= () => []
window.scrollTo = () => {}
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, createRef, useState, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { Input, Dropdown, Textarea, Table } = await import('../dist/index.js')
const fieldComponents = { text: Input, dropdown: Dropdown, textarea: Textarea, multiple: Dropdown }
let host, root
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(() => root.unmount()); host.remove() })
const options = [{ label: 'Design', value: 'design' }, { label: 'Engineering', value: 'engineering' }, { label: 'Unavailable', value: 'unavailable', disabled: true }]
const tableRows = [{ id: 'ada', name: 'Ada Lin' }]
const tableColumns = [{ key: 'name', header: 'Name' }]
const tableFixture = props => h(Table, { columns: tableColumns, rows: tableRows, getRowId: row => row.id, ...props })
const render = (element) => act(() => root.render(element))
const formValues = () => new dom.window.FormData(host.querySelector('form'))
async function waitForMotion(predicate, message) {
  const deadline = performance.now() + 1000
  while (!predicate() && performance.now() < deadline) {
    await act(() => new Promise(resolve => setTimeout(resolve, 20)))
  }
  assert.ok(predicate(), message)
}
const activateOption = (label) => act(() => {
  const item = [...document.querySelectorAll('[role="option"]')].find(option => option.textContent.includes(label))
  // Base UI differentiates explicit assistive activations from the synthetic
  // no-pointer clicks JSDOM produces. Include pointer data as browsers do.
  const event = new window.MouseEvent('click', { bubbles: true, detail: 0 })
  Object.defineProperty(event, 'pointerType', { value: '' })
  item.dispatchEvent(event)
})

for (const [name, variant, multiple] of [
  ['text', 'text', false],
  ['textarea', 'textarea', false],
  ['single dropdown', 'dropdown', false],
  ['multi dropdown', 'dropdown', true],
]) {
  test(`legacy Input ${name} preserves labels, refs, validation feedback, form edits and resets`, async () => {
    const ref = createRef()
    const changes = []
    const dropdown = variant === 'dropdown'
    const props = {
      variant, ref, name: 'legacy', label: 'Legacy field', required: true,
      ...(dropdown ? { options, multiple, defaultValue: multiple ? ['design'] : 'design' } : { defaultValue: 'Saved' }),
      helperText: 'Normal help.', onValueChange: value => changes.push(value),
    }
    const fixture = error => h('form', null, h(Input, { ...props, error, errorText: 'Check the value.' }))
    await render(fixture(false))
    const field = ref.current
    assert.equal(field.tagName, variant === 'text' ? 'INPUT' : variant === 'textarea' ? 'TEXTAREA' : 'BUTTON')
    assert.equal(field.labels[0].textContent, 'Legacy field *')
    assert.equal(field.labels[0].querySelector('[aria-hidden="true"]').textContent, ' *')
    assert.equal(field.hasAttribute('variant'), false)
    if (dropdown) {
      await act(() => field.click())
      await activateOption('Engineering')
    } else {
      const prototype = variant === 'text' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
      await act(() => {
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, 'Edited')
        field.dispatchEvent(new window.Event('input', { bubbles: true }))
      })
    }
    const editedValues = dropdown ? multiple ? ['design', 'engineering'] : ['engineering'] : ['Edited']
    assert.deepEqual(formValues().getAll('legacy'), editedValues)
    assert.deepEqual(changes, [dropdown ? multiple ? ['design', 'engineering'] : 'engineering' : 'Edited'])

    await render(fixture(true))
    assert.equal(ref.current, field)
    assert.equal(field.getAttribute('aria-invalid'), 'true')
    const errorHelp = host.querySelector('.lars-input__helper--error')
    assert.equal(errorHelp.textContent, 'Check the value.')
    assert.equal(field.getAttribute('aria-describedby'), errorHelp.id)
    assert.deepEqual(formValues().getAll('legacy'), editedValues)
    await act(() => host.querySelector('form').reset())
    assert.equal(ref.current, field)
    assert.deepEqual(formValues().getAll('legacy'), dropdown ? ['design'] : ['Saved'])
  })
}

test('legacy Input variant changes dispatch to the matching native control and update the ref', async () => {
  const ref = createRef()
  const fixture = variant => h(Input, {
    ref, variant, label: 'Changing field', name: 'changing',
    ...(variant === 'dropdown' ? { options, defaultValue: 'design' } : { defaultValue: 'Saved' }),
  })
  let previous
  for (const [variant, tagName] of [['text', 'INPUT'], ['textarea', 'TEXTAREA'], ['dropdown', 'BUTTON'], ['text', 'INPUT']]) {
    await render(fixture(variant))
    assert.equal(ref.current.tagName, tagName)
    assert.notEqual(ref.current, previous)
    assert.equal(ref.current.labels[0].textContent, 'Changing field')
    assert.equal(ref.current.hasAttribute('variant'), false)
    previous = ref.current
  }
})

async function glideFixture() {
  const previousMedia = window.matchMedia
  window.matchMedia = query => ({ matches: query === '(hover: hover) and (pointer: fine)', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
  await render(h('form', null, h(Dropdown, { name: 'team', options, defaultValue: 'design', defaultOpen: true })))
  const list = document.querySelector('.lars-input__list')
  const rows = [...list.querySelectorAll('[role="option"]')]
  // Mixed row heights inside a scaled popup exercise actual geometry, not size constants.
  const positions = [[0, 28], [28, 44], [72, 28]]
  rows.forEach((row, index) => {
    for (const [key, value] of Object.entries({ offsetLeft: 0, offsetTop: positions[index][0], offsetWidth: 280, offsetHeight: positions[index][1] })) {
      Object.defineProperty(row, key, { configurable: true, value })
    }
  })
  Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 100 })
  list.getBoundingClientRect = () => ({ top: 100, left: 0, width: 140, height: 50, bottom: 150, right: 140 })
  // Simulate the resize notification emitted after the popup gets its layout.
  await act(() => window.dispatchEvent(new window.Event('resize')))
  return {
    list, rows, highlight: list.querySelector('.lars-input__option-glide'),
    restore: () => { window.matchMedia = previousMedia },
    pointer: (localY, pointerType = 'mouse', type = 'pointermove') => act(() => {
      const event = new window.MouseEvent(type, { bubbles: true, clientY: 100 + localY / 2 })
      Object.defineProperty(event, 'pointerType', { value: pointerType })
      list.dispatchEvent(event)
    }),
  }
}

test('one glide highlight follows the nearest enabled option through scaled, mixed-height rows without selecting', async () => {
  const fixture = await glideFixture()
  try {
    await fixture.pointer(14)
    assert.equal(fixture.highlight.style.transform, 'translate3d(0px, 0px, 0)')
    await fixture.pointer(50)
    assert.equal(fixture.highlight.style.transform, 'translate3d(0px, 28px, 0)')
    assert.equal(fixture.highlight.style.height, '44px')
    await fixture.pointer(90)
    assert.equal(fixture.highlight.style.transform, 'translate3d(0px, 28px, 0)')
    assert.equal(fixture.list.querySelectorAll('.lars-input__option-glide').length, 1)
    assert.equal(formValues().get('team'), 'design')
    await act(() => fixture.list.dispatchEvent(new window.MouseEvent('pointerleave')))
    assert.equal(fixture.highlight.hasAttribute('data-visible'), false)
    await fixture.pointer(14)
    assert.equal(fixture.highlight.hasAttribute('data-visible'), true)
    assert.equal(fixture.highlight.hasAttribute('data-travel'), false)
  } finally { fixture.restore() }
})

test('keyboard navigation takes over from glide, preserves disabled options, and commits normally', async () => {
  const fixture = await glideFixture()
  try {
    await fixture.pointer(14)
    await act(() => fixture.rows[0].focus())
    await act(() => fixture.rows[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })))
    assert.equal(fixture.list.hasAttribute('data-glide-pointer'), false)
    assert.equal(fixture.highlight.hasAttribute('data-visible'), false)
    assert.equal(fixture.rows[1].hasAttribute('data-highlighted'), true)
    await act(() => fixture.rows[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })))
    assert.equal(fixture.rows[2].getAttribute('aria-disabled'), 'true')
    await activateOption('Unavailable')
    assert.equal(formValues().get('team'), 'design')
    await act(() => fixture.rows[2].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })))
    await activateOption('Engineering')
    assert.equal(formValues().get('team'), 'engineering')
  } finally { fixture.restore() }
})

test('touch activation clears an existing mouse glide without changing selection', async () => {
  const fixture = await glideFixture()
  try {
    await fixture.pointer(50)
    assert.equal(fixture.highlight.hasAttribute('data-visible'), true)
    await fixture.pointer(50, 'touch', 'pointerdown')
    assert.equal(fixture.list.hasAttribute('data-glide-pointer'), false)
    assert.equal(fixture.highlight.hasAttribute('data-visible'), false)
    assert.equal(formValues().get('team'), 'design')
  } finally { fixture.restore() }
})

test('glide follows the live rows when select-all is inserted and removed with stable options', async () => {
  const previousMedia = window.matchMedia
  window.matchMedia = query => ({ matches: query === '(hover: hover) and (pointer: fine)', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
  const defaults = ['design']
  const fixture = showSelectAll => h('form', null, h(Dropdown, {
    multiple: true, showSelectAll, options, defaultValue: defaults,
    defaultOpen: true, name: 'team', 'aria-label': 'Team',
  }))
  try {
    await render(fixture(false))
    const trigger = host.querySelector('[role="combobox"]')
    const list = document.querySelector('.lars-input__list')
    const highlight = list.querySelector('.lars-input__option-glide')
    let listHeight = 0
    Object.defineProperty(list, 'offsetHeight', { configurable: true, get: () => listHeight })
    list.getBoundingClientRect = () => ({ top: 100, left: 0, width: 140, height: listHeight / 2, bottom: 100 + listHeight / 2, right: 140 })
    const measureRows = async () => {
      let top = 0
      for (const row of list.querySelectorAll('[role="option"]')) {
        const height = row.textContent === 'Engineering' ? 44 : 28
        for (const [key, value] of Object.entries({ offsetLeft: 0, offsetTop: top, offsetWidth: 280, offsetHeight: height })) {
          Object.defineProperty(row, key, { configurable: true, value })
        }
        top += height
      }
      listHeight = top
      // JSDOM has no layout observer. Notify the hook after supplying the new geometry.
      await act(() => window.dispatchEvent(new window.Event('resize')))
    }
    const pointer = localY => act(() => {
      const event = new window.MouseEvent('pointermove', { bubbles: true, clientY: 100 + localY / 2 })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      list.dispatchEvent(event)
    })
    await measureRows()
    await pointer(14)
    assert.equal(highlight.style.transform, 'translate3d(0px, 0px, 0)')

    await render(fixture(true))
    await measureRows()
    assert.equal(document.querySelector('.lars-input__list'), list)
    assert.equal(host.querySelector('[role="combobox"]'), trigger)
    assert.match(list.querySelector('[role="option"]').textContent, /^All options/)
    assert.equal(highlight.style.transform, 'translate3d(0px, 0px, 0)', 'The retained pointer must target the newly inserted first row')
    assert.deepEqual(formValues().getAll('team'), ['design'])

    await render(fixture(false))
    await measureRows()
    assert.equal(list.querySelectorAll('[role="option"]').length, options.length)
    assert.equal(highlight.style.transform, 'translate3d(0px, 0px, 0)')
    await pointer(50)
    assert.equal(highlight.style.transform, 'translate3d(0px, 28px, 0)')
    assert.equal(highlight.style.height, '44px', 'The next row must use current geometry after select-all is removed')
    assert.deepEqual(formValues().getAll('team'), ['design'])
    await activateOption('Engineering')
    assert.deepEqual(formValues().getAll('team'), ['design', 'engineering'])
  } finally { window.matchMedia = previousMedia }
})

for (const variant of ['text', 'textarea']) {
  test(`${variant} forwards native fields and refs, participates in forms, and resets`, async () => {
    const ref = createRef()
    await render(h('form', null, h('label', { htmlFor: 'notes' }, 'Notes'), h(fieldComponents[variant], { id: 'notes', name: 'notes', defaultValue: 'Saved', maxLength: 80, required: true, ref, 'aria-describedby': 'hint' })))
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
      return h(fieldComponents[variant], { value, onChange: event => changes.push(event.currentTarget.value), onValueChange: next => { values.push(next); setValue(next) } })
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

for (const variant of ['text', 'dropdown', 'textarea']) {
  test(`${variant} helper text describes the native control, preserves refs and form values, and accepts a decorative icon`, async () => {
    const ref = createRef()
    const fieldProps = {
      ref, id: 'helped-field', name: 'helped', ...(variant === 'dropdown' ? { options } : {}),
      defaultValue: variant === 'dropdown' ? 'design' : 'Saved',
      helperText: 'Choose the value to save.',
      'aria-describedby': 'external-one external-two',
      className: 'consumer-field', style: { width: 280 },
    }
    const fixture = (props) => h('form', null,
      h('label', { htmlFor: 'helped-field' }, 'Helped field'),
      h('span', { id: 'external-one' }, 'First description.'),
      h('span', { id: 'external-two' }, 'Second description.'),
      h(fieldComponents[variant], props))
    await render(fixture(fieldProps))
    const field = ref.current
    const wrapper = host.querySelector('.lars-input-field')
    const helper = wrapper.querySelector('.lars-input__helper')
    assert.equal(field.tagName, variant === 'text' ? 'INPUT' : variant === 'textarea' ? 'TEXTAREA' : 'BUTTON')
    assert.equal(field.labels[0].textContent, 'Helped field')
    assert.equal(helper.textContent, 'Choose the value to save.')
    assert.equal(field.getAttribute('aria-describedby'), `external-one external-two ${helper.id}`)
    assert.equal(document.getElementById(helper.id), helper)
    assert.equal(wrapper.classList.contains('consumer-field'), true)
    assert.equal(wrapper.style.width, '280px')
    assert.equal(field.classList.contains('consumer-field'), false)
    assert.equal(field.style.width, '')
    assert.equal(wrapper.querySelector('.lars-input__helper-icon'), null)
    assert.equal(formValues().get('helped'), variant === 'dropdown' ? 'design' : 'Saved')
    assert.equal(host.querySelector('[helpertext], [helpericon]'), null)

    const helperId = helper.id
    await render(fixture({ ...fieldProps, helperText: 'Updated helper.', helperIcon: h('svg', { 'data-testid': 'helper-icon' }) }))
    const iconWrapper = host.querySelector('.lars-input__helper-icon')
    assert.equal(iconWrapper.getAttribute('aria-hidden'), 'true')
    assert.ok(iconWrapper.querySelector('[data-testid="helper-icon"]'))
    assert.equal(ref.current, field)
    assert.equal(host.querySelector('.lars-input__helper').id, helperId)
    assert.equal(field.getAttribute('aria-describedby'), `external-one external-two ${helperId}`)
    assert.equal(host.querySelector('[helpertext], [helpericon]'), null)
  })
}

test('empty helpers preserve the original control targets and strip helper-only props', async () => {
  for (const variant of ['text', 'dropdown', 'textarea']) {
    await render(h(fieldComponents[variant], {
      key: variant, ...(variant === 'dropdown' ? { options } : {}), className: 'consumer-control', style: { width: 240 },
      helperText: '  ', helperIcon: h('span', null, 'Decorative'), 'aria-describedby': 'external',
    }))
    const target = host.querySelector('.consumer-control')
    const field = host.querySelector(variant === 'text' ? 'input' : variant === 'textarea' ? 'textarea' : '[role="combobox"]')
    assert.equal(host.querySelector('.lars-input-field'), null)
    assert.equal(host.querySelector('.lars-input__helper'), null)
    assert.equal(target.parentElement.classList.contains('lars-input-field-shell'), true)
    assert.equal(target.classList.contains('consumer-control'), true)
    assert.equal(target.style.width, '240px')
    assert.equal(field.getAttribute('aria-describedby'), 'external')
    assert.equal(host.querySelector('[helpertext], [helpericon]'), null)
  }
})

for (const variant of ['text', 'textarea', 'dropdown', 'multiple']) {
  test(`${variant} replaces helper copy with an accessible error without replacing the focused control or submitted value`, async () => {
    const ref = createRef()
    const dropdown = variant === 'dropdown' || variant === 'multiple'
    const value = dropdown ? variant === 'multiple' ? ['design'] : 'design' : 'Saved value'
    const fieldProps = {
      ref, ...(dropdown ? { multiple: variant === 'multiple', options } : {}),
      name: 'validated', label: h('span', null, 'Validated field'), value,
      onChange: () => {}, onValueChange: () => {},
      'aria-describedby': 'external-one external-one external-two',
      helperIcon: h('span', { 'data-testid': 'normal-help-icon' }, 'Hint'),
    }
    const fixture = props => h('form', null,
      h('span', { id: 'external-one' }, 'First description.'),
      h('span', { id: 'external-two' }, 'Second description.'),
      h(fieldComponents[variant], { ...fieldProps, ...props }))
    await render(fixture({ helperText: 'Normal helper.' }))
    const field = ref.current
    const label = host.querySelector('label')
    const helper = host.querySelector('.lars-input__helper')
    const helperId = helper.id
    assert.equal(label.textContent, 'Validated field')
    assert.equal(label.htmlFor, field.id)
    assert.ok(field.id, 'An owned label should be associated with the native control')
    assert.ok([...field.labels].includes(label))
    assert.equal(field.getAttribute('aria-describedby'), `external-one external-two ${helperId}`)
    await act(() => field.focus())

    const assertControlPreserved = () => {
      assert.ok(ref.current === field, 'The native ref must remain stable while help changes')
      assert.ok(document.activeElement === field, 'The control must retain keyboard focus')
      assert.deepEqual(formValues().getAll('validated'), dropdown ? ['design'] : ['Saved value'])
      assert.equal(host.querySelector('[error], [errortext], [label], [helpertext], [helpericon]'), null)
    }

    await render(fixture({ helperText: 'Normal helper.', error: true, errorText: 'This value is invalid.' }))
    const errorHelp = host.querySelector('.lars-input__helper--error')
    assert.equal(host.querySelectorAll('.lars-input__helper').length, 1)
    assert.equal(errorHelp.id, helperId)
    assert.equal(errorHelp.textContent, 'This value is invalid.')
    assert.equal(errorHelp.getAttribute('role'), 'alert')
    assert.equal(errorHelp.getAttribute('aria-hidden'), null)
    assert.equal(host.querySelector('[data-testid="normal-help-icon"]'), null)
    assert.ok(errorHelp.querySelector('.lars-input__error-icon')?.closest('[aria-hidden="true"]'))
    assert.equal(field.getAttribute('aria-invalid'), 'true')
    assert.equal(field.getAttribute('aria-describedby'), `external-one external-two ${helperId}`)
    assert.equal(host.querySelector('.lars-input-field').hasAttribute('data-invalid'), true)
    assertControlPreserved()

    await render(fixture({ helperText: 'Normal helper.', error: false, errorText: 'This value is invalid.' }))
    assert.equal(host.querySelectorAll('.lars-input__helper').length, 1)
    assert.equal(host.querySelector('.lars-input__helper').textContent, 'HintNormal helper.')
    assert.equal(host.querySelector('[role="alert"]'), null)
    assert.equal(host.querySelector('.lars-input__error-icon'), null)
    assert.equal(field.hasAttribute('aria-invalid'), false)
    assert.equal(host.querySelector('.lars-input-field').hasAttribute('data-invalid'), false)
    assertControlPreserved()

    await render(fixture({ error: true, errorText: 'Another error.' }))
    assert.equal(host.querySelector('.lars-input__helper').textContent, 'Another error.')
    await waitForMotion(() => host.querySelector('.lars-input__helper').style.opacity === '1', 'Error help should appear before it is cleared')
    await render(fixture({ error: false }))
    const exitingHelp = host.querySelector('.lars-input__helper')
    assert.equal(exitingHelp.getAttribute('aria-hidden'), 'true')
    assert.equal(field.getAttribute('aria-describedby'), 'external-one external-one external-two')
    assert.equal(field.hasAttribute('aria-invalid'), false)
    assertControlPreserved()
    await waitForMotion(() => !host.querySelector('.lars-input__helper'), 'Clearing an error without helper text should remove the help')
    assertControlPreserved()
  })
}

test('error help supplies useful default copy, overrides a normal helper icon, and honors explicit control ids', async () => {
  await render(h(Input, {
    id: 'email-error', name: 'email', label: 'Email address', error: true, errorText: '  ',
    helperText: 'We will not share your email.', helperIcon: h('span', { 'data-testid': 'normal-help-icon' }),
    'aria-invalid': false,
  }))
  const field = host.querySelector('input')
  const help = host.querySelector('.lars-input__helper--error')
  assert.equal(field.id, 'email-error')
  assert.equal(field.labels[0].textContent, 'Email address')
  assert.equal(field.getAttribute('aria-invalid'), 'true')
  assert.equal(help.textContent, 'Please enter a valid value.')
  assert.equal(help.getAttribute('role'), 'alert')
  assert.equal(field.getAttribute('aria-describedby'), help.id)
  assert.equal(host.querySelector('[data-testid="normal-help-icon"]'), null)
  assert.ok(help.querySelector('.lars-input__error-icon'))
})

test('error copy remains inactive until error is enabled, while native aria-invalid remains supported', async () => {
  const props = { 'aria-label': 'Native invalid field', errorText: 'Only show on error.', 'aria-describedby': 'external' }
  await render(h(Input, props))
  assert.equal(host.querySelector('.lars-input__helper'), null)
  assert.equal(host.querySelector('input').hasAttribute('aria-invalid'), false)
  assert.equal(host.querySelector('input').getAttribute('aria-describedby'), 'external')
  assert.equal(host.querySelector('[error], [errortext], [label]'), null)

  await render(h(Input, { ...props, 'aria-invalid': true }))
  assert.equal(host.querySelector('input').getAttribute('aria-invalid'), 'true')
  assert.equal(host.querySelector('.lars-input__helper'), null)
  assert.equal(host.querySelector('[role="alert"]'), null)

  await render(h(Input, { ...props, error: true }))
  assert.equal(host.querySelector('.lars-input__helper--error').textContent, 'Only show on error.')
  assert.equal(host.querySelector('input').getAttribute('aria-invalid'), 'true')
})

for (const variant of ['text', 'textarea', 'dropdown', 'multiple']) {
  test(`${variant} preserves its uncontrolled value, native ref, and focus when helper text turns on and off`, async () => {
    const ref = createRef()
    const dropdown = variant === 'dropdown' || variant === 'multiple'
    const fieldProps = {
      ref, ...(dropdown ? { multiple: variant === 'multiple', options } : {}), name: 'saved',
      'aria-label': 'Saved field',
      defaultValue: dropdown ? variant === 'multiple' ? ['design'] : 'design' : 'Original',
      'aria-describedby': 'external', className: 'consumer-control', style: { width: 240 },
    }
    const fixture = (helperText) => h('form', null, h('span', { id: 'external' }, 'External description.'), h(fieldComponents[variant], { ...fieldProps, helperText }))
    await render(fixture(undefined))
    const field = ref.current
    if (dropdown) {
      await act(() => field.click())
      await activateOption('Engineering')
    } else {
      const prototype = variant === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      await act(() => {
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, 'User edit')
        field.dispatchEvent(new window.Event('input', { bubbles: true }))
      })
    }
    await act(() => field.focus())
    const expectedValue = dropdown ? variant === 'multiple' ? ['design', 'engineering'] : ['engineering'] : ['User edit']
    const assertControlPreserved = () => {
      assert.ok(ref.current === field, 'Native ref should keep pointing to the original control')
      assert.ok(document.activeElement === field, 'The original control should keep focus')
      assert.deepEqual(formValues().getAll('saved'), expectedValue)
      assert.equal(host.querySelectorAll('.consumer-control').length, 1)
      assert.equal(host.querySelector('.consumer-control').style.width, '240px')
    }
    assertControlPreserved()

    await render(fixture('This change is saved.'))
    const wrapper = host.querySelector('.lars-input-field')
    const helper = host.querySelector('.lars-input__helper')
    assert.equal(field.getAttribute('aria-describedby'), `external ${helper.id}`)
    assertControlPreserved()
    await waitForMotion(() => helper.style.opacity === '1', 'Helper should finish appearing before it is hidden')

    await render(fixture(undefined))
    assert.ok(host.querySelector('.lars-input__helper') === helper, 'Exiting helper should remain mounted for its fade')
    assert.equal(helper.getAttribute('aria-hidden'), 'true')
    assert.equal(field.getAttribute('aria-describedby'), 'external')
    assert.ok(host.querySelector('.consumer-control') === wrapper, 'Consumer sizing should stay on the field wrapper during exit')
    assertControlPreserved()
    await waitForMotion(() => !host.querySelector('.lars-input__helper'), 'Helper should unmount after fading out')
    assert.equal(wrapper.classList.contains('lars-input-field-shell'), true)
    assert.ok(host.querySelector('.consumer-control').parentElement === wrapper, 'Consumer sizing should return to the control after exit')
    assert.equal(field.getAttribute('aria-describedby'), 'external')
    assertControlPreserved()

    // Re-enabling during an exit must cancel removal without losing the saved
    // native control or moving consumer sizing off the active field wrapper.
    await render(fixture('First helper.'))
    const returningHelper = host.querySelector('.lars-input__helper')
    await waitForMotion(() => returningHelper.style.opacity === '1', 'Helper should be visible before testing an interrupted exit')
    await render(fixture(undefined))
    assert.equal(returningHelper.getAttribute('aria-hidden'), 'true')
    assert.equal(field.getAttribute('aria-describedby'), 'external')
    await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
    await render(fixture('Replacement helper.'))
    assert.ok(host.querySelector('.lars-input__helper') === returningHelper, 'Re-enabling should reuse the exiting helper')
    assert.equal(returningHelper.getAttribute('aria-hidden'), null)
    assert.equal(returningHelper.textContent, 'Replacement helper.')
    assert.equal(field.getAttribute('aria-describedby'), `external ${returningHelper.id}`)
    assertControlPreserved()
    await waitForMotion(() => returningHelper.style.opacity === '1', 'Re-enabled helper should finish appearing')
    // Give the canceled exit time to reach its former deadline before checking
    // that no stale completion callback releases the active field layout.
    await act(() => new Promise(resolve => setTimeout(resolve, 200)))
    assert.ok(host.querySelector('.lars-input__helper') === returningHelper, 'Canceled exit should not remove the re-enabled helper')
    assert.equal(wrapper.classList.contains('lars-input-field'), true)
    assert.ok(host.querySelector('.consumer-control') === wrapper, 'Re-enabled helper should keep consumer sizing on the field wrapper')
    assertControlPreserved()
  })
}

test('helper text coexists with leading and trailing slots and native clearing', async () => {
  const ref = createRef(), changes = []
  let actions = 0
  await render(h('form', null, h(Input, {
    ref, name: 'message', 'aria-label': 'Message', defaultValue: 'Hello', helperText: 'Keep the message brief.',
    leading: '$', trailing: h('button', { type: 'button', onClick: () => { actions++ } }, 'Copy'),
    onValueChange: value => changes.push(value),
  })))
  const fieldWrapper = host.querySelector('.lars-input-field')
  assert.equal(fieldWrapper.hasAttribute('data-leading-slot'), true)
  assert.equal(fieldWrapper.hasAttribute('data-trailing-slot'), true)
  assert.ok(host.querySelector('.lars-input__slot--leading'))
  assert.ok(host.querySelector('.lars-input__slot--trailing'))
  await act(() => host.querySelector('.lars-input__slot--trailing button').click())
  assert.equal(actions, 1)
  await act(() => host.querySelector('[aria-label="Clear input"]').click())
  assert.equal(ref.current.value, '')
  assert.equal(document.activeElement, ref.current)
  assert.deepEqual(changes, [''])
  assert.equal(formValues().get('message'), '')
  assert.equal(host.querySelector('.lars-input__helper').textContent, 'Keep the message brief.')
})

test('dropdown exposes its label and ref, submits option values, and resets its selection', async () => {
  const ref = createRef()
  await render(h('form', null, h('label', { htmlFor: 'team' }, 'Team'), h(Dropdown, { id: 'team', name: 'team', options, defaultValue: 'design', ref })))
  assert.equal(ref.current.getAttribute('role'), 'combobox')
  assert.equal(ref.current.labels[0].textContent, 'Team')
  assert.match(ref.current.textContent, /Design/)
  assert.ok(!host.querySelector('.lars-input__clear'))
  assert.equal(formValues().get('team'), 'design')
  await act(() => ref.current.click())
  const firstOption = document.querySelector('[role="option"]')
  assert.equal(firstOption.lastElementChild.classList.contains('lars-input__indicator-slot'), true)
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
    return h(Dropdown, { 'aria-label': 'Team', options, placeholder: 'Choose team', value, readOnly, onValueChange: next => { calls.push(next); setValue(next) } })
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
  await render(h('form', null, h(Dropdown, { name: 'team', options, defaultValue: 'design', disabled: true })))
  const trigger = host.querySelector('[role="combobox"]')
  assert.equal(trigger.disabled, true)
  assert.equal(formValues().has('team'), false)
})

for (const multiple of [false, true]) {
  test(`required ${multiple ? 'multi' : 'single'}-select delivers native invalid events once and can surface error feedback`, async () => {
    const ref = createRef()
    const calls = []
    const record = (name, event) => calls.push({ name, target: event.target, currentTarget: event.currentTarget, nativeEvent: event.nativeEvent, prevented: event.defaultPrevented })
    function Consumer() {
      const [error, setError] = useState(false)
      return h('form', {
        onInvalidCapture: event => record('form capture', event),
        onInvalid: event => record('form bubble', event),
      }, h(Dropdown, {
        ref, multiple, options, required: true, name: 'team', label: 'Team',
        helperText: 'Choose a team.', error, errorText: 'Select at least one team.',
        onInvalidCapture: event => { event.preventDefault(); record('input capture', event) },
        onInvalid: event => { record('input bubble', event); setError(true) },
        onValueChange: () => setError(false),
      }))
    }
    await render(h(Consumer))
    const form = host.querySelector('form')
    const trigger = ref.current
    const validationInput = host.querySelector('input')
    await act(() => trigger.focus())
    let valid
    await act(() => { valid = form.checkValidity() })
    assert.equal(valid, false)
    assert.deepEqual(calls.map(call => call.name), ['form capture', 'input capture', 'input bubble', 'form bubble'])
    assert.ok(calls.every(call => call.target === validationInput), 'Callbacks must preserve the original validation target')
    assert.ok(calls.every(call => call.nativeEvent === calls[0].nativeEvent), 'Validation must use one original native event')
    assert.deepEqual(calls.map(call => call.currentTarget), [form, trigger, trigger, form])
    assert.deepEqual(calls.map(call => call.prevented), [false, true, true, true])
    assert.equal(ref.current, trigger)
    assert.equal(document.activeElement, trigger)
    assert.equal(trigger.getAttribute('aria-invalid'), 'true')
    assert.equal(host.querySelector('.lars-input__helper--error').textContent, 'Select at least one team.')

    await act(() => trigger.click())
    await activateOption('Design')
    await act(() => { valid = form.checkValidity() })
    assert.equal(valid, true)
    assert.equal(calls.length, 4, 'A valid selection must not produce additional invalid callbacks')
    assert.deepEqual(formValues().getAll('team'), ['design'])
    assert.equal(host.querySelector('.lars-input__helper--error'), null)
    assert.equal(host.querySelector('.lars-input__helper').textContent, 'Choose a team.')
  })

  test(`${multiple ? 'multi' : 'single'}-select invalid callbacks honor propagation cancellation`, async () => {
    for (const stopAt of ['capture', 'bubble']) {
      const ref = createRef()
      const calls = []
      await render(h('form', {
        key: stopAt,
        onInvalidCapture: () => calls.push('form capture'),
        onInvalid: () => calls.push('form bubble'),
      }, h(Dropdown, {
        ref, multiple, options, required: true, 'aria-label': 'Team',
        onInvalidCapture: event => { calls.push('input capture'); if (stopAt === 'capture') event.stopPropagation() },
        onInvalid: event => { calls.push('input bubble'); if (stopAt === 'bubble') event.stopPropagation() },
      })))
      let valid
      await act(() => { valid = host.querySelector('form').checkValidity() })
      assert.equal(valid, false)
      assert.deepEqual(calls, stopAt === 'capture' ? ['form capture', 'input capture'] : ['form capture', 'input capture', 'input bubble'])
    }
  })
}

for (const kind of ['text', 'single', 'multiple']) {
  test(`${kind} resets through an external form mounted later and honors canceled resets`, async () => {
    const ref = createRef()
    const defaults = ['design']
    const calls = []
    const formId = `late-form-${kind}`
    let cancelReset = true
    const inputProps = kind === 'text'
      ? { defaultValue: 'Saved' }
      : { multiple: kind === 'multiple', options, defaultValue: kind === 'multiple' ? defaults : 'design', defaultOpen: true }
    const fixture = showForm => h('div', null,
      h(kind === 'text' ? Input : Dropdown, { ...inputProps, ref, name: 'saved', form: formId, 'aria-label': 'Saved field', onValueChange: value => calls.push(value) }),
      showForm && h('form', { id: formId, onReset: event => { if (cancelReset) event.preventDefault() } }),
      h('form', { 'data-unrelated-form': true }),
    )
    await render(fixture(false))
    const control = ref.current
    if (kind === 'text') await act(() => host.querySelector('[aria-label="Clear input"]').click())
    else await activateOption('Engineering')
    await render(fixture(true))
    let form = document.getElementById(formId)
    const edited = kind === 'text' ? [''] : kind === 'multiple' ? ['design', 'engineering'] : ['engineering']
    const submitted = () => new dom.window.FormData(form).getAll('saved')
    const changesBeforeReset = calls.length
    assert.equal(ref.current, control)
    assert.deepEqual(submitted(), edited)
    await act(() => host.querySelector('[data-unrelated-form]').reset())
    assert.deepEqual(submitted(), edited, 'Resetting an unrelated form must leave the associated control alone')
    await act(() => form.reset())
    assert.deepEqual(submitted(), edited, 'A prevented reset must preserve the edited value')
    if (kind === 'text') assert.equal(host.querySelector('[aria-label="Clear input"]'), null)

    cancelReset = false
    const originalForm = form
    await render(fixture(false))
    await render(fixture(true))
    form = document.getElementById(formId)
    assert.notEqual(form, originalForm, 'The replacement must be a new form with the same id')
    await act(() => form.reset())
    assert.equal(ref.current, control, 'Connecting and resetting a later form must preserve the control')
    assert.deepEqual(submitted(), kind === 'text' ? ['Saved'] : ['design'])
    assert.equal(calls.length, changesBeforeReset, 'Reset must not be reported as a user edit')
    if (kind === 'text') assert.ok(host.querySelector('[aria-label="Clear input"]'), 'Reset must restore populated/clearable state as well as the DOM value')
    else assert.equal(control.querySelector('.lars-input__value').textContent, 'Design')
  })

  test(`controlled ${kind} keeps consumer state when its later external form resets`, async () => {
    const ref = createRef()
    const calls = []
    const formId = `late-controlled-${kind}`
    function Consumer({ showForm }) {
      const [value, setValue] = useState(kind === 'text' ? 'Saved' : kind === 'multiple' ? ['design'] : 'design')
      return h('div', null,
        h(kind === 'text' ? Input : Dropdown, {
          ref, name: 'saved', form: formId, 'aria-label': 'Saved field', value,
          ...(kind === 'text' ? {} : { multiple: kind === 'multiple', options, defaultOpen: true }),
          onValueChange: next => { calls.push(next); setValue(next) },
        }),
        showForm && h('form', { id: formId }),
      )
    }
    await render(h(Consumer, { showForm: false }))
    const control = ref.current
    if (kind === 'text') {
      await act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(control, 'Edited')
        control.dispatchEvent(new window.Event('input', { bubbles: true }))
      })
    } else await activateOption('Engineering')
    await render(h(Consumer, { showForm: true }))
    const form = host.querySelector('form')
    const edited = kind === 'text' ? ['Edited'] : kind === 'multiple' ? ['design', 'engineering'] : ['engineering']
    const changesBeforeReset = calls.length
    assert.deepEqual(new dom.window.FormData(form).getAll('saved'), edited)
    await act(() => form.reset())
    assert.equal(ref.current, control)
    assert.deepEqual(new dom.window.FormData(form).getAll('saved'), edited)
    assert.equal(calls.length, changesBeforeReset)
  })
}

for (const multiple of [false, true]) {
  test(`${multiple ? 'multi' : 'single'}-select associates option subtext without adding it to selected labels or values`, async () => {
    const describedOptions = options.map(option => ({
      ...option,
      ...(option.value === 'design' ? { description: 'Create thoughtful product experiences' } : {}),
      ...(option.value === 'engineering' ? { description: 'Build reliable software' } : {}),
    }))
    await render(h('form', null, h(Dropdown, {
      multiple, name: 'team', 'aria-label': 'Team', options: describedOptions,
      defaultValue: multiple ? ['design'] : 'design', defaultOpen: true,
    })))
    const trigger = host.querySelector('[role="combobox"]')
    const item = label => [...document.querySelectorAll('[role="option"]')].find(option =>
      document.getElementById(option.getAttribute('aria-labelledby'))?.textContent === label)
    for (const option of describedOptions.filter(option => option.description)) {
      const row = item(option.label)
      const description = document.getElementById(row.getAttribute('aria-describedby'))
      assert.equal(description.textContent, option.description)
      assert.equal(row.contains(description), true)
      assert.equal(description.classList.contains('lars-input__option-description'), true)
      assert.equal(row.children[multiple ? 0 : row.children.length - 1].classList.contains('lars-input__indicator-slot'), true)
    }
    assert.equal(item('Unavailable').hasAttribute('aria-describedby'), false)
    assert.equal(item('Unavailable').querySelector('.lars-input__option-description'), null)
    assert.equal(trigger.textContent, 'Design')
    if (multiple) assert.equal(bulkOption().querySelector('.lars-input__option-description'), null)

    await activateOption('Engineering')
    assert.equal(trigger.textContent, multiple ? 'Design, Engineering' : 'Engineering')
    assert.deepEqual(formValues().getAll('team'), multiple ? ['design', 'engineering'] : ['engineering'])
    assert.equal(trigger.getAttribute('aria-expanded'), String(multiple))
    if (multiple) {
      assert.equal(item('Design').getAttribute('aria-selected'), 'true')
      assert.equal(item('Engineering').getAttribute('aria-selected'), 'true')
      await activateOption('All options')
      assert.deepEqual(formValues().getAll('team'), [])
      assert.equal(trigger.textContent, 'Select an option')
    }
  })
}

test('uncontrolled multi-select toggles independent options without closing, submits each value, and resets', async () => {
  await render(h('form', null, h('label', { htmlFor: 'team' }, 'Team'), h(Dropdown, {
    multiple: true, id: 'team', name: 'team', options,
    defaultValue: ['design'], defaultOpen: true,
  })))
  const trigger = host.querySelector('[role="combobox"]')
  const listbox = document.querySelector('[role="listbox"]')
  const item = (label) => [...document.querySelectorAll('[role="option"]')].find(option => option.textContent.includes(label))
  assert.equal(trigger.labels[0].textContent, 'Team')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.equal(listbox.getAttribute('aria-multiselectable'), 'true')
  assert.deepEqual(formValues().getAll('team'), ['design'])
  assert.equal(item('Design').getAttribute('aria-selected'), 'true')
  assert.equal(item('Engineering').getAttribute('aria-selected'), 'false')
  assert.equal(item('Design').firstElementChild.classList.contains('lars-input__indicator-slot'), true)
  assert.equal(item('Design').lastElementChild.textContent, 'Design')
  assert.ok(item('Design').querySelector('.lars-input__indicator-slot > .lars-input__check--multiple[data-selected]'))

  await activateOption('Engineering')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.deepEqual(formValues().getAll('team'), ['design', 'engineering'])
  assert.equal(item('Engineering').getAttribute('aria-selected'), 'true')
  assert.ok(item('Engineering').querySelector('.lars-input__indicator-slot > .lars-input__check--multiple[data-selected]'))
  assert.match(trigger.textContent, /Design, Engineering/)

  await activateOption('Unavailable')
  assert.deepEqual(formValues().getAll('team'), ['design', 'engineering'])
  await activateOption('Design')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.deepEqual(formValues().getAll('team'), ['engineering'])
  assert.equal(item('Design').getAttribute('aria-selected'), 'false')

  await act(() => host.querySelector('form').reset())
  assert.deepEqual(formValues().getAll('team'), ['design'])
  assert.equal(item('Design').getAttribute('aria-selected'), 'true')
  assert.equal(item('Engineering').getAttribute('aria-selected'), 'false')
})

test('controlled multi-select reports arrays and reflects parent updates', async () => {
  const changes = []
  function Consumer() {
    const [value, setValue] = useState(['design'])
    return h('form', null, h(Dropdown, {
      multiple: true, name: 'team', 'aria-label': 'Team',
      options, value, defaultOpen: true,
      onValueChange: next => { changes.push(next); setValue(next) },
    }))
  }
  await render(h(Consumer))
  const trigger = host.querySelector('[role="combobox"]')
  await activateOption('Engineering')
  assert.deepEqual(changes, [['design', 'engineering']])
  assert.deepEqual(formValues().getAll('team'), ['design', 'engineering'])
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  await activateOption('Design')
  assert.deepEqual(changes, [['design', 'engineering'], ['engineering']])
  assert.deepEqual(formValues().getAll('team'), ['engineering'])
  assert.match(trigger.textContent, /Engineering/)
})

const bulkOption = () => [...document.querySelectorAll('[role="option"]')].find(option => option.textContent.includes('All options'))
const assertBulkState = (selected, total, state) => {
  const item = bulkOption()
  assert.ok(item)
  assert.equal(document.querySelector('[role="option"]'), item)
  assert.match(item.textContent.replace(/\s+/g, ' '), new RegExp(`All options\\s*\\(${selected} of ${total}\\)`))
  assert.equal(item.getAttribute('aria-selected'), String(state === 'checked'))
  assert.equal(item.getAttribute('data-state'), state)
}

test('multi-select can hide select-all while preserving independent selection, keyboard navigation, and reset', async () => {
  const changes = []
  await render(h('form', null, h(Dropdown, {
    multiple: true, showSelectAll: false, name: 'team', 'aria-label': 'Team',
    options, defaultValue: ['design'], defaultOpen: true,
    onValueChange: next => changes.push(next),
  })))
  const trigger = host.querySelector('[role="combobox"]')
  const rows = [...document.querySelectorAll('[role="option"]')]
  assert.equal(bulkOption(), undefined)
  assert.deepEqual(rows.map(row => row.textContent), options.map(option => option.label))
  assert.equal(trigger.hasAttribute('showSelectAll'), false)

  await act(() => rows[1].focus())
  await act(() => rows[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })))
  assert.equal(rows[0].hasAttribute('data-highlighted'), true)
  await activateOption('Engineering')
  await activateOption('Design')
  await activateOption('Unavailable')
  assert.deepEqual(changes, [['design', 'engineering'], ['engineering']])
  assert.deepEqual(formValues().getAll('team'), ['engineering'])
  assert.equal(trigger.textContent, 'Engineering')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')

  await act(() => host.querySelector('form').reset())
  assert.deepEqual(formValues().getAll('team'), ['design'])
  assert.equal(trigger.textContent, 'Design')
  assert.equal(bulkOption(), undefined)
})

test('changing select-all visibility while open preserves the selected values and bulk state', async () => {
  const changes = []
  const consumer = showSelectAll => h('form', null, h(Dropdown, {
    multiple: true, showSelectAll, name: 'team', 'aria-label': 'Team',
    options, defaultValue: ['design'], defaultOpen: true,
    onValueChange: next => changes.push(next),
  }))
  await render(consumer(false))
  await activateOption('Engineering')
  await render(consumer(true))
  assertBulkState(2, 2, 'checked')
  assert.deepEqual(formValues().getAll('team'), ['design', 'engineering'])
  await activateOption('All options')
  assert.deepEqual(changes.at(-1), [])
  await render(consumer(false))
  assert.equal(bulkOption(), undefined)
  await activateOption('Design')
  assert.deepEqual(formValues().getAll('team'), ['design'])
  assert.deepEqual(changes, [['design', 'engineering'], [], ['design']])
})

test('multi-select all toggles enabled options, reports partial counts, stays open, and resets', async () => {
  const changes = []
  await render(h('form', null, h(Dropdown, {
    multiple: true, name: 'team', 'aria-label': 'Team',
    options, defaultValue: ['design'], defaultOpen: true,
    onValueChange: next => changes.push(next),
  })))
  const trigger = host.querySelector('[role="combobox"]')
  assertBulkState(1, 2, 'indeterminate')

  await activateOption('All options')
  assertBulkState(2, 2, 'checked')
  assert.deepEqual(formValues().getAll('team').sort(), ['design', 'engineering'])
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.deepEqual([...changes.at(-1)].sort(), ['design', 'engineering'])
  assert.doesNotMatch(trigger.textContent, /All options/)

  await activateOption('All options')
  assertBulkState(0, 2, 'unchecked')
  assert.deepEqual(formValues().getAll('team'), [])
  assert.deepEqual(changes.at(-1), [])
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')

  await activateOption('Engineering')
  assertBulkState(1, 2, 'indeterminate')
  await act(() => host.querySelector('form').reset())
  assertBulkState(1, 2, 'indeterminate')
  assert.deepEqual(formValues().getAll('team'), ['design'])
})

for (const controlled of [false, true]) {
  test(`${controlled ? 'controlled' : 'uncontrolled'} select-all respects canceled value changes without leaking its internal value`, async () => {
    const changes = []
    let cancel = true
    function Consumer() {
      const [value, setValue] = useState(['design'])
      return h('form', null, h(Dropdown, {
        multiple: true, name: 'team', 'aria-label': 'Team', options, defaultOpen: true,
        ...(controlled ? { value } : { defaultValue: ['design'] }),
        onValueChange: (next, details) => {
          assert.equal(details.reason, 'item-press')
          assert.ok(details.event instanceof window.Event)
          assert.ok(next.every(value => ['design', 'engineering'].includes(value)))
          changes.push([...next])
          if (cancel) details.cancel()
          else if (controlled) setValue(next)
        },
      }))
    }
    await render(h(Consumer))
    await activateOption('All options')
    assert.deepEqual(changes[0].sort(), ['design', 'engineering'])
    assert.deepEqual(formValues().getAll('team'), ['design'])
    assertBulkState(1, 2, 'indeterminate')

    cancel = false
    await activateOption('All options')
    assert.deepEqual(formValues().getAll('team').sort(), ['design', 'engineering'])
    assertBulkState(2, 2, 'checked')

    cancel = true
    await activateOption('All options')
    assert.deepEqual(changes.at(-1), [])
    assert.deepEqual(formValues().getAll('team').sort(), ['design', 'engineering'])
    assertBulkState(2, 2, 'checked')

    cancel = false
    await activateOption('All options')
    assert.deepEqual(formValues().getAll('team'), [])
    assertBulkState(0, 2, 'unchecked')
  })
}

test('select-all preserves disabled and unknown selections while toggling available options', async () => {
  await render(h('form', null, h(Dropdown, {
    multiple: true, name: 'team', 'aria-label': 'Team', options,
    defaultValue: ['unavailable', 'legacy'], defaultOpen: true,
  })))
  assertBulkState(0, 2, 'unchecked')
  await activateOption('All options')
  assertBulkState(2, 2, 'checked')
  assert.deepEqual(formValues().getAll('team').sort(), ['design', 'engineering', 'legacy', 'unavailable'])
  await activateOption('All options')
  assertBulkState(0, 2, 'unchecked')
  assert.deepEqual(formValues().getAll('team'), ['unavailable', 'legacy'])
})

test('select-all is unavailable with no enabled options and respects disabled and read-only roots', async () => {
  for (const [key, available] of [['empty', []], ['all-disabled', [options[2]]]]) {
    const changes = []
    await render(h('form', null, h(Dropdown, {
      key, multiple: true, name: 'team', 'aria-label': 'Team',
      options: available, defaultOpen: true, onValueChange: next => changes.push(next),
    })))
    assertBulkState(0, 0, 'unchecked')
    assert.equal(bulkOption().getAttribute('aria-disabled'), 'true')
    await activateOption('All options')
    assert.deepEqual(changes, [])
    assert.deepEqual(formValues().getAll('team'), [])
  }
  for (const state of ['disabled', 'readOnly']) {
    const changes = []
    await render(h('form', null, h(Dropdown, {
      key: state, multiple: true, name: 'team', 'aria-label': 'Team', options,
      defaultValue: ['design'], defaultOpen: true, [state]: true,
      onValueChange: next => changes.push(next),
    })))
    await activateOption('All options')
    assert.deepEqual(changes, [])
    assertBulkState(1, 2, 'indeterminate')
    assert.deepEqual(formValues().getAll('team'), state === 'disabled' ? [] : ['design'])
  }
})

test('multi-select all participates in keyboard navigation and single-select has no bulk action', async () => {
  await render(h('form', null, h(Dropdown, {
    multiple: true, name: 'team', 'aria-label': 'Team', options, defaultOpen: true,
  })))
  const design = [...document.querySelectorAll('[role="option"]')].find(option => option.textContent === 'Design')
  await act(() => design.focus())
  await act(() => design.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })))
  assert.equal(bulkOption().hasAttribute('data-highlighted'), true)
  await act(() => bulkOption().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
  assertBulkState(2, 2, 'checked')
  assert.deepEqual(formValues().getAll('team').sort(), ['design', 'engineering'])
  await act(() => bulkOption().dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })))
  await act(() => bulkOption().dispatchEvent(new window.KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })))
  assertBulkState(0, 2, 'unchecked')
  assert.deepEqual(formValues().getAll('team'), [])

  await render(h(Dropdown, { key: 'single', 'aria-label': 'Team', options, defaultOpen: true }))
  assert.equal(bulkOption(), undefined)
  assert.equal(document.querySelectorAll('[role="option"]').length, options.length)
})

for (const controlled of [false, true]) {
  test(`${controlled ? 'controlled' : 'uncontrolled'} text clears through native change handlers without submitting, and keeps its ref and focus`, async () => {
    const ref = createRef(), changes = [], values = []
    let submits = 0
    function Consumer() {
      const [value, setValue] = useState('Saved')
      return h('form', { onSubmit: event => { event.preventDefault(); submits++ } },
        h(Input, {
          ref, name: 'notes', 'aria-label': 'Notes',
          ...(controlled ? { value } : { defaultValue: 'Saved' }),
          onChange: event => changes.push(event.currentTarget.value),
          onValueChange: next => { values.push(next); if (controlled) setValue(next) },
        }))
    }
    await render(h(Consumer))
    const field = ref.current
    const clear = host.querySelector('button[aria-label="Clear input"]')
    assert.equal(clear.type, 'button')
    await act(() => clear.click())
    assert.equal(ref.current, field)
    assert.equal(field.value, '')
    assert.equal(formValues().get('notes'), '')
    assert.equal(document.activeElement, field)
    assert.equal(host.querySelector('button[aria-label="Clear input"]'), null)
    assert.deepEqual(changes, [''])
    assert.deepEqual(values, [''])
    assert.equal(submits, 0)
    if (!controlled) {
      await act(() => host.querySelector('form').reset())
      assert.equal(field.value, 'Saved')
      assert.ok(host.querySelector('button[aria-label="Clear input"]'))
    }
  })

}

test('clear buttons are absent for empty, disabled, read-only and textarea controls', async () => {
  for (const variant of ['text', 'dropdown']) {
    const populated = { ...(variant === 'dropdown' ? { options } : {}), defaultValue: variant === 'dropdown' ? 'design' : 'Saved' }
    for (const state of [{ disabled: true }, { readOnly: true }]) {
      await render(h(fieldComponents[variant], { ...populated, ...state, key: `${variant}-${Object.keys(state)[0]}` }))
      assert.ok(!host.querySelector('.lars-input__clear'))
    }
    await render(h(fieldComponents[variant], { ...(variant === 'dropdown' ? { options } : {}), key: `${variant}-empty` }))
    assert.ok(!host.querySelector('.lars-input__clear'))
  }
  await render(h(Textarea, { defaultValue: 'Saved' }))
  assert.ok(!host.querySelector('.lars-input__clear'))
})

test('a native type change updates clearable state after the browser sanitizes the value', async () => {
  const ref = createRef()
  const calls = []
  const fixture = type => h(Input, { ref, type, defaultValue: 'Saved', 'aria-label': 'Value', onValueChange: value => calls.push(value) })
  await render(fixture('text'))
  const field = ref.current
  assert.equal(field.value, 'Saved')
  assert.ok(host.querySelector('[aria-label="Clear input"]'))
  await render(fixture('number'))
  assert.equal(ref.current, field)
  assert.equal(field.value, '', 'Changing to a numeric input must preserve native value sanitization')
  assert.equal(host.querySelector('[aria-label="Clear input"]'), null)
  assert.deepEqual(calls, [], 'Native sanitization must not invent a user edit callback')
})

test('leading and trailing slots keep the text field native, allow an action, and coexist with clear', async () => {
  const ref = createRef()
  let actions = 0
  let submits = 0
  await render(h('form', { onSubmit: event => { event.preventDefault(); submits++ } },
    h(Input, {
      ref, name: 'message', 'aria-label': 'Message', defaultValue: 'Hello',
      leading: '$',
      trailing: h('button', { type: 'button', 'aria-label': 'Copy message', onClick: () => { actions++ } }, 'Copy'),
    })))
  const wrapper = host.querySelector('.lars-input-wrapper')
  const field = ref.current
  assert.equal(wrapper.hasAttribute('data-leading-slot'), true)
  assert.equal(wrapper.hasAttribute('data-trailing-slot'), true)
  assert.equal(wrapper.children[0].classList.contains('lars-input__slot--leading'), true)
  assert.equal(wrapper.children[1], field)
  assert.equal(wrapper.lastElementChild.classList.contains('lars-input__slot--trailing'), true)
  assert.equal(formValues().get('message'), 'Hello')
  await act(() => host.querySelector('[aria-label="Copy message"]').click())
  assert.equal(actions, 1)
  assert.equal(submits, 0)
  await act(() => host.querySelector('[aria-label="Clear input"]').click())
  assert.equal(field.value, '')
  assert.equal(formValues().get('message'), '')
  assert.equal(document.activeElement, field)
  assert.ok(host.querySelector('[aria-label="Copy message"]'))
  await render(h(Input, { disabled: true, leading: '$', trailing: h('button', { type: 'button' }, 'Copy') }))
  assert.equal(host.querySelector('.lars-input__slot--leading').hasAttribute('inert'), true)
  assert.equal(host.querySelector('.lars-input__slot--trailing').hasAttribute('inert'), true)
})

for (const variant of ['default', 'compact', 'relaxed']) {
  test(`${variant} table row menu keeps action semantics and selection with the shared dropdown list`, async () => {
    const actions = []
    const selections = []
    await render(tableFixture({ variant, onRowAction: row => actions.push(row.id), onSelectedRowIdsChange: ids => selections.push(ids) }))
    const trigger = host.querySelector('[aria-label="Open row actions"]')
    await act(() => trigger.click())
    const popup = document.querySelector('.lars-table__action-menu')
    assert.equal(popup.getAttribute('role'), 'menu')
    assert.equal(document.querySelector('[role="listbox"]'), null)
    const items = [...popup.querySelectorAll('[role="menuitem"]')]
    assert.deepEqual(items.map(item => item.textContent), ['View details', 'Select row'])
    await act(() => items[1].click())
    assert.deepEqual(selections, [['ada']])
    assert.deepEqual(actions, [])
    await act(() => trigger.click())
    assert.equal(document.querySelectorAll('[role="menuitem"]')[1].textContent, 'Deselect row')
    await act(() => document.querySelector('[role="menuitem"]').click())
    assert.deepEqual(actions, ['ada'])
    assert.deepEqual(selections, [['ada']])
  })
}

test('table action hover uses the shared glide without firing actions, then yields immediately to keyboard navigation', async () => {
  const previousMedia = window.matchMedia
  window.matchMedia = query => ({ matches: query === '(hover: hover) and (pointer: fine)', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
  let actions = 0
  try {
    await render(tableFixture({ onRowAction: () => { actions++ } }))
    await act(() => host.querySelector('[aria-label="Open row actions"]').click())
    const list = document.querySelector('.lars-table__action-menu .lars-input__list')
    const items = [...list.querySelectorAll('[role="menuitem"]')]
    items.forEach((item, index) => {
      for (const [key, value] of Object.entries({ offsetLeft: 0, offsetTop: index * 30, offsetWidth: 150, offsetHeight: 30 })) {
        Object.defineProperty(item, key, { configurable: true, value })
      }
    })
    Object.defineProperty(list, 'offsetHeight', { configurable: true, value: 60 })
    list.getBoundingClientRect = () => ({ top: 100, left: 0, width: 150, height: 60, bottom: 160, right: 150 })
    await act(() => window.dispatchEvent(new window.Event('resize')))
    const pointer = y => {
      const event = new window.MouseEvent('pointermove', { bubbles: true, clientY: y })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      list.dispatchEvent(event)
    }
    await act(() => pointer(115))
    const highlight = list.querySelector('.lars-input__option-glide')
    assert.equal(highlight.style.transform, 'translate3d(0px, 0px, 0)')
    await act(() => pointer(145))
    assert.equal(highlight.style.transform, 'translate3d(0px, 30px, 0)')
    assert.equal(actions, 0)
    await act(() => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    assert.equal(highlight.hasAttribute('data-visible'), false)
    assert.equal(list.hasAttribute('data-glide-pointer'), false)
  } finally {
    window.matchMedia = previousMedia
  }
})

test('non-selectable table row menus only offer View details', async () => {
  await render(tableFixture({ selectable: false, onRowAction: () => {} }))
  await act(() => host.querySelector('[aria-label="Open row actions"]').click())
  assert.deepEqual([...document.querySelectorAll('[role="menuitem"]')].map(item => item.textContent), ['View details'])
})

test('table action keyboard navigation remains immediate and Escape restores the kebab trigger', async () => {
  let actions = 0
  await render(tableFixture({ onRowAction: () => { actions++ } }))
  const trigger = host.querySelector('[aria-label="Open row actions"]')
  const key = (target, value) => act(() => target.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
  await act(() => trigger.focus())
  await key(trigger, 'ArrowDown')
  await act(() => new Promise(resolve => setTimeout(resolve, 20)))
  const popup = document.querySelector('.lars-table__action-menu')
  assert.equal(popup.dataset.inputMotion, 'instant')
  const items = [...popup.querySelectorAll('[role="menuitem"]')]
  assert.equal(document.activeElement, items[0])
  await key(items[0], 'ArrowDown')
  assert.equal(document.activeElement, items[1])
  await key(items[1], 'Escape')
  await act(() => new Promise(resolve => setTimeout(resolve, 20)))
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, trigger)
  assert.equal(actions, 0)
})
