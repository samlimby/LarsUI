import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'SVGElement', 'Element', 'Node', 'Document', 'DocumentFragment', 'MutationObserver', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = globalThis.ResizeObserver
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let reduceMotion = false
window.matchMedia = () => ({ matches: reduceMotion, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
globalThis.DOMMatrixReadOnly = class {
  constructor(transform) { this.m41 = Number(transform.match(/matrix\(1, 0, 0, 1, ([^,]+), 0\)/)?.[1] ?? 0) }
}

// JSDOM has no layout or WAAPI. Supply measurable resting layouts and an
// interruptible animation clock; assertions below exercise the built public API.
let animations = []
const running = element => animations.findLast(animation => animation.target === element && animation.playState === 'running')
const valueAt = (animation, property, fallback) => animation
  ? parseFloat(animation.frames[0][property]) + (parseFloat(animation.frames[1][property]) - parseFloat(animation.frames[0][property])) * animation.progress
  : fallback
HTMLElement.prototype.animate = function (frames, timing) {
  const animation = { target: this, frames, timing, progress: 0, playState: 'running', cancel() { this.playState = 'idle' } }
  animations.push(animation)
  return animation
}
const nativeStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = element => new Proxy(nativeStyle(element), {
  get(style, property) {
    const button = element.closest('.lars-button')
    if (button && (property === 'paddingLeft' || property === 'paddingRight')) {
      return `${valueAt(running(button), property, button.classList.contains('lars-button--icon-only') ? 12 : 24)}px`
    }
    if (property === 'transform' && running(element)?.frames[0].transform) {
      const animation = running(element)
      const from = parseFloat(animation.frames[0].transform.slice('translateX('.length))
      return `matrix(1, 0, 0, 1, ${from * (1 - animation.progress)}, 0)`
    }
    const value = Reflect.get(style, property, style)
    return typeof value === 'function' ? value.bind(style) : value
  },
})
globalThis.getComputedStyle = window.getComputedStyle
const bounds = function () {
  const button = this.closest('.lars-button')
  if (!button) return { x: 0, y: 0, width: 0, height: 0 }
  const iconOnly = button.classList.contains('lars-button--icon-only')
  const loading = button.classList.contains('lars-button--loading')
  const width = valueAt(running(button), 'width', iconOnly ? 44 : loading ? 132 : 110)
  if (this === button) return { x: 100 - width / 2, y: 0, width, height: 44 }
  const content = this.closest('.lars-button__idle, .lars-button__status')
  const animation = running(content)
  const translation = animation ? parseFloat(animation.frames[0].transform.slice('translateX('.length)) * (1 - animation.progress) : 0
  const anchorOffset = iconOnly ? 0 : content?.classList.contains('lars-button__status') ? -30 : 21
  return { x: 90 + anchorOffset + translation, y: 12, width: 20, height: 20 }
}
HTMLElement.prototype.getBoundingClientRect = bounds
SVGElement.prototype.getBoundingClientRect = bounds

const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { Button } = await import('../dist/index.js')
let host, root
beforeEach(() => {
  animations = []
  reduceMotion = false
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => { await act(() => root.unmount()); host.remove() })
const render = (props = {}) => act(() => root.render(h(Button, { size: 'large', 'aria-label': 'View', ...props },
  h('span', { key: 'label', className: 'lars-button__label', 'aria-hidden': props.iconOnly || undefined }, 'View'),
  h('span', { key: 'icon', className: 'lars-button__icon', 'aria-hidden': true }, h('svg')),
)))

test('icon-only toggles coordinate width, padding and icon position without replacing the button', async () => {
  await render()
  const button = host.querySelector('button')
  const icon = button.querySelector('svg')
  button.focus()
  await render({ iconOnly: true })
  assert.equal(host.querySelector('button'), button)
  assert.equal(button.querySelector('svg'), icon)
  assert.equal(document.activeElement, button)
  assert.deepEqual(animations[0].frames.map(frame => frame.width), ['110px', '44px'])
  assert.deepEqual(animations[0].frames.map(frame => frame.paddingLeft), ['24px', '12px'])
  assert.deepEqual(animations[1].frames.map(frame => frame.transform), ['translateX(21px)', 'translateX(0)'])
  assert.deepEqual(animations[0].timing, animations[1].timing)
  assert.equal(button.getAttribute('aria-label'), 'View')
  assert.equal(button.querySelector('.lars-button__label').getAttribute('aria-hidden'), 'true')
})

test('a reversal starts from the current width, padding and visible icon position', async () => {
  await render()
  await render({ iconOnly: true })
  const [width, content] = animations
  width.progress = content.progress = 0.5
  await render()
  assert.equal(width.playState, 'idle')
  assert.equal(content.playState, 'idle')
  assert.equal(animations[2].frames[0].width, '77px')
  assert.equal(animations[2].frames[0].paddingLeft, '18px')
  assert.equal(animations[2].frames[0].minWidth, 0)
  // The expanded icon rests at +21px; its starting translation preserves +10.5px.
  assert.equal(animations[3].frames[0].transform, 'translateX(-10.5px)')
})

test('reduced motion applies the new layout without size or position animations', async () => {
  reduceMotion = true
  await render()
  await render({ iconOnly: true })
  await render()
  assert.equal(animations.length, 0)
  assert.equal(host.querySelector('button').getAttribute('aria-label'), 'View')
  assert.equal(host.querySelector('.lars-button__label').hasAttribute('aria-hidden'), false)
})

test('loading uses the same icon-only transition while retaining focus and blocking duplicate actions', async () => {
  let actions = 0
  const onClick = () => actions++
  await render({ onClick })
  const button = host.querySelector('button')
  button.focus()
  await render({ loading: true, onClick })
  assert.equal(animations[0].frames[1].width, '132px')
  animations[0].playState = 'finished'
  await render({ loading: true, iconOnly: true, onClick })
  assert.equal(animations.at(-1).target.className, 'lars-button__status')
  assert.equal(animations.at(-1).frames[0].transform, 'translateX(-30px)')
  await act(() => button.click())
  assert.equal(actions, 0)
  assert.equal(document.activeElement, button)
  assert.equal(button.getAttribute('aria-busy'), 'true')
  assert.equal(host.querySelector('[role="status"]').textContent, 'Loading')
})
