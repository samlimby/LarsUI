import { Menu } from '@base-ui/react/menu'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { Button } from './Button'
import { AiComposerIcon, type AiComposerIconName, type AiComposerIcons } from './AiComposerIcon.js'
export type { AiComposerIconName, AiComposerIcons } from './AiComposerIcon.js'
import { AiComposerWaveform } from './AiComposerWaveform'
import { startAudioRecording, type AudioRecording } from './audioRecording'
import { SegmentedControl } from './SegmentedControl'
import './AiComposer.css'

export type AiComposerVariant = 'structured' | 'unstructured'
export type AiComposerSize = 'default' | 'small'
export type AiComposerMode = 'work' | 'plan' | 'chat'
export type AiComposerAction = 'more'
export type AiComposerModelProvider = 'anthropic' | 'openai' | 'xai' | 'kimi'
export type AiComposerModelOption = {
  value: string
  label: string
  provider?: AiComposerModelProvider
  icon?: ReactNode
}
export type AiComposerSuggestion = {
  id: string
  label: string
}

export type AiComposerTranscriptionOptions = {
  signal: AbortSignal
  language: string
}
export type AiComposerTranscribeAudio = (audio: Blob, options: AiComposerTranscriptionOptions) => Promise<string>

export type AiComposerSubmission = {
  files: File[]
  message: string
  model?: string
  mode?: AiComposerMode
  variant: AiComposerVariant
}

export type AiComposerInputProps = Omit<ComponentProps<'textarea'>, 'children' | 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'readOnly' | 'placeholder' | 'rows' | 'ref'>

export type AiComposerProps = Omit<ComponentProps<'form'>, 'children' | 'onSubmit'> & {
  /** Disables editing and all composer actions. */
  disabled?: boolean
  /** Allows reading/copying the draft while disabling changes and sending. */
  readOnly?: boolean
  /** Accessible label for the message textarea. */
  inputLabel?: string
  /** Native textarea options such as name, required, maxLength, and aria-describedby. */
  inputProps?: AiComposerInputProps
  /** Override individual icons; defaults are open-source Lucide icons. */
  icons?: AiComposerIcons
  variant?: AiComposerVariant
  size?: AiComposerSize
  value?: string
  defaultValue?: string
  model?: string
  defaultModel?: string
  mode?: AiComposerMode
  defaultMode?: AiComposerMode
  modelOptions?: readonly AiComposerModelOption[]
  onModelChange?: (model: string) => void
  onModeChange?: (mode: AiComposerMode) => void
  onValueChange?: (value: string) => void
  /** Called with the recognized words when the user accepts a dictation. */
  onDictationComplete?: (transcript: string) => void
  /** Records audio and calls your provider when accepted; omitted uses browser recognition. */
  transcribeAudio?: AiComposerTranscribeAudio
  /** Success clears the draft; rejection preserves it. AbortError cancellation is silent. */
  onSubmit?: (submission: AiComposerSubmission) => void | Promise<void>
  /** Host-controlled response generation state; replaces Send with Stop. */
  generating?: boolean
  /** Cancel the host's generation request. The host also resets generating when it ends. */
  onStop?: () => void | Promise<void>
  onAction?: (action: AiComposerAction) => void
  placeholder?: string
  rotatePlaceholder?: boolean
  /** Shows attachment and more controls at either size. */
  showAddButton?: boolean
  /** Shows voice dictation entry points at either size. */
  showDictation?: boolean
  showModelDropdown?: boolean
  showModelSelector?: boolean
  showSuggestions?: boolean
  suggestions?: readonly AiComposerSuggestion[]
}

type AttachedFile = { id: number; file: File }
type DictationState = 'idle' | 'starting' | 'active' | 'ready' | 'accepting'
type DictationFeedback = { message: string; tone: 'error' | 'info' }
type SpeechResult = { isFinal: boolean; [index: number]: { transcript: string } }
type SpeechResultEvent = { results: ArrayLike<SpeechResult> }
type SpeechErrorEvent = { error: string }
type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  processLocally?: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: (track?: MediaStreamTrack) => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionInstance
  available?: (options: { langs: string[]; processLocally: true }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>
  install?: (options: { langs: string[]; processLocally: true }) => Promise<boolean>
}
type LocalRecognitionAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown'

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const browser = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}

function appendSpokenText(message: string, transcript: string) {
  const spoken = transcript.trim()
  if (!spoken) return message
  return `${message}${message && !/\s$/.test(message) ? ' ' : ''}${spoken}`
}

function getDictationFeedback(error: string): DictationFeedback {
  if (error === 'not-allowed' || error === 'service-not-allowed') return { message: 'Microphone access was denied or voice dictation is unavailable here.', tone: 'error' }
  if (error === 'audio-capture') return { message: 'No microphone was found. Check your audio input and try again.', tone: 'error' }
  if (error === 'no-speech') return { message: 'No words were transcribed. Try again, or use your system dictation shortcut in the message field.', tone: 'info' }
  if (error === 'language-not-supported') return { message: 'Speech recognition is not available for your browser language.', tone: 'error' }
  if (error === 'network') return { message: 'Voice dictation could not connect in this browser. Use your system dictation shortcut in the message field, or open this page in Chrome.', tone: 'info' }
  return { message: 'Voice dictation stopped unexpectedly. Try again.', tone: 'error' }
}

function abortRecognition(recognition: SpeechRecognitionInstance) {
  recognition.onstart = null
  recognition.onresult = null
  recognition.onerror = null
  recognition.onend = null
  try { recognition.abort() } catch { /* The session may already have ended. */ }
}

const attachmentEase = [0.25, 1, 0.5, 1] as const
const placeholderMessages = [
  'How can I help you today?',
  "What's on your mind?",
  "Ready to type? I'm here to help",
  "Let's build something great today",
  'Do something amazing',
  'Type out your thoughts',
] as const
const defaultModelOptions: readonly AiComposerModelOption[] = [
  { value: 'sonnet-5.5', label: 'Sonnet 5.5', provider: 'anthropic' },
  { value: 'gpt-5.6', label: 'GPT-5.6', provider: 'openai' },
  { value: 'grok-4', label: 'Grok 4', provider: 'xai' },
  { value: 'kimi-k3', label: 'Kimi K3', provider: 'kimi' },
]
const modeOptions = [
  { value: 'work', label: 'Work' },
  { value: 'plan', label: 'Plan' },
  { value: 'chat', label: 'Chat' },
] as const

function ModelMark({ option }: { option: AiComposerModelOption }) {
  return (
    <span aria-hidden="true" className="lars-ai-composer__model-mark">
      {option.icon ?? (option.provider && <span className={`lars-ai-composer__model-brand lars-ai-composer__model-brand--${option.provider}`} />)}
    </span>
  )
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}mb`
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)}kb`
  return `${bytes}b`
}

