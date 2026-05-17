#!/usr/bin/env node
/**
 * build-bundle.js — produces splitlog.bundle.js (and splitlog.demo.bundle.js)
 * from index.html.
 *
 * The bundle exposes `window.SplitLog.mount(rootEl, options)` so SplitLog can
 * be embedded inside another page without leaking styles or globals.
 *
 *   options:
 *     supabaseClient?: <parent's @supabase/supabase-js client>
 *     userId?: string
 *     mode?: 'embed' | 'standalone'   (default 'embed')
 *     view?: 'full' | 'today'         (default 'full')
 *       - 'full'  → 7-day grid + logger (standalone-equivalent UI)
 *       - 'today' → compact "today's day" card; taps expand inline to full UI
 *
 * Pipeline:
 *   1. Read index.html.
 *   2. Pull out <style> blocks, <body> markup, and the inline <script> body.
 *   3. Scope every CSS selector under `#splitlog-root`. `body`/`html` rules
 *      apply only in standalone mode via `[data-mode="standalone"]`.
 *      Recurses into `@media`/`@supports`/`@container` blocks. Leaves
 *      `@keyframes`/`@font-face` alone.
 *   4. Rewrite `document.getElementById|querySelector|querySelectorAll(` in
 *      the JS to `$byId|$query|$queryAll(` (defined inside the mount closure).
 *   5. Wrap everything in an IIFE that defines `window.SplitLog.mount`.
 *
 * Output files (repo root):
 *   - splitlog.bundle.js       — DEMO_MODE=false (real-user variant)
 *   - splitlog.demo.bundle.js  — DEMO_MODE=true  (seeded screen-grab variant)
 *
 * Run: `node build-bundle.js`
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT      = __dirname;
const SRC_HTML  = path.join(ROOT, 'index.html');
const OUT       = path.join(ROOT, 'splitlog.bundle.js');
const OUT_DEMO  = path.join(ROOT, 'splitlog.demo.bundle.js');
const OUT_EMBED = path.join(ROOT, 'embed.js');

const ROOT_ID   = 'splitlog-root';
const ROOT_SEL  = '#' + ROOT_ID;
const EMBED_SEL = '[data-module-id="splitlog"]';

// ──────────────────────────────────────────────────────────────────────────
// HTML extraction
// ──────────────────────────────────────────────────────────────────────────

function extractAllStyles(html) {
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks.join('\n\n');
}

function extractInlineScript(html) {
  // First inline <script> without src= — that's our app code.
  const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/;
  const m = re.exec(html);
  return m ? m[1] : '';
}

function extractBodyMarkup(html) {
  const m = /<body\b[^>]*>([\s\S]*?)<\/body>/.exec(html);
  if (!m) return '';
  let body = m[1];
  // Drop every <script> — we extracted them, they re-run inside mount().
  body = body.replace(/<script\b[\s\S]*?<\/script>/g, '');
  // Drop <style> in body too, just in case.
  body = body.replace(/<style\b[\s\S]*?<\/style>/g, '');
  return body.trim();
}

// ──────────────────────────────────────────────────────────────────────────
// CSS scoping
// ──────────────────────────────────────────────────────────────────────────

function scopeCss(css, rootSel) {
  const out = [];
  let i = 0;
  const n = css.length;

  function skipWsAndComments() {
    while (i < n) {
      const c = css[i];
      if (c === '/' && css[i + 1] === '*') {
        const e = css.indexOf('*/', i + 2);
        i = e < 0 ? n : e + 2;
      } else if (/\s/.test(c)) {
        i++;
      } else break;
    }
  }

  function readUntilOpenOrSemi() {
    const start = i;
    let strChar = null;
    let parenDepth = 0;
    while (i < n) {
      const c = css[i];
      if (strChar) {
        if (c === '\\' && i + 1 < n) { i += 2; continue; }
        if (c === strChar) strChar = null;
        i++; continue;
      }
      if (c === '"' || c === "'") { strChar = c; i++; continue; }
      if (c === '/' && css[i + 1] === '*') {
        const e = css.indexOf('*/', i + 2);
        i = e < 0 ? n : e + 2; continue;
      }
      if (c === '(') { parenDepth++; i++; continue; }
      if (c === ')') { parenDepth--; i++; continue; }
      if (parenDepth === 0 && (c === '{' || c === ';')) break;
      i++;
    }
    return css.slice(start, i);
  }

  function readBlock() {
    // css[i] === '{' — return content without braces, advance past closing '}'.
    if (css[i] !== '{') return '';
    i++;
    const start = i;
    let depth = 1;
    let strChar = null;
    while (i < n) {
      const c = css[i];
      if (strChar) {
        if (c === '\\' && i + 1 < n) { i += 2; continue; }
        if (c === strChar) strChar = null;
        i++; continue;
      }
      if (c === '"' || c === "'") { strChar = c; i++; continue; }
      if (c === '/' && css[i + 1] === '*') {
        const e = css.indexOf('*/', i + 2);
        i = e < 0 ? n : e + 2; continue;
      }
      if (c === '{') { depth++; i++; continue; }
      if (c === '}') {
        depth--;
        if (depth === 0) { const end = i; i++; return css.slice(start, end); }
        i++; continue;
      }
      i++;
    }
    return css.slice(start, i);
  }

  while (i < n) {
    skipWsAndComments();
    if (i >= n) break;

    const prelude = readUntilOpenOrSemi();
    if (i >= n) break;

    if (css[i] === ';') {
      // Statement at-rule (@import, @charset, @namespace).
      out.push(prelude.trim() + ';');
      i++;
      continue;
    }

    // css[i] === '{'
    const block = readBlock();
    const trimmedPrelude = prelude.trim();

    if (trimmedPrelude.startsWith('@')) {
      const nameMatch = trimmedPrelude.match(/^@[a-zA-Z-]+/);
      const atName = nameMatch ? nameMatch[0].toLowerCase() : '@';
      if (atName === '@media' || atName === '@supports' ||
          atName === '@container' || atName === '@document' ||
          atName === '@layer') {
        out.push(trimmedPrelude + ' {\n' + scopeCss(block, rootSel) + '\n}');
      } else {
        // @keyframes / @font-face / @page / @counter-style / @property — leave alone
        out.push(trimmedPrelude + ' {' + block + '}');
      }
    } else {
      out.push(scopeSelectorList(trimmedPrelude, rootSel) + ' {' + block + '}');
    }

    out.push('\n');
  }

  return out.join('');
}

