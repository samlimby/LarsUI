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
  if (name === 'attach') return <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M7.215 1.92C8.62 0.515 10.9 0.515 12.305 1.92 13.709 3.325 13.709 5.605 12.305 7.009L8.205 11.109C7.345 11.969 5.952 11.969 5.092 11.109 4.232 10.249 4.232 8.857 5.092 7.997L8.912 4.183C9.225 3.869 9.732 3.869 10.045 4.183 10.357 4.495 10.357 5.003 10.045 5.315L6.225 9.132C5.989 9.368 5.989 9.748 6.225 9.98 6.46 10.212 6.84 10.215 7.072 9.98L11.172 5.88C11.952 5.1 11.952 3.832 11.172 3.052 10.392 2.272 9.125 2.272 8.345 3.052L4.245 7.152C2.917 8.48 2.917 10.632 4.245 11.96 5.572 13.288 7.725 13.288 9.052 11.96L12.308 8.708C12.62 8.395 13.128 8.395 13.44 8.708 13.752 9.02 13.752 9.528 13.44 9.84L10.185 13.089C8.232 15.043 5.068 15.043 3.115 13.089 1.163 11.137 1.163 7.972 3.115 6.02L7.215 1.92z" /></svg>
  if (name === 'more') return <MoreIcon />
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14V2" /><path d="M3.5 6.5 8 2l4.5 4.5" /></svg>
}

function MoreIcon() {
  const maskId = useId()

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <mask height="24" id={maskId} maskUnits="userSpaceOnUse" width="24" x="0" y="0">
        <rect fill="#000" height="24" width="24" />
        <g fill="none">
          <rect fill="#fff" height="4" rx="2" width="4" x="10" y="3" />
          <rect fill="#fff" height="4" rx="2" width="4" x="10" y="10" />
          <rect fill="#fff" height="4" rx="2" width="4" x="10" y="17" />
        </g>
      </mask>
      <rect fill="currentColor" height="24" mask={`url(#${maskId})`} width="24" />
    </svg>
  )
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}mb`
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)}kb`
  return `${bytes}b`
}

function AttachmentCard({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
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
  const showStructuredAttachments = variant === 'structured' && files.length > 0

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
      className={`lars-ai-composer lars-ai-composer--${variant}${showStructuredAttachments ? ' lars-ai-composer--has-attachments' : ''}${className ? ` ${className}` : ''}`}
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
      {showStructuredAttachments && (
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
