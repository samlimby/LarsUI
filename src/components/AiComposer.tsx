import { useId, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { Button } from './Button'
import { Chip } from './Chip'
import './AiComposer.css'

export type AiComposerVariant = 'structured' | 'unstructured'
export type AiComposerAction = 'help' | 'more' | 'edit' | 'history'

export type AiComposerOption = {
  label: string
  value: string
}

export type AiComposerSubmission = {
  files: File[]
  message: string
  role?: string
  variant: AiComposerVariant
  workspace?: string
}

export type AiComposerProps = Omit<ComponentProps<'form'>, 'children' | 'onSubmit'> & {
  variant?: AiComposerVariant
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onSubmit?: (submission: AiComposerSubmission) => void
  onAction?: (action: AiComposerAction) => void
  context?: { eyebrow?: string; title: string; icon?: ReactNode }
  workspaceOptions?: readonly AiComposerOption[]
  roleOptions?: readonly AiComposerOption[]
  workspaceValue?: string
  roleValue?: string
  onWorkspaceValueChange?: (value: string) => void
  onRoleValueChange?: (value: string) => void
  placeholder?: string
}

function Icon({ name }: { name: AiComposerAction | 'attach' | 'send' | 'chevron' | 'spark' }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (name === 'spark') return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>
  if (name === 'chevron') return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="m6 9 6 6 6-6" /></svg>
  if (name === 'attach') return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="M8 12.5v5a4 4 0 0 0 8 0v-9a2.5 2.5 0 0 0-5 0v8a1 1 0 0 0 2 0V9" /></svg>
  if (name === 'help') return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2.5-3 4.5" /><path d="M12 18h.01" /></svg>
  if (name === 'more') return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
  if (name === 'edit') return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="M13 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7" /><path d="m10 14 9-9 2 2-9 9-3 1z" /></svg>
  if (name === 'history') return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="M20 11a8 8 0 1 0-2 6" /><path d="M20 5v6h-6" /><path d="M12 7v5l3 2" /></svg>
  return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
}

export function AiComposer({
  className = '',
  context,
  defaultValue = '',
  onAction,
  onRoleValueChange,
  onSubmit,
  onValueChange,
  onWorkspaceValueChange,
  placeholder,
  roleOptions = [{ label: 'Functional Analyst', value: 'functional-analyst' }],
  roleValue,
  value,
  variant = 'unstructured',
  workspaceOptions = [{ label: 'S4H', value: 's4h' }],
  workspaceValue,
  ...formProps
}: AiComposerProps) {
  const messageId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(defaultValue)
  const [files, setFiles] = useState<File[]>([])
  const [internalWorkspace, setInternalWorkspace] = useState(workspaceOptions[0]?.value ?? '')
  const [internalRole, setInternalRole] = useState(roleOptions[0]?.value ?? '')
  const message = value ?? draft
  const selectedWorkspace = workspaceValue ?? internalWorkspace
  const selectedRole = roleValue ?? internalRole
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
      ...(variant === 'structured' ? { role: selectedRole, workspace: selectedWorkspace } : {}),
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

  const attach = () => fileInput.current?.click()

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
      {variant === 'unstructured' && context && (
        <div className="lars-ai-composer__context">
          <span aria-hidden="true" className="lars-ai-composer__context-icon">{context.icon ?? <Icon name="spark" />}</span>
          {context.eyebrow && <span className="lars-ai-composer__context-eyebrow">{context.eyebrow}</span>}
          <span className="lars-ai-composer__context-title">{context.title}</span>
        </div>
      )}
      <div className="lars-ai-composer__body">
        <label className="lars-ai-composer__sr-only" htmlFor={messageId}>Message</label>
        <textarea
          className="lars-ai-composer__input"
          id={messageId}
          onChange={(event) => setMessage(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? (variant === 'structured' ? 'Ask a question…' : 'Type your message…')}
          rows={variant === 'structured' ? 3 : 4}
          value={message}
        />
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
        {variant === 'structured' ? (
          <div className="lars-ai-composer__toolbar lars-ai-composer__toolbar--structured">
            <div className="lars-ai-composer__parameters">
              <label className="lars-ai-composer__select-wrap lars-ai-composer__select-wrap--workspace">
                <span aria-hidden="true" className="lars-ai-composer__workspace-mark" />
                <span className="lars-ai-composer__sr-only">Workspace</span>
                <select onChange={(event) => { if (workspaceValue === undefined) setInternalWorkspace(event.currentTarget.value); onWorkspaceValueChange?.(event.currentTarget.value) }} value={selectedWorkspace}>
                  {workspaceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Icon name="chevron" />
              </label>
              <label className="lars-ai-composer__select-wrap lars-ai-composer__select-wrap--role">
                <span aria-hidden="true" className="lars-ai-composer__role-mark"><Icon name="spark" /></span>
                <span className="lars-ai-composer__sr-only">Role</span>
                <select onChange={(event) => { if (roleValue === undefined) setInternalRole(event.currentTarget.value); onRoleValueChange?.(event.currentTarget.value) }} value={selectedRole}>
                  {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Icon name="chevron" />
              </label>
              <Button className="lars-ai-composer__sources" onClick={attach} shape="neat" type="button" variant="tertiary">+ <span>Sources</span></Button>
            </div>
            <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send" /></Button>
          </div>
        ) : (
          <div className="lars-ai-composer__toolbar">
            <div className="lars-ai-composer__actions">
              <Button aria-label="Attach files" iconOnly onClick={attach} shape="neat" title="Attach files" type="button" variant="tertiary"><Icon name="attach" /></Button>
              {onAction && <Button aria-label="Help" iconOnly onClick={() => onAction('help')} shape="neat" title="Help" type="button" variant="tertiary"><Icon name="help" /></Button>}
            </div>
            <div className="lars-ai-composer__actions">
              {onAction && (['more', 'edit', 'history'] as const).map((action) => (
                <Button aria-label={action === 'more' ? 'More options' : action === 'edit' ? 'Edit' : 'History'} iconOnly key={action} onClick={() => onAction(action)} shape="neat" title={action === 'more' ? 'More options' : action === 'edit' ? 'Edit' : 'History'} type="button" variant="tertiary"><Icon name={action} /></Button>
              ))}
              <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send" /></Button>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
