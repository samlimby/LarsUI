# LarsUI

Thoughtfully crafted, accessible React UI components built on Base UI.

## Install

```sh
npm install larsui
```

Requires React 19 and React DOM 19. Import `larsui/style.css` once in your application. The package is ESM and its entry point declares `"use client"` for React Server Components; put interactive callbacks in a client component.

AI Composer includes open-source Lucide defaults and installs without a Central Icons license. Both Central Icons packs are **optional peer dependencies**: applications that use them install and license them directly. The LarsUI website supplies Central Icons through `IconProvider`.

## Use

```tsx
import { AiComposer, Button, Chip, InlineSlider, SegmentedControl, Tooltip } from 'larsui'
import 'larsui/style.css'
```

```tsx
<Button variant="primary" shape="full" size="medium">View</Button>
<Chip variant="positive" iconPosition="start" size="small" burst>Approved</Chip>
<SegmentedControl
  label="View"
  defaultValue="overview"
  options={[
    { label: 'Overview', value: 'overview' },
    { label: 'Details', value: 'details' },
    { label: 'Activity', value: 'activity' },
  ]}
/>
<AiComposer
  variant="unstructured"
  onSubmit={({ message, files }) => sendMessage(message, files)}
/>

<AiComposer
  variant="structured"
  onSubmit={({ message, files }) => runAnalysis({ message, files })}
/>

<Tooltip anchor label="Export quality" description="Higher quality creates a larger file.">
  <button className="lars-tooltip-inline" type="button">export settings</button>
</Tooltip>
```

The AI Composer accepts `value` / `onValueChange` for a controlled draft, or `defaultValue` for an uncontrolled draft. Press Enter to submit or Shift + Enter for a new line. Attachments stay local until your `onSubmit` handler receives them; selecting a file does not upload it. Image and PDF previews are generated locally, with PDF support loaded on demand.

Provide `onSubmit` to enable sending. It receives `{ message, files, model, mode, variant }`. Model and mode are included even when their controls are hidden. Return a promise for an asynchronous send: editing controls are disabled while it runs, success clears the submitted draft and attachments, and rejection preserves them for retry and displays the error. An `AbortError` cancellation preserves the draft without an error warning. Controlled consumers must apply `onValueChange`, including the empty string after a successful send.

Use `disabled` to disable all interactions, `readOnly` to preserve selection/copying without editing or sending, and `inputLabel` to name the textarea accessibly. `inputProps` forwards native textarea options such as `name`, `required`, `maxLength`, `autoFocus`, and `aria-describedby`; other native form props belong on the composer itself. The component renders a form, so do not nest it inside another form. Its scoped styles do not require the website's global CSS reset.

### Icons

Configure semantic slots once for every composer beneath `IconProvider`. An individual composer's `icons` prop takes precedence; unspecified slots use the provider and then Lucide defaults. Supply decorative React elements, not interactive buttons. Set a slot to `null` to hide its glyph while retaining the button's accessible name.

To use Central Icons, configure your own `CENTRAL_LICENSE_KEY` for installation according to Central Icons' instructions, then install the packs you need:

```sh
npm install @central-icons-react/round-outlined-radius-2-stroke-1.5 @central-icons-react/round-filled-radius-2-stroke-1.5
```

```tsx
'use client'

import { AiComposer, IconProvider, type AiComposerIcons } from 'larsui'
import { IconMicrophone } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconMicrophone'
import { IconPlusMedium } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconPlusMedium'
import { IconCrossMedium } from '@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCrossMedium'
import { IconCheckCircle2 } from '@central-icons-react/round-filled-radius-2-stroke-1.5/IconCheckCircle2'
import { IconFormSquare } from '@central-icons-react/round-filled-radius-2-stroke-1.5/IconFormSquare'
import 'larsui/style.css'

const icons = {
  add: <IconPlusMedium />,
  close: <IconCrossMedium />,
  microphone: <IconMicrophone />,
  acceptDictation: <IconCheckCircle2 />,
  stop: <IconFormSquare />,
} satisfies AiComposerIcons

export function ChatInput() {
  return (
    <IconProvider icons={icons}>
      <AiComposer onSubmit={async (submission) => { await sendMessage(submission) }} />
    </IconProvider>
  )
}
```

