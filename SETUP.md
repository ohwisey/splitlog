# SplitLog setup

## Use it standalone

Open [splitlog.vercel.app](https://splitlog.vercel.app/). That's it. Data lives in your browser. No account needed.

To install it as a phone app: open the link in Safari (iOS) or Chrome (Android), tap Share → Add to Home Screen. Opens fullscreen, works offline.

## Embed it in your OhWisey dashboard

Paste one line just before `</body>` in your dashboard's `index.html`:

```html
<script src="https://splitlog.vercel.app/embed.js"></script>
```

Commit → push → wait for redeploy → SplitLog renders inside the dashboard.

**What happens:** `embed.js` polls for `window.OhWisey.registerModule` (50 ms × 100 attempts = 5 s max), registers itself as the `splitlog` module, then the dashboard hands it a container element. All splitlog DOM lives as children of that container. No floating overlays, no global style injection.

**Requirements:**
- An OhWisey-Starter–compatible dashboard (exposes `window.OhWisey.registerModule`, `window.OhWisey.supabase`, `window.OhWisey.userId`)
- A Supabase project with the OhWisey-Starter schema applied

**If something's wrong:** open the browser console. The most common message is:

```
[splitlog] OhWisey dashboard API not detected — is this loaded inside an OhWisey dashboard?
```

That means `embed.js` waited 5 s and never saw `window.OhWisey.registerModule`. Either:
- The dashboard isn't an OhWisey-Starter fork.
- The script tag is loading before the dashboard's module system (move it lower, closer to `</body>`).
- The dashboard's module system errored before exposing `registerModule` (check for earlier console errors).

## Theming the embed

SplitLog inherits the dashboard's look. Set any of these CSS variables on your dashboard's `:root` and SplitLog picks them up:

```css
:root {
  --ohw-accent: #6ee7b7;         /* Primary action color */
  --ohw-text: #fff;              /* Primary text */
  --ohw-text-dim: rgba(255,255,255,0.55);  /* Secondary text */
  --ohw-bg-card: rgba(20,20,22,0.6);       /* Card backgrounds */
  --ohw-border: rgba(255,255,255,0.08);    /* Borders / dividers */
  --ohw-radius: 20px;             /* Card corner radius */
  --ohw-font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
}
```

Translucent mint tints stay hardcoded — they're subtle enough to read as themed against any dark host.

## Local development

Source of truth is `index.html`. Run:

```
node build-bundle.js
```

That regenerates three artifacts:

| File | Used by |
|---|---|
| `splitlog.bundle.js` | Legacy `SplitLog.mount(rootEl, options)` API |
| `splitlog.demo.bundle.js` | Demo variant (`DEMO_MODE = true`) for screen-grabs |
| `embed.js` | OhWisey module entry point (one-line embed) |

Commit the regenerated artifacts when shipping changes that touch CSS, JS, or body markup.
