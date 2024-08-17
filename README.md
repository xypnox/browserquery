# Browserquery

Query your current browser tabs.

It filters tabs from direct string match with url or title of the tab.

It groups by:   

- "domain",  // Domain of the url
- "window", // Window ID
- "active", // Whether the window has not been discarded
- "time", // Currently in months
- "audio", // If there is any audio playing
- "article", // Whether it can be rendered in the firefox reader mode (isn't reliable tbh)
- "pinned", // Whether the tab is pinned
- "duplicate", // Ability to close all duplicate and also all duplicate but one.

It asks for confirmation when closing tabs in bulk.
Doesn't ask when closing all but one for duplicate tabs.

## Shortcuts

| Shortcut | Description |
| ---      | ---         |
| `Alt + Shift + Space`           | Open the popup |
| `Command + Alt + Shift + Space` | ... (Mac) |
| | |
| **When input is not focused**     | |
| `G`                             | Focus on the Group input |
| `X` or `Delete`                   | Close currently focused tab |

By design, it only queries for tabs that start with http, so tabs from extensions will not show up.

> Iosevka Term font recommended but not required

## Build Steps

1. Requirements
  1. [Node.js](https://nodejs.org/en)
  2. [pnpm](https://pnpm.io/)

```bash
pnpm i # Install dependencies
pnpm build # Build for Chrome
# OR
pnpm build:firefox # Build for Firefox
```


## Dev


```bash
pnpm dev
# OR
pnpm dev:firefox
```
