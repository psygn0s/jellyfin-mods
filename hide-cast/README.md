
# Jellyfin Hide Duplicate/Missing People

A lightweight JavaScript customization for Jellyfin that hides cast and crew cards without portraits and removes duplicate names from the people section.

Designed for use with **Jellyfin JS Injector** and custom Jellyfin themes.

## Features

- **Hide people without portraits** — hides cards when a missing or default portrait is confirmed.
- **Remove duplicate people** — keeps the first valid occurrence of each displayed name within its section.
- **Dynamic content support** — rechecks cards when Jellyfin adds or updates content.
- **Lazy-loading protection** — avoids treating an image that is still loading as a missing portrait.
- **Mutation monitoring** — detects changes to card elements, image sources, and portrait styling.
- **Lightweight implementation** — uses native JavaScript without external libraries.

## Requirements

- Jellyfin Web
- [Jellyfin JS Injector](https://github.com/n00bcodr/Jellyfin.Plugin.JavaScriptInjector)
- A compatible Jellyfin theme or interface that uses `.personCard` and `#castContent`

## Installation

1. Install and configure the **Jellyfin JS Injector** plugin.
2. Open the plugin's JavaScript configuration in the Jellyfin dashboard.
3. Paste the complete contents of the script into the JavaScript configuration.
4. Save your changes.
5. Reload Jellyfin Web to apply the customization.

If you use a browser cache or a desktop client, perform a full reload or restart the client if the changes do not appear immediately.

## How It Works

The script monitors Jellyfin's people-card interface and processes cards inside `#castContent`.

### Portrait detection

The script checks each `.personCard` for a `.cardImageContainer` portrait. Cards with confirmed missing or default portraits are hidden.

Cards that are still loading are not automatically classified as missing, preventing valid cast members from disappearing prematurely.

### Duplicate detection

Names are read from the following elements:

- `.cardText-first`
- `.cardText`
- `.itemName`

Names are normalized by trimming whitespace, collapsing repeated spaces, and converting text to lowercase.

For example, these names are treated as duplicates:

- `John Smith`
- `john smith`
- ` John Smith `

The first valid card is preserved, and subsequent occurrences with the same normalized name are hidden.

Duplicate detection is performed independently within each `#castContent` container.

### Dynamic updates

A `MutationObserver` watches for DOM changes and relevant card attribute updates. Cleanup is scheduled through `requestAnimationFrame` to avoid running the processing routine repeatedly for every individual mutation.

## Configuration

The script uses these selectors by default:

| Selector | Purpose |
|---|---|
| `#castContent` | People section to process |
| `.personCard` | Individual cast or crew card |
| `.cardImageContainer` | Portrait container |
| `.cardText-first` | Preferred person-name element |
| `.cardText` | Alternative person-name element |
| `.itemName` | Fallback person-name element |

If your Jellyfin theme uses different selectors, update the corresponding constants and selectors in the script.

## Troubleshooting

### All people disappear

Check whether your theme uses a different portrait structure or keeps portrait images in a lazy-loading state. Confirm the actual HTML classes in your browser's developer tools.

### People without portraits remain visible

Some themes display a placeholder without using `defaultCardBackground`. The portrait-detection logic may need to be adjusted to match that placeholder.

### Duplicate people remain visible

The script compares displayed names within each `#castContent` container. Cards outside that container are not processed, and duplicates in separate containers are handled independently.

### Changes do not appear

- Confirm the JavaScript is enabled in JS Injector.
- Check the browser developer console for errors.
- Perform a full reload of Jellyfin Web.
- Verify that the page contains the expected selectors.

## Compatibility

This customization depends on Jellyfin Web's DOM structure and the selectors used by your theme. Jellyfin updates or theme changes may require selector adjustments.

The script modifies card visibility in the client interface; it does not delete people, edit metadata, or modify your media library.

## License

MIT License — you may use, modify, and redistribute this customization with attribution.
