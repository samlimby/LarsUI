import { IconArrowRedoDown } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconArrowRedoDown'
import { IconCheckCircle2 } from '@central-icons-react/round-filled-radius-2-stroke-1.5/IconCheckCircle2'
import { IconFormSquare } from '@central-icons-react/round-filled-radius-2-stroke-1.5/IconFormSquare'
import { IconExclamationTriangle } from '@central-icons-react/round-filled-radius-2-stroke-1.5/IconExclamationTriangle'
import { IconCrossMedium } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCrossMedium'
import { IconImages1 } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconImages1'
import { IconMicrophone } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconMicrophone'
import { IconPlusMedium } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconPlusMedium'
import { IconArrowUp } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconArrowUp'
import { IconPaperclip1 } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconPaperclip1'
import { IconDotGrid1x3VerticalTight } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconDotGrid1x3VerticalTight'
import { IconChevronBottom } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconChevronBottom'
import { IconChevronRight } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconChevronRight'
import { IconCheckmark1 } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCheckmark1'
import { IconShuffle } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconShuffle'
import type { AiComposerIcons } from '../components/AiComposer'

/** Licensed icons stay in the demo website; the npm component uses Lucide defaults. */
export const websiteAiComposerIcons: AiComposerIcons = {
  add: <IconPlusMedium />,
  close: <IconCrossMedium />,
  microphone: <IconMicrophone />,
  acceptDictation: <IconCheckCircle2 />,
  suggestion: <IconArrowRedoDown />,
  warning: <IconExclamationTriangle />,
  uploadImages: <IconImages1 />,
  attachment: <IconPaperclip1 />,
  more: <IconDotGrid1x3VerticalTight />,
  send: <IconArrowUp />,
  stop: <IconFormSquare />,
  shuffle: <IconShuffle />,
  chevronDown: <IconChevronBottom />,
  chevronRight: <IconChevronRight />,
  selected: <IconCheckmark1 />,
}
