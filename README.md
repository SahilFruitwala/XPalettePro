# XPalettePro 🎨

**XPalettePro** is a lightweight, privacy-first Chrome Extension that allows you to transform the look of X (Twitter) with beautiful, carefully curated color palettes. It seamlessly restyles the entire website without breaking functionality, offering both vibrant dark modes and clean light modes.

![XPalettePro Logo](icons/icon128.png)

## ✨ Features

- **Curated Themes**: Choose from beautifully balanced palettes including Dracula, Nord, Matrix, Solarized Dark, Catppuccin Mocha, Catppuccin Latte, and GitHub Light.
- **Instant Switching**: Swap themes instantly from the extension popup without needing to reload the page.
- **Native Symbiosis**: Designed to work gracefully with X.com's underlying structure. You can cleanly revert to X's default themes anytime.
- **Lightweight & Fast**: CSS-first theming with a targeted mutation scanner keeps visuals consistent while reducing heavy full-page rescans.

## 🚀 Installation (Load Unpacked)

If you want to install from source before it's available on the Chrome Web Store:

1. Clone or download this repository to your computer.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** and select the folder containing this extension's files.
5. Setup complete! Pin the extension to your toolbar.

> **💡 Best Results:** Make sure your native X.com theme is set to **"Lights out"** (black) before applying custom themes!

## 🔒 Privacy Policy

XPalettePro was built with privacy as the core fundamental principle. **Your data is yours.**

- **No Data Collection**: This extension does not collect, monitor, or transmit _any_ personal data, browsing history, or interaction metrics.
- **No External Servers**: The extension runs 100% locally on your machine. It makes zero network requests to external servers.
- **No Analytics or Trackers**: We do not use Google Analytics or any third-party tracking scripts.
- **Minimal Permissions**: We only request two specific permissions:
  - `storage`: Exclusively used to locally save your active theme choice so it remembers your preference when you open a new tab.
  - `*://*.twitter.com/*` and `*://*.x.com/*`: Restricted specifically so the extension can only inject CSS and colors into the Twitter/X application, and nowhere else.

## 🛠️ Development

### Stack

- Vanilla JavaScript
- Plain CSS overrides
- Chrome Extension Manifest V3

### Theming Engine

XPalettePro uses a two-layer CSS-first engine:

1. **Theme Variables Layer**: Injects a small `:root` variable block for the selected theme.
2. **Theme Rules Layer**: Applies stable selectors across feed, profile, explore, notifications, bookmarks, messages, dialogs, menus, and settings surfaces.

For dynamic React updates, a **targeted mutation queue** classifies only changed/new nodes and applies lightweight theme classes (`xp-bg-main`, `xp-bg-hover`, `xp-txt-primary`, `xp-txt-muted`, `xp-brd`) instead of rescanning the full app tree on every mutation.

The popup also inherits the active theme for consistent extension UI.

## 🤝 Contributing

Feel free to open issues or submit Pull Requests if you'd like to add new color palettes or refine the JS DOM scanner logic! All submitted themes must adhere to accessible contrast guidelines and cover both background and core text colors.
