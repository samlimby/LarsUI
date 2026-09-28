# LarsUI

Thoughtfully crafted, accessible React UI components built on Base UI.

## Install

```sh
npm install larsui
```

## Use

```tsx
import { Button, Chip, InlineSlider, SegmentedControl, Tooltip, TermLink, TermTooltipProvider } from 'larsui'
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
```

When a custom `icon` is provided without an `iconPosition`, the Chip renders it at the start rather than silently dropping it.

The components can be themed with the CSS custom properties included in the generated stylesheet.

## Tooltips

`Tooltip` is for a short, noninteractive hint on an existing focusable element:

```tsx
<Tooltip content="Higher quality creates a larger file.">
  <button type="button" aria-label="About export quality">i</button>
</Tooltip>
```

For interactive definitions, register each term once and place `TermLink` directly in running text. The provider owns the stack, timing, focus return, and dismissal:

```tsx
import { TermLink, TermTooltipProvider, type TermRegistry } from 'larsui'

const terms: TermRegistry = {
  provenance: {
    title: 'Provenance',
    body: <p>A record of origin and <TermLink term="custody">custody</TermLink>.</p>,
  },
  custody: {
    title: 'Chain of custody',
    body: <p>The documented sequence of handoffs.</p>,
    learnMore: { href: '/glossary/custody', label: 'Learn more' },
  },
}

<TermTooltipProvider terms={terms} openDelay={200} lockDelay={700} closeGrace={250} maxDepth={4}>
  <p>Inspect the item's <TermLink term="provenance">provenance</TermLink>.</p>
</TermTooltipProvider>
```

`TermLink` defaults to a dotted glossary underline; use `variant="solid"` for a solid underline. The provider also accepts `resolveTerm(id)` and `lockMode="pointer" | "timer" | "click" | "pointer-or-timer"`. Pointer mode is the default and also locks after a sustained dwell. Enter or Space locks immediately. Escape closes one level, and an outside press closes the stack. On narrow or coarse-pointer screens, the current definition becomes a bottom sheet with back and close controls.

The basic hint uses Base UI Tooltip. Nested definitions use Base UI Popover and its Floating UI positioning, portal, collision handling, and virtual anchors. Styling uses LarsUI's `--lars-accent`, surface, text, and divider variables; `--lars-tooltip-radius`, `--lars-tooltip-shadow`, and `--lars-tooltip-z-index` can be overridden where LarsUI has no shared token.

Known limits: nested definitions should be authored as React nodes inside one registry; `TermLink` without a registry entry displays emphasized text; and a small-screen sheet shows only the current level while its breadcrumb preserves the trail. The tooltip page of the demo site includes a three-level chain, adjacent terms, a wrapped term, a viewport-edge term, a cycle, and keyboard and touch instructions.