function AttachmentCard({ id, file, onRemove, reducedMotion, disabled, icons }: { id: number; file: File; onRemove: (button: HTMLButtonElement) => void; reducedMotion: boolean; disabled: boolean; icons?: AiComposerIcons }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setPreviewUrl(null)

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => {
        active = false
        URL.revokeObjectURL(url)
      }
    }

    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      void import('./pdfThumbnail')
        .then(({ renderPdfThumbnail }) => renderPdfThumbnail(file))
        .then((url) => { if (active) setPreviewUrl(url) })
        .catch(() => { /* Keep the neutral thumbnail for unreadable PDFs. */ })
    }

    return () => { active = false }
  }, [file])

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="lars-ai-composer__attachment"
      exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
      layout={reducedMotion ? false : 'position'}
      transition={{ duration: reducedMotion ? 0.12 : 0.2, ease: attachmentEase }}
    >
      <span className="lars-ai-composer__attachment-thumbnail">
        {previewUrl && (
          <motion.img
            alt=""
            animate={{ opacity: 1 }}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            src={previewUrl}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          />
        )}
        <button aria-label={`Remove ${file.name}`} className="lars-ai-composer__remove" data-attachment-id={id} disabled={disabled} onClick={(event) => onRemove(event.currentTarget)} title={`Remove ${file.name}`} type="button">
          <AiComposerIcon icons={icons} name="close" size={16} />
        </button>
      </span>
      <span className="lars-ai-composer__attachment-details">
        <span className="lars-ai-composer__attachment-name" title={file.name}>{file.name}</span>
        <span className="lars-ai-composer__attachment-size">{formatFileSize(file.size)}</span>
      </span>
    </motion.div>
  )
}