Available slots: `add`, `close`, `microphone`, `acceptDictation`, `suggestion`, `warning`, `uploadImages`, `attachment`, `more`, `send`, `stop`, `shuffle`, `chevronDown`, `chevronRight`, and `selected`. For model logos, pass `icon` on each `modelOptions` entry. Nested providers inherit other slots. The core component does not import the Central Icons React packages or require a license key at runtime; the host application owns those imports and installation credentials.

### Compact layout

With `size="small"`, set `showAddButton={false}` and `showDictation={false}` for an input and send button only. Both default to `true` and work at either size; hidden actions stay hidden if the input expands into the standard layout. Disabling dictation also removes it from the add menu.

### Generating responses

Pass `generating` from your chat request or stream status. It defaults to `false`; the composer never starts a generation request itself. While `true`, the Send arrow transitions to a filled square and the button calls `onStop` instead of submitting. The button keeps its size, position, and focus, and reduced motion uses a short fade.

```tsx
<AiComposer
  generating={isGenerating}
  onSubmit={sendMessage}
  onStop={stopGeneration}
/>
```

Your host sets `isGenerating` when a response starts and resets it when that response completes, fails, or is cancelled. Connect `stopGeneration` to your chat SDK's stop method or an `AbortController`. If `onSubmit` returns the entire request promise, Stop remains available while it is pending. To allow composing the next draft during a streamed response, resolve `onSubmit` after accepting the message and drive the longer response lifecycle with `generating`.

New submissions are blocked during generation, including Enter in the textarea. Stop works with an empty draft and preserves any new draft or attachments. `onStop` may return a promise; repeat stops are disabled while it runs, and rejection displays a readable error for retry. The host still owns `generating` after the callback completes. Without `onStop`, or with `disabled` / `readOnly`, the Stop button is disabled. Use the `stop` icon slot to supply your preferred square glyph.

### Voice dictation

Pass `transcribeAudio` to record microphone audio and transcribe it with your own server or service. The component handles recording, the live waveform, and the check/close controls. Pressing the check button stops recording and shows a static **Transcribing** placeholder while your callback runs; placeholder animation resumes afterwards. The returned transcript is appended to the draft and sent to `onValueChange`. The optional `onDictationComplete` callback receives only the accepted transcript. Closing dictation discards the recording and preserves the draft and attachments.

```tsx
import { AiComposer, type AiComposerTranscribeAudio } from 'larsui'

const transcribeAudio: AiComposerTranscribeAudio = async (audio, { signal, language }) => {
  const form = new FormData()
  const extension = audio.type.includes('mp4') ? 'mp4' : 'webm'
  form.append('file', audio, 'dictation.' + extension)
  form.append('language', language.split('-')[0])

  const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal })
  const result = await response.json()
  if (!response.ok || typeof result.text !== 'string') {
    throw new Error(result.error || 'Audio could not be transcribed. Please try again.')
  }
  return result.text
}

<AiComposer
  transcribeAudio={transcribeAudio}
  value={message}
  onValueChange={setMessage}
  onSubmit={sendMessage}
  onDictationComplete={(transcript) => console.log(transcript)}
/>
```

`AiComposerTranscribeAudio` has the signature `(audio: Blob, options: { signal: AbortSignal; language: string }) => Promise<string>`. Check `audio.type` when choosing a filename or provider format; the composer records WebM or MP4 according to browser support. `language` is the browser's language, such as `en-GB`; adapt it to your provider's expected format. Forward `signal` to your request so cancellation and component unmounts can abort pending work. Reject with a readable `Error` to show a warning above the composer. Microphone recording requires HTTPS or localhost and microphone permission. Keep provider credentials on your server.

Omitting `transcribeAudio` keeps the browser `SpeechRecognition` behavior. The check button accepts recognized words, including interim results. Some embedded browsers expose recognition but cannot connect to its speech service; provide a server callback to use a transcription service in those browsers. The library does not depend on OpenAI or select a transcription endpoint.

