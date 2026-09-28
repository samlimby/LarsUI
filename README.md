# LarsUI

Thoughtfully crafted, accessible React UI components built on Base UI.

## Install

```sh
npm install larsui
```

## Use

```tsx
import { AiComposer, Button, Chip, InlineSlider, SegmentedControl } from 'larsui'
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

<AiComposer
  variant="unstructured"
  onSubmit={({ message, files }) => sendMessage(message, files)}
/>

<AiComposer
  variant="structured"
  workspaceOptions={[{ label: 'S4H', value: 's4h' }]}
  roleOptions={[{ label: 'Functional Analyst', value: 'analyst' }]}
  onSubmit={({ message, workspace, role, files }) =>
    runAnalysis({ message, workspace, role, files })}
/>
```

The AI Composer accepts controlled or default message values, file attachments, and optional workspace and role selectors. Press Enter to submit or Shift + Enter for a new line. Its send and utility controls use LarsUI buttons, and attached file labels use LarsUI chips.

When a custom `icon` is provided without an `iconPosition`, the Chip renders it at the start rather than silently dropping it.

The components can be themed with the CSS custom properties included in the generated stylesheet.
