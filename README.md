# LarsUI

Thoughtfully crafted, accessible React UI components built on Base UI.

## Install

```sh
npm install larsui
```

## Use

```tsx
import { Button, Chip, InlineSlider, SegmentedControl } from 'larsui'
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
