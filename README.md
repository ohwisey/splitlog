# SplitLog

A single-file workout split tracker. Runs in your browser. Your data stays on your device.

**Live app:** https://ohwisey.github.io/splitlog/

## What you get

- **8-day split builder** with presets (push/pull/legs, upper/lower, bro split, full body) or build your own day by day
- **Heavy / volume / rest day tagging** — rest times auto-tune (compounds 3:30 / 2:30, isolations 1:15 / 1:00)
- **Auto-calculated warm-ups** based on your working weight and the lift's intensity tier
- **Between-set rest timer** with −15s / +15s / Skip and a haptic ping at zero
- **Tap-to-edit rest** if the default doesn't suit you for a specific lift
- **Per-exercise progress chart** — drag to scrub through past sessions
- **Backfill past workouts** from your old notes so the graph isn't empty for weeks
- **Profile-based starting-weight estimates** (age, gender, height, weight in kg or lb, height in cm or ft+in)
- **Today-only exercise swaps** (hotel gym only has incline? swap for the day, alt gets credit, original returns tomorrow)
- **Cardio block** on every day with zone tracking
- **Add custom exercises** if yours isn't on the list
- **Submitted workouts are locked** — delete to edit, no accidental data corruption
- **Export / Import your data as JSON** for backup

## Three ways to use it

### 1. Just open the link

Visit **https://ohwisey.github.io/splitlog/** in any browser. Done. Your data is in your browser's storage — refresh, come back tomorrow, it's still there.

### 2. Install as an app on your phone (recommended)

On iPhone:
1. Open the link in **Safari** (not Chrome — Chrome on iOS doesn't support PWA install)
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. The app's icon lands on your home screen and opens fullscreen, no browser chrome

On Android:
1. Open the link in **Chrome**
2. Tap the **⋮ menu** → **Add to Home Screen** (or **Install app**)
3. Same fullscreen experience

### 3. Host your own copy

Click **Fork** at the top of this repo. Enable Pages in your fork's Settings (Pages → Deploy from main → /(root)). Your URL becomes `https://<your-username>.github.io/splitlog/`. Your viewers get their own data on your domain.

## Where your data lives

Everything is in `localStorage` under the `splitlog.*` namespace. Nothing leaves your device. There are no servers, no analytics, no tracking, no fetch calls to external services. The app is a single HTML file with inline JavaScript and CSS — open the source and grep for `fetch` if you want to verify.

If you want to back up: tap **Export data** at the bottom of the page → JSON file downloads. To restore on a new device / browser: **Import data** → pick the file.

## License

MIT. Use it, fork it, rebrand it, build on top of it.
