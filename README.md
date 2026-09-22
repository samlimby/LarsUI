# LarsUI

Thoughtfully crafted, accessible React UI components built on Base UI.

## Install

```sh
npm install larsui
```

## Use

```tsx
import { Button, Chip, InlineSlider } from 'larsui'
import 'larsui/style.css'
```

```tsx
<Button variant="primary" shape="full">View</Button>
<Chip variant="positive" iconPosition="start" size="small" burst>Approved</Chip>
```

When a custom `icon` is provided without an `iconPosition`, the Chip renders it at the start rather than silently dropping it.

The components accept Base UI props and can be themed with the CSS custom properties included in the generated stylesheet.
