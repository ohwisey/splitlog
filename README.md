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

That's it. The script injects a SplitLog widget where the `<script>` tag sits, auto-sizes to its content (empty state, day card, completed — every state fits perfectly), and inherits a dark theme. No CSS to write, no height to guess, no styling to break.

**Want the full app inline** (day-picker grid + logger, not the compact card)?

```html
<script src="https://ohwisey.github.io/splitlog/embed.js?full=1"></script>
```

**Prefer a raw iframe** (e.g., your CSP blocks third-party scripts)?

```html
<iframe
  src="https://ohwisey.github.io/splitlog/?view=today"
  style="display:block;width:100%;height:160px;border:0;border-radius:20px;background:#000;color-scheme:dark;">
</iframe>
```

You lose auto-resize with this path — you'll have to pick a height yourself. The script-tag install is recommended.

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
