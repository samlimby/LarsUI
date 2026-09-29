import { Menu } from '@base-ui/react/menu'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { Button } from './Button'
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

export type AiComposerSubmission = {
  files: File[]
  message: string
  model?: string
  mode?: AiComposerMode
  variant: AiComposerVariant
}

export type AiComposerProps = Omit<ComponentProps<'form'>, 'children' | 'onSubmit'> & {
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
  onSubmit?: (submission: AiComposerSubmission) => void
  onAction?: (action: AiComposerAction) => void
  placeholder?: string
  rotatePlaceholder?: boolean
  showModelDropdown?: boolean
  showModelSelector?: boolean
  showSuggestions?: boolean
  suggestions?: readonly AiComposerSuggestion[]
}

type AttachedFile = { id: number; file: File }

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

function Icon({ name }: { name: AiComposerAction | 'attach' | 'plus' | 'send-up' }) {
  if (name === 'attach') return <span aria-hidden="true" className="lars-ai-composer__attach-icon" />
  if (name === 'plus') return <span aria-hidden="true" className="lars-ai-composer__plus-icon" />
  if (name === 'more') return <span aria-hidden="true" className="lars-ai-composer__more-icon" />
  return <span aria-hidden="true" className="lars-ai-composer__send-icon" />
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}mb`
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)}kb`
  return `${bytes}b`
}

