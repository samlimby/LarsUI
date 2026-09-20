import { Slider } from '@base-ui/react/slider'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import './InlineSlider.css'

const STOP_COUNT = 10
const HANDLE_START = 8
const HANDLE_END_INSET = 12
const TEXT_INSET = 20
const MIN_TICK_LABEL_WIDTH = 40
const MORPH_DISTANCE = 4
const MORPH_GAP = 4
const THUMB_WIDTH = 4

const SPRING_GLIDE = { stiffness: 700, damping: 50, mass: 0.5 }
const SPRING_BOUNCY = { type: 'spring' as const, stiffness: 500, damping: 14, mass: 0.7 }

type Stop = { value: number; x: number }
type Gesture = { id: number; left: number; offset: number; scale: number; x: number }

export type InlineSliderProps = {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  stops?: readonly number[]
  showTicks?: boolean
  linearStops?: boolean
  continuous?: boolean
  disabled?: boolean
  className?: string
  format?: (value: number) => string
  onValueChange: (value: number) => void
  onValueCommit?: (value: number) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function capturePointer(element: HTMLElement, pointerId: number) {
  try { element.setPointerCapture(pointerId) } catch { /* Implicit touch capture still applies. */ }
}

function releasePointer(element: HTMLElement, pointerId: number) {
  try {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  } catch { /* The browser already released this pointer. */ }
}

function snapSliderValue(next: number, min: number, max: number, step: number) {
  if (!(max > min)) return min
  if (!(step > 0)) return clamp(next, min, max)
  const whole = Math.floor(Number(((max - min) / step).toFixed(6)))
  const lastWhole = Number((min + whole * step).toFixed(6))
  const gridValue = clamp(Math.round((next - min) / step) * step + min, min, lastWhole)
  const snapped = lastWhole < max && Math.abs(next - max) <= Math.abs(next - gridValue)
    ? max
    : gridValue
  return Number(snapped.toFixed(6))
}

function mapBetweenStops(stops: Stop[], point: number, from: keyof Stop, to: keyof Stop) {
  const found = stops.findIndex((stop) => stop[from] >= point)
  const upperIndex = found < 0 ? stops.length - 1 : found
  const upper = stops[upperIndex]
  const lower = stops[Math.max(0, upperIndex - 1)]
  if (lower[from] === upper[from]) return upper[to]
  return lower[to] + ((point - lower[from]) / (upper[from] - lower[from])) * (upper[to] - lower[to])
}

function nearestStop(stops: Stop[], x: number) {
  return stops.reduce((nearest, stop) => Math.abs(stop.x - x) < Math.abs(nearest.x - x) ? stop : nearest)
}

/** BaseUI-backed slider with the motion behavior used by component-playground and corner-radii. */
export function InlineSlider({
  label,
  value,
  min = 0,
  max = 100,
  step: suppliedStep = 1,
  stops: suppliedStops,
  showTicks = true,
  linearStops = false,
  continuous = false,
  disabled = false,
  className = '',
  format = String,
  onValueChange,
  onValueCommit,
}: InlineSliderProps) {
  const reduce = useReducedMotion()
  const step = suppliedStep > 0 ? suppliedStep : 1
  const current = clamp(value, min, max)
  const trackRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const readoutTextRef = useRef<HTMLSpanElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const dragFrame = useRef<number | null>(null)
  const pendingDragValue = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [geometry, setGeometry] = useState({ width: 292, labelWidth: 22, readoutWidth: 24, readoutTextWidth: 24 })

  const commit = useCallback((next: number) => {
    onValueChange(snapSliderValue(next, min, max, step))
  }, [max, min, onValueChange, step])

  useLayoutEffect(() => {
    const track = trackRef.current
    const labelElement = labelRef.current
    const readout = readoutRef.current
    const readoutText = readoutTextRef.current
    if (!track || !labelElement || !readout || !readoutText) return

    const measure = () => {
      const width = track.clientWidth
      if (!width) return
      const next = {
        width,
        labelWidth: labelElement.offsetWidth,
        readoutWidth: readout.offsetWidth,
        readoutTextWidth: readoutText.offsetWidth,
      }
      setGeometry((previous) => Object.keys(next).every(
        (key) => previous[key as keyof typeof next] === next[key as keyof typeof next],
      ) ? previous : next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    observer.observe(labelElement)
    observer.observe(readout)
    observer.observe(readoutText)
    return () => observer.disconnect()
  }, [])

  const readoutBounds = { start: geometry.width - TEXT_INSET - geometry.readoutWidth, end: geometry.width - TEXT_INSET }
  const endX = Math.max(HANDLE_START, geometry.width - HANDLE_END_INSET)

  const stops = useMemo<Stop[]>(() => {
    if (continuous) return [{ value: min, x: HANDLE_START }, { value: max, x: endX }]
    const explicitValues = suppliedStops
      ? [...new Set(suppliedStops
        .map((stop) => snapSliderValue(stop, min, max, step))
        .filter((stop) => stop > min && stop < max))]
        .sort((a, b) => a - b)
      : null
    const values = explicitValues
      ? [min, ...explicitValues, max]
      : [...new Set(Array.from(
        { length: STOP_COUNT },
        (_, index) => snapSliderValue(min + (index / (STOP_COUNT - 1)) * (max - min), min, max, step),
      ))]

    if (explicitValues) {
      if (linearStops) {
        return values.map((stop) => ({
          value: stop,
          x: max > min ? HANDLE_START + ((stop - min) / (max - min)) * (endX - HANDLE_START) : HANDLE_START,
        }))
      }
      const tickStart = Math.min(endX, TEXT_INSET + Math.max(geometry.labelWidth, MIN_TICK_LABEL_WIDTH) + 12)
      const tickEnd = Math.max(tickStart, Math.min(endX, readoutBounds.start - 12))
      return values.map((stop, index) => {
        if (index === 0) return { value: stop, x: HANDLE_START }
        if (index === values.length - 1) return { value: stop, x: endX }
        return {
          value: stop,
          x: explicitValues.length === 1
            ? (tickStart + tickEnd) / 2
            : tickStart + ((index - 1) / (explicitValues.length - 1)) * (tickEnd - tickStart),
        }
      })
    }

    return values.map((stop, index) => ({
      value: stop,
      x: values.length === 1 ? HANDLE_START : HANDLE_START + (index / (values.length - 1)) * (endX - HANDLE_START),
    }))
  }, [continuous, endX, geometry.labelWidth, linearStops, max, min, readoutBounds.start, step, suppliedStops])

  const restingX = mapBetweenStops(stops, current, 'value', 'x')
  const handleX = useMotionValue(restingX)
  const restingTarget = useRef(restingX)
  const settleTo = useCallback((x: number) => {
    restingTarget.current = x
    handleX.stop()
    if (reduce) handleX.set(x)
    else animate(handleX, x, { type: 'spring', ...SPRING_GLIDE })
  }, [handleX, reduce])

  useLayoutEffect(() => {
    if (gesture.current || restingTarget.current === restingX) return
    settleTo(restingX)
  }, [restingX, settleTo])

  useEffect(() => () => {
    handleX.stop()
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current)
  }, [handleX])

  const fillRight = useTransform(handleX, (x) => x >= endX ? geometry.width : x + 8)
  const fillX = useTransform(fillRight, (right) => right - geometry.width)
  const split = useTransform(handleX, (x) => {
    const overlap = (start: number, end: number) => Math.max(0, Math.min(
      1,
      (x + THUMB_WIDTH + MORPH_GAP + MORPH_DISTANCE - start) / MORPH_DISTANCE,
      (end + MORPH_GAP + MORPH_DISTANCE - x) / MORPH_DISTANCE,
    ))
    return Math.max(
      overlap(TEXT_INSET, TEXT_INSET + geometry.labelWidth),
      overlap(geometry.width - TEXT_INSET - geometry.readoutTextWidth, geometry.width - TEXT_INSET),
    )
  })
  const stemOpacity = useTransform(split, (amount) => 1 - amount)
  const capTop = useTransform(split, (amount) => -amount)
  const capBottom = useTransform(split, (amount) => amount)
  const ticks = showTicks ? stops.map((stop) => stop.x) : []

  const queueDragCommit = (next: number) => {
    pendingDragValue.current = next
    if (dragFrame.current !== null) return
    dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = null
      if (pendingDragValue.current !== null) commit(pendingDragValue.current)
      pendingDragValue.current = null
    })
  }

  const cancelDragCommit = () => {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current)
    dragFrame.current = null
    pendingDragValue.current = null
  }

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active || active.id !== event.pointerId) return
    gesture.current = null
    cancelDragCommit()
    setDragging(false)

    if (!disabled && geometry.width > 0) {
      const x = event.type === 'pointerup'
        ? (event.clientX - active.left) * active.scale - active.offset
        : active.x
      const next = continuous
        ? snapSliderValue(mapBetweenStops(stops, x, 'x', 'value'), min, max, step)
        : nearestStop(stops, x).value
      const targetX = mapBetweenStops(stops, next, 'value', 'x')
      releasePointer(event.currentTarget, event.pointerId)
      settleTo(targetX)
      commit(next)
      onValueCommit?.(next)
    } else {
      settleTo(restingX)
    }
    releasePointer(event.currentTarget, event.pointerId)
  }

  const useIndexedStops = !continuous
  const semanticValue = useIndexedStops
    ? stops.reduce((nearest, stop, index) => Math.abs(stop.value - current) < Math.abs(stops[nearest].value - current) ? index : nearest, 0)
    : current
  const semanticMin = useIndexedStops ? 0 : min
  const semanticMax = useIndexedStops ? stops.length - 1 : max

  return (
    <Slider.Root
      ref={trackRef}
      className={`inline-slider${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      largeStep={continuous ? step * 10 : 1}
      max={semanticMax}
      min={semanticMin}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0 || gesture.current) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (!rect.width) return
        event.preventDefault()
        const pointerScale = geometry.width / rect.width
        const pointerX = (event.clientX - rect.left) * pointerScale
        const thumbX = handleX.get()
        const offset = Math.abs(pointerX - thumbX - 2) <= 12 ? pointerX - thumbX : 2
        gesture.current = { id: event.pointerId, left: rect.left, offset, scale: pointerScale, x: thumbX }
        setDragging(true)
        handleX.stop()
        cancelDragCommit()
        capturePointer(event.currentTarget, event.pointerId)
        event.currentTarget.querySelector<HTMLElement>('[role=slider]')?.focus({ preventScroll: true })
      }}
      onPointerMove={(event) => {
        const active = gesture.current
        if (!active || active.id !== event.pointerId || disabled) return
        const x = Math.min(endX, Math.max(HANDLE_START, (event.clientX - active.left) * active.scale - active.offset))
        active.x = x
        handleX.set(x)
        queueDragCommit(suppliedStops ? nearestStop(stops, x).value : mapBetweenStops(stops, x, 'x', 'value'))
      }}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
      onValueChange={(next) => commit(useIndexedStops ? stops[Math.round(clamp(next, semanticMin, semanticMax))].value : next)}
      onValueCommitted={(next) => onValueCommit?.(useIndexedStops ? stops[Math.round(clamp(next, semanticMin, semanticMax))].value : next)}
      step={useIndexedStops ? 1 : step}
      thumbAlignment="edge"
      value={semanticValue}
    >
      <span className="inline-slider__fill-window" aria-hidden="true">
        <motion.span className="inline-slider__fill" style={{ x: fillX }} />
      </span>

      <div className="inline-slider__labels" aria-hidden="true">
        {ticks.map((left) => <span className="inline-slider__tick" key={left} style={{ left: Math.round(left) }} />)}
        <Slider.Label ref={labelRef} className="inline-slider__label">{label}</Slider.Label>
        <span ref={readoutRef} className="inline-slider__readout">
          <span className="inline-slider__measure">{format(min)}</span>
          <span className="inline-slider__measure">{format(max)}</span>
          <span ref={readoutTextRef} className="inline-slider__value">{format(current)}</span>
        </span>
      </div>

      <motion.div
        className="inline-slider__thumb"
        aria-hidden="true"
        animate={reduce ? undefined : { scaleY: dragging ? 1.35 : 1 }}
        transition={SPRING_BOUNCY}
        style={{ x: handleX }}
      >
        <motion.span className="inline-slider__cap inline-slider__cap--top" style={{ y: reduce ? 0 : capTop }} />
        <motion.span className="inline-slider__stem" style={{ opacity: reduce ? 1 : stemOpacity }} />
        <motion.span className="inline-slider__cap inline-slider__cap--bottom" style={{ y: reduce ? 0 : capBottom }} />
      </motion.div>

      <Slider.Control className="inline-slider__control">
        <Slider.Track className="inline-slider__semantic-track">
          <Slider.Thumb className="inline-slider__semantic-thumb" aria-valuetext={format(current)} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}
