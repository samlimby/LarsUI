# LarsUI

Thoughtfully crafted, accessible React UI components built on Base UI.

## Install

```sh
npm install larsui
```

## Use

```tsx
import { AdaptiveTooltip, Button, Chip, InlineSlider, SegmentedControl, Tooltip } from 'larsui'
import 'larsui/style.css'
```

```tsx
<Button variant="primary" shape="full">View</Button>
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
<Tooltip anchor label="Export quality" description="Higher quality creates a larger file.">
  <button className="lars-tooltip-inline" type="button">export settings</button>
</Tooltip>
<AdaptiveTooltip steps={[
  { title: 'Provenance', description: 'Where an item came from and how it changed.' },
  { title: 'Chain of custody', description: 'Who handled the item.' },
]}>
  <button type="button">provenance</button>
</AdaptiveTooltip>
```

When a custom `icon` is provided without an `iconPosition`, the Chip renders it at the start rather than silently dropping it.

The components can be themed with the CSS custom properties included in the generated stylesheet.

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
