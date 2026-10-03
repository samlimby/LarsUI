import type { IncomingMessage } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { handleTranscription } from './api/transcribe.ts'

function requestBody(request: IncomingMessage) {
  let cleanup = () => {}
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const onData = (chunk: Buffer) => {
        controller.enqueue(chunk)
        if ((controller.desiredSize ?? 0) <= 0) request.pause()
      }
      const onEnd = () => { cleanup(); controller.close() }
      const onError = () => { cleanup(); controller.error(new Error('The audio upload was interrupted.')) }
      cleanup = () => {
        request.off('data', onData)
        request.off('end', onEnd)
        request.off('error', onError)
        request.off('aborted', onError)
      }
      request.on('data', onData)
      request.once('end', onEnd)
      request.once('error', onError)
      request.once('aborted', onError)
    },
    pull() { request.resume() },
    cancel() { cleanup(); request.resume() },
  })
}

function transcriptionApi(mode: string): Plugin {
  return {
    name: 'larsui-transcription-api',
    apply: 'serve',
    configureServer(server) {
      const localEnv = loadEnv(mode, server.config.envDir, '')
      const env = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? localEnv.OPENAI_API_KEY,
        OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL ?? localEnv.OPENAI_TRANSCRIPTION_MODEL,
      }
      server.middlewares.use(async (incoming, outgoing, next) => {
        if (incoming.url?.split('?')[0] !== '/api/transcribe') return next()
        const abort = new AbortController()
        const onAborted = () => abort.abort()
        const onClosed = () => { if (!outgoing.writableEnded) abort.abort() }
        incoming.once('aborted', onAborted)
        outgoing.once('close', onClosed)
        try {
          const headers = new Headers()
          for (const [name, value] of Object.entries(incoming.headers)) {
            if (Array.isArray(value)) value.forEach((part) => headers.append(name, part))
            else if (value !== undefined) headers.set(name, value)
          }
          const protocol = 'encrypted' in incoming.socket && incoming.socket.encrypted ? 'https' : 'http'
          const requestInit = {
            method: incoming.method,
            headers,
            signal: abort.signal,
            body: incoming.method === 'GET' || incoming.method === 'HEAD' ? undefined : requestBody(incoming),
            duplex: 'half' as const,
          }
          const request = new Request(`${protocol}://${incoming.headers.host ?? 'localhost'}${incoming.url}`, requestInit)
          const response = await handleTranscription(request, { env })
          if (outgoing.destroyed) return
          outgoing.statusCode = response.status
          response.headers.forEach((value, name) => outgoing.setHeader(name, value))
          outgoing.end(Buffer.from(await response.arrayBuffer()))
        } catch {
          if (!outgoing.destroyed) {
            outgoing.statusCode = 500
            outgoing.setHeader('Content-Type', 'application/json')
            outgoing.setHeader('Cache-Control', 'no-store')
            outgoing.end(JSON.stringify({ error: 'The audio upload could not be read. Try recording again.' }))
          }
        } finally {
          incoming.off('aborted', onAborted)
          outgoing.off('close', onClosed)
          incoming.resume()
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), transcriptionApi(mode)],
  build: {
    outDir: 'site-dist',
  },
  server: {
    port: 4300,
  },
}))
