import { Popover } from '@base-ui/react/popover'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import './TermTooltip.css'

export type TermDefinition = {
  title: string
  body: ReactNode
  learnMore?: { href: string; label?: string }
  pageHref?: string
}

export type TermRegistry = Record<string, TermDefinition>
export type TermLockMode = 'pointer' | 'timer' | 'click' | 'pointer-or-timer'
export type TermTooltipProviderProps = {
  children: ReactNode
  terms?: TermRegistry
  resolveTerm?: (id: string) => TermDefinition | undefined
  openDelay?: number
  lockDelay?: number
  closeGrace?: number
  maxDepth?: number
  lockMode?: TermLockMode
}

type StackEntry = {
  id: string
  anchorEl: HTMLAnchorElement
  rectIndex: number
  locked: boolean
  depth: number
  panelId: string
}

type TermContextValue = {
  openDelay: number
  lockDelay: number
  closeGrace: number
  lockMode: TermLockMode
  maxDepth: number
  resolve: (id: string) => TermDefinition | undefined
  stack: StackEntry[]
  open: (id: string, anchorEl: HTMLAnchorElement, rectIndex: number, depth: number, lock: boolean) => void
  lock: (anchorEl: HTMLAnchorElement) => void
  leaveTrigger: (anchorEl: HTMLAnchorElement, depth: number, x: number, y: number) => void
  enterPanel: (depth: number) => void
  leavePanel: (depth: number, x: number, y: number) => void
  cancelClose: () => void
  inSafeCorridor: (x: number, y: number) => boolean
  closeTop: () => void
  closeAll: () => void
}

const TermContext = createContext<TermContextValue | null>(null)
const DepthContext = createContext(0)

function useTermContext() {
  const context = useContext(TermContext)
  if (!context) throw new Error('TermLink must be inside TermTooltipProvider')
  return context
}