function scopeSelectorList(selList, rootSel) {
  // Split on commas at depth 0 (ignore commas inside (), [], strings).
  const parts = [];
  let depth = 0;
  let last = 0;
  let strChar = null;
  for (let j = 0; j < selList.length; j++) {
    const c = selList[j];
    if (strChar) {
      if (c === '\\' && j + 1 < selList.length) { j++; continue; }
      if (c === strChar) strChar = null;
      continue;
    }
    if (c === '"' || c === "'") { strChar = c; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(selList.slice(last, j));
      last = j + 1;
    }
  }
  parts.push(selList.slice(last));
  return parts.map(p => scopeOneSelector(p.trim(), rootSel)).join(', ');
}

function scopeOneSelector(sel, rootSel) {
  if (!sel) return sel;

  // Bare element/root selectors — map to standalone-mode root.
  if (sel === 'html' || sel === 'body') {
    return rootSel + '[data-mode="standalone"]';
  }
  if (sel === ':root') return rootSel;
  if (sel === '*') return rootSel + ', ' + rootSel + ' *';

  // Compound selectors that start with `html` or `body` — convert prefix.
  if (/^html\b/.test(sel)) {
    return sel.replace(/^html\b/, rootSel + '[data-mode="standalone"]');
  }
  if (/^body\b/.test(sel)) {
    return sel.replace(/^body\b/, rootSel + '[data-mode="standalone"]');
  }

  // Default: nest under root.
  return rootSel + ' ' + sel;
}

// ──────────────────────────────────────────────────────────────────────────
// JS scoping
// ──────────────────────────────────────────────────────────────────────────

