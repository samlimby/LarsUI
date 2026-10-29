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
import { AiComposer, Button, Chip, Dropdown, Input, InlineSlider, SegmentedControl, Textarea, Tooltip } from 'larsui'
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

The AI Composer accepts `value` / `onValueChange` for a controlled draft, or `defaultValue` for an uncontrolled draft. Press Enter to submit or Shift + Enter for a new line. The standard input grows with wrapped text up to ten visible lines, or until the composer reaches 40% of the visible viewport height, then scrolls. It keeps the action buttons clear of the text. The viewport limit allows room for attachments and stacked controls, while preserving at least three input lines on very small screens. Choose attachments with the file picker or drag files onto the composer using native browser drag and drop. Attachments stay local until your `onSubmit` handler receives them; selecting or dropping a file does not upload it. Image and PDF previews are generated locally, with PDF support loaded on demand.

Provide `onSubmit` to enable sending. It receives `{ message, files, model, mode, variant }`. Model and mode are included even when their controls are hidden. Return a promise for an asynchronous send: editing controls are blocked while it runs (the textarea stays focusable and read-only), success clears the submitted draft and attachments, and rejection preserves them for retry and displays the error. An `AbortError` cancellation preserves the draft without an error warning. Controlled consumers must apply `onValueChange`, including the empty string after a successful send.

Use `disabled` to disable all interactions, `readOnly` to preserve selection/copying without editing or sending, and `inputLabel` to name the textarea accessibly. `inputProps` forwards native textarea options such as `name`, `required`, `maxLength`, `autoFocus`, and `aria-describedby`; other native form props belong on the composer itself. The component renders a form, so do not nest it inside another form. Its scoped styles do not require the website's global CSS reset.

### Input, Dropdown and Textarea

Use `Input` for single-line text, `Dropdown` for single or multiple selection, and `Textarea` for multiline text. Each supports `size="small"` or `"large"` and `appearance="outline"`, `"subtle"`, or `"filled"`, with shared semantic tokens and label, helper, required and error behavior. Input and dropdown heights are 32px / 44px; textareas start at 320 × 96px and can resize vertically. All controls shrink to fit their container.

```tsx
const cityOptions = [
  { label: 'New York', value: 'new-york', description: 'New York, United States' },
  { label: 'Los Angeles', value: 'los-angeles', description: 'California, United States' },
]

<Input aria-label="Name" name="name" placeholder="Type here" />
<Input aria-label="Amount" name="amount" leading="$" placeholder="0.00" />
<Dropdown
  aria-label="City"
  name="city"
  placeholder="Select a city"
  options={cityOptions}
/>
<Dropdown multiple aria-label="Cities" name="cities" options={cityOptions} defaultValue={['new-york']} />
<Textarea aria-label="Notes" name="notes" size="large" rows={4} />
```

The existing `<Input variant="dropdown">` and `<Input variant="textarea">` APIs and their exported prop types remain supported for compatibility. New usage should import `Dropdown` or `Textarea` directly. Their props are exported as `DropdownProps` (including `DropdownSingleProps` and `DropdownMultiProps`) and `TextareaProps`; dropdown options use `DropdownOption`.

Use `value` / `onValueChange` for controlled fields or `defaultValue` for uncontrolled fields. Single-select dropdown values are `string | null`; `null` shows the placeholder. Set `multiple` to select several options with `string[]` values; selecting an option toggles it while the menu stays open. The **All options** row selects or clears enabled options, shows their selected count, and indicates partial selection. Set `showSelectAll={false}` on a multi-select to hide this row; it is shown by default. Existing disabled selections are preserved. The trigger shows the selected labels, and forms submit one value per selection under `name`. Text fields and textareas also forward native `onChange`, validation, form attributes, and refs. The dropdown forwards its ref to the trigger and supports keyboard navigation, typeahead, and Escape through Base UI Select. Supply an accessible name with `aria-label` or a `<label htmlFor>` matching the input's `id`. All three components support `disabled` and `readOnly`; the surface treatments remain editable unless either prop is set.

