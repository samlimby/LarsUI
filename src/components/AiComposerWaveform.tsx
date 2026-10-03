import { useEffect, useRef } from 'react'

const INITIAL_WAVE_WIDTH = 240
const WAVE_HEIGHT = 44
const WAVE_MIDLINE = WAVE_HEIGHT / 2
const BAR_SPACING = 6
const BAR_WIDTH = 3
const BAR_MIN_HEIGHT = 4
const BAR_MAX_HEIGHT = 34
const FRAME_INTERVAL_MS = 1000 / 30
const INITIAL_BAR_COUNT = Math.floor((INITIAL_WAVE_WIDTH - BAR_WIDTH) / BAR_SPACING) + 1

function waveformPath(levels: Float32Array, width: number) {
  const firstBarX = (width - (levels.length - 1) * BAR_SPACING) / 2
  let path = ''

  for (let bar = 0; bar < levels.length; bar++) {
    const x = firstBarX + bar * BAR_SPACING
    // Round stroke caps add a half-width at each end of the vertical segment.
    const segmentHalfHeight = (BAR_MIN_HEIGHT + levels[bar] * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) - BAR_WIDTH) / 2
    path += `M ${x} ${(WAVE_MIDLINE - segmentHalfHeight).toFixed(2)} V ${(WAVE_MIDLINE + segmentHalfHeight).toFixed(2)} `
  }

  return path
}

const IDLE_PATH = waveformPath(new Float32Array(INITIAL_BAR_COUNT), INITIAL_WAVE_WIDTH)

/** A silent microphone monitor that can observe a shared recognition stream. */
export function AiComposerWaveform({ active, reducedMotion, stream }: { active: boolean; reducedMotion: boolean; stream?: MediaStream | null }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const levelsRef = useRef(new Float32Array(INITIAL_BAR_COUNT))
  const widthRef = useRef(INITIAL_WAVE_WIDTH)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const syncWidth = () => {
      const width = Math.round(svg.getBoundingClientRect().width)
      if (width <= 0) return

      const count = Math.max(1, Math.floor((width - BAR_WIDTH) / BAR_SPACING) + 1)
      if (count !== levelsRef.current.length) {
        const previous = levelsRef.current
        const next = new Float32Array(count)
        const retained = Math.min(previous.length, count)
        next.set(previous.subarray(previous.length - retained), count - retained)
        levelsRef.current = next
      }

      widthRef.current = width
      svg.setAttribute('viewBox', `0 0 ${width} ${WAVE_HEIGHT}`)
      pathRef.current?.setAttribute('d', waveformPath(levelsRef.current, width))
    }

    syncWidth()
    const observer = new ResizeObserver(syncWidth)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const path = pathRef.current
    levelsRef.current.fill(0)
    path?.setAttribute('d', waveformPath(levelsRef.current, widthRef.current))

    if (!active || reducedMotion || (!stream && !navigator.mediaDevices?.getUserMedia)) return

    const AudioContextConstructor = window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return

    let disposed = false
    let ownedStream: MediaStream | null = null
    let context: AudioContext | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let analyser: AnalyserNode | null = null
    let frameId: number | null = null
    let lastFrame = -Infinity
    let smoothedLevel = 0
    const release = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = null
      source?.disconnect()
      analyser?.disconnect()
      ownedStream?.getTracks().forEach((track) => track.stop())
      if (context && context.state !== 'closed') void context.close().catch(() => {})
    }

    const monitor = async (inputStream: MediaStream) => {
      if (disposed) return
      context = new AudioContextConstructor()
      source = context.createMediaStreamSource(inputStream)
      analyser = context.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      // Some browsers begin a newly created context suspended after a permission prompt.
      if (context.state === 'suspended') await context.resume()
      if (disposed) return

      const samples = new Float32Array(analyser.fftSize)
      const draw = (now: number) => {
        if (disposed) return
        frameId = window.requestAnimationFrame(draw)
        if (now - lastFrame < FRAME_INTERVAL_MS) return
        lastFrame = now

        analyser?.getFloatTimeDomainData(samples)
        let sumOfSquares = 0
        for (let index = 0; index < samples.length; index++) {
          sumOfSquares += samples[index] * samples[index]
        }
        const rms = Math.sqrt(sumOfSquares / samples.length)
        const targetLevel = rms < 0.004 ? 0 : rms
        smoothedLevel += (targetLevel - smoothedLevel) * (targetLevel > smoothedLevel ? 0.4 : 0.16)
        const activity = Math.min(1, Math.max(0, (smoothedLevel - 0.003) / 0.012))
        // Each bar holds one recent audio level, creating the reference's rounded,
        // symmetric wave clusters while continuing to follow the microphone.
        const levels = levelsRef.current
        levels.copyWithin(0, 1)
        levels[levels.length - 1] = Math.sqrt(activity)
        path?.setAttribute('d', waveformPath(levels, widthRef.current))
      }

      frameId = window.requestAnimationFrame(draw)
    }
    const resetAfterError = () => {
      release()
      levelsRef.current.fill(0)
      path?.setAttribute('d', waveformPath(levelsRef.current, widthRef.current))
    }

    if (stream) {
      void monitor(stream).catch(resetAfterError)
    } else {
      void navigator.mediaDevices.getUserMedia({ audio: true })
        .then(async (capturedStream) => {
          if (disposed) {
            capturedStream.getTracks().forEach((track) => track.stop())
            return
          }
          ownedStream = capturedStream
          await monitor(capturedStream)
        })
        .catch(resetAfterError)
    }

    return () => {
      disposed = true
      release()
    }
  }, [active, reducedMotion, stream])

  return (
    <svg
      aria-hidden="true"
      className="lars-ai-composer__waveform"
      focusable="false"
      preserveAspectRatio="none"
      ref={svgRef}
      viewBox={`0 0 ${INITIAL_WAVE_WIDTH} ${WAVE_HEIGHT}`}
    >
      <path
        className="lars-ai-composer__waveform-path"
        d={IDLE_PATH}
        fill="none"
        ref={pathRef}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={BAR_WIDTH}
      />
    </svg>
  )
}
