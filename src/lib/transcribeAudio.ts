import type { AiComposerTranscribeAudio } from '../components/AiComposer'

function recordingExtension(mimeType: string): string {
  const mime = mimeType.split(';', 1)[0].toLowerCase()
  if (mime === 'audio/mp4' || mime === 'video/mp4') return 'mp4'
  if (mime === 'audio/ogg') return 'ogg'
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return 'wav'
  if (mime === 'audio/mpeg') return 'mp3'
  return 'webm'
}

/** The website uses its own server; the reusable composer accepts any provider. */
export const transcribeAudio: AiComposerTranscribeAudio = async (audio, { signal, language }) => {
  const form = new FormData()
  form.append('file', audio, `dictation.${recordingExtension(audio.type)}`)
  const baseLanguage = language.toLowerCase().split(/[-_]/, 1)[0]
  if (/^[a-z]{2}$/.test(baseLanguage)) form.append('language', baseLanguage)

  const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal })
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 413) throw new Error('This recording is too long. Try a shorter memo.')
    const error = result && typeof result === 'object' && 'error' in result ? result.error : undefined
    throw new Error(typeof error === 'string' && error.trim()
      ? error
      : 'Audio could not be transcribed. Please try again.')
  }
  if (!result || typeof result !== 'object' || !('text' in result) || typeof result.text !== 'string') {
    throw new Error('Audio could not be transcribed. Please try again.')
  }
  return result.text.trim()
}
