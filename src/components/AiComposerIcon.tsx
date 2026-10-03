import { ArrowUp, Check, ChevronDown, ChevronRight, CircleCheck, EllipsisVertical, Images, Mic, Paperclip, Plus, Redo2, Shuffle, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useProvidedIcons } from './IconProvider'

const defaults = {
  add: Plus,
  close: X,
  microphone: Mic,
  acceptDictation: CircleCheck,
  suggestion: Redo2,
  warning: TriangleAlert,
  uploadImages: Images,
  attachment: Paperclip,
  more: EllipsisVertical,
  send: ArrowUp,
  shuffle: Shuffle,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  selected: Check,
}
export type AiComposerIconName = keyof typeof defaults
export type AiComposerIcons = Partial<Record<AiComposerIconName, ReactNode>>

export function AiComposerIcon({ name, icons, size = 20, className = '' }: {
  name: AiComposerIconName
  icons?: AiComposerIcons
  size?: number
  className?: string
}) {
  const providedIcons = useProvidedIcons()
  const override = icons?.[name] !== undefined ? icons[name] : providedIcons[name]
  const DefaultIcon = defaults[name]
  return (
    <span aria-hidden="true" className={`lars-ai-composer__glyph${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
      {override === undefined ? <DefaultIcon size={size} strokeWidth={1.5} /> : override}
    </span>
  )
}
