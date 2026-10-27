import { memo, useLayoutEffect, useRef } from 'react';
import { SHELF_W, SHELF_H } from './shelves.js';
import { addSpineTitles } from './spines.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Symbols and letters drawn as several pieces or with gaps (“ <3 ¿? O) are
// hard to hit with the mouse or a finger, so each gets an invisible box
// that counts as the item itself. The boxes all sit in one layer at the very
// back, so a real shape (like a book next to a slanted letter) always wins.
function addHitAreas(root) {
  const svg = root.querySelector('svg');
  let layer = svg.querySelector(':scope > .hit-layer');
  if (!layer) {
    layer = document.createElementNS(SVG_NS, 'g');
    layer.setAttribute('class', 'hit-layer');
    svg.prepend(layer);
  }
  for (const wrap of root.querySelectorAll('.shelf-pop')) {
    const item = wrap.querySelector('.shelf-item');
    const key = wrap.getAttribute('data-pop');
    const needsBox = item?.tagName === 'g' || /^(glyph|letter)-/.test(key);
    if (!needsBox || layer.querySelector(`[data-key="${CSS.escape(key)}"]`)) continue;
    const box = item.getBBox();
    const rect = document.createElementNS(SVG_NS, 'rect');
    const interactive = item.classList.contains('is-interactive') ? ' is-interactive' : '';
    rect.setAttribute('class', `shelf-item hit-area${interactive}`);
    rect.setAttribute('data-key', key);
    rect.setAttribute('x', box.x);
    rect.setAttribute('y', box.y);
    rect.setAttribute('width', box.width);
    rect.setAttribute('height', box.height);
    rect.setAttribute('fill', 'transparent');
    layer.appendChild(rect);
  }
}

// The SVG is injected once and never re-rendered, so the lit/unlit classes
// that Home toggles directly on the DOM are not wiped out by React.
export const Shelf = memo(function Shelf({ shelf }) {
  const ref = useRef(null);
  const [left, top] = shelf.offset;

  useLayoutEffect(() => {
    const root = ref.current;
    addHitAreas(root);
    // Load the spine font first so the titles are measured at their real width
    // (the browser wouldn't fetch it until some text actually uses it).
    let alive = true;
    const draw = () => {
      if (!alive) return;
      // Measured with a stand-in font, titles come out too thick and too
      // short — so if Oswald wasn't ready yet, measure them again once it is.
      root.querySelectorAll('.spine-text').forEach((t) => t.remove());
      addSpineTitles(root);
    };
    document.fonts
      .load('600 10px Oswald')
      .catch(() => {})
      .then(() => {
        const ready = document.fonts.check('600 10px Oswald');
        draw();
        if (!ready) document.fonts.ready.then(draw);
      });
    // Also when any font finishes loading late (slow phone connections).
    document.fonts.addEventListener?.('loadingdone', draw);
    return () => {
      alive = false;
      document.fonts.removeEventListener?.('loadingdone', draw);
    };
  }, []);

  return (
    <div className="shelf" data-shelf={shelf.no} style={{ width: SHELF_W, height: SHELF_H }}>
      <div ref={ref} className="shelf-items" style={{ left, top }} dangerouslySetInnerHTML={{ __html: shelf.html }} />
    </div>
  );
});
