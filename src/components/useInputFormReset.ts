import { useLayoutEffect, useRef, type RefObject } from 'react'

/** Resolve the current form when it resets, including forms mounted after the input. */
export function useInputFormReset(inputRef: RefObject<HTMLInputElement | null>, onReset: () => void) {
  const resetRef = useRef(onReset)
  useLayoutEffect(() => { resetRef.current = onReset })

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    const ownerDocument = input.ownerDocument
    const treeRoot = input.getRootNode()
    // Native reset events stay inside a shadow root when a control is rendered there.
    const shadowRoot = treeRoot !== ownerDocument && treeRoot.nodeType === 11 && 'host' in treeRoot ? treeRoot : null
    let mounted = true
    const reset = (event: Event) => {
      if (event.target !== input.form) return
      queueMicrotask(() => {
        if (mounted && inputRef.current === input && event.target === input.form && !event.defaultPrevented) resetRef.current()
      })
    }
    ownerDocument.addEventListener('reset', reset, true)
    shadowRoot?.addEventListener('reset', reset, true)
    return () => {
      mounted = false
      ownerDocument.removeEventListener('reset', reset, true)
      shadowRoot?.removeEventListener('reset', reset, true)
    }
  }, [inputRef])
}
