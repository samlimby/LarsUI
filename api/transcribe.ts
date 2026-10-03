export const MAX_TRANSCRIPTION_BYTES = 4 * 1024 * 1024
const TRANSCRIPTION_TIMEOUT_MS = 45_000
const AUDIO_EXTENSIONS = new Set(['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'])
const AUDIO_TYPES = new Set([
  'audio/webm', 'video/webm', 'audio/mp4', 'video/mp4', 'audio/mpeg', 'audio/mp3',
  'audio/mpga', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/x-wav',
  'audio/wave', 'audio/vnd.wave', 'application/octet-stream', '',
])

type TranscriptionOptions = {
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
  timeoutMs?: number
}

class TranscriptionRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function json(body: { text: string } | { error: string }, status = 200, headers?: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })
}

async function readMultipart(request: Request, signal: AbortSignal) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^multipart\/form-data(?:;|$)/i.test(contentType)) {
    throw new TranscriptionRequestError(415, 'Send an audio recording as multipart form data.')
  }
  const declaredLength = request.headers.get('content-length')
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_TRANSCRIPTION_BYTES)) {
    throw new TranscriptionRequestError(413, 'The recording is too large. Record a shorter message (under 4 MB).')
  }
  if (!request.body) throw new TranscriptionRequestError(400, 'An audio recording is required.')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}) }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    signal.throwIfAborted()
    while (true) {
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      length += value.byteLength
      if (length > MAX_TRANSCRIPTION_BYTES) {
        await reader.cancel().catch(() => {})
        throw new TranscriptionRequestError(413, 'The recording is too large. Record a shorter message (under 4 MB).')
      }
      chunks.push(value)
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    reader.releaseLock()
  }

  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData()
  } catch {
    throw new TranscriptionRequestError(400, 'The audio upload could not be read. Try recording again.')
  }
}

/** The same server-only handler serves Vercel and the local Vite development site. */
export async function handleTranscription(request: Request, options: TranscriptionOptions = {}) {
  if (request.method !== 'POST') return json({ error: 'Use POST to transcribe a recording.' }, 405, { Allow: 'POST' })

  // Browser requests must come from this site; the endpoint does not enable CORS.
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'Transcription requests must come from this site.' }, 403)
  }

  const env = options.env ?? process.env
  const apiKey = env.OPENAI_API_KEY?.trim()
  if (!apiKey) return json({ error: 'Voice transcription is not configured on this site.' }, 503)
  const timeout = AbortSignal.timeout(options.timeoutMs ?? TRANSCRIPTION_TIMEOUT_MS)
  const signal = AbortSignal.any([request.signal, timeout])
  try {
    const form = await readMultipart(request, signal)
    const files = form.getAll('file')
    const file = files[0]
    if (files.length !== 1 || !(file instanceof File) || file.size === 0) {
      return json({ error: 'A non-empty audio recording is required.' }, 400)
    }
    if (file.size > MAX_TRANSCRIPTION_BYTES) {
      return json({ error: 'The recording is too large. Record a shorter message (under 4 MB).' }, 413)
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = file.type.split(';')[0].trim().toLowerCase()
    if (!AUDIO_EXTENSIONS.has(extension) || !AUDIO_TYPES.has(mimeType)) {
      return json({ error: 'Use a WebM, MP4, MP3, M4A, MPEG, MPGA, or WAV recording.' }, 415)
    }
    const languages = form.getAll('language')
    const language = languages[0]
    if (languages.length > 1 || (language !== undefined && (typeof language !== 'string' || !/^[a-z]{2}$/i.test(language)))) {
      return json({ error: 'Use a two-letter language code, such as en.' }, 400)
    }

    const upload = new FormData()
    upload.set('file', file, `dictation.${extension}`)
    upload.set('model', env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-transcribe')
    upload.set('response_format', 'json')
    if (typeof language === 'string') upload.set('language', language.toLowerCase())
    const upstream = await (options.fetch ?? fetch)('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upload,
      signal,
    })
    const result: unknown = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      if (upstream.status === 401 || upstream.status === 403) {
        return json({ error: "Voice transcription isn't configured correctly. Check the site's OpenAI key." }, 502)
      }
      if (upstream.status === 429) {
        const code = typeof result === 'object' && result !== null && 'error' in result &&
          typeof result.error === 'object' && result.error !== null && 'code' in result.error ? result.error.code : undefined
        if (code === 'insufficient_quota') {
          return json({ error: "Voice transcription is unavailable because the site's OpenAI quota is exhausted." }, 503)
        }
        return json({ error: 'Voice transcription is busy. Try again in a moment.' }, 429, { 'Retry-After': '30' })
      }
      if (upstream.status === 400 || upstream.status === 422) {
        return json({ error: 'The recording could not be transcribed. Try recording again.' }, 422)
      }
      return json({ error: 'Voice transcription is temporarily unavailable. Try again.' }, 502)
    }
    if (typeof result !== 'object' || result === null || !('text' in result) || typeof result.text !== 'string') {
      return json({ error: 'The transcription service returned an unreadable response. Try again.' }, 502)
    }
    return json({ text: result.text.trim() })
  } catch (error) {
    if (request.signal.aborted) return json({ error: 'Transcription was cancelled.' }, 499)
    if (timeout.aborted) return json({ error: 'Transcription took too long. Try recording a shorter message.' }, 504)
    if (error instanceof TranscriptionRequestError) return json({ error: error.message }, error.status)
    return json({ error: 'Voice transcription could not connect. Try again.' }, 502)
  }
}

export default { fetch: handleTranscription }