Add an optional `description` to an option to show subtext beneath its label in either dropdown selection mode. The selected trigger and keyboard typeahead use the primary label; assistive technology can also read the option's description.

Use `helperText` to add guidance 4px below any of these controls. It uses `mid_emphasis` text and can include a decorative leading `helperIcon`, for example `helperIcon={<Info size={12} />}`. The helper is linked through `aria-describedby`, preserving any description IDs you supply. When helper text is present, `className` and `style` customize the outer field containing the control and helper; refs and native field attributes still target the input, textarea, or dropdown trigger.

Set `error` to show an invalid state on any of these controls. The border turns red, and error feedback with the built-in warning icon replaces `helperText` and `helperIcon`. Supply `errorText` for the message; blank or omitted copy falls back to “Please enter a valid value.” Clearing `error` restores the normal helper. Error feedback sets `aria-invalid` and joins the control's existing `aria-describedby` references.

Use the optional `label` prop for an associated visible label that also turns red in the error state. With a label or feedback present, `className` and `style` apply to the field wrapper; refs continue to target the native control.

```tsx
<Input
  label="Email address"
  type="email"
  helperText="Use your work email."
  error
  errorText="Enter a valid email address."
/>
```

The website shows Input, Dropdown and Textarea as separate home cards, each linking to its own component page and usage example. Each home card has an independent **White**, **Subtle**, and **Filled** surface toggle, and its copied snippet reflects the selected surface. Each page includes **Size**, **Surface**, **Labels & Text**, and **Error** controls, with an editable **Error message** when enabled. **Required** lives inside the expanded **Labels & Text** menu, beside the label controls; required labels show an asterisk. Input adds leading and trailing **Slots** controls, Dropdown adds multiple selection, Select all and option subtext controls, and Textarea adds **Rows**. Generated usage code uses the corresponding component and reflects its selected properties.

Native `required` validation calls `onInvalidCapture` and `onInvalid` for all three components. For dropdowns, `target` remains the validating native input and `currentTarget` is the visible trigger. Uncontrolled fields also reset correctly when their associated external form mounts later or is replaced; canceled resets leave values unchanged.

Fields use subtle hover and color transitions. Pointer interactions animate the dropdown's entry, exit, and chevron; keyboard and assistive activations stay immediate. With `prefers-reduced-motion`, the dropdown uses a short fade without movement or icon rotation.

Populated text fields show a clear button when editable. Entered text and selected dropdown values use `--color-fg-input`; placeholders use `--color-fg-input-placeholder`. Clearing calls the existing change handlers, preserves focus, and restores the placeholder. For `Input`, `className` and `style` customize the wrapper; refs and native attributes stay on the input. Dropdowns and textareas remain standalone controls without a clear button.

Text inputs accept `leading` and `trailing` React nodes in separate compartments outside the editable field. Icon slots remain 32px square for small inputs and 44px square for large inputs; text prefixes can grow within the control's available width. Use a prefix or decorative icon for `leading`, or provide an accessible `<button type="button">` in `trailing` for actions such as copy or send. Both slots can be used together, and the clear button stays inside the editable field even when a slot grows. The slots follow the field's surface, selected, and disabled styles; action behavior belongs to the button you provide.

Dropdown options share one highlight that glides to the nearest enabled row under a mouse pointer. Keyboard navigation stays immediate. Reduced motion removes the travel and keeps the brief hover fade; touch selection uses the standard option states. Long labels wrap within the popup, and the glide updates when rows such as **All options** are inserted or removed while open.

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

### Design tokens

Shared tokens live in `src/tokens/`, with `index.css` loading the core layer before the semantic layer. Both the library and the website use this entry point; package consumers continue to import `larsui/style.css`.

