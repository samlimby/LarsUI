import assert from 'node:assert/strict'
import test from 'node:test'
import { handleTranscription, MAX_TRANSCRIPTION_BYTES } from '../api/transcribe.ts'

const ORIGIN = 'https://larsui.example'
const env = { OPENAI_API_KEY: 'mock-key' }
const noFetch: typeof fetch = async () => { throw new Error('Validation must not call the provider') }

function recording(options: { filename?: string; type?: string; data?: string; language?: string; origin?: string; signal?: AbortSignal } = {}) {
  const form = new FormData()
  form.set('file', new File([options.data ?? 'mock-audio'], options.filename ?? 'memo.webm', { type: options.type ?? 'audio/webm;codecs=opus' }))
  if (options.language !== undefined) form.set('language', options.language)
  return new Request(`${ORIGIN}/api/transcribe`, {
    method: 'POST', headers: { Origin: options.origin ?? ORIGIN }, body: form, signal: options.signal,
  })
}

test('forwards the recording with a server-owned model and key; returns text only', async () => {
  const provider: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions')
    assert.equal(init?.method, 'POST')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer mock-key')
    assert.equal(new Headers(init?.headers).get('Content-Type'), null)
    const form = init?.body as FormData
    assert.equal(form.get('model'), 'gpt-transcribe')
    assert.equal(form.get('response_format'), 'json')
    assert.equal(form.get('language'), 'en')
    const file = form.get('file') as File
    assert.equal(file.name, 'dictation.webm')
    assert.equal(await file.text(), 'mock-audio')
    return Response.json({ text: '  Dictated message.  ', usage: { tokens: 1 }, extra: 'private-provider-detail' })
  }
  const response = await handleTranscription(recording({ language: 'EN' }), { env, fetch: provider })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(await response.json(), { text: 'Dictated message.' })
})

test('supports a server-configured model without accepting a client model', async () => {
  const provider: typeof fetch = async (_url, init) => {
    assert.equal((init?.body as FormData).get('model'), 'whisper-1')
    return Response.json({ text: 'Hello' })
  }
  assert.equal((await handleTranscription(recording(), {
    env: { ...env, OPENAI_TRANSCRIPTION_MODEL: 'whisper-1' }, fetch: provider,
  })).status, 200)
})

test('rejects method, origin, missing configuration, invalid media, and empty audio before provider calls', async () => {
  const cases: Array<[Request, number, Record<string, string>]> = [
    [new Request(`${ORIGIN}/api/transcribe`), 405, env],
    [recording({ origin: 'https://other.example' }), 403, env],
    [recording(), 503, {}],
    [recording({ filename: 'memo.txt', type: 'text/plain' }), 415, env],
    [recording({ data: '' }), 400, env],
    [recording({ language: 'en-GB' }), 400, env],
    [new Request(`${ORIGIN}/api/transcribe`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{}' }), 415, env],
  ]
  for (const [request, expected, configuration] of cases) {
    assert.equal((await handleTranscription(request, { env: configuration, fetch: noFetch })).status, expected)
  }
})

test('rejects malformed multipart and duplicate file fields', async () => {
  const malformed = new Request(`${ORIGIN}/api/transcribe`, {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'multipart/form-data; boundary=test' }, body: 'not multipart',
  })
  assert.equal((await handleTranscription(malformed, { env, fetch: noFetch })).status, 400)
  const form = new FormData()
  form.append('file', new File(['audio'], 'first.webm', { type: 'audio/webm' }))
  form.append('file', new File(['audio'], 'second.webm', { type: 'audio/webm' }))
  const duplicate = new Request(`${ORIGIN}/api/transcribe`, { method: 'POST', headers: { Origin: ORIGIN }, body: form })
  assert.equal((await handleTranscription(duplicate, { env, fetch: noFetch })).status, 400)
})

test('enforces the streaming size cap even without Content-Length', async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(MAX_TRANSCRIPTION_BYTES + 1)) },
    cancel() { cancelled = true },
  })
  const init = {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'multipart/form-data; boundary=test' }, body, duplex: 'half' as const,
  }
  const request = new Request(`${ORIGIN}/api/transcribe`, init)
  assert.equal((await handleTranscription(request, { env, fetch: noFetch })).status, 413)
  assert.equal(cancelled, true)
})

test('returns safe provider errors without forwarding provider diagnostics', async () => {
  for (const [status, code, expected] of [[401, 'invalid_api_key', 502], [429, 'insufficient_quota', 503], [429, 'rate_limit', 429], [500, 'server_error', 502]] as const) {
    const provider: typeof fetch = async () => Response.json({ error: { code, message: 'mock-key private-provider-detail' } }, { status })
    const response = await handleTranscription(recording(), { env, fetch: provider })
    assert.equal(response.status, expected)
    const body = await response.text()
    assert.ok(!body.includes('mock-key'))
    assert.ok(!body.includes('private-provider-detail'))
  }
})

test('handles unreadable provider responses, timeouts, and client cancellation', async () => {
  const malformed: typeof fetch = async () => Response.json({ wrong: 'shape' })
  assert.equal((await handleTranscription(recording(), { env, fetch: malformed })).status, 502)
  const waiting: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Mock fetch failed')), 100)
    init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason) }, { once: true })
  })
  assert.equal((await handleTranscription(recording(), { env, fetch: waiting, timeoutMs: 10 })).status, 504)
  const controller = new AbortController()
  controller.abort()
  assert.equal((await handleTranscription(recording({ signal: controller.signal }), { env, fetch: noFetch })).status, 499)
})
