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
- **Optional cloud sync** (Supabase) — sign in once, your workouts follow you across devices

## Embedding in your own dashboard

Paste these 3 elements inside `<body>` of your dashboard's `index.html`:

```html
<section id="splitlog-root"></section>
<script src="https://ohwisey.github.io/splitlog/splitlog.bundle.js"></script>
<script>
  (function mount() {
    if (!window.OhWisey?.supabase) {
      setTimeout(mount, 100);
      return;
    }
    SplitLog.mount(document.getElementById('splitlog-root'), {
      supabaseClient: window.OhWisey.supabase,
      userId: window.OhWisey.userId,
      mode: 'embed'
    });
  })();
</script>
```

Commit → push → wait for redeploy → SplitLog appears.

**Requirements:**
- Your dashboard exposes `window.OhWisey.supabase` and `window.OhWisey.userId` (OhWisey-Starter does this by default)
- Your Supabase project has the OhWisey-Starter schema applied

The polling shim waits for `window.OhWisey.supabase` to be ready (typically <500ms after page load). Without it, `SplitLog.mount` would race the dashboard's deferred auth module and run with an undefined client.

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

### 4. Embed SplitLog inside another page

If you're building a dashboard or portal and want SplitLog as one panel inside a bigger UI, drop in the bundle. The URL stays on your page, styles don't leak in either direction, and you can hand SplitLog your existing Supabase client.

```html
<section id="splitlog-root"></section>
<script src="https://ohwisey.github.io/splitlog/splitlog.bundle.js"></script>
<script>
  SplitLog.mount(document.getElementById('splitlog-root'), {
    supabaseClient: window.MyDashboard.supabase,  // optional — uses parent's session
    userId: window.MyDashboard.userId,            // optional — explicit user id
    mode: 'embed',                                // 'embed' (default) | 'standalone'
    view: 'full',                                 // 'full' (default) | 'today'
  });
</script>
```

### Compact widget mode (`view: 'today'`)

For dashboards where SplitLog is one panel among many, pass `view: 'today'`. The bundle renders a single compact card showing the day the user should train today (resolved from the existing streak rotation logic), the day's type tag, and progress (`{logged}/{total} sets logged today`). Tapping the card expands the full 7-day grid + logger inline, with a "‹ Back to widget" affordance to collapse.

```js
SplitLog.mount(document.getElementById('splitlog-root'), {
  supabaseClient: window.MyDashboard.supabase,
  userId: window.MyDashboard.userId,
  view: 'today',
});
```

What the compact card shows:

- **Has a split, signed in** → `DAY 01 · Push heavy · HEAVY · 6 exercises · 3/22 sets logged today`
- **Rest day** → `DAY 07 · Full rest · REST · Rest day · recovery focus`
- **No split yet** → `Get started · Build your training week · tap to set up your split`
- **Configured but signed out** → compact email + magic-link prompt inline
- **Sync errors** → gear's sync dot turns amber/red; the widget itself stays usable

The gear icon stays accessible in the card's top-right corner; the sync dot lives on the gear (gray / white / amber / mint / red).

**What the bundle does**
- Defines exactly one global: `window.SplitLog` with a single `mount(rootEl, options)` method.
- Forces `rootEl.id = 'splitlog-root'` so the scoped stylesheet matches.
- Sets `rootEl.dataset.mode` to `embed` or `standalone` (affects body-level padding rules).
- Injects a single `<style id="splitlog-bundle-styles">` into `<head>` whose rules are all prefixed with `#splitlog-root` — no leakage onto your host page's elements.
- All DOM queries are scoped to the root element, so SplitLog's IDs (`split-section`, `settings-modal`, etc.) can't collide with anything on your page.

**Supabase integration**

If you pass `supabaseClient`, SplitLog skips its own SDK load, skips config discovery, and skips the sign-in UI. It reuses your client and your session. Sync starts immediately. Without `supabaseClient`, SplitLog falls back to its standalone auth (paste-URL/anon-key + magic-link in the Settings sheet) and runs local-only until configured.

**Pinning the bundle version**

Pages serves whatever is at `main`. If you want immutability for production, copy the file into your own repo or pin it to a tagged release URL.

## Where your data lives

By default, everything is in `localStorage` under the `splitlog.*` namespace. Nothing leaves your device. No analytics, no tracking, no fetch calls.

If you want backup: **Settings → Export data** downloads a JSON file. To restore on a new browser: **Settings → Import data**.

## Optional cloud sync (Supabase)

If you want your workouts to follow you across devices (laptop ↔ phone), you can wire SplitLog to your own Supabase project. Local writes always go to localStorage first; the cloud push is best-effort and silently falls back to local on network failure.

### What you need

A Supabase project with one table:

```sql
create table app_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_slug text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, app_slug, key)
);

alter table app_data enable row level security;

create policy "users read own data"
  on app_data for select using (auth.uid() = user_id);

create policy "users write own data"
  on app_data for insert with check (auth.uid() = user_id);

create policy "users update own data"
  on app_data for update using (auth.uid() = user_id);
```

Email magic-link auth is enabled by default in Supabase — no extra config needed.

### Connecting SplitLog

Two paths:

**A. Standalone (paste-it-yourself):**
1. Open SplitLog → tap the **gear icon** → see the **Sync** section
2. Paste your project URL (Supabase → Project Settings → API → Project URL)
3. Paste your **anon public key** (same page — the `anon` `public` key, NOT the `service_role` key)
4. Enter your email, tap **Send magic link**, click the link in your inbox
5. The sync dot on the gear turns mint when synced

**B. Inherited from a parent dashboard:**
If you opened SplitLog from a dashboard tile (using `window.open()`) and the dashboard has set:
```js
window.ohwisey = {
  supabaseUrl: '<your URL>',
  supabaseAnonKey: '<your anon key>',
  session: <current Supabase session object>,
};
```
SplitLog reads `window.opener?.ohwisey` and inherits both the config and the active session. No paste needed, no separate sign-in.

### Sync model (v1)

- **Offline-first.** Every change writes to localStorage instantly. Cloud push is debounced (~1s) and silent on failure.
- **Cloud wins on first sign-in.** If both local and cloud have data, cloud replaces local. Empty cloud accepts your local data.
- **Last-write-wins.** No conflict resolution beyond that. Two devices editing simultaneously: the most recent push wins. Pull-from-cloud is manual via the Sync section.
- **Auth tokens never sync.** Each device signs in independently; the access/refresh tokens stay in that device's storage.

### Sync status

The colored dot on the gear icon:

- **gray** — local only (no Supabase configured)
- **white** — configured but not signed in
- **amber** — syncing
- **mint** — synced
- **red** — error (network, auth, or schema)

### Reset and sync

**Settings → Reset all data** clears local data AND pushes the empty state to the cloud, so other devices won't restore old data on next sync. Your Supabase URL/key/session aren't touched by Reset — use **Forget config** in the Sync section if you want to remove those.

## Building the bundle

The single source of truth is `index.html`. `splitlog.bundle.js` and `splitlog.demo.bundle.js` are generated from it. Run:

```
node build-bundle.js
```

This reads `index.html`, prefixes every CSS selector with `#splitlog-root` (mapping `body`/`html` rules to `[data-mode="standalone"]`), rewrites the inline script's `document.getElementById|querySelector|querySelectorAll` calls to root-scoped helpers, wraps everything in an IIFE that defines `window.SplitLog.mount`, and writes both bundles to the repo root.

No build framework, no dependencies — just Node. Commit the regenerated bundles when shipping changes that touch CSS, JS, or body markup.

## License

MIT. Use it, fork it, rebrand it, build on top of it.
