import { useLayoutEffect, useRef } from 'react'

export function dropdownMotionForEvent(event: Event): 'pointer' | 'instant' {
  if (event.type.startsWith('pointer') || event.type.startsWith('mouse') || event.type.startsWith('touch')) return 'pointer'
  if (event.type === 'click' && 'detail' in event && Number(event.detail) > 0) return 'pointer'
  return 'instant'
}

/** One pointer highlight; Base UI continues to own keyboard focus and selection. */
export function useDropdownGlide(items: readonly unknown[], itemRole: 'option' | 'menuitem' = 'option') {
  const listRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const mountedList = listRef.current
    const mountedHighlight = highlightRef.current
    const documentView = mountedList?.ownerDocument.defaultView
    if (!mountedList || !mountedHighlight || !documentView) return
    const list = mountedList
    const highlight = mountedHighlight
    const view = documentView

    const finePointer = view.matchMedia('(hover: hover) and (pointer: fine)')
    const popup = list.closest('.lars-input__popup')
    let rows: HTMLElement[] = []
    let rects: { node: HTMLElement; x: number; y: number; width: number; height: number }[] = []
    let pointerY: number | null = null
    let frame = 0

    function cancelFrame() {
      view.cancelAnimationFrame(frame)
      frame = 0
    }

    function hide() {
      cancelFrame()
      delete highlight.dataset.visible
      delete highlight.dataset.travel
    }

    function pick(instant = false) {
      if (pointerY === null || !list.offsetHeight) return
      // Offset measurements are unscaled: opening a scaled popup doesn't shift the target.
      const bounds = list.getBoundingClientRect()
      const y = (pointerY - bounds.top) / (bounds.height / list.offsetHeight || 1)
      let nearest: typeof rects[number] | undefined
      let distance = Infinity
      for (const rect of rects) {
        if (rect.node.hasAttribute('data-disabled') || rect.height === 0) continue
        const nextDistance = Math.abs(y - rect.y - rect.height / 2)
        if (nextDistance < distance) {
          nearest = rect
          distance = nextDistance
        }
      }
      if (!nearest) { hide(); return }

      const fresh = !highlight.hasAttribute('data-visible')
      if (fresh || instant) {
        cancelFrame()
        delete highlight.dataset.travel
      }
      highlight.style.width = `${nearest.width}px`
      highlight.style.height = `${nearest.height}px`
      highlight.style.transform = `translate3d(${nearest.x}px, ${nearest.y}px, 0)`
      highlight.dataset.visible = ''
      if (fresh || instant) {
        // A fresh entry fades at its new row, then subsequent moves glide from there.
        frame = view.requestAnimationFrame(() => {
          highlight.dataset.travel = ''
          frame = 0
        })
      }
    }

    function measure() {
      rects = rows.map(node => ({ node, x: node.offsetLeft, y: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight }))
      pick(true)
    }

    function pointer(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || !finePointer.matches) { keyboard(); return }
      list.dataset.glidePointer = ''
      pointerY = event.clientY
      pick()
    }

    function leave() {
      pointerY = null
      hide()
      // Keep suppressing Base UI's last hover color until keyboard navigation resumes.
    }

    function keyboard() {
      pointerY = null
      hide()
      delete list.dataset.glidePointer
    }

    function scroll() { pick(true) }
    function press(event: PointerEvent) { if (event.pointerType !== 'mouse') keyboard() }

    const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(measure) : null
    function refreshRows() {
      const nextRows = Array.from(list.querySelectorAll<HTMLElement>(`[role="${itemRole}"]`))
      const previous = new Set(rows)
      const next = new Set(nextRows)
      rows.forEach(row => { if (!next.has(row)) observer?.unobserve(row) })
      nextRows.forEach(row => { if (!previous.has(row)) observer?.observe(row) })
      rows = nextRows
      measure()
    }

    observer?.observe(list)
    refreshRows()
    // The select-all row can change while the options array stays the same.
    // Observe children only so the highlight's own style/data updates do not loop.
    const mutations = new view.MutationObserver(refreshRows)
    mutations.observe(list, { childList: true, subtree: true })
    list.addEventListener('pointerenter', pointer)
    list.addEventListener('pointermove', pointer, true)
    list.addEventListener('pointerdown', press, true)
    list.addEventListener('pointerleave', leave)
    list.ownerDocument.addEventListener('keydown', keyboard, true)
    popup?.addEventListener('scroll', scroll, { passive: true })
    view.addEventListener('resize', measure)

    return () => {
      hide()
      delete list.dataset.glidePointer
      mutations.disconnect()
      observer?.disconnect()
      list.removeEventListener('pointerenter', pointer)
      list.removeEventListener('pointermove', pointer, true)
      list.removeEventListener('pointerdown', press, true)
      list.removeEventListener('pointerleave', leave)
      list.ownerDocument.removeEventListener('keydown', keyboard, true)
      popup?.removeEventListener('scroll', scroll)
      view.removeEventListener('resize', measure)
    }
  }, [items, itemRole])

  return { listRef, highlightRef }
}
