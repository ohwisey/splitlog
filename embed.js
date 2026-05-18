/*!
 * SplitLog embed — one-line installer.
 *
 * Drop this anywhere in your dashboard's HTML:
 *
 *     <script src="https://ohwisey.github.io/splitlog/embed.js"></script>
 *
 * That's it. The script injects the full SplitLog app inline at its own
 * location, sized to fit a dashboard section, and inherits a dark theme.
 *
 * Want the compact "today's session" widget card instead of the full app?
 *
 *     <script src="https://ohwisey.github.io/splitlog/embed.js?widget=1"></script>
 *
 * The widget auto-resizes to its content; full mode uses a fixed dashboard
 * section height that comfortably fits the day-picker grid and logger.
 */
(function () {
  var SCRIPT = document.currentScript;
  if (!SCRIPT) return; // no anchor — bail rather than guess

  // Read flags off the script's own URL: e.g. ?widget=1 for compact card.
  // Default is the full app (this is what most viewers want — settings,
  // day grid, logger, all in one section).
  var src = SCRIPT.getAttribute('src') || '';
  var qs = src.split('?')[1] || '';
  var widgetMode = /(^|&)widget=1\b/.test(qs);

  var IFRAME_SRC = 'https://ohwisey.github.io/splitlog/' +
    (widgetMode ? '?view=today' : '');

  // Build the iframe. Visual contract:
  //   - full width of parent (no fixed px → adapts to any dashboard)
  //   - 20px radius matches typical dashboard cards
  //   - color-scheme:dark + black bg so no white canvas seams show through
  //   - height is initial, will be overridden by postMessage auto-resize
  var iframe = document.createElement('iframe');
  iframe.src = IFRAME_SRC;
  iframe.title = 'SplitLog';
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.style.cssText = [
    'display:block',
    'width:100%',
    'height:' + (widgetMode ? '160' : '720') + 'px',
    'border:0',
    'border-radius:20px',
    'background:#000',
    'color-scheme:dark',
    'overflow:hidden'
  ].join(';');

  // Insert RIGHT WHERE the <script> tag sits so the embed appears in flow,
  // not at the end of <body>.
  SCRIPT.parentNode.insertBefore(iframe, SCRIPT);

  // Auto-resize. The widget posts {type:'splitlog:size', h:N} when its
  // content height changes. We listen and update the iframe height.
  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (!d || d.type !== 'splitlog:size') return;
    if (e.source !== iframe.contentWindow) return; // ignore other iframes
    var h = Math.max(80, Math.min(2000, parseInt(d.h, 10) || 0));
    if (h > 0) iframe.style.height = h + 'px';
  });
})();
