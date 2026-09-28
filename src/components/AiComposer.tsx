import { useId, useRef, useState } from 'react'
import type { ComponentProps, KeyboardEvent } from 'react'
import { Button } from './Button'
import { Chip } from './Chip'
import './AiComposer.css'

export type AiComposerVariant = 'structured' | 'unstructured'
export type AiComposerAction = 'more'

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
  workspaceOptions?: readonly AiComposerOption[]
  roleOptions?: readonly AiComposerOption[]
  workspaceValue?: string
  roleValue?: string
  onWorkspaceValueChange?: (value: string) => void
  onRoleValueChange?: (value: string) => void
  placeholder?: string
}

function Icon({ name }: { name: AiComposerAction | 'attach' | 'send' | 'send-up' | 'chevron' | 'spark' }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (name === 'spark') return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>
  if (name === 'chevron') return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="m6 9 6 6 6-6" /></svg>
  if (name === 'attach') return <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M7.215 1.92C8.62 0.515 10.9 0.515 12.305 1.92 13.709 3.325 13.709 5.605 12.305 7.009L8.205 11.109C7.345 11.969 5.952 11.969 5.092 11.109 4.232 10.249 4.232 8.857 5.092 7.997L8.912 4.183C9.225 3.869 9.732 3.869 10.045 4.183 10.357 4.495 10.357 5.003 10.045 5.315L6.225 9.132C5.989 9.368 5.989 9.748 6.225 9.98 6.46 10.212 6.84 10.215 7.072 9.98L11.172 5.88C11.952 5.1 11.952 3.832 11.172 3.052 10.392 2.272 9.125 2.272 8.345 3.052L4.245 7.152C2.917 8.48 2.917 10.632 4.245 11.96 5.572 13.288 7.725 13.288 9.052 11.96L12.308 8.708C12.62 8.395 13.128 8.395 13.44 8.708 13.752 9.02 13.752 9.528 13.44 9.84L10.185 13.089C8.232 15.043 5.068 15.043 3.115 13.089 1.163 11.137 1.163 7.972 3.115 6.02L7.215 1.92z" /></svg>
  if (name === 'more') return <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M8 5.2C7.228 5.2 6.6 4.572 6.6 3.8 6.6 3.028 7.228 2.4 8 2.4 8.772 2.4 9.4 3.028 9.4 3.8 9.4 4.572 8.772 5.2 8 5.2zM8 10.8C8.772 10.8 9.4 11.428 9.4 12.2 9.4 12.972 8.772 13.6 8 13.6 7.228 13.6 6.6 12.972 6.6 12.2 6.6 11.428 7.228 10.8 8 10.8zM9.4 8C9.4 8.772 8.772 9.4 8 9.4 7.228 9.4 6.6 8.772 6.6 8 6.6 7.228 7.228 6.6 8 6.6 8.772 6.6 9.4 7.228 9.4 8z" /></svg>
  if (name === 'send-up') return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14V2" /><path d="M3.5 6.5 8 2l4.5 4.5" /></svg>
  return <svg aria-hidden="true" viewBox="0 0 24 24" {...shared}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
}

export function AiComposer({
  className = '',
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
      <div className="lars-ai-composer__body">
        <label className="lars-ai-composer__sr-only" htmlFor={messageId}>Message</label>
        <textarea
          className="lars-ai-composer__input"
          id={messageId}
          onChange={(event) => setMessage(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? (variant === 'structured' ? 'Ask a question…' : 'How can I help you?')}
          rows={variant === 'structured' ? 2 : 3}
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
              <Button aria-label="Attach files" className="lars-ai-composer__icon-button" iconOnly onClick={attach} shape="neat" title="Attach files" type="button" variant="tertiary"><Icon name="attach" /></Button>
            </div>
            <div className="lars-ai-composer__actions">
              <Button aria-label="More options" className="lars-ai-composer__icon-button" iconOnly onClick={() => onAction?.('more')} shape="neat" title="More options" type="button" variant="tertiary"><Icon name="more" /></Button>
              <Button aria-label="Send message" className="lars-ai-composer__send" disabled={!canSubmit} iconOnly shape="neat" type="submit" variant="primary"><Icon name="send-up" /></Button>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
