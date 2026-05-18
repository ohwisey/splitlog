/*!
 * SplitLog embed — one-line installer.
 *
 * Drop this anywhere in your dashboard's HTML:
 *
 *     <script src="https://ohwisey.github.io/splitlog/embed.js"></script>
 *
 * That's it. The script injects a SplitLog widget iframe at its own location,
 * auto-resizes it to fit content, and inherits a dark theme.
 *
 * Want the full app inline (not just the widget card)? Pass ?full=1:
 *
 *     <script src="https://ohwisey.github.io/splitlog/embed.js?full=1"></script>
 */
(function () {
  var SCRIPT = document.currentScript;
  if (!SCRIPT) return; // no anchor — bail rather than guess

  // Read flags off the script's own URL: e.g. ?full=1 to load the full app.
  var src = SCRIPT.getAttribute('src') || '';
  var qs = src.split('?')[1] || '';
  var fullMode = /(^|&)full=1\b/.test(qs);

  var IFRAME_SRC = 'https://ohwisey.github.io/splitlog/' +
    (fullMode ? '' : '?view=today');

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
    'height:' + (fullMode ? '720' : '160') + 'px',
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
