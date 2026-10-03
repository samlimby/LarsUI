export type AudioRecording = {
  stop: () => Promise<Blob>
  cancel: () => void
}

/** Wait for MediaRecorder's final dataavailable event before returning the audio. */
export function startAudioRecording(stream: MediaStream, onError: (error: Error) => void): AudioRecording {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Audio recording is not available in this browser.')
  }
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    .find((type) => MediaRecorder.isTypeSupported(type))
  const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 64_000, ...(mimeType ? { mimeType } : {}) })
  const chunks: Blob[] = []
  let settled = false
  let stopping = false
  let resolveAudio!: (audio: Blob) => void
  let rejectAudio!: (error: Error) => void
  const audio = new Promise<Blob>((resolve, reject) => {
    resolveAudio = resolve
    rejectAudio = reject
  })
  // Recording can fail before the user accepts it; stop() still returns the rejection.
  void audio.catch(() => {})

  const cleanup = () => {
    recorder.removeEventListener('dataavailable', handleData)
    recorder.removeEventListener('stop', handleStop)
    recorder.removeEventListener('error', handleError)
  }
  const fail = (error: Error) => {
    if (settled) return
    settled = true
    cleanup()
    chunks.length = 0
    rejectAudio(error)
  }
  const handleData = (event: BlobEvent) => {
    if (event.data.size) chunks.push(event.data)
  }
  const handleStop = () => {
    if (settled) return
    settled = true
    cleanup()
    resolveAudio(new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || mimeType || '' }))
    chunks.length = 0
  }
  const handleError = () => {
    const error = new Error('Microphone recording stopped unexpectedly. Try again.')
    fail(error)
    onError(error)
  }
  recorder.addEventListener('dataavailable', handleData)
  recorder.addEventListener('stop', handleStop)
  recorder.addEventListener('error', handleError)
  try {
    recorder.start(1_000)
  } catch (error) {
    cleanup()
    throw error
  }

  return {
    stop() {
      if (!settled && !stopping && recorder.state !== 'inactive') {
        stopping = true
        try { recorder.stop() } catch {
          fail(new Error('Microphone recording could not finish. Try again.'))
        }
      }
      return audio
    },
    cancel() {
      fail(new DOMException('Recording cancelled.', 'AbortError'))
      if (recorder.state !== 'inactive') {
        try { recorder.stop() } catch { /* The recorder may already have stopped. */ }
      }
    },
  }
}
