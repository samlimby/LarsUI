import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Motion needs pixel radii for layout scale correction, including scoped CSS overrides. */
export function useRadiusToken(token: string) {
  const ref = useRef<HTMLSpanElement>(null)
  const [radius, setRadius] = useState<number>()

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    // A clipped probe lets the browser resolve var()/calc()/rem to pixels without
    // changing the surface's layout or reading an in-progress animated radius.
    const clip = element.ownerDocument.createElement('span')
    clip.setAttribute('aria-hidden', 'true')
    clip.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;'
    const probe = element.ownerDocument.createElement('span')
    probe.style.display = 'block'
    probe.style.width = `var(${token})`
    clip.append(probe)
    element.append(clip)

    const measure = () => {
      const pixels = Number.parseFloat(getComputedStyle(probe).width)
      if (Number.isFinite(pixels)) setRadius(pixels)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(probe)
    return () => {
      observer.disconnect()
      clip.remove()
    }
  }, [token])

  return { ref, radius }
}
