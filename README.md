# SplitLog

Single-file workout split tracker. Open `index.html` in a browser and start logging — no build step, no server, no signup. Your data lives in your browser's `localStorage`.

**Live:** https://ohwisey.github.io/splitlog/

## What's in this repo

- `index.html` — the whole app (HTML + CSS + JS in one file, ~280 KB)
- `LICENSE` — MIT
- `.gitignore`

That's it.

## Use it

Three options, ranked by friction:

1. **Visit the live URL** — https://ohwisey.github.io/splitlog/. Works on phone and desktop. Add to Home Screen on iOS for a fullscreen app icon.
2. **Save the file** — right-click `index.html` → Save As. Open it from your filesystem. Runs offline forever.
3. **Fork + host yourself** — fork this repo, enable GitHub Pages on `main`, and your fork's `username.github.io/splitlog/` is live in a minute.

## Embed it in your own dashboard

**One-line install** — paste this anywhere in your dashboard's HTML:

```html
<script src="https://ohwisey.github.io/splitlog/embed.js"></script>
```

That's it. The script injects the full SplitLog app — day-picker grid, logger, settings, sync — as a single dashboard section at the `<script>` tag's location. Dark-themed, full-width of its container, 20px rounded corners, no styling needed on your end.

**Want the compact "today's card" widget instead** (one card showing today's day + progress, tap to open full app)?

```html
<script src="https://ohwisey.github.io/splitlog/embed.js?widget=1"></script>
```

The widget mode auto-resizes to its content; full mode uses a fixed 720px section height — enough to comfortably show the day-picker grid and the start of the logger without scrolling.

**Prefer a raw iframe** (e.g., your CSP blocks third-party scripts)?

```html
<iframe
  src="https://ohwisey.github.io/splitlog/"
  style="display:block;width:100%;height:720px;border:0;border-radius:20px;background:#000;color-scheme:dark;">
</iframe>
```

The script-tag install is recommended — it handles the iframe styling and width/height for you, and any future fixes (auto-resize improvements, etc.) deploy automatically.

**Privacy:** Each viewer's data lives in their browser's `localStorage` scoped to `ohwisey.github.io` — fully private per-viewer, even though everyone embeds the same URL.

**Stacking multiple standalones:** Drop multiple `<script>` tags in order. Each injects its own iframe at its own location and auto-sizes independently. Everything lines up — same width, same radius, same dark theme.

```html
<script src="https://ohwisey.github.io/splitlog/embed.js"></script>
<script src="https://ohwisey.github.io/<next-standalone>/embed.js"></script>
```

Wrap them in `<div style="display:flex;flex-direction:column;gap:24px;">` for consistent spacing.

## How it works

- Pick a preset split (Push/Pull/Legs, Upper/Lower, Bro, Full Body) or build one from scratch.
- Each day is tagged Heavy / Volume / Recovery — rest times auto-tune by exercise tier (compounds get longer rest than isolation).
- Optional profile (age, gender, height, weight, training level) pre-fills sensible starting weights.
- Log sets as you train. A between-set rest timer floats above the screen.
- History is per-exercise: charts show top weight over time, with peak/avg/Δ stats and drag-to-scrub readouts.
- Cardio logs separately, with optional zone breakdown.
- Export/import as JSON. Reset wipes everything.

## Optional cloud sync

The app runs fully offline. If you want sync across devices, paste a Supabase project URL + anon key in Settings → Sync. The schema is one table:

```sql
create table app_data (
  user_id uuid not null,
  app_slug text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, app_slug, key)
);
alter table app_data enable row level security;
create policy "users own rows"
  on app_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Sign in via magic link, and your local data uploads on first sign-in. Other devices pull on sign-in. Last-write-wins.

No sync? No problem. The app is built local-first.

## License

MIT — see `LICENSE`.
