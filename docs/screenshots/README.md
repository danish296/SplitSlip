# Screenshots

The `.svg` files here are **UI previews** — hand-authored illustrations that use the
app's real design tokens (`src/index.css`) so the README renders correctly on a fresh
clone with no binaries in the repo.

They are not device captures. To replace them with the real thing:

## Capturing

1. Run the app and sign in with a seeded account.
2. Capture at **1080 × 2280** (or any 20:9 ratio) in **light mode**.
   - Android: `adb exec-out screencap -p > 01-home.png`
   - Browser: DevTools → device toolbar → Pixel 7 → capture screenshot
3. Save as PNG with these exact names, replacing the `.svg` references in the root
   `README.md`:

| File                    | Screen                | Route           |
| ----------------------- | --------------------- | --------------- |
| `01-home.png`           | Home / dashboard      | `/home`         |
| `02-review.png`         | Receipt review        | `/review`       |
| `03-item-split.png`     | Split by item         | `/split/items`  |
| `04-payment-slip.png`   | Public payment slip   | `/r/:requestId` |

## Before you commit

Scrub anything real. These images go into a public repository:

- Use placeholder names, not real contacts
- Replace the UPI ID with something like `yourname@bank`
- Blur or replace real UTR / transaction references
- Check the status bar for personal notifications

Keep each PNG under ~400 KB (`oxipng -o4` or `pngquant` is plenty).