export function AiComposer({
  className = '',
  defaultMode = 'plan',
  defaultModel,
  defaultValue = '',
  disabled = false,
  generating = false,
  readOnly = false,
  inputLabel = 'Message',
  inputProps = {},
  icons,
  model,
  mode,
  modelOptions = defaultModelOptions,
  onAction,
  onDictationComplete,
  onModelChange,
  onModeChange,
  onSubmit,
  onStop,
  onValueChange,
  placeholder,
  rotatePlaceholder = true,
  size = 'default',
  showAddButton = true,
  showDictation = true,
  showModelDropdown = true,
  showModelSelector = false,
  showSuggestions = false,
  suggestions = [],
  transcribeAudio,
  value,
  variant = 'unstructured',
  ...formProps
}: AiComposerProps) {
  const generatedMessageId = useId()
  const messageId = inputProps.id ?? generatedMessageId
  const feedbackId = `${generatedMessageId}-feedback`
  const fileInput = useRef<HTMLInputElement>(null)
  const messageInput = useRef<HTMLTextAreaElement>(null)
  const pendingMessageFocusRef = useRef(false)
  const composerContent = useRef<HTMLDivElement>(null)
  const composerToolbar = useRef<HTMLDivElement>(null)
  const nextAttachmentId = useRef(0)
  const submittingRef = useRef(false)
  const submissionIdRef = useRef(0)
  const stoppingRef = useRef(false)
  const stopRequestIdRef = useRef(0)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const dictationStreamRef = useRef<MediaStream | null>(null)
  const recordingRef = useRef<{ recording: AudioRecording; transcribe: AiComposerTranscribeAudio; language: string; startId: number } | null>(null)
  const transcriptionAbortRef = useRef<AbortController | null>(null)
  const dictationStartIdRef = useRef(0)
  const localRecognitionReadyRef = useRef(false)
  const localRecognitionAvailabilityRef = useRef<LocalRecognitionAvailability>('unknown')
  const stopTimeoutRef = useRef<number | null>(null)
  const processedSpeechResults = useRef(new Set<number>())
  const dictationTranscriptRef = useRef('')
  const dictationInterimRef = useRef('')
  const acceptingDictationRef = useRef(false)
  const dictationViewRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef(value ?? defaultValue)
  const onValueChangeRef = useRef(onValueChange)
  const onDictationCompleteRef = useRef(onDictationComplete)
  const isControlledRef = useRef(value !== undefined)
  const reducedMotion = useReducedMotion() ?? false
  const [draft, setDraft] = useState(defaultValue)
  const [expandedFromWrap, setExpandedFromWrap] = useState(false)
  const composerContentHeight = useMotionValue<number | string>('auto')
  const [draftModel, setDraftModel] = useState(defaultModel ?? modelOptions[0]?.value ?? '')
  const [draftMode, setDraftMode] = useState<AiComposerMode>(defaultMode)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [suggestionOrder, setSuggestionOrder] = useState<string[]>([])
  const [shuffleRound, setShuffleRound] = useState(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [attachmentExiting, setAttachmentExiting] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const [dictationState, setDictationState] = useState<DictationState>('idle')
  const [dictationStream, setDictationStream] = useState<MediaStream | null>(null)
  const [dictationFeedback, setDictationFeedback] = useState<DictationFeedback | null>(null)
  const [dictationPreview, setDictationPreview] = useState('')
  const [dictationFinalAnnouncement, setDictationFinalAnnouncement] = useState('')
  const [canInstallLocalRecognition, setCanInstallLocalRecognition] = useState(false)
  const [installingLocalRecognition, setInstallingLocalRecognition] = useState(false)
  const isSmall = size === 'small' && !expandedFromWrap
  const effectiveSize = isSmall ? 'small' : 'default'
  const hasAddButton = showAddButton
  const hasDictation = showDictation
  const interactionBlocked = disabled || readOnly || isSubmitting
  const message = value ?? draft
  const isDictating = dictationState !== 'idle'
  const isTranscribing = dictationState === 'accepting'
  const hasKeyboardShortcuts = Boolean(onSubmit) && !interactionBlocked && !isStopping && !generating && !isDictating
  const displayedMessage = isDictating ? appendSpokenText(message, dictationPreview) : message
  // Preserve the stored draft and captured words while showing the processing placeholder.
  const inputValue = isTranscribing ? '' : displayedMessage
  onValueChangeRef.current = onValueChange
  onDictationCompleteRef.current = onDictationComplete
  isControlledRef.current = value !== undefined
  if (value !== undefined) messageRef.current = value
  const hasRotatingPlaceholder = !isTranscribing && rotatePlaceholder && placeholder === undefined
  const showRotatingPlaceholder = hasRotatingPlaceholder && displayedMessage.length === 0
  const feedback = submissionError ? { message: submissionError, tone: 'error' as const } : dictationFeedback
  const icon = (name: AiComposerIconName, props: { size?: number; className?: string } = {}) => <AiComposerIcon icons={icons} name={name} {...props} />
  const selectedModel = modelOptions.find((option) => option.value === (model ?? draftModel)) ?? modelOptions[0]
  const selectedMode = mode ?? draftMode
  const hasModelDropdown = showModelDropdown && Boolean(selectedModel)
  const hasModelSelector = !isSmall && showModelSelector
  const modeMotion = reducedMotion
    ? { duration: 0.12 }
    : { duration: 0.28, ease: attachmentEase, layout: { duration: 0.32, ease: attachmentEase } }
  const canSubmit = message.trim().length > 0 || files.length > 0
  const hasAttachments = files.length > 0
  const showAttachmentChrome = hasAttachments || attachmentExiting
  const orderedSuggestions = [
    ...suggestionOrder.flatMap((id) => {
      const suggestion = suggestions.find((item) => item.id === id)
      return suggestion ? [suggestion] : []
    }),
    ...suggestions.filter((item) => !suggestionOrder.includes(item.id)),
  ]

  // Stretch the mode group only after its natural layout wraps above the actions.
  useLayoutEffect(() => {
    const toolbar = composerToolbar.current
    if (!toolbar) return
    toolbar.removeAttribute('data-stacked')
    if (isSmall || isDictating || !hasModelSelector) return
    const modeGroup = toolbar.querySelector<HTMLElement>('.lars-ai-composer__mode-motion')
    const actions = toolbar.querySelector<HTMLElement>('.lars-ai-composer__toolbar-actions')
    if (!modeGroup || !actions) return

    let active = true
    let previousSizes = ''
    const sizes = () => [toolbar.clientWidth, modeGroup.offsetWidth, actions.offsetWidth].join(':')
    const updateLayout = () => {
      // Measure intrinsic widths first so a filled row can return to inline.
      toolbar.removeAttribute('data-stacked')
      if (modeGroup.offsetHeight > 0 && actions.offsetTop >= modeGroup.offsetTop + modeGroup.offsetHeight) {
        toolbar.setAttribute('data-stacked', '')
      }
      previousSizes = sizes()
    }
    updateLayout()
    const observer = new ResizeObserver(() => {
      if (sizes() !== previousSizes) updateLayout()
    })
    observer.observe(toolbar)
    observer.observe(modeGroup)
    observer.observe(actions)
    void document.fonts?.ready.then(() => { if (active) updateLayout() })
    return () => {
      active = false
      observer.disconnect()
      toolbar.removeAttribute('data-stacked')
    }
  }, [isSmall, isDictating, hasModelSelector, hasModelDropdown, hasAddButton, hasDictation, variant])

  // Grow with wrapped text, keeping complete lines within the viewport budget.
  useLayoutEffect(() => {
    const textarea = messageInput.current
    const content = composerContent.current
    if (!textarea || !content) return
    if (isSmall) {
      textarea.style.height = ''
      return
    }
    // Keep the draft's height while the processing placeholder replaces its text.
    if (isTranscribing) return

    const composer = textarea.closest('form')
    const toolbar = content.querySelector<HTMLElement>('.lars-ai-composer__toolbar')
    const attachments = content.querySelector<HTMLElement>('.lars-ai-composer__attachments-reveal')
    const resizeInput = () => {
      const style = window.getComputedStyle(textarea)
      const lineHeight = Number.parseFloat(style.lineHeight) || 18
      const padding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
      const border = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0)
      const minHeight = Math.max(Number.parseFloat(style.minHeight) || 0, lineHeight * 3 + padding + border)
      const lineLimit = lineHeight * 10 + padding + border
      const scrollTop = textarea.scrollTop
      textarea.style.height = '0px'
      const naturalHeight = Math.max(minHeight, textarea.scrollHeight + border)
      textarea.style.height = `${Math.min(naturalHeight, lineLimit)}px`

      // Measure the natural inner content, rather than the animated outer clip.
      // Include attachments, stacked controls, and the form's own padding/border.
      const composerStyle = composer ? window.getComputedStyle(composer) : null
      const outerSpacing = composerStyle
        ? ['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width']
          .reduce((total, property) => total + (Number.parseFloat(composerStyle.getPropertyValue(property)) || 0), 0)
        : 0
      const chromeHeight = Math.max(0, content.offsetHeight - textarea.offsetHeight) + outerSpacing
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const availableLines = Math.floor((viewportHeight * 0.4 - chromeHeight - padding - border) / lineHeight)
      // Preserve a usable minimum when the viewport or attachment area is very small.
      const maxHeight = Math.max(minHeight, Math.min(lineLimit, availableLines * lineHeight + padding + border))
      textarea.style.height = `${Math.min(naturalHeight, maxHeight)}px`
      textarea.scrollTop = scrollTop
    }

    resizeInput()
    const measureLayout = () => [textarea.clientWidth, toolbar?.offsetHeight ?? 0, attachments?.offsetHeight ?? 0].join(':')
    let previousLayout = measureLayout()
    const observer = new ResizeObserver(() => {
      const layout = measureLayout()
      if (layout === previousLayout) return
      previousLayout = layout
      resizeInput()
    })
    observer.observe(textarea)
    if (toolbar) observer.observe(toolbar)
    if (attachments) observer.observe(attachments)
    window.addEventListener('resize', resizeInput)
    window.visualViewport?.addEventListener('resize', resizeInput)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resizeInput)
      window.visualViewport?.removeEventListener('resize', resizeInput)
    }
  }, [inputValue, isDictating, isSmall, isTranscribing, variant, inputProps.className, inputProps.style, showAttachmentChrome, hasModelSelector, hasModelDropdown, hasAddButton, hasDictation])

  // Keep the expanded layout until clear: its wider input may fit the same text on one line.
  useLayoutEffect(() => {
    if (size !== 'small' || displayedMessage.length === 0) {
      setExpandedFromWrap(false)
      return
    }
    const textarea = messageInput.current
    if (!isSmall || isDictating || !textarea) return
    const measureLines = () => {
      if (textarea.clientWidth > 0 && textarea.scrollHeight > textarea.clientHeight + 1) {
        setExpandedFromWrap(true)
      }
    }
    measureLines()
    const observer = new ResizeObserver(measureLines)
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [displayedMessage, isDictating, isSmall, showAttachmentChrome, size])

  useLayoutEffect(() => {
    const content = composerContent.current
    if (size !== 'small' || !content) return
    let previousHeight: number | undefined
    let resizeAnimation: ReturnType<typeof animate> | undefined
    const measureHeight = () => {
      const height = content.offsetHeight
      if (height === previousHeight) return
      resizeAnimation?.stop()
      if (previousHeight === undefined || reducedMotion) {
        composerContentHeight.set(height)
      } else {
        resizeAnimation = animate(composerContentHeight, height, { duration: 0.28, ease: attachmentEase })
      }
      previousHeight = height
    }
    measureHeight()
    const observer = new ResizeObserver(measureHeight)
    observer.observe(content)
    return () => {
      observer.disconnect()
      resizeAnimation?.stop()
    }
  }, [composerContentHeight, reducedMotion, size])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Meta') {
        setKeyboardFocus(true)
      }
    }
    const handlePointerDown = () => setKeyboardFocus(false)

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [])

  useEffect(() => {
    if (!hasModelDropdown || isSmall) setModelMenuOpen(false)
  }, [hasModelDropdown, isSmall])

  useEffect(() => {
    if (!showRotatingPlaceholder || reducedMotion) return
    const interval = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderMessages.length)
    }, 7_500)
    return () => window.clearInterval(interval)
  }, [showRotatingPlaceholder, reducedMotion])

  useEffect(() => () => {
    submissionIdRef.current += 1
    stopRequestIdRef.current += 1
    dictationStartIdRef.current += 1
    if (stopTimeoutRef.current !== null) window.clearTimeout(stopTimeoutRef.current)
    if (recognitionRef.current) abortRecognition(recognitionRef.current)
    recognitionRef.current = null
    recordingRef.current?.recording.cancel()
    recordingRef.current = null
    transcriptionAbortRef.current?.abort()
    transcriptionAbortRef.current = null
    dictationStreamRef.current?.getTracks().forEach((track) => track.stop())
    dictationStreamRef.current = null
  }, [])

  useEffect(() => {
    if (generating) return
    // A completed response invalidates any unfinished stop callback from that response.
    stopRequestIdRef.current += 1
    stoppingRef.current = false
    setIsStopping(false)
  }, [generating])

  useEffect(() => {
    if (transcribeAudio) return
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition?.available) return
    let mounted = true
    void Recognition.available({ langs: [navigator.language || 'en-US'], processLocally: true })
      .then((availability) => {
        if (!mounted || localRecognitionReadyRef.current) return
        localRecognitionAvailabilityRef.current = availability
        if (availability === 'available') localRecognitionReadyRef.current = true
        if (availability === 'unavailable') setCanInstallLocalRecognition(false)
      })
      .catch(() => { /* Continue with browser recognition when the local check is blocked. */ })
    return () => { mounted = false }
  }, [transcribeAudio])

  useEffect(() => {
    if (!isDictating || isTranscribing) return
    const frame = window.requestAnimationFrame(() => {
      dictationViewRef.current?.querySelector<HTMLButtonElement>('[data-dictation-cancel]')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isDictating, isTranscribing])

  // Compact dictation mounts its textarea only when transcription begins.
  // Complete the requested handoff after refs are set, before the browser paints.
  useLayoutEffect(() => {
    if (!pendingMessageFocusRef.current) return
    if (disabled) {
      pendingMessageFocusRef.current = false
      return
    }
    if (!messageInput.current || messageInput.current.disabled) return
    messageInput.current.focus({ preventScroll: true })
    pendingMessageFocusRef.current = false
  })

  const setMessage = (next: string) => {
    messageRef.current = next
    setDictationFeedback(null)
    setSubmissionError(null)
    if (value === undefined) setDraft(next)
    onValueChange?.(next)
  }

  const clearStopTimeout = () => {
    if (stopTimeoutRef.current !== null) window.clearTimeout(stopTimeoutRef.current)
    stopTimeoutRef.current = null
  }

  const releaseDictationStream = () => {
    dictationStreamRef.current?.getTracks().forEach((track) => track.stop())
    dictationStreamRef.current = null
    setDictationStream(null)
  }

  const focusMessage = () => {
    pendingMessageFocusRef.current = true
    if (messageInput.current && !messageInput.current.disabled) {
      messageInput.current.focus({ preventScroll: true })
    } else {
      // Keep focus on a live control until the compact textarea is mounted.
      dictationViewRef.current?.querySelector<HTMLButtonElement>('[data-dictation-cancel]')?.focus({ preventScroll: true })
    }
  }

  const capturedTranscript = () => appendSpokenText(dictationTranscriptRef.current, dictationInterimRef.current).trim()

  const commitDictation = () => {
    dictationStartIdRef.current += 1
    releaseDictationStream()
    const transcript = capturedTranscript()
    acceptingDictationRef.current = false
    dictationTranscriptRef.current = ''
    dictationInterimRef.current = ''
    setDictationPreview('')
    setDictationFinalAnnouncement('')
    setCanInstallLocalRecognition(false)
    if (transcript) {
      const next = appendSpokenText(messageRef.current, transcript)
      messageRef.current = next
      if (!isControlledRef.current) setDraft(next)
      onValueChangeRef.current?.(next)
      onDictationCompleteRef.current?.(transcript)
    }
    if (transcript) setSubmissionError(null)
    setDictationFeedback(transcript ? null : getDictationFeedback('no-speech'))
    setDictationState('idle')
    focusMessage()
  }

  const cancelDictation = () => {
    dictationStartIdRef.current += 1
    recordingRef.current?.recording.cancel()
    recordingRef.current = null
    transcriptionAbortRef.current?.abort()
    transcriptionAbortRef.current = null
    releaseDictationStream()
    clearStopTimeout()
    acceptingDictationRef.current = false
    dictationTranscriptRef.current = ''
    dictationInterimRef.current = ''
    setDictationPreview('')
    setDictationFinalAnnouncement('')
    setCanInstallLocalRecognition(false)
    setInstallingLocalRecognition(false)
    if (recognitionRef.current) abortRecognition(recognitionRef.current)
    recognitionRef.current = null
    setDictationFeedback(null)
    setDictationState('idle')
    focusMessage()
  }

  useEffect(() => {
    if ((disabled || readOnly) && isDictating) cancelDictation()
  }, [disabled, readOnly, isDictating])

  const failRecordedDictation = (startId: number, error: unknown) => {
    if (dictationStartIdRef.current !== startId) return
    dictationStartIdRef.current += 1
    recordingRef.current?.recording.cancel()
    recordingRef.current = null
    transcriptionAbortRef.current?.abort()
    transcriptionAbortRef.current = null
    acceptingDictationRef.current = false
    releaseDictationStream()
    setDictationPreview('')
    setDictationState('idle')
    const name = error instanceof Error ? error.name : ''
    setDictationFeedback(name === 'NotAllowedError' || name === 'SecurityError'
      ? getDictationFeedback('not-allowed')
      : name === 'NotFoundError'
        ? getDictationFeedback('audio-capture')
        : { message: error instanceof Error ? error.message : 'Voice dictation could not finish. Try again.', tone: 'error' })
    focusMessage()
  }

  const finishRecordedDictation = async (session: NonNullable<typeof recordingRef.current>) => {
    acceptingDictationRef.current = true
    setDictationState('accepting')
    const controller = new AbortController()
    transcriptionAbortRef.current = controller
    try {
      const audio = await session.recording.stop()
      if (dictationStartIdRef.current !== session.startId || controller.signal.aborted) return
      releaseDictationStream()
      if (!audio.size) throw new Error('No audio was recorded. Try again.')
      const transcript = await session.transcribe(audio, { signal: controller.signal, language: session.language })
      if (dictationStartIdRef.current !== session.startId || controller.signal.aborted) return
      if (typeof transcript !== 'string') throw new Error('The transcription service did not return text. Try again.')
      recordingRef.current = null
      transcriptionAbortRef.current = null
      dictationTranscriptRef.current = transcript.trim()
      dictationInterimRef.current = ''
      commitDictation()
    } catch (error) {
      failRecordedDictation(session.startId, error)
    }
  }

  const acceptDictation = () => {
    if (dictationState === 'starting' || acceptingDictationRef.current) return
    focusMessage()
    const session = recordingRef.current
    if (session) {
      void finishRecordedDictation(session)
      return
    }
    const recognition = recognitionRef.current
    if (!recognition) {
      commitDictation()
      return
    }
    acceptingDictationRef.current = true
    setDictationState('accepting')
    stopTimeoutRef.current = window.setTimeout(() => {
      if (recognitionRef.current === recognition) {
        abortRecognition(recognition)
        recognitionRef.current = null
        commitDictation()
      }
      stopTimeoutRef.current = null
    }, 3_000)
    try {
      recognition.stop()
    } catch {
      clearStopTimeout()
      abortRecognition(recognition)
      recognitionRef.current = null
      commitDictation()
    }
  }

  const startDictation = async () => {
    if (interactionBlocked || dictationState !== 'idle' || installingLocalRecognition) return
    const startId = ++dictationStartIdRef.current
    if (transcribeAudio) {
      setDictationFeedback(null)
      setDictationPreview('')
      setDictationFinalAnnouncement('')
      setCanInstallLocalRecognition(false)
      dictationTranscriptRef.current = ''
      dictationInterimRef.current = ''
      acceptingDictationRef.current = false
      setDictationState('starting')
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone recording requires HTTPS or localhost.')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (dictationStartIdRef.current !== startId) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        dictationStreamRef.current = stream
        setDictationStream(stream)
        const recording = startAudioRecording(stream, (error) => failRecordedDictation(startId, error))
        recordingRef.current = { recording, transcribe: transcribeAudio, language: navigator.language || 'en-US', startId }
        setDictationState('active')
      } catch (error) {
        failRecordedDictation(startId, error)
      }
      return
    }
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      setDictationFeedback({ message: 'Voice dictation is not available in this browser. Use your system dictation shortcut in the message field.', tone: 'info' })
      messageInput.current?.focus({ preventScroll: true })
      return
    }

    setDictationFeedback(null)
    setDictationPreview('')
    setDictationFinalAnnouncement('')
    setCanInstallLocalRecognition(false)
    setDictationState('starting')

    const language = navigator.language || 'en-US'
    // In browsers with on-device recognition, install must be called directly
    // from the microphone click: some browsers require a user gesture.
    if (!localRecognitionReadyRef.current
      && Recognition.available
      && Recognition.install
      && localRecognitionAvailabilityRef.current !== 'unavailable') {
      setInstallingLocalRecognition(true)
      let installed = false
      try {
        installed = await Recognition.install({ langs: [language], processLocally: true })
        if (dictationStartIdRef.current !== startId) return
        if (installed) {
          const availability = await Recognition.available({ langs: [language], processLocally: true })
          if (dictationStartIdRef.current !== startId) return
          localRecognitionAvailabilityRef.current = availability
          localRecognitionReadyRef.current = availability === 'available'
        }
      } catch {
        // The browser may block installation. Keep its normal speech service
        // available as a fallback below.
      } finally {
        if (dictationStartIdRef.current === startId) setInstallingLocalRecognition(false)
      }
    }
    if (dictationStartIdRef.current !== startId) return

    let microphoneStream: MediaStream | null = null
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        // Recognition may still obtain the browser's microphone directly.
      }
      if (dictationStartIdRef.current !== startId) {
        microphoneStream?.getTracks().forEach((track) => track.stop())
        return
      }
      if (microphoneStream) {
        dictationStreamRef.current = microphoneStream
        setDictationStream(microphoneStream)
      }
    }

    let recognition: SpeechRecognitionInstance
    try {
      recognition = new Recognition()
    } catch {
      releaseDictationStream()
      setDictationState('idle')
      setDictationFeedback({ message: 'Voice dictation could not start. Try again.', tone: 'error' })
      return
    }

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    if (localRecognitionReadyRef.current) recognition.processLocally = true
    processedSpeechResults.current.clear()
    dictationTranscriptRef.current = ''
    dictationInterimRef.current = ''
    acceptingDictationRef.current = false
    recognition.onstart = () => {
      if (recognitionRef.current === recognition) {
        setDictationState((current) => current === 'starting' ? 'active' : current)
      }
    }
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return
      const finalSegments: string[] = []
      const interimSegments: string[] = []
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index]
        if (!result) continue
        const spoken = result[0]?.transcript ?? ''
        if (result.isFinal) {
          if (processedSpeechResults.current.has(index)) continue
          processedSpeechResults.current.add(index)
          finalSegments.push(spoken)
        } else {
          interimSegments.push(spoken)
        }
      }
      if (finalSegments.length) {
        dictationTranscriptRef.current = appendSpokenText(dictationTranscriptRef.current, finalSegments.join(' '))
        setDictationFinalAnnouncement(finalSegments.join(' ').trim())
      }
      dictationInterimRef.current = interimSegments.join(' ').trim()
      setDictationPreview(capturedTranscript())
    }
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return
      clearStopTimeout()
      recognitionRef.current = null
      abortRecognition(recognition)
      releaseDictationStream()
      if (acceptingDictationRef.current && capturedTranscript()) {
        commitDictation()
        return
      }
      acceptingDictationRef.current = false
      if (recognition.processLocally && (event.error === 'language-not-supported' || event.error === 'service-not-allowed')) {
        localRecognitionReadyRef.current = false
        localRecognitionAvailabilityRef.current = 'unavailable'
      }
      const canInstallLocally = (event.error === 'network' || event.error === 'no-speech')
        && Boolean(Recognition.available && Recognition.install)
        && !localRecognitionReadyRef.current
        && localRecognitionAvailabilityRef.current !== 'unavailable'
      setDictationFeedback(canInstallLocally && event.error === 'network'
        ? { message: 'Voice dictation could not connect in this browser.', tone: 'info' }
        : getDictationFeedback(event.error))
      setCanInstallLocalRecognition(canInstallLocally)
      if (capturedTranscript()) {
        setDictationState('ready')
      } else {
        setDictationPreview('')
        setDictationState('idle')
        focusMessage()
      }
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      clearStopTimeout()
      recognitionRef.current = null
      releaseDictationStream()
      if (acceptingDictationRef.current) {
        commitDictation()
      } else if (capturedTranscript()) {
        setDictationState('ready')
      } else {
        setDictationPreview('')
        setDictationState('idle')
        const canInstallLocally = Boolean(Recognition.available && Recognition.install)
          && !localRecognitionReadyRef.current
          && localRecognitionAvailabilityRef.current !== 'unavailable'
        setCanInstallLocalRecognition(canInstallLocally)
        setDictationFeedback(getDictationFeedback('no-speech'))
        focusMessage()
      }
    }

    recognitionRef.current = recognition
    try {
      const audioTrack = microphoneStream?.getAudioTracks()[0]
      if (audioTrack) recognition.start(audioTrack)
      else recognition.start()
    } catch {
      recognitionRef.current = null
      abortRecognition(recognition)
      releaseDictationStream()
      setDictationPreview('')
      setDictationState('idle')
      setDictationFeedback({ message: 'Voice dictation could not start. Check microphone access and try again.', tone: 'error' })
    }
  }

  const installOnDeviceDictation = async () => {
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition?.available || !Recognition.install || installingLocalRecognition) return
    const startId = ++dictationStartIdRef.current
    const language = navigator.language || 'en-US'
    setInstallingLocalRecognition(true)
    setDictationFeedback({ message: 'Preparing on-device voice dictation…', tone: 'info' })
    try {
      // Start the installation while this click still has user activation.
      const installed = await Recognition.install({ langs: [language], processLocally: true })
      if (dictationStartIdRef.current !== startId) return
      const availability = installed
        ? await Recognition.available({ langs: [language], processLocally: true })
        : localRecognitionAvailabilityRef.current
      if (dictationStartIdRef.current !== startId) return
      localRecognitionReadyRef.current = availability === 'available'
      localRecognitionAvailabilityRef.current = availability
      setCanInstallLocalRecognition(!localRecognitionReadyRef.current)
      setDictationFeedback({
        message: localRecognitionReadyRef.current
          ? 'On-device voice dictation is ready. Press the microphone to try again.'
          : 'On-device voice dictation could not be prepared in this browser.',
        tone: localRecognitionReadyRef.current ? 'info' : 'error',
      })
    } catch {
      if (dictationStartIdRef.current !== startId) return
      setCanInstallLocalRecognition(true)
      setDictationFeedback({ message: 'On-device voice dictation could not be prepared in this browser.', tone: 'error' })
    } finally {
      if (dictationStartIdRef.current === startId) setInstallingLocalRecognition(false)
    }
  }

  const submit = async () => {
    if (interactionBlocked || generating || stoppingRef.current || submittingRef.current || dictationState !== 'idle' || !canSubmit || !onSubmit) return
    if (messageInput.current && !messageInput.current.reportValidity()) return
    const submissionId = ++submissionIdRef.current
    const submittedMessage = messageRef.current
    submittingRef.current = true
    setIsSubmitting(true)
    setSubmissionError(null)
    try {
      await onSubmit({
        files: files.map(({ file }) => file),
        message: submittedMessage.trim(),
        model: selectedModel?.value,
        mode: selectedMode,
        variant,
      })
      if (submissionIdRef.current !== submissionId) return
      setHasSubmitted(true)
      // A controlled parent may replace the draft while its request is pending.
      if (messageRef.current === submittedMessage) setMessage('')
      if (hasAttachments) setAttachmentExiting(true)
      setFiles([])
      if (fileInput.current) fileInput.current.value = ''
    } catch (error) {
      // A host may abort its pending send from onStop; cancellation keeps the draft quietly.
      if (error instanceof Error && error.name === 'AbortError') return
      if (submissionIdRef.current === submissionId) {
        setSubmissionError(error instanceof Error && error.message ? error.message : 'Message could not be sent. Try again.')
      }
    } finally {
      if (submissionIdRef.current === submissionId) {
        submittingRef.current = false
        setIsSubmitting(false)
        focusMessage()
      }
    }
  }

  const stopGeneration = async () => {
    if (!generating || disabled || readOnly || stoppingRef.current || !onStop) return
    focusMessage()
    const requestId = ++stopRequestIdRef.current
    stoppingRef.current = true
    setIsStopping(true)
    setSubmissionError(null)
    try {
      await onStop()
    } catch (error) {
      if (stopRequestIdRef.current === requestId) {
        setSubmissionError(error instanceof Error && error.message ? error.message : 'Generation could not be stopped. Try again.')
      }
    } finally {
      if (stopRequestIdRef.current === requestId) {
        stoppingRef.current = false
        setIsStopping(false)
      }
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    inputProps.onKeyDown?.(event)
    if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    event.preventDefault()
    void submit()
  }

  const addAttachments = (selectedFiles: File[]) => {
    if (interactionBlocked || submittingRef.current || isDictating || selectedFiles.length === 0) return
    setAttachmentExiting(false)
    setFiles((current) => [
      ...current,
      ...selectedFiles.map((file) => ({ id: nextAttachmentId.current++, file })),
    ])
  }

  const attach = (accept = '') => {
    if (interactionBlocked || !fileInput.current) return
    fileInput.current.accept = accept
    fileInput.current.click()
  }

  const removeAttachment = (id: number, button: HTMLButtonElement) => {
    if (interactionBlocked) return
    if (document.activeElement === button) {
      const index = files.findIndex((attachment) => attachment.id === id)
      const nextAttachment = files[index + 1] ?? files[index - 1]
      const nextButton = nextAttachment
        ? composerContent.current?.querySelector<HTMLButtonElement>(`[data-attachment-id="${nextAttachment.id}"]`)
        : null
      if (nextButton) nextButton.focus({ preventScroll: true })
      else focusMessage()
    }
    if (files.length === 1) setAttachmentExiting(true)
    setFiles((current) => current.filter((attachment) => attachment.id !== id))
  }

  const shuffleSuggestions = () => {
    const shuffled = [...orderedSuggestions]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1))
      const item = shuffled[index]
      shuffled[index] = shuffled[other]
      shuffled[other] = item
    }
    if (shuffled.length > 1 && shuffled.every((item, index) => item.id === orderedSuggestions[index].id)) {
      const first = shuffled[0]
      shuffled[0] = shuffled[1]
      shuffled[1] = first
    }
    setSuggestionOrder(shuffled.map((item) => item.id))
    setShuffleRound((current) => current + 1)
  }

  const input = (
    <motion.div
      className="lars-ai-composer__input-wrap"
      data-rotating-placeholder={hasRotatingPlaceholder || undefined}
      key="message"
      layout={reducedMotion ? false : 'position'}
      transition={modeMotion}
    >
      <textarea
        {...inputProps}
        aria-describedby={[inputProps['aria-describedby'], feedback ? feedbackId : null].filter(Boolean).join(' ') || undefined}
        aria-keyshortcuts={inputProps['aria-keyshortcuts'] ?? (hasKeyboardShortcuts ? 'Enter Shift+Enter' : undefined)}
        disabled={disabled}
        aria-busy={isSubmitting || isTranscribing || undefined}
        className={`lars-ai-composer__input${inputProps.className ? ` ${inputProps.className}` : ''}`}
        id={messageId}
        onChange={(event) => { if (!interactionBlocked && !isDictating) setMessage(event.currentTarget.value) }}
        onKeyDown={handleKeyDown}
        placeholder={isTranscribing ? 'Transcribing' : placeholder ?? (hasRotatingPlaceholder ? placeholderMessages[0] : 'How can I help you?')}
        ref={(node) => {
          if (!node) return
          messageInput.current = node
          // An exiting compact dictation input must not clear the new input's ref.
          return () => { if (messageInput.current === node) messageInput.current = null }
        }}
        readOnly={readOnly || isDictating || isSubmitting}
        rows={isSmall ? 1 : 3}
        value={inputValue}
      />
      {showRotatingPlaceholder && (
        <span aria-hidden="true" className="lars-ai-composer__placeholder lars-ai-composer__reveal-group is-animating">
          <span className="lars-ai-composer__reveal-part" key={placeholderIndex}>{placeholderMessages[placeholderIndex]}</span>
        </span>
      )}
    </motion.div>
  )

  const attachmentOptions = () => (
    <>
      <Menu.Item disabled={interactionBlocked} className="lars-ai-composer__attach-item" onClick={() => attach()}>
        {icon('attachment', { size: 16 })}
        <span>Upload files</span>
      </Menu.Item>
      <Menu.Item disabled={interactionBlocked} className="lars-ai-composer__attach-item" onClick={() => attach('image/*')}>
        {icon('uploadImages', { size: 16 })}
        <span>Upload images</span>
      </Menu.Item>
    </>
  )

  const selectModel = (nextModel: string) => {
    const nextValue = String(nextModel)
    if (model === undefined) setDraftModel(nextValue)
    onModelChange?.(nextValue)
    setModelMenuOpen(false)
  }

  const modelChoices = () => (
    <Menu.RadioGroup onValueChange={selectModel} value={selectedModel?.value}>
      {modelOptions.map((option) => (
        <Menu.RadioItem disabled={interactionBlocked} className="lars-ai-composer__model-item" closeOnClick key={option.value} value={option.value}>
          <ModelMark option={option} />
          <span>{option.label}</span>
          <span aria-hidden="true" className="lars-ai-composer__model-check-slot">
            <Menu.RadioItemIndicator>{icon('selected', { size: 16 })}</Menu.RadioItemIndicator>
          </span>
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  )

  const modelSubmenu = hasModelDropdown && selectedModel && (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger disabled={interactionBlocked} className="lars-ai-composer__attach-item lars-ai-composer__model-submenu-trigger">
        <ModelMark option={selectedModel} />
        <span>{selectedModel.label}</span>
        {icon('chevronRight', { size: 12, className: 'lars-ai-composer__model-submenu-chevron' })}
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner
          align="start"
          className="lars-ai-composer__model-positioner"
          collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'end' }}
          side="inline-end"
          sideOffset={8}
        >
          <Menu.Popup aria-label="Choose model" className="lars-ai-composer__model-menu">
            {modelChoices()}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  )

  const dictationMenuItem = hasDictation && (
    <Menu.Item disabled={interactionBlocked} className="lars-ai-composer__attach-item lars-ai-composer__dictation-menu-item" onClick={startDictation}>
      {icon('microphone')}
      <span>Voice dictation</span>
    </Menu.Item>
  )

  const attachmentMenu = (
    <Menu.Root modal={false}>
      <Menu.Trigger disabled={interactionBlocked} render={
        <Button
          aria-label={isSmall ? 'More options' : 'Attach files'}
          className={`lars-ai-composer__icon-button ${isSmall ? 'lars-ai-composer__expand-trigger' : 'lars-ai-composer__attachment-trigger'}`}
          iconOnly
          onClick={isSmall ? () => onAction?.('more') : undefined}
          shape="neat"
          title={isSmall ? 'More options' : 'Attach files'}
          type="button"
          variant="tertiary"
        >
          {isSmall ? (
            <span aria-hidden="true" className="lars-ai-composer__expand-icon">
              {icon('add', { className: 'lars-ai-composer__expand-plus' })}
              {icon('close', { className: 'lars-ai-composer__expand-close' })}
            </span>
          ) : icon('attachment')}
        </Button>
      } />
      <Menu.Portal>
        <Menu.Positioner align="start" className="lars-ai-composer__attach-positioner" side="top" sideOffset={8}>
          <Menu.Popup aria-label={isSmall ? 'More options' : 'Attachment options'} className="lars-ai-composer__attach-menu">
            {attachmentOptions()}
            {isSmall && dictationMenuItem}
            {isSmall && modelSubmenu}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )

  const dictationButton = (
    <Button
      disabled={interactionBlocked}
      aria-label="Start voice dictation"
      className="lars-ai-composer__icon-button lars-ai-composer__dictation"
      iconOnly
      onClick={startDictation}
      shape="neat"
      title="Start voice dictation"
      type="button"
      variant="tertiary"
    >
      {icon('microphone')}
    </Button>
  )

  const compactMoreMenu = (
    <Menu.Root modal={false}>
      <Menu.Trigger disabled={interactionBlocked} render={<Button aria-label="More options" className="lars-ai-composer__icon-button lars-ai-composer__more-menu-trigger" iconOnly onClick={() => onAction?.('more')} shape="neat" title="More options" type="button" variant="tertiary">{icon('more')}</Button>} />
      <Menu.Portal>
        <Menu.Positioner align="start" className="lars-ai-composer__attach-positioner" collisionAvoidance={{ side: 'flip', align: 'shift' }} side="top" sideOffset={8}>
          <Menu.Popup aria-label="More options" className="lars-ai-composer__attach-menu">
            {attachmentOptions()}
            {dictationMenuItem}
            {modelSubmenu}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )

  const modelMenu = hasModelDropdown && selectedModel && (
    <Menu.Root modal={false} onOpenChange={setModelMenuOpen} open={modelMenuOpen}>
      <Menu.Trigger
        disabled={interactionBlocked}
        render={(
          <button aria-label={`Model: ${selectedModel.label}`} className="lars-ai-composer__model-trigger lars-ai-composer__model-inline" type="button">
            <ModelMark option={selectedModel} />
            <span className="lars-ai-composer__model-label">{selectedModel.label}</span>
            {icon('chevronDown', { size: 12, className: 'lars-ai-composer__model-chevron' })}
          </button>
        )}
      />
      <Menu.Portal>
        <Menu.Positioner align="end" className="lars-ai-composer__model-positioner" side="top" sideOffset={8}>
          <Menu.Popup aria-label="Choose model" className="lars-ai-composer__model-menu">
            {modelChoices()}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )

  const modeSelector = hasModelSelector && (
    <SegmentedControl
      disabled={interactionBlocked}
      className="lars-ai-composer__mode-selector"
      label="Composer mode"
      onValueChange={(nextMode) => {
        const next = nextMode as AiComposerMode
        if (mode === undefined) setDraftMode(next)
        onModeChange?.(next)
      }}
      options={modeOptions}
      type={variant === 'structured' ? 'square' : 'cornered'}
      value={selectedMode}
    />
  )

  const attachments = (
    <AnimatePresence initial={false} onExitComplete={() => setAttachmentExiting(false)}>
      {hasAttachments && (
        <motion.div
          animate={{ height: 'auto', opacity: 1 }}
          className="lars-ai-composer__attachments-reveal"
          exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          key="attachments"
          layout={reducedMotion ? false : 'size'}
          transition={reducedMotion
            ? { duration: 0.12 }
            : { height: { duration: 0.26, ease: attachmentEase }, layout: { duration: 0.26, ease: attachmentEase }, opacity: { duration: 0.18, ease: attachmentEase } }}
        >
          <div aria-label="Attached files" className="lars-ai-composer__attachments">
            <AnimatePresence initial={false}>
              {files.map(({ id, file }) => (
                <AttachmentCard disabled={interactionBlocked} icons={icons} id={id} file={file} key={id} onRemove={(button) => removeAttachment(id, button)} reducedMotion={reducedMotion} />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const dictationStatus = dictationState === 'starting'
    ? installingLocalRecognition ? 'Preparing on-device dictation' : 'Connecting microphone'
    : dictationState === 'accepting'
      ? 'Transcribing'
      : dictationState === 'ready'
        ? dictationFeedback ? 'Dictation paused — use captured text' : 'Dictation ready'
        : 'Listening for speech'
  const dictationLiveStatus = isSmall && (dictationState === 'ready' || dictationState === 'accepting') && dictationPreview.trim()
    ? `${dictationStatus}. Captured text: ${dictationPreview.trim()}`
    : isSmall && dictationFinalAnnouncement
      ? `Recognized: ${dictationFinalAnnouncement}`
      : dictationFeedback?.message ?? dictationStatus

  const dictationView = (
    <motion.div
      animate={{ opacity: 1 }}
      className="lars-ai-composer__dictation-view"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      key="dictation"
      ref={dictationViewRef}
      transition={{ duration: reducedMotion ? 0.12 : 0.2, ease: attachmentEase }}
    >
      <div className="lars-ai-composer__dictation-row">
        <Button
          aria-label="Cancel voice dictation"
          className="lars-ai-composer__icon-button lars-ai-composer__voice-control"
          data-dictation-cancel
          iconOnly
          onClick={cancelDictation}
          shape="neat"
          title="Cancel voice dictation"
          type="button"
          variant="tertiary"
        >
          {icon('close')}
        </Button>
        <div className="lars-ai-composer__waveform-wrap">
          {isSmall && isTranscribing ? input : (
            <>
              <AiComposerWaveform active={dictationState === 'active'} reducedMotion={reducedMotion} stream={dictationStream} />
              {!isTranscribing && (dictationState !== 'active' || reducedMotion) && <span className="lars-ai-composer__waveform-status" title={dictationFeedback?.message}>{dictationStatus}</span>}
            </>
          )}
        </div>
        <motion.div layoutId={reducedMotion ? undefined : `${messageId}-dictation-action`} transition={modeMotion}>
          <Button
            aria-busy={dictationState === 'accepting' || dictationState === 'starting'}
            aria-disabled={dictationState === 'accepting' || dictationState === 'starting'}
            aria-label="Use dictated text"
            className="lars-ai-composer__icon-button lars-ai-composer__voice-control"
            data-dictation-accept
            disabled={dictationState === 'accepting' || dictationState === 'starting'}
            iconOnly
            onClick={acceptDictation}
            shape="neat"
            title="Use dictated text"
            type="button"
            variant="tertiary"
          >
            {icon('acceptDictation')}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )

  const normalSmallControls = hasDictation && (
    <motion.div
      animate={{ opacity: 1 }}
      className="lars-ai-composer__small-actions"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      key="controls"
      transition={{ duration: reducedMotion ? 0.12 : 0.2, ease: attachmentEase }}
    >
      <motion.div layoutId={reducedMotion ? undefined : `${messageId}-dictation-action`} transition={modeMotion}>{dictationButton}</motion.div>
    </motion.div>
  )

  const normalToolbarControls = (
    <motion.div
      animate={{ opacity: 1 }}
      className="lars-ai-composer__toolbar-content"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      key="controls"
      transition={{ duration: reducedMotion ? 0.12 : 0.2, ease: attachmentEase }}
    >
      <motion.div className="lars-ai-composer__actions lars-ai-composer__actions--end" layout={reducedMotion ? false : 'position'} transition={modeMotion}>
        {hasAddButton && compactMoreMenu}
        {hasAddButton && <motion.div className="lars-ai-composer__attachment-motion" layout={reducedMotion ? false : 'position'} transition={modeMotion}>{attachmentMenu}</motion.div>}
        {hasDictation && <motion.div className="lars-ai-composer__dictation-motion" layout={reducedMotion ? false : 'position'} layoutId={reducedMotion ? undefined : `${messageId}-dictation-action`} transition={modeMotion}>{dictationButton}</motion.div>}
        <motion.div className="lars-ai-composer__model-motion" layout={reducedMotion ? false : 'position'} transition={modeMotion}>{modelMenu}</motion.div>
      </motion.div>
    </motion.div>
  )

  const sendButton = (
    <motion.div className="lars-ai-composer__send-motion" layout={reducedMotion ? false : 'position'} transition={modeMotion}>
      <Button
        aria-label={generating ? 'Stop generating' : 'Send message'}
        aria-busy={generating || isStopping || isSubmitting || undefined}
        className="lars-ai-composer__send"
        data-generating={generating || undefined}
        disabled={generating ? disabled || readOnly || isStopping || !onStop : interactionBlocked || isStopping || isDictating || !canSubmit || !onSubmit}
        iconOnly
        onClick={generating ? () => { void stopGeneration() } : undefined}
        shape="neat"
        type={generating ? 'button' : 'submit'}
        variant="primary"
      >
        <span aria-hidden="true" className="lars-ai-composer__send-icons">
          {icon('send', { className: 'lars-ai-composer__send-arrow' })}
          {icon('stop', { size: 16, className: 'lars-ai-composer__send-stop' })}
        </span>
      </Button>
    </motion.div>
  )

  const dictationFeedbackView = !isDictating && feedback && (
    <div className="lars-ai-composer__dictation-feedback">
      {icon('warning', { className: 'lars-ai-composer__dictation-warning' })}
      <div className="lars-ai-composer__dictation-feedback-content">
        <p className={`lars-ai-composer__dictation-error${feedback.tone === 'info' ? ' lars-ai-composer__dictation-error--info' : ''}`} id={feedbackId} role={feedback.tone === 'info' ? 'status' : 'alert'}>{feedback.message}</p>
        {!submissionError && canInstallLocalRecognition && (
          <button className="lars-ai-composer__dictation-setup" disabled={installingLocalRecognition} onClick={installOnDeviceDictation} type="button">
            {installingLocalRecognition ? 'Preparing on-device dictation…' : 'Set up on-device dictation'}
          </button>
        )}
      </div>
    </div>
  )

  const composer = (
    <form
      {...formProps}
      aria-busy={isSubmitting || isTranscribing || formProps['aria-busy']}
      className={`lars-ai-composer lars-ai-composer--${variant} lars-ai-composer--${effectiveSize}${size === 'small' ? ' lars-ai-composer--auto-size' : ''}${isDictating ? ' lars-ai-composer--dictating' : ''}${keyboardFocus ? ' lars-ai-composer--keyboard-focus' : ''}${hasModelSelector ? ' lars-ai-composer--with-model-selector' : ''}${showAttachmentChrome ? ' lars-ai-composer--has-attachments' : ''}${attachmentExiting ? ' lars-ai-composer--attachment-exiting' : ''}${className ? ` ${className}` : ''}`}
      onDragOver={(event) => {
        formProps.onDragOver?.(event)
        if (event.defaultPrevented || !event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = interactionBlocked || submittingRef.current || isDictating ? 'none' : 'copy'
      }}
      onDrop={(event) => {
        formProps.onDrop?.(event)
        if (event.defaultPrevented) return
        const droppedFiles = Array.from(event.dataTransfer.files)
        if (droppedFiles.length === 0) return
        event.preventDefault()
        addAttachments(droppedFiles)
      }}
      onKeyDown={(event) => {
        if (isDictating && event.key === 'Escape') {
          event.preventDefault()
          cancelDictation()
        }
        formProps.onKeyDown?.(event)
      }}
      onSubmit={(event) => { event.preventDefault(); void submit() }}
      style={{
        ...(isSmall && variant === 'unstructured' ? { borderRadius: showAttachmentChrome && !attachmentExiting ? 8 : 25 } : {}),
        ...formProps.style,
      }}
    >
      <motion.div
        className="lars-ai-composer__content-clip"
        style={{ height: size === 'small' ? composerContentHeight : 'auto' }}
      >
        <div className="lars-ai-composer__content" ref={composerContent}>
          <input
            disabled={interactionBlocked}
            aria-label="Attach files"
            className="lars-ai-composer__file-input"
            multiple
            onChange={(event) => {
              addAttachments(Array.from(event.currentTarget.files ?? []))
              event.currentTarget.value = ''
            }}
            ref={fileInput}
            type="file"
          />
          {variant === 'structured' && attachments}
          <div className="lars-ai-composer__surface">
            <div className="lars-ai-composer__body">
              {(!isSmall || !isDictating || isTranscribing) && <label className="lars-ai-composer__sr-only" htmlFor={messageId}>{inputLabel}</label>}
              <span className="lars-ai-composer__sr-only" role="status">{isStopping ? 'Stopping generation' : generating ? 'Generating response' : isSubmitting ? 'Sending message' : isDictating ? dictationLiveStatus : ''}</span>
              {variant === 'unstructured' && attachments}
              <motion.div
                className={`lars-ai-composer__entry${isSmall ? ' lars-ai-composer__small-row' : ''}`}
                data-add-button={hasAddButton || undefined}
                layout={reducedMotion ? false : 'position'}
                transition={modeMotion}
              >
                {isSmall && !isDictating && hasAddButton && <div className="lars-ai-composer__small-attachment">{attachmentMenu}</div>}
                {(!isSmall || !isDictating) && input}
                {isSmall && <AnimatePresence initial={false} mode="popLayout">{isDictating ? dictationView : normalSmallControls}</AnimatePresence>}
                {isSmall && sendButton}
              </motion.div>
              {!isSmall && (
                <motion.div ref={composerToolbar} className="lars-ai-composer__toolbar" data-add-button={hasAddButton || undefined} data-model-selector={hasModelSelector || undefined} layout={!reducedMotion} transition={modeMotion}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {!isDictating && hasModelSelector && (
                      <motion.div
                        animate={{ opacity: 1, x: 0 }}
                        className="lars-ai-composer__mode-motion"
                        exit={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
                        initial={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
                        key="mode"
                        layout={reducedMotion ? false : 'position'}
                        transition={modeMotion}
                      >
                        {modeSelector}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div className="lars-ai-composer__toolbar-actions" layout={reducedMotion ? false : 'position'} transition={modeMotion}>
                    <AnimatePresence initial={false} mode="popLayout">{isDictating ? dictationView : normalToolbarControls}</AnimatePresence>
                    {sendButton}
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </form>
  )

  const composerWithFeedback = (
    <div className="lars-ai-composer__group">
      {dictationFeedbackView}
      {composer}
    </div>
  )

  if (size === 'small' || !showSuggestions || suggestions.length === 0) return composerWithFeedback

  return (
    <div className="lars-ai-composer__layout">
      <section aria-label="Suggested prompts" className="lars-ai-composer__suggestions" hidden={isDictating || canSubmit || hasSubmitted}>
        {orderedSuggestions.map((suggestion, index) => (
          <button
            disabled={interactionBlocked}
            className="lars-ai-composer__suggestion"
            key={suggestion.id}
            onClick={() => {
              setMessage(suggestion.label)
              messageInput.current?.focus()
            }}
            type="button"
          >
            <span className={`lars-ai-composer__suggestion-content lars-ai-composer__reveal-group${shuffleRound > 0 ? ' is-animating' : ''}`}>
              <span className="lars-ai-composer__reveal-part" key={shuffleRound} style={shuffleRound > 0 ? { animationDelay: `${index * 100}ms` } : undefined}>
                <span aria-hidden="true" className="lars-ai-composer__suggestion-icon">{icon('suggestion')}</span>
                <span className="lars-ai-composer__suggestion-label">{suggestion.label}</span>
              </span>
            </span>
          </button>
        ))}
        <button disabled={interactionBlocked} className="lars-ai-composer__suggestion lars-ai-composer__suggestion--shuffle" onClick={shuffleSuggestions} type="button">
          <span aria-hidden="true" className="lars-ai-composer__suggestion-icon">{icon('shuffle')}</span>
          <span>Shuffle suggestions</span>
        </button>
      </section>
      {composerWithFeedback}
    </div>
  )
}