function scopeJs(js) {
  return js
    .replace(/\bdocument\.getElementById\(/g, '$byId(')
    .replace(/\bdocument\.querySelectorAll\(/g, '$queryAll(')
    .replace(/\bdocument\.querySelector\(/g, '$query(');
}

function flipDemoMode(js, demo) {
  if (!demo) return js;
  // index.html has: `const DEMO_MODE        = false; // template.html — no demo seed`
  return js.replace(
    /const DEMO_MODE\s+=\s+false;\s*\/\/[^\n]*/,
    'const DEMO_MODE        = true;  // demo bundle — seeded sample data'
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Bundle wrapper
// ──────────────────────────────────────────────────────────────────────────

function buildBundle(opts) {
  const html = fs.readFileSync(SRC_HTML, 'utf8');
  const cssRaw = extractAllStyles(html);
  const jsRaw  = extractInlineScript(html);
  const body   = extractBodyMarkup(html);

  const scopedCss = scopeCss(cssRaw, ROOT_SEL);
  const scopedJs  = scopeJs(flipDemoMode(jsRaw, !!opts.demo));

  return wrap(scopedCss, scopedJs, body);
}

// position: fixed escapes the container and floats over the viewport — not
// allowed in OhWisey modules. Swap to absolute so the modals/toasts stay
// inside the container (which mount() forces to position: relative).
function fixedToAbsolute(css) {
  return css.replace(/position:\s*fixed/g, 'position: absolute');
}

function buildEmbed() {
  const html = fs.readFileSync(SRC_HTML, 'utf8');
  const cssRaw = extractAllStyles(html);
  const jsRaw  = extractInlineScript(html);
  const body   = extractBodyMarkup(html);

  // The source CSS now references --ohw-* variables directly with refined
  // fallbacks (green-500 accent, #0d0d0d card bg, 12px radius), so no var
  // prelude and no accent-rewrap step is needed here — the host's
  // --ohw-* declarations cascade into the embed automatically.
  let scopedCss = scopeCss(cssRaw, EMBED_SEL);
  scopedCss = fixedToAbsolute(scopedCss);
  // Clip at the container so any tile-selection glow that extends past
  // splitlog's bounds gets cut at the host card's rounded border instead
  // of bleeding into the surrounding dashboard. border-radius: inherit
  // picks up the host card's curve so the clip follows the visible edge,
  // not a hard rectangle inside it.
  scopedCss += `\n${EMBED_SEL} { overflow: hidden; border-radius: inherit; }\n`;

  const scopedJs = scopeJs(jsRaw);

  return wrapEmbed(scopedCss, scopedJs, body);
}

function wrapEmbed(scopedCss, scopedJs, bodyMarkup) {
  const CSS_LIT  = JSON.stringify(scopedCss);
  const HTML_LIT = JSON.stringify(bodyMarkup);

  return `/*! splitlog embed.js — OhWisey standalone module
 * Generated by build-bundle.js from index.html. Do not edit by hand.
 *
 * Drop a single tag just before </body> in your OhWisey dashboard:
 *
 *   <script src="https://splitlog.vercel.app/embed.js"></script>
 *
 * embed.js polls window.OhWisey.registerModule (50ms × 100 = 5s window),
 * then registers the module. The dashboard owns the container; splitlog
 * renders inside it, themed by --ohw-* CSS variables.
 */
(function () {
  'use strict';

  const MODULE_ID    = 'splitlog';
  const SPLITLOG_CSS = ${CSS_LIT};
  const SPLITLOG_HTML = ${HTML_LIT};

  let _attempts = 0;
  const MAX_ATTEMPTS = 100; // 50ms × 100 = 5s

  function waitForOhWisey() {
    if (window.OhWisey && typeof window.OhWisey.registerModule === 'function') {
      register();
      return;
    }
    if (++_attempts > MAX_ATTEMPTS) {
      console.error('[splitlog] OhWisey dashboard API not detected — is this loaded inside an OhWisey dashboard?');
      return;
    }
    setTimeout(waitForOhWisey, 50);
  }

  function register() {
    window.OhWisey.registerModule({
      id: MODULE_ID,
      mount: function (container) {
        if (!container || !(container instanceof Element)) {
          console.error('[splitlog] mount called without a valid container element');
          return;
        }
        // Container becomes the positioned ancestor for inline-absolute
        // modals/toasts/popovers — keeps the module inside its box.
        try {
          if (window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
          }
        } catch (e) {}
        container.setAttribute('data-module-id', MODULE_ID);
        container.setAttribute('data-mode', 'embed');
        renderInto(container);
      },
    });
  }

  function renderInto(container) {
    // Inject scoped stylesheet inside the container — never into <head>.
    if (!container.querySelector('style[data-module-styles="' + MODULE_ID + '"]')) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-module-styles', MODULE_ID);
      styleEl.textContent = SPLITLOG_CSS;
      container.appendChild(styleEl);
    }

    // Inject markup as children of the container.
    const surface = document.createElement('div');
    surface.innerHTML = SPLITLOG_HTML;
    while (surface.firstChild) container.appendChild(surface.firstChild);

    // ── Per-mount closures consumed by the app code ───────────────────────
    const __SPLITLOG_SUPABASE_CLIENT__ = (window.OhWisey && window.OhWisey.supabase) || null;
    const __SPLITLOG_USER_ID__         = (window.OhWisey && window.OhWisey.userId)   || null;
    const __SPLITLOG_MODE__            = 'embed';
    const __SPLITLOG_VIEW__            = 'full';

    const $root = container;
    const $byId = function (id) {
      return $root.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
    };
    const $query    = function (sel) { return $root.querySelector(sel); };
    const $queryAll = function (sel) { return $root.querySelectorAll(sel); };

    // ── BEGIN app code (container-scoped) ────────────────────────────────
${scopedJs}
    // ── END app code ─────────────────────────────────────────────────────
  }

  waitForOhWisey();
})();
`;
}

function wrap(scopedCss, scopedJs, bodyMarkup) {
  // Embed the CSS / HTML as JSON-encoded strings so any characters survive.
  const CSS_LIT  = JSON.stringify(scopedCss);
  const HTML_LIT = JSON.stringify(bodyMarkup);

  return `/*! splitlog.bundle.js — embeddable workout split tracker
 * Generated by build-bundle.js from index.html. Do not edit by hand.
 *
 * Usage:
 *   <section id="splitlog-root"></section>
 *   <script src="splitlog.bundle.js"></script>
 *   <script>
 *     SplitLog.mount(document.getElementById('splitlog-root'), {
 *       supabaseClient: window.MyDashboard.supabase,  // optional
 *       userId: window.MyDashboard.userId,            // optional
 *       mode: 'embed',                                // 'embed' | 'standalone'
 *       view: 'today',                                // 'full' | 'today'
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  const SPLITLOG_CSS = ${CSS_LIT};
  const SPLITLOG_HTML = ${HTML_LIT};

  let _mounted = false;

  function mount(rootEl, options) {
    if (_mounted) {
      console.warn('SplitLog.mount: already mounted. Multiple instances on one page are not supported.');
      return;
    }
    if (!rootEl || !(rootEl instanceof Element)) {
      throw new Error('SplitLog.mount: pass an Element as the first argument.');
    }
    options = options || {};
    if (options.view != null && options.view !== 'full' && options.view !== 'today') {
      console.warn("SplitLog.mount: options.view must be 'full' or 'today'; got " + JSON.stringify(options.view) + " — falling back to 'full'.");
      options.view = 'full';
    }
    _mounted = true;

    // Force the root to be addressable by the scoped stylesheet.
    rootEl.id = '${ROOT_ID}';
    rootEl.setAttribute('data-mode', options.mode === 'standalone' ? 'standalone' : 'embed');

    // Inject scoped styles once.
    if (!document.getElementById('splitlog-bundle-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'splitlog-bundle-styles';
      styleEl.textContent = SPLITLOG_CSS;
      document.head.appendChild(styleEl);
    }

    // Inject markup.
    rootEl.innerHTML = SPLITLOG_HTML;

    // Variables consumed by the app code (declared inside this closure so
    // the source's typeof guards resolve correctly).
    const __SPLITLOG_SUPABASE_CLIENT__ = options.supabaseClient || null;
    const __SPLITLOG_USER_ID__         = options.userId || null;
    const __SPLITLOG_MODE__            = options.mode === 'standalone' ? 'standalone' : 'embed';
    const __SPLITLOG_VIEW__            = options.view === 'today' ? 'today' : 'full';

    // Root-scoped DOM query helpers used by the transformed app code.
    const $root = rootEl;
    const $byId = function (id) {
      return $root.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
    };
    const $query = function (sel) { return $root.querySelector(sel); };
    const $queryAll = function (sel) { return $root.querySelectorAll(sel); };

    // ── BEGIN app code (scoped) ────────────────────────────────────────────
${scopedJs}
    // ── END app code ───────────────────────────────────────────────────────
  }

  global.SplitLog = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

function main() {
  const bundle = buildBundle({ demo: false });
  fs.writeFileSync(OUT, bundle);
  console.log('wrote', path.relative(ROOT, OUT), '·', (bundle.length / 1024).toFixed(1) + ' KB');

  const demoBundle = buildBundle({ demo: true });
  fs.writeFileSync(OUT_DEMO, demoBundle);
  console.log('wrote', path.relative(ROOT, OUT_DEMO), '·', (demoBundle.length / 1024).toFixed(1) + ' KB');

  const embedBundle = buildEmbed();
  fs.writeFileSync(OUT_EMBED, embedBundle);
  console.log('wrote', path.relative(ROOT, OUT_EMBED), '·', (embedBundle.length / 1024).toFixed(1) + ' KB');
}

main();
