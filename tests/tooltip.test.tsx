// @vitest-environment jsdom
import axe from 'axe-core'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tooltip } from '../src/components/Tooltip'
import { TermLink, TermTooltipProvider } from '../src/components/TermTooltip'
import type { TermRegistry } from '../src/components/TermTooltip'

const terms: TermRegistry = {
  first: { title: 'First', body: <p>Continue to <TermLink term="second">second</TermLink>.</p> },
  second: { title: 'Second', body: <p>Return to <TermLink term="first">first</TermLink>.</p> },
  sibling: { title: 'Sibling', body: <p>A neighboring definition.</p> },
}

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Example({ maxDepth }: { maxDepth?: number }) {
  return (
    <TermTooltipProvider terms={terms} maxDepth={maxDepth}>
      <main>
        <p>Read <TermLink term="first">first</TermLink> or <TermLink term="sibling">sibling</TermLink>.</p>
        <button type="button">Outside</button>
      </main>
    </TermTooltipProvider>
  )
}

describe('Tooltip', () => {
  it('shows a short hint when its trigger receives focus', () => {
    render(<Tooltip content="Short help"><button type="button">Help</button></Tooltip>)
    fireEvent.focus(screen.getByRole('button', { name: 'Help' }))
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toContain('Short help')
    expect(screen.getByRole('button', { name: 'Help' }).getAttribute('aria-describedby')).toBe(tooltip.id)
  })
})

describe('TermTooltipProvider', () => {
  it('opens after the hover delay and locks after the dwell delay', () => {
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'first' })
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse', clientX: 10, clientY: 10 })
    act(() => vi.advanceTimersByTime(199))
    expect(screen.queryByRole('dialog', { name: 'First' })).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByLabelText('Locked open')).not.toBeNull()
  })

  it('does not replace a locked term while crossing a sibling', () => {
    render(<Example />)
    const first = screen.getByRole('button', { name: 'first' })
    const sibling = screen.getByRole('button', { name: 'sibling' })
    fireEvent.click(first)
    fireEvent.pointerLeave(first, { pointerType: 'mouse' })
    fireEvent.pointerEnter(sibling, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.pointerLeave(sibling, { pointerType: 'mouse' })
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Sibling' })).toBeNull()
  })

  it('closes an abandoned locked panel after grace', () => {
    render(<Example />)
    const first = screen.getByRole('button', { name: 'first' })
    fireEvent.click(first)
    fireEvent.pointerLeave(first, { pointerType: 'mouse', clientX: 500, clientY: 500 })
    act(() => vi.advanceTimersByTime(250))
    expect(screen.queryByRole('dialog', { name: 'First' })).toBeNull()
  })

  it('holds a locked term inside the travel corridor until the pointer deliberately leaves it', () => {
    render(<Example />)
    const first = screen.getByRole('button', { name: 'first' })
    const sibling = screen.getByRole('button', { name: 'sibling' })
    fireEvent.click(first)
    const panel = screen.getByRole('dialog', { name: 'First' })
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      x: 40, y: 40, width: 160, height: 160, left: 40, top: 40, right: 200, bottom: 200, toJSON: () => ({}),
    } as DOMRect)
    fireEvent.pointerLeave(first, { pointerType: 'mouse', clientX: 50, clientY: 20 })
    fireEvent.pointerEnter(sibling, { pointerType: 'mouse', clientX: 60, clientY: 30 })
    fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 60, clientY: 30 })
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Sibling' })).toBeNull()
    fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 300, clientY: 30 })
    act(() => vi.advanceTimersByTime(50))
    expect(screen.getByRole('dialog', { name: 'Sibling' })).not.toBeNull()
  })

  it('starts the close grace when pointer travel leaves the corridor without entering the panel', () => {
    render(<Example />)
    const first = screen.getByRole('button', { name: 'first' })
    fireEvent.click(first)
    const panel = screen.getByRole('dialog', { name: 'First' })
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      x: 40, y: 40, width: 160, height: 160, left: 40, top: 40, right: 200, bottom: 200, toJSON: () => ({}),
    } as DOMRect)
    fireEvent.pointerLeave(first, { pointerType: 'mouse', clientX: 50, clientY: 20 })
    fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 60, clientY: 30 })
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
    fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 300, clientY: 30 })
    act(() => vi.advanceTimersByTime(250))
    expect(screen.queryByRole('dialog', { name: 'First' })).toBeNull()
  })

  it('closes one level on Escape and restores focus, then closes on outside press', () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'first' }))
    const second = screen.getByRole('button', { name: 'second' })
    fireEvent.click(second)
    expect(screen.getByRole('dialog', { name: 'Second' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Second' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
    expect(document.activeElement).toBe(second)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('dialog', { name: 'First' })).toBeNull()
  })

  it('closes descendants from the deepest level upward after pointer exit', () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'first' }))
    fireEvent.click(screen.getByRole('button', { name: 'second' }))
    const secondPanel = screen.getByRole('dialog', { name: 'Second' })
    fireEvent.pointerLeave(secondPanel, { pointerType: 'mouse', clientX: 500, clientY: 500 })
    act(() => vi.advanceTimersByTime(250))
    expect(screen.queryByRole('dialog', { name: 'Second' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
    act(() => vi.advanceTimersByTime(250))
    expect(screen.queryByRole('dialog', { name: 'First' })).toBeNull()
  })

  it('focuses an existing ancestor for a cycle and enforces max depth', () => {
    render(<Example maxDepth={2} />)
    fireEvent.click(screen.getByRole('button', { name: 'first' }))
    fireEvent.click(screen.getByRole('button', { name: 'second' }))
    expect(screen.getByText('first', { selector: 'strong' })).not.toBeNull()
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
  })

  it('reuses an ancestor panel when a nested term forms a cycle', () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'first' }))
    fireEvent.click(screen.getByRole('button', { name: 'second' }))
    const second = screen.getByRole('dialog', { name: 'Second' })
    fireEvent.click(within(second).getByRole('button', { name: 'first' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'First' }))
  })

  it('shows one sheet level at a time on touch screens with back navigation', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: true, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }))
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'first' }))
    fireEvent.click(screen.getByRole('button', { name: 'second' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Second' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back to previous term' }))
    expect(screen.getByRole('dialog', { name: 'First' })).not.toBeNull()
  })

  it('has no axe violations in the open state', async () => {
    vi.useRealTimers()
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'first' }))
    const result = await axe.run(document.body)
    expect(result.violations).toEqual([])
  })
})
