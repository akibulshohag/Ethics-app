# App icon source

Put your **square** logo here as **`logo.png`** (recommended **1024×1024** px, PNG).

This file is the **single source** for:

- Android launcher icons (`ic_launcher` / adaptive foreground)
- iOS `AppIcon` asset catalog

After replacing `logo.png`, regenerate native icons:

```bash
cd Ethics-app
npm run generate-icons
```

Then rebuild the app (icons are compiled into the native binary — Metro reload alone will not change the home-screen icon):

```bash
npx react-native run-ios
# or
npx react-native run-android
```

Requires **macOS** (`sips`) for `npm run generate-icons`. On Linux/Windows, resize `logo.png` manually or use an online “app icon generator” and copy outputs into `android/.../mipmap-*` and `ios/.../AppIcon.appiconset`.