function AttachmentCard({ file, onRemove, reducedMotion }: { file: File; onRemove: () => void; reducedMotion: boolean }) {
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
        <button aria-label={`Remove ${file.name}`} className="lars-ai-composer__remove" onClick={onRemove} title={`Remove ${file.name}`} type="button">
          <span aria-hidden="true" className="lars-ai-composer__remove-icon" />
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
  model,
  mode,
  modelOptions = defaultModelOptions,
  onAction,
  onModelChange,
  onModeChange,
  onSubmit,
  onValueChange,
  placeholder,
  rotatePlaceholder = true,
  size = 'default',
  showModelDropdown = true,
  showModelSelector = false,
  showSuggestions = false,
  suggestions = [],
  value,
  variant = 'unstructured',
  ...formProps
}: AiComposerProps) {
  const messageId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const messageInput = useRef<HTMLTextAreaElement>(null)
  const nextAttachmentId = useRef(0)
  const reducedMotion = useReducedMotion() ?? false
  const [draft, setDraft] = useState(defaultValue)
  const [draftModel, setDraftModel] = useState(defaultModel ?? modelOptions[0]?.value ?? '')
  const [draftMode, setDraftMode] = useState<AiComposerMode>(defaultMode)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [suggestionOrder, setSuggestionOrder] = useState<string[]>([])
  const [shuffleRound, setShuffleRound] = useState(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [attachmentExiting, setAttachmentExiting] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const isSmall = size === 'small'
  const message = value ?? draft
  const hasRotatingPlaceholder = rotatePlaceholder && placeholder === undefined
  const showRotatingPlaceholder = hasRotatingPlaceholder && message.length === 0
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
    if (!hasModelDropdown) setModelMenuOpen(false)
  }, [hasModelDropdown])

  useEffect(() => {
    if (!showRotatingPlaceholder) return
    const interval = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderMessages.length)
    }, 7_500)
    return () => window.clearInterval(interval)
  }, [showRotatingPlaceholder])

  const setMessage = (next: string) => {
    if (value === undefined) setDraft(next)
    onValueChange?.(next)
  }

  const submit = () => {
    if (!canSubmit) return
    setHasSubmitted(true)
    onSubmit?.({
      files: files.map(({ file }) => file),
      message: message.trim(),
      model: hasModelDropdown ? selectedModel?.value : undefined,
      mode: hasModelSelector ? selectedMode : undefined,
      variant,
    })
    setMessage('')
    if (hasAttachments) setAttachmentExiting(true)
    setFiles([])
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  const attach = (accept = '') => {
    if (!fileInput.current) return
    fileInput.current.accept = accept
    fileInput.current.click()
  }

  const removeAttachment = (id: number) => {
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
    <div className="lars-ai-composer__input-wrap" data-rotating-placeholder={hasRotatingPlaceholder || undefined}>
      <textarea
        className="lars-ai-composer__input"
        id={messageId}
        onChange={(event) => setMessage(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? (hasRotatingPlaceholder ? placeholderMessages[0] : 'How can I help you?')}
        ref={messageInput}
        rows={isSmall ? 1 : 3}
        value={message}
      />
      {showRotatingPlaceholder && (
        <span aria-hidden="true" className="lars-ai-composer__placeholder t-digit-group is-animating">
          <span className="t-digit" key={placeholderIndex}>{placeholderMessages[placeholderIndex]}</span>
        </span>
      )}
    </div>
  )

  const attachmentOptions = () => (
    <>
      <Menu.Item className="lars-ai-composer__attach-item" onClick={() => attach()}>Upload files</Menu.Item>
      <Menu.Item className="lars-ai-composer__attach-item" onClick={() => attach('image/*')}>Upload images</Menu.Item>
    </>
  )

  const attachmentMenu = (
    <Menu.Root modal={false}>
      <Menu.Trigger render={<Button aria-label="Attach files" className={`lars-ai-composer__icon-button${isSmall ? '' : ' lars-ai-composer__attachment-trigger'}`} iconOnly shape="neat" title="Attach files" type="button" variant={isSmall ? 'secondary' : 'tertiary'}><Icon name={isSmall ? 'plus' : 'attach'} /></Button>} />
      <Menu.Portal>
        <Menu.Positioner align="start" className="lars-ai-composer__attach-positioner" side="top" sideOffset={8}>
          <Menu.Popup aria-label="Attachment options" className="lars-ai-composer__attach-menu">
            {attachmentOptions()}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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
        <Menu.RadioItem className="lars-ai-composer__model-item" closeOnClick key={option.value} value={option.value}>
          <ModelMark option={option} />
          <span>{option.label}</span>
          <span aria-hidden="true" className="lars-ai-composer__model-check-slot">
            <Menu.RadioItemIndicator><span className="lars-ai-composer__model-check-icon" /></Menu.RadioItemIndicator>
          </span>
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  )

  const modelSubmenu = hasModelDropdown && selectedModel && (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className="lars-ai-composer__attach-item lars-ai-composer__model-submenu-trigger">
        <ModelMark option={selectedModel} />
        <span>{selectedModel.label}</span>
        <span aria-hidden="true" className="lars-ai-composer__model-submenu-chevron" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner
          align="start"
          className="lars-ai-composer__model-positioner"
          collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'end' }}
          side="inline-start"
          sideOffset={8}
        >
          <Menu.Popup aria-label="Choose model" className="lars-ai-composer__model-menu">
            {modelChoices()}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  )

  const compactMoreMenu = (
    <Menu.Root modal={false}>
      <Menu.Trigger render={<Button aria-label="More options" className="lars-ai-composer__icon-button lars-ai-composer__more-menu-trigger" iconOnly onClick={() => onAction?.('more')} shape="neat" title="More options" type="button" variant="tertiary"><Icon name="more" /></Button>} />
      <Menu.Portal>
        <Menu.Positioner align="start" className="lars-ai-composer__attach-positioner" collisionAvoidance={{ side: 'flip', align: 'shift' }} side="top" sideOffset={8}>
          <Menu.Popup aria-label="More options" className="lars-ai-composer__attach-menu">
            {attachmentOptions()}
            {modelSubmenu}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )

  const modelMenu = hasModelDropdown && selectedModel && (
    <Menu.Root modal={false} onOpenChange={setModelMenuOpen} open={modelMenuOpen}>
      <Menu.Trigger
        render={(
          <button aria-label={`Model: ${selectedModel.label}`} className="lars-ai-composer__model-trigger lars-ai-composer__model-inline" type="button">
            <ModelMark option={selectedModel} />
            <span className="lars-ai-composer__model-label">{selectedModel.label}</span>
            <span aria-hidden="true" className="lars-ai-composer__model-chevron" />
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

  const composer = (
    <form
      {...formProps}
      className={`lars-ai-composer lars-ai-composer--${variant} lars-ai-composer--${size}${keyboardFocus ? ' lars-ai-composer--keyboard-focus' : ''}${hasModelSelector ? ' lars-ai-composer--with-model-selector' : ''}${showAttachmentChrome ? ' lars-ai-composer--has-attachments' : ''}${attachmentExiting ? ' lars-ai-composer--attachment-exiting' : ''}${className ? ` ${className}` : ''}`}
      onSubmit={(event) => { event.preventDefault(); submit() }}
    >
      <input
        aria-label="Attach files"
        className="lars-ai-composer__file-input"
        multiple
        onChange={(event) => {
          const selectedFiles = Array.from(event.currentTarget.files ?? [])
          if (selectedFiles.length === 0) return
          setAttachmentExiting(false)
          setFiles((current) => [
            ...current,
            ...selectedFiles.map((file) => ({ id: nextAttachmentId.current++, file })),
          ])
          event.currentTarget.value = ''
        }}
        ref={fileInput}
        type="file"
      />
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
                  <AttachmentCard file={file} key={id} onRemove={() => removeAttachment(id)} reducedMotion={reducedMotion} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lars-ai-composer__surface">
        <div className="lars-ai-composer__body">
          <label className="lars-ai-composer__sr-only" htmlFor={messageId}>Message</label>
          {isSmall ? (
            <div className="lars-ai-composer__small-row">
              {attachmentMenu}
              {input}
              {compactMoreMenu}
              {modelMenu}
              <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send-up" /></Button>
            </div>
          ) : (
            <>
              {input}
              <motion.div className="lars-ai-composer__toolbar" data-model-selector={hasModelSelector || undefined} layout={!reducedMotion} transition={modeMotion}>
                <motion.div className="lars-ai-composer__actions" layout={reducedMotion ? false : 'position'} transition={modeMotion}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {hasModelSelector ? (
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
                    ) : (
                      <motion.div
                        animate={{ opacity: 1 }}
                        className="lars-ai-composer__attachment-motion"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key="attachment-left"
                        layoutId={reducedMotion ? undefined : `${messageId}-attachment`}
                        transition={modeMotion}
                      >
                        {attachmentMenu}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                <motion.div className="lars-ai-composer__actions lars-ai-composer__actions--end" layout={reducedMotion ? false : 'position'} transition={modeMotion}>
                  <Button aria-label="More options" className="lars-ai-composer__icon-button lars-ai-composer__more-standalone" iconOnly onClick={() => onAction?.('more')} shape="neat" title="More options" type="button" variant="tertiary"><Icon name="more" /></Button>
                  {compactMoreMenu}
                  <AnimatePresence initial={false} mode="popLayout">
                    {hasModelSelector && (
                      <motion.div
                        animate={{ opacity: 1 }}
                        className="lars-ai-composer__attachment-motion"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key="attachment-right"
                        layoutId={reducedMotion ? undefined : `${messageId}-attachment`}
                        transition={modeMotion}
                      >
                        {attachmentMenu}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div className="lars-ai-composer__model-motion" layout={reducedMotion ? false : 'position'} transition={modeMotion}>{modelMenu}</motion.div>
                  <motion.div className="lars-ai-composer__send-motion" layout={reducedMotion ? false : 'position'} transition={modeMotion}>
                    <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send-up" /></Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </form>
  )

  if (isSmall || !showSuggestions || suggestions.length === 0) return composer

  return (
    <div className="lars-ai-composer__layout">
      <section aria-label="Suggested prompts" className="lars-ai-composer__suggestions" hidden={canSubmit || hasSubmitted}>
        {orderedSuggestions.map((suggestion, index) => (
          <button
            className="lars-ai-composer__suggestion"
            key={suggestion.id}
            onClick={() => {
              setMessage(suggestion.label)
              messageInput.current?.focus()
            }}
            type="button"
          >
            <span className={`lars-ai-composer__suggestion-label t-digit-group${shuffleRound > 0 ? ' is-animating' : ''}`}>
              <span className="t-digit" key={shuffleRound} style={shuffleRound > 0 ? { animationDelay: `${index * 100}ms` } : undefined}>{suggestion.label}</span>
            </span>
          </button>
        ))}
        <button className="lars-ai-composer__suggestion lars-ai-composer__suggestion--shuffle" onClick={shuffleSuggestions} type="button">
          <span aria-hidden="true" className="lars-ai-composer__suggestion-icon"><span className="lars-ai-composer__shuffle-icon" /></span>
          <span>Shuffle suggestions</span>
        </button>
      </section>
      {composer}
    </div>
  )
}
