import { Menu } from '@base-ui/react/menu'
import { useEffect, useId, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent } from 'react'
import { Button } from './Button'
import './AiComposer.css'

export type AiComposerVariant = 'structured' | 'unstructured'
export type AiComposerAction = 'more'

export type AiComposerSubmission = {
  files: File[]
  message: string
  variant: AiComposerVariant
}

export type AiComposerProps = Omit<ComponentProps<'form'>, 'children' | 'onSubmit'> & {
  variant?: AiComposerVariant
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onSubmit?: (submission: AiComposerSubmission) => void
  onAction?: (action: AiComposerAction) => void
  placeholder?: string
}

function Icon({ name }: { name: AiComposerAction | 'attach' | 'send-up' }) {
  if (name === 'attach') return <span aria-hidden="true" className="lars-ai-composer__attach-icon" />
  if (name === 'more') return <span aria-hidden="true" className="lars-ai-composer__more-icon" />
  return <span aria-hidden="true" className="lars-ai-composer__send-icon" />
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}mb`
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)}kb`
  return `${bytes}b`
}

function AttachmentCard({ file, onRemove }: { file: File; onRemove: () => void }) {
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
    <div className="lars-ai-composer__attachment">
      <span aria-hidden="true" className="lars-ai-composer__attachment-thumbnail">
        {previewUrl && <img alt="" src={previewUrl} />}
      </span>
      <span className="lars-ai-composer__attachment-details">
        <span className="lars-ai-composer__attachment-name" title={file.name}>{file.name}</span>
        <span className="lars-ai-composer__attachment-size">{formatFileSize(file.size)}</span>
      </span>
      <button aria-label={`Remove ${file.name}`} className="lars-ai-composer__remove" onClick={onRemove} title={`Remove ${file.name}`} type="button">×</button>
    </div>
  )
}

export function AiComposer({
  className = '',
  defaultValue = '',
  onAction,
  onSubmit,
  onValueChange,
  placeholder,
  value,
  variant = 'unstructured',
  ...formProps
}: AiComposerProps) {
  const messageId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(defaultValue)
  const [files, setFiles] = useState<File[]>([])
  const message = value ?? draft
  const canSubmit = message.trim().length > 0 || files.length > 0
  const hasAttachments = files.length > 0

  const setMessage = (next: string) => {
    if (value === undefined) setDraft(next)
    onValueChange?.(next)
  }

  const submit = () => {
    if (!canSubmit) return
    onSubmit?.({
      files,
      message: message.trim(),
      variant,
    })
    setMessage('')
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

  const input = (
    <textarea
      className="lars-ai-composer__input"
      id={messageId}
      onChange={(event) => setMessage(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder ?? 'How can I help you?'}
      rows={3}
      value={message}
    />
  )

  const attachmentMenu = (
    <Menu.Root modal={false}>
      <Menu.Trigger render={<Button aria-label="Attach files" className="lars-ai-composer__icon-button" iconOnly shape="neat" title="Attach files" type="button" variant="tertiary"><Icon name="attach" /></Button>} />
      <Menu.Portal>
        <Menu.Positioner align="start" className="lars-ai-composer__attach-positioner" side="top" sideOffset={8}>
          <Menu.Popup aria-label="Attachment options" className="lars-ai-composer__attach-menu">
            <Menu.Item className="lars-ai-composer__attach-item" onClick={() => attach()}>Upload files</Menu.Item>
            <Menu.Item className="lars-ai-composer__attach-item" onClick={() => attach('image/*')}>Upload images</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )

  return (
    <form
      {...formProps}
      className={`lars-ai-composer lars-ai-composer--${variant}${hasAttachments ? ' lars-ai-composer--has-attachments' : ''}${className ? ` ${className}` : ''}`}
      onSubmit={(event) => { event.preventDefault(); submit() }}
    >
      <input
        aria-label="Attach files"
        className="lars-ai-composer__file-input"
        multiple
        onChange={(event) => {
          setFiles((current) => [...current, ...Array.from(event.currentTarget.files ?? [])])
          event.currentTarget.value = ''
        }}
        ref={fileInput}
        type="file"
      />
      {hasAttachments && (
        <div aria-label="Attached files" className="lars-ai-composer__attachments">
          {files.map((file, index) => (
            <AttachmentCard file={file} key={`${file.name}-${index}`} onRemove={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} />
          ))}
        </div>
      )}
      <div className="lars-ai-composer__surface">
        <div className="lars-ai-composer__body">
          <label className="lars-ai-composer__sr-only" htmlFor={messageId}>Message</label>
          {input}
          <div className="lars-ai-composer__toolbar">
            <div className="lars-ai-composer__actions">{attachmentMenu}</div>
            <div className="lars-ai-composer__actions">
              <Button aria-label="More options" className="lars-ai-composer__icon-button" iconOnly onClick={() => onAction?.('more')} shape="neat" title="More options" type="button" variant="tertiary"><Icon name="more" /></Button>
              <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send-up" /></Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