- `core/colors.css` stores the Radix palettes documented in Paper, including the Display P3 yellow ramp, plus the dark ramps used by component themes and fixed vendor identity colors.
- `core/chip-colors.css` retains the existing custom LarsUI dark Chip shades. Chip semantic roles use Radix step 4 backgrounds and step 10 foregrounds in light mode: gray, blue, orange, green and red. Their dark mappings preserve the original dark palette.
- `core/component-colors.css` stores the original custom component shades alongside the Radix primitives, including the existing dark surfaces and button colors.
- `core/typography.css` stores primitive type sizes, font stacks, and weights. `core/sizes.css` defines `--size-0` through `--size-96` in 4px increments; the numeric suffix is the pixel value, so `--size-12` is `12px`.
- `semantic/spacing.css` maps the existing `--spacing-1` through `--spacing-6` names to the size scale and defines the shared radius roles. `core/spacing.css` remains a compatibility entry point for these tokens.
- `semantic/colors.css` contains all 259 Paper color roles under their exact `--color-fg-*`, `--color-bg-*`, and `--color-border-*` names. Each value references a core color. `semantic/component-colors.css` adds supporting roles for primary controls, fixed dark surfaces, overlays, shadows and vendor marks.
- `semantic/typography.css` contains the shared Paper typography bundles: `body/{xs,sm,md,lg}/{weight}`, `heading/{sm,md,lg}/{medium,semibold}`, `shortcut/sm/medium`, and the three monospace Chip styles. For example, `body/sm/regular` uses `--font-body-sm-regular`, `--text-body-sm-regular`, `--font-weight-body-sm-regular`, `--leading-body-sm-regular`, and `--tracking-body-sm-regular`. Existing role names remain compatibility aliases to these consolidated styles.
- `semantic/themes.css` supplies Paper’s light/dark mappings. `semantic/component-themes.css` preserves the original component palettes, including hover, focus and inverse variants. Components use semantic roles directly; local variables such as `--button-primary-bg`, `--input-text` and `--table-row` remain available for component overrides. `semantic/focus.css`, `semantic/shadows.css`, and `semantic/aliases.css` provide focus, elevation and compatibility tokens.
- `site/index.css` is imported only by the website. Its `theme.css` retains the website's light/dark overrides; `typography.css` defines code previews, commands, and the existing 9px footnote superscript, together with their site-only primitives. These files are excluded from `larsui/style.css`.
- `src/assets/fonts/fonts.css` loads the bundled Inter and Paper Mono variable fonts through the shared token entry point. Font licenses and pinned sources are recorded in `src/assets/fonts/` and copied to `FONT-LICENSES.txt` in each build output.

Body sizes and line heights are `xs` 10px/12px, `sm` 12px/16px, `md` 14px/18px, and `lg` 16px/20px. Regular, medium, semibold, and bold use weights 400, 500, 600, and 700 with zero tracking; `md` currently defines regular, medium, and semibold. Monospace Chips use Paper Mono at weight 600 with 0.05em tracking. Tabular numbers, link underlines, and the default slider readout's tighter tracking remain component properties.