### Website transcription setup

Contributors to the website also need their Central Icons license key when installing its development dependencies. Keep all license keys and API keys in local environment files or deployment secrets, outside the repository.

The LarsUI website passes a callback that uploads accepted dictation audio to its same-origin `/api/transcribe` endpoint. That endpoint calls OpenAI speech-to-text on the server. Set `OPENAI_API_KEY` in a Git-ignored `.env.local` file for local development and restart `npm run dev`. The development server serves the endpoint alongside Vite.

For Vercel, add `OPENAI_API_KEY` as a secret environment variable for Production and Preview, then redeploy the site so the server function receives it. The source includes `api/transcribe.ts`; deploy the Vercel function and site together. Keep the key server-side and never use a `VITE_` prefix. A static build served without the server endpoint cannot transcribe recordings. The endpoint defaults to `gpt-transcribe`; set `OPENAI_TRANSCRIPTION_MODEL` server-side to override it. Uploads are limited to 4 MiB including multipart fields and processing times out after 45 seconds.

When a custom `icon` is provided without an `iconPosition`, the Chip renders it at the start rather than silently dropping it.

The components can be themed with the CSS custom properties included in the generated stylesheet.

Button supports `size="medium"` (the default, preserving the original 32px height) and `size="large"`. Large buttons fit their content with 24px horizontal padding, 12px vertical padding, an 8px gap, and sans semibold text at 14px with an 18px line height and zero letter spacing. Icons are 20px. These dimensions apply to both `full` and `neat` shapes, including icon-only buttons; text-only Large buttons are 42px tall and Large buttons with icons are 44px tall.

SegmentedControl supports `content="icon-only"` alongside `text-only` and `text-icon`. Supply an `icon` and a descriptive `label` for each option: the label stays available to assistive technology while only the icon is visible. Options without icons keep their visible label. Icon-only segments are 32px square at the default size and 38px square at the large size, for both `cornered` and `square` types.

The light square SegmentedControl border uses `--divider-mid_emphasis`, based on `--radix-gray-5` (`#e0e0e0`).

Three shadow tokens are available in `larsui/style.css`:

| Token | Value |
| --- | --- |
| `--shadow-low_emphasis` | `0 2px 5px`, gray 12 at 24% |
| `--shadow-mid_emphasis` | `0 3px 4px`, gray 12 at 40% |
| `--shadow-high_emphasis` | `0 4px 6px`, gray 12 at 56% |

## Tooltip

The optional `lars-tooltip-inline` class is included in `larsui/style.css` and styles a button as the inline indigo trigger shown in the example. Any focusable native element can be used as the trigger. A custom trigger component must pass the received DOM props and ref to its underlying element. `className` on `Tooltip` styles the popup, not the trigger.

| Prop | Default | Behavior |
| --- | --- | --- |
| `label` | Required | Single-line title; truncates when needed. |
| `description` | — | Up to four lines; takes precedence over `shortcut`. |
| `shortcut` | — | Shown beside `label` when `description` is absent. |
| `shortcutStyle` | `plain` | `plain` text or a `keycap`. |
| `side` | `top` | Preferred side; flips near viewport edges. |
| `delay` | `300` | Pointer hover delay in milliseconds. |
| `anchor` | `false` | Shows the triangle pointing to the trigger. |
| `highContrast` | `false` | Reverses the popup theme: dark on a light page, light on a dark page. |

The popup fits its content up to 280px wide. It follows `<html data-theme="light|dark">`, or the system preference when no explicit theme is set. With `highContrast`, it uses the opposite of that effective theme. Tooltip content is supplementary visual information: give icon-only triggers their own accessible name, and put essential instructions inline or in a popover.

The library also provides shared high-contrast text tokens with these Radix gray colors as parent values:

| Token | Radix parent |
| --- | --- |
| `--high_contrast-high_emphasis` | `--radix-gray-1` |
| `--high_contrast-mid_emphasis` | `--radix-gray-dark-11` |
| `--high_contrast-low_emphasis` | `--radix-gray-10` |
