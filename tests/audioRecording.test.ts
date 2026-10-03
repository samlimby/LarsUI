import assert from 'node:assert/strict'
import test from 'node:test'
import { startAudioRecording } from '../src/components/audioRecording.ts'

class FakeRecorder extends EventTarget {
  static latest: FakeRecorder
  static isTypeSupported(type: string) { return type === 'audio/webm;codecs=opus' }
  state = 'inactive'
  mimeType = 'audio/webm;codecs=opus'
  stopCalls = 0
  constructor() { super(); FakeRecorder.latest = this }
  data(text: string) {
    const event = new Event('dataavailable')
    Object.defineProperty(event, 'data', { value: new Blob([text], { type: this.mimeType }) })
    this.dispatchEvent(event)
  }
  start() { this.state = 'recording'; this.data('first ') }
  stop() {
    this.stopCalls++
    this.state = 'inactive'
    queueMicrotask(() => { this.data('final'); this.dispatchEvent(new Event('stop')) })
  }
}
Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeRecorder })
const stream = {} as MediaStream

test('waits for the final chunk and shares one stop promise across repeated calls', async () => {
  const recording = startAudioRecording(stream, () => assert.fail('Unexpected recorder error'))
  const first = recording.stop()
  assert.equal(recording.stop(), first)
  const audio = await first
  assert.equal(await audio.text(), 'first final')
  assert.equal(audio.type, 'audio/webm;codecs=opus')
  assert.equal(FakeRecorder.latest.stopCalls, 1)
})

test('cancel discards audio and rejects without waiting for the stop event', async () => {
  const recording = startAudioRecording(stream, () => assert.fail('Unexpected recorder error'))
  recording.cancel()
  await assert.rejects(recording.stop(), { name: 'AbortError' })
  recording.cancel()
  assert.equal(FakeRecorder.latest.stopCalls, 1)
})

test('cancel while stopping prevents final chunks from becoming accepted audio', async () => {
  const recording = startAudioRecording(stream, () => assert.fail('Unexpected recorder error'))
  const result = recording.stop()
  recording.cancel()
  await assert.rejects(result, { name: 'AbortError' })
})

test('recording failure is reported before acceptance and stop subsequently rejects', async () => {
  let errorMessage = ''
  const recording = startAudioRecording(stream, (error) => { errorMessage = error.message })
  FakeRecorder.latest.dispatchEvent(new Event('error'))
  assert.match(errorMessage, /stopped unexpectedly/)
  await assert.rejects(recording.stop(), /stopped unexpectedly/)
  recording.cancel()
  assert.equal(FakeRecorder.latest.stopCalls, 1)
})