Component padding, gaps, margins, and common control/icon dimensions use the core size tokens. Rounded corners use `--radius-xs` (2px), `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), and `--radius-2xl` (20px), plus `--radius-full` (999px) for pills and `--radius-circle` (50%) for circles. The 2px radius is a half-step derived from `--size-4`. Existing compact 2px/6px/10px spacing and inset radii use `calc()` expressions; fixed 1px border adjustments preserve the current geometry. Larger component widths, optical dimensions, thin strokes, and motion measurements remain local.

Use the shared scale in custom styles after importing `larsui/style.css`:

```css
.my-control {
  gap: var(--size-8);
  padding: var(--size-8) var(--size-12);
  border-radius: var(--radius-md);
}
```

Override a size primitive to change its uses across components, or override a radius role to adjust corners without changing spacing. Animated Chip surfaces and SegmentedControl indicators resolve the same CSS tokens to pixels for Motion's corner correction, including scoped overrides.

The shared heading scale provides medium and semibold at 16px/24px, 24px/32px, and 32px/40px. Medium headings use weight 500 and semibold headings use 600; the 24px styles use -0.02em tracking, while the others use zero tracking. These are public LarsUI tokens in `larsui/style.css`, currently used by the website and available for future component use. The site-only code style uses Paper Mono at 12px/18px; installation commands keep their documented 450 weight.

Paper's color roles define the light palette. Components consume these semantic roles in both themes, with original component mappings centralized in `semantic/component-colors.css` and `semantic/component-themes.css`; the website no longer supplies component color defaults. Set `<html data-theme="light|dark">` for an explicit theme, or omit it to follow the system preference. Button and Tooltip high-contrast variants use the opposite palette, while the floating Table toolbar keeps a fixed dark surface. Edit primitives to change a shared palette value, or override a semantic role to change its use across components. Keep component state and layout variables local to their components.

Button supports `size="medium"` (the default, preserving the original 32px height) and `size="large"`. Every Large button is 44px tall, with centered text and icons, 24px horizontal padding, 12px vertical padding, an 8px gap, and sans semibold text at 14px with an 18px line height and zero letter spacing. Icons are 20px. Large icon-only buttons are 44px square with 12px padding on every side. These dimensions apply to both `full` and `neat` shapes, including loading states.

Button also accepts `highContrast` (default `false`), which switches to the opposite theme palette, matching Tooltip: light pages use dark-theme button colors, and dark pages use light-theme button colors. This includes Primary, Secondary, Ghost, and Danger, with Ghost retaining its transparent surface. High Contrast Secondary buttons use white text and icons on their dark surface in both idle and hover states. It follows `<html data-theme="light|dark">`, or the system preference when no explicit theme is set. The button Properties panel includes an Off/On High Contrast config, and its editable usage code stays in sync with that setting.

SegmentedControl supports `content="icon-only"` alongside `text-only` and `text-icon`. Supply an `icon` and a descriptive `label` for each option: the label stays available to assistive technology while only the icon is visible. Options without icons keep their visible label. Icon-only segments are 32px square at the default size and 38px square at the large size, for both `cornered` and `square` types.

The light square SegmentedControl border uses `--color-border-mid_emphasis`, based on `--radix-gray-5` (`#e0e0e0`).

Four emphasis shadow tokens are available in `larsui/style.css`, using the muted recipes from levels 1, 2, 4, and 6 of [Fluid Functionalism’s surface scale](https://www.fluidfunctionalism.com/docs/surfaces). Light shadows combine a fine outline with stacked drops using the core black token at 6% opacity. Dark shadows progress from a 2% white inset ring to a 4% white top highlight, 6% white ring, 18% black hairline, and 18% black drops. All colors resolve through semantic roles in `semantic/component-colors.css` to the existing core black/white palette.

| Token | Elevation |
| --- | --- |
| `--shadow-min_emphasis` | Fine outline; no drop layers |
| `--shadow-low_emphasis` | Small controls and menus; one drop with 1px blur |
| `--shadow-mid_emphasis` | Floating menus and toolbars; three drops up to 6px blur |
| `--shadow-high_emphasis` | Large floating surfaces; five drops up to 24px blur |

The scale follows explicit `[data-theme="light|dark"]` scopes and the system preference when no theme is set. Existing names remain aliases: `--shadow-input-popup` uses low emphasis, `--shadow-popup` and `--shadow-floating-toolbar` use mid emphasis, and `--shadow-composer` uses high emphasis. Insets that draw a component border or focus indicator continue to use their own semantic border colors.

Elevation recipes include their own fine outline. Floating popups reserve a transparent 1px border for layout instead of adding a second visible outline; tooltip arrows use the matching semantic edge color.

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