function getLineIndex(element: Element, x: number, y: number) {
  const rects = Array.from(element.getClientRects())
  const matching = rects.findIndex((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
  return matching >= 0 ? matching : 0
}

function isVisible(rect: DOMRect) {
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth
}

function pointInTriangle(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const sign = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) =>
    (p.x - r.x) * (q.y - r.y) - (q.x - r.x) * (p.y - r.y)
  const point = { x, y }
  const d1 = sign(point, a, b)
  const d2 = sign(point, b, c)
  const d3 = sign(point, c, a)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

export function TermTooltipProvider({
  children,
  terms = {},
  resolveTerm,
  openDelay = 200,
  lockDelay = 700,
  closeGrace = 250,
  maxDepth = 4,
  lockMode = 'pointer',
}: TermTooltipProviderProps) {
  const instanceId = useId().replace(/:/g, '')
  const [stack, setStack] = useState<StackEntry[]>([])
  const [mobile, setMobile] = useState(false)
  const stackRef = useRef<StackEntry[]>([])
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPointer = useRef({ x: -1, y: -1 })
  const corridor = useRef<{ from: { x: number; y: number }; depth: number; until: number } | null>(null)
  const resolve = useCallback((id: string) => resolveTerm?.(id) ?? terms[id], [resolveTerm, terms])

  const commit = useCallback((next: StackEntry[]) => {
    stackRef.current = next
    setStack(next)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const inSafeCorridor = useCallback((x: number, y: number) => {
    const active = corridor.current
    if (!active || Date.now() > active.until) return false
    const panel = document.getElementById(stackRef.current[active.depth]?.panelId)
    if (!panel) return false
    const rect = panel.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true
    const { from } = active
    const pad = 8
    const centerX = (rect.left + rect.right) / 2
    const centerY = (rect.top + rect.bottom) / 2
    const horizontal = Math.abs(centerX - from.x) > Math.abs(centerY - from.y)
    const b = horizontal
      ? { x: centerX >= from.x ? rect.left - pad : rect.right + pad, y: rect.top - pad }
      : { x: rect.left - pad, y: centerY >= from.y ? rect.top - pad : rect.bottom + pad }
    const c = horizontal
      ? { x: b.x, y: rect.bottom + pad }
      : { x: rect.right + pad, y: b.y }
    return pointInTriangle(x, y, from, b, c)
  }, [])

  const closeAll = useCallback(() => {
    cancelClose()
    corridor.current = null
    commit([])
  }, [cancelClose, commit])

  const closeTop = useCallback(() => {
    cancelClose()
    corridor.current = null
    const current = stackRef.current
    if (!current.length) return
    const top = current[current.length - 1]
    commit(current.slice(0, -1))
    top.anchorEl.dataset.termRestoringFocus = ''
    top.anchorEl.focus({ preventScroll: true })
    queueMicrotask(() => { delete top.anchorEl.dataset.termRestoringFocus })
  }, [cancelClose, commit])

  const pointerInside = useCallback((entry: StackEntry) => {
    const { x, y } = lastPointer.current
    const rects = [entry.anchorEl.getBoundingClientRect(), document.getElementById(entry.panelId)?.getBoundingClientRect()]
    return rects.some((rect) => rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
  }, [])

  const scheduleClose = useCallback((depth: number) => {
    cancelClose()
    const step = (expectedDepth: number) => {
      const current = stackRef.current
      if (!current.length || current[current.length - 1].depth !== expectedDepth) return
      if (pointerInside(current[current.length - 1])) return
      commit(current.slice(0, -1))
      const parent = stackRef.current[stackRef.current.length - 1]
      if (parent && !pointerInside(parent)) closeTimer.current = setTimeout(() => step(parent.depth), closeGrace)
    }
    closeTimer.current = setTimeout(() => step(depth), closeGrace)
  }, [cancelClose, closeGrace, commit, pointerInside])

  const lock = useCallback((anchorEl: HTMLAnchorElement) => {
    const current = stackRef.current
    const index = current.findIndex((entry) => entry.anchorEl === anchorEl)
    if (index < 0 || current[index].locked) return
    commit(current.map((entry, position) => position === index ? { ...entry, locked: true } : entry))
  }, [commit])

  const open = useCallback((id: string, anchorEl: HTMLAnchorElement, rectIndex: number, depth: number, shouldLock: boolean) => {
    if (depth >= maxDepth || !resolve(id)) return
    cancelClose()
    const current = stackRef.current
    const existingIndex = current.findIndex((entry) => entry.id === id)
    if (existingIndex >= 0) {
      const existing = current[existingIndex]
      if (existing.anchorEl === anchorEl && shouldLock) lock(anchorEl)
      else document.getElementById(existing.panelId)?.focus({ preventScroll: true })
      return
    }
    corridor.current = null
    const panelId = `${instanceId}-term-${depth}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    commit([...current.slice(0, depth), { id, anchorEl, rectIndex, locked: shouldLock, depth, panelId }])
  }, [cancelClose, commit, instanceId, lock, maxDepth, resolve])

  const leaveTrigger = useCallback((anchorEl: HTMLAnchorElement, depth: number, x: number, y: number) => {
    const entry = stackRef.current[depth]
    if (entry?.anchorEl !== anchorEl) return
    lastPointer.current = { x, y }
    corridor.current = { from: { x, y }, depth, until: Date.now() + lockDelay + closeGrace }
    scheduleClose(depth)
  }, [closeGrace, lockDelay, scheduleClose])

  const enterPanel = useCallback((depth: number) => {
    cancelClose()
    corridor.current = null
    const entry = stackRef.current[depth]
    if (entry && (lockMode === 'pointer' || lockMode === 'pointer-or-timer')) lock(entry.anchorEl)
  }, [cancelClose, lock, lockMode])

  const leavePanel = useCallback((depth: number, x: number, y: number) => {
    lastPointer.current = { x, y }
    const current = stackRef.current
    if (current[current.length - 1]?.depth === depth) scheduleClose(depth)
  }, [scheduleClose])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px), (pointer: coarse)')
    const update = () => setMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      lastPointer.current = { x: event.clientX, y: event.clientY }
      if (inSafeCorridor(event.clientX, event.clientY)) {
        cancelClose()
        return
      }
      if (corridor.current) {
        const depth = corridor.current.depth
        corridor.current = null
        const entry = stackRef.current[depth]
        if (entry) scheduleClose(stackRef.current[stackRef.current.length - 1].depth)
      }
      if (stackRef.current.some(pointerInside)) cancelClose()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (stackRef.current.some((entry) => entry.anchorEl.contains(target) || document.getElementById(entry.panelId)?.contains(target))) return
      closeAll()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !stackRef.current.length) return
      event.preventDefault()
      event.stopImmediatePropagation()
      closeTop()
    }
    const onScrollOrResize = () => {
      if (mobile) return
      const current = stackRef.current
      const hiddenIndex = current.findIndex((entry) => {
        const rect = entry.anchorEl.getClientRects()[entry.rectIndex] ?? entry.anchorEl.getBoundingClientRect()
        return !isVisible(rect)
      })
      if (hiddenIndex >= 0) commit(current.slice(0, hiddenIndex))
    }
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [cancelClose, closeAll, closeTop, commit, inSafeCorridor, mobile, pointerInside, scheduleClose])

  useEffect(() => () => cancelClose(), [cancelClose])

  const value = useMemo<TermContextValue>(() => ({
    openDelay, lockDelay, closeGrace, lockMode, maxDepth, resolve, stack,
    open, lock, leaveTrigger, enterPanel, leavePanel, cancelClose, inSafeCorridor, closeTop, closeAll,
  }), [openDelay, lockDelay, closeGrace, lockMode, maxDepth, resolve, stack, open, lock, leaveTrigger, enterPanel, leavePanel, cancelClose, inSafeCorridor, closeTop, closeAll])

  return (
    <TermContext.Provider value={value}>
      {children}
      {stack.map((entry, index) => {
        if (mobile && index !== stack.length - 1) return null
        const definition = resolve(entry.id)
        if (!definition) return null
        const anchor = {
          contextElement: entry.anchorEl,
          getBoundingClientRect: () => entry.anchorEl.getClientRects()[entry.rectIndex] ?? entry.anchorEl.getBoundingClientRect(),
        }
        return (
          <Popover.Root key={entry.panelId} open modal={false}>
            <Popover.Portal container={entry.anchorEl.closest<HTMLElement>('[data-theme]') ?? undefined}>
              <Popover.Positioner
                anchor={anchor}
                side={entry.depth === 0 ? 'bottom' : 'right'}
                align="start"
                sideOffset={10}
                collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' }}
                className="lars-term-positioner"
                style={{ '--lars-term-depth': entry.depth } as CSSProperties}
              >
                <Popover.Popup
                  id={entry.panelId}
                  aria-label={definition.title}
                  className="lars-term-popup"
                  data-locked={entry.locked || undefined}
                  data-current={index === stack.length - 1 || undefined}
                  initialFocus={false}
                  finalFocus={false}
                  onPointerEnter={() => enterPanel(entry.depth)}
                  onPointerLeave={(event) => leavePanel(entry.depth, event.clientX, event.clientY)}
                >
                  <DepthContext.Provider value={entry.depth + 1}>
                    <TermTooltip
                      title={definition.title}
                      body={definition.body}
                      learnMore={definition.learnMore}
                      locked={entry.locked}
                      depth={entry.depth}
                      maxDepth={maxDepth}
                      onBack={entry.depth > 0 ? closeTop : undefined}
                      onClose={closeAll}
                      mobile={mobile}
                      breadcrumbs={stack.slice(0, index).map((ancestor) => resolve(ancestor.id)?.title ?? ancestor.id)}
                    />
                  </DepthContext.Provider>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )
      })}
    </TermContext.Provider>
  )
}

export type TermLinkProps = {
  term: string
  children: ReactNode
  variant?: 'glossary' | 'solid'
  className?: string
}

export function TermLink({ term, children, variant = 'glossary', className = '' }: TermLinkProps) {
  const context = useTermContext()
  const depth = useContext(DepthContext)
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const hoverPoint = useRef({ x: 0, y: 0 })
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pendingLock, setPendingLock] = useState(false)
  const definition = context.resolve(term)
  const entry = context.stack.find((item) => item.anchorEl === anchorRef.current)
  const full = depth >= context.maxDepth

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (lockTimer.current) clearTimeout(lockTimer.current)
    openTimer.current = null
    lockTimer.current = null
    setPendingLock(false)
  }

  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (lockTimer.current) clearTimeout(lockTimer.current)
  }, [])

  if (full || !definition) {
    if (definition?.pageHref) return <a className={`lars-term-link lars-term-link--${variant} ${className}`} href={definition.pageHref}>{children}</a>
    return <strong className="lars-term-limit">{children}</strong>
  }

  const activate = (lock: boolean, x?: number, y?: number) => {
    const element = anchorRef.current
    if (!element) return
    const index = x === undefined || y === undefined ? 0 : getLineIndex(element, x, y)
    context.open(term, element, index, depth, lock)
  }

  return (
    <a
      ref={anchorRef}
      role="button"
      tabIndex={0}
      className={`lars-term-link lars-term-link--${variant}${className ? ` ${className}` : ''}`}
      aria-expanded={Boolean(entry)}
      aria-controls={entry?.panelId}
      data-active={Boolean(entry) || undefined}
      data-locked={entry?.locked || undefined}
      data-pending-lock={pendingLock || undefined}
      style={{ '--lars-term-lock-delay': `${context.lockDelay}ms` } as CSSProperties}
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return
        context.cancelClose()
        if (entry) return
        hoverPoint.current = { x: event.clientX, y: event.clientY }
        const lockedSibling = context.stack[depth]?.locked && context.stack[depth]?.id !== term
        const openWhenSafe = () => {
          const { x, y } = hoverPoint.current
          if (context.inSafeCorridor(x, y)) {
            openTimer.current = setTimeout(openWhenSafe, 50)
          } else {
            activate(false, x, y)
          }
        }
        openTimer.current = setTimeout(openWhenSafe, context.openDelay + (lockedSibling ? context.closeGrace : 0))
        if (context.lockMode !== 'click') {
          setPendingLock(true)
          lockTimer.current = setTimeout(() => {
            const { x, y } = hoverPoint.current
            activate(true, x, y)
            setPendingLock(false)
          }, context.lockDelay)
        }
      }}
      onPointerMove={(event) => {
        hoverPoint.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerLeave={(event) => {
        clearTimers()
        const element = anchorRef.current
        if (element) context.leaveTrigger(element, depth, event.clientX, event.clientY)
      }}
      onFocus={(event) => {
        if (event.currentTarget.dataset.termRestoringFocus === undefined) activate(false)
      }}
      onClick={(event) => {
        event.preventDefault()
        clearTimers()
        activate(true, event.clientX, event.clientY)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          clearTimers()
          activate(true)
        } else if (event.key === 'Tab' && entry && !event.shiftKey) {
          const panel = document.getElementById(entry.panelId)
          const first = panel?.querySelector<HTMLElement>('.lars-term-tooltip__body a[role="button"], .lars-term-tooltip__body a[href], .lars-term-tooltip__footer')
          if (panel) {
            event.preventDefault()
            if (anchorRef.current) context.lock(anchorRef.current)
            ;(first ?? panel).focus()
          }
        }
      }}
    >
      {children}
    </a>
  )
}

export type TermTooltipProps = {
  title: string
  body: ReactNode
  learnMore?: { href: string; label?: string }
  locked?: boolean
  depth?: number
  maxDepth?: number
  onBack?: () => void
  onClose?: () => void
  mobile?: boolean
  breadcrumbs?: string[]
}

export function TermTooltip({
  title, body, learnMore, locked = false, depth = 0, maxDepth = 4,
  onBack, onClose, mobile = false, breadcrumbs = [],
}: TermTooltipProps) {
  return (
    <div className="lars-term-tooltip">
      {mobile && (
        <div className="lars-term-tooltip__navigation">
          <button type="button" onClick={onBack ?? onClose} aria-label={onBack ? 'Back to previous term' : 'Close explanation'}>
            {onBack ? '‹ Back' : 'Close'}
          </button>
          <span>{[...breadcrumbs, title].join(' / ')}</span>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      )}
      <div className="lars-term-tooltip__header">
        <strong>{title}</strong>
        <span className="lars-term-tooltip__lock" aria-label={locked ? 'Locked open' : 'Preview'}>
          {locked ? '● Locked' : '○ Preview'}
        </span>
      </div>
      <div className="lars-term-tooltip__body">{body}</div>
      {learnMore && (
        <a className="lars-term-tooltip__footer" href={learnMore.href}>
          {learnMore.label ?? 'Learn more'} <span aria-hidden="true">↗</span>
        </a>
      )}
      {depth + 1 >= maxDepth && <span className="lars-term-tooltip__limit">End of this trail</span>}
    </div>
  )
}
