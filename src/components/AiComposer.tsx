import { Menu } from '@base-ui/react/menu'
import { useId, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent } from 'react'
import { Button } from './Button'
import { Chip } from './Chip'
import './AiComposer.css'

export type AiComposerVariant = 'structured' | 'unstructured'
export type AiComposerAction = 'more'

export type AiComposerSubmission = {
  files: File[]
  message: string
  variant: AiComposerVariant
  workspace?: string
  role?: string
}

export type AiComposerProps = Omit<ComponentProps<'form'>, 'children' | 'onSubmit'> & {
  variant?: AiComposerVariant
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onSubmit?: (submission: AiComposerSubmission) => void
  onAction?: (action: AiComposerAction) => void
  placeholder?: string
  workspaceOptions?: readonly string[]
  roleOptions?: readonly string[]
}

const DEFAULT_WORKSPACES = ['S4H', 'General'] as const
const DEFAULT_ROLES = ['Functional Analyst', 'General Assistant'] as const

function Icon({ name }: { name: AiComposerAction | 'attach' | 'send-up' | 'send-right' }) {
  if (name === 'attach') return <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M7.215 1.92C8.62 0.515 10.9 0.515 12.305 1.92 13.709 3.325 13.709 5.605 12.305 7.009L8.205 11.109C7.345 11.969 5.952 11.969 5.092 11.109 4.232 10.249 4.232 8.857 5.092 7.997L8.912 4.183C9.225 3.869 9.732 3.869 10.045 4.183 10.357 4.495 10.357 5.003 10.045 5.315L6.225 9.132C5.989 9.368 5.989 9.748 6.225 9.98 6.46 10.212 6.84 10.215 7.072 9.98L11.172 5.88C11.952 5.1 11.952 3.832 11.172 3.052 10.392 2.272 9.125 2.272 8.345 3.052L4.245 7.152C2.917 8.48 2.917 10.632 4.245 11.96 5.572 13.288 7.725 13.288 9.052 11.96L12.308 8.708C12.62 8.395 13.128 8.395 13.44 8.708 13.752 9.02 13.752 9.528 13.44 9.84L10.185 13.089C8.232 15.043 5.068 15.043 3.115 13.089 1.163 11.137 1.163 7.972 3.115 6.02L7.215 1.92z" /></svg>
  if (name === 'more') return <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="2" r="2" /><circle cx="8" cy="8" r="2" /><circle cx="8" cy="14" r="2" /></svg>
  if (name === 'send-right') return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14V2" /><path d="M3.5 6.5 8 2l4.5 4.5" /></svg>
}

function StructuredSelector({
  icon,
  label,
  onValueChange,
  options,
  value,
}: {
  icon: 'workspace' | 'role'
  label: string
  onValueChange: (value: string) => void
  options: readonly string[]
  value: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Menu.Root modal={false} onOpenChange={setOpen} open={open}>
      <Menu.Trigger render={<Button aria-label={label} className={`lars-ai-composer__selector lars-ai-composer__selector--${icon}`} shape="neat" type="button" variant="tertiary">
        <span aria-hidden="true" className={`lars-ai-composer__selector-icon lars-ai-composer__selector-icon--${icon}`}>{icon === 'role' ? '✦' : null}</span>
        <span className="lars-ai-composer__selector-value">{value}</span>
        <svg aria-hidden="true" className="lars-ai-composer__chevron" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Button>} />
      <Menu.Portal>
        <Menu.Positioner align="start" className="lars-ai-composer__attach-positioner" side="bottom" sideOffset={6}>
          <Menu.Popup aria-label={label} className="lars-ai-composer__attach-menu">
            <Menu.RadioGroup onValueChange={(next) => { onValueChange(next); setOpen(false) }} value={value}>
              {options.map((option) => (
                <Menu.RadioItem className="lars-ai-composer__attach-item lars-ai-composer__select-item" key={option} value={option}>
                  {option}
                  <Menu.RadioItemIndicator aria-hidden="true">✓</Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function AiComposer({
  className = '',
  defaultValue = '',
  onAction,
  onSubmit,
  onValueChange,
  placeholder,
  roleOptions = DEFAULT_ROLES,
  value,
  variant = 'unstructured',
  workspaceOptions = DEFAULT_WORKSPACES,
  ...formProps
}: AiComposerProps) {
  const messageId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(defaultValue)
  const [files, setFiles] = useState<File[]>([])
  const [workspace, setWorkspace] = useState(workspaceOptions[0] ?? 'S4H')
  const [role, setRole] = useState(roleOptions[0] ?? 'Functional Analyst')
  const message = value ?? draft
  const canSubmit = message.trim().length > 0 || files.length > 0

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
      ...(variant === 'structured' ? { workspace, role } : {}),
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
      placeholder={placeholder ?? (variant === 'structured'
        ? 'Help me identify the customs programs relevant to\ngoods movement'
        : 'How can I help you?')}
      rows={3}
      value={message}
    />
  )

  const attachmentMenu = (
    <Menu.Root modal={false}>
      <Menu.Trigger render={variant === 'structured'
        ? <Button className="lars-ai-composer__sources" shape="neat" type="button" variant="tertiary"><span aria-hidden="true">+</span> Sources</Button>
        : <Button aria-label="Attach files" className="lars-ai-composer__icon-button" iconOnly shape="neat" title="Attach files" type="button" variant="tertiary"><Icon name="attach" /></Button>} />
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
      className={`lars-ai-composer lars-ai-composer--${variant}${className ? ` ${className}` : ''}`}
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
      <div className="lars-ai-composer__body">
        <label className="lars-ai-composer__sr-only" htmlFor={messageId}>Message</label>
        {variant === 'structured' ? (
          <div className="lars-ai-composer__prompt">
            <span className="lars-ai-composer__mark-frame"><svg aria-hidden="true" className="lars-ai-composer__mark" viewBox="0 0 24 24"><path d="M3 4h15v2H8v2H3V4Zm4 5h13v2H4V9h3Zm-4 5h15v2H8v2H3v-4Zm4 5h13v2H7v-2Z" fill="currentColor" /></svg></span>
            {input}
          </div>
        ) : input}
        {files.length > 0 && (
          <div aria-label="Attached files" className="lars-ai-composer__attachments">
            {files.map((file, index) => (
              <span className="lars-ai-composer__attachment" key={`${file.name}-${index}`}>
                <Chip size="small" variant="neutral">{file.name}</Chip>
                <Button aria-label={`Remove ${file.name}`} className="lars-ai-composer__remove" iconOnly onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} shape="neat" type="button" variant="tertiary">×</Button>
              </span>
            ))}
          </div>
        )}
        <div className="lars-ai-composer__toolbar">
          {variant === 'structured' ? (
            <>
              <div className="lars-ai-composer__fields">
                <StructuredSelector icon="workspace" label="Workspace" onValueChange={setWorkspace} options={workspaceOptions} value={workspace} />
                <StructuredSelector icon="role" label="Role" onValueChange={setRole} options={roleOptions} value={role} />
                {attachmentMenu}
              </div>
              <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send-right" /></Button>
            </>
          ) : (
            <>
              <div className="lars-ai-composer__actions">{attachmentMenu}</div>
              <div className="lars-ai-composer__actions">
                <Button aria-label="More options" className="lars-ai-composer__icon-button" iconOnly onClick={() => onAction?.('more')} shape="neat" title="More options" type="button" variant="tertiary"><Icon name="more" /></Button>
                <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send-up" /></Button>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
