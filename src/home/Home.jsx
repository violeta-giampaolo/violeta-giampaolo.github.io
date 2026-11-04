import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMediaQuery, useViewport } from '../hooks/useMediaQuery.js';
import { useElasticEdges } from '../hooks/useElasticEdges.js';
import { useShelfGlow } from '../hooks/useShelfGlow.js';
import { sfx } from '../sound/sfx.js';
import { shelves, targets, SHELF_W, SHELF_H } from './shelves.js';
import { Shelf } from './Shelf.jsx';
import { SilhouetteQuote } from './SilhouetteQuote.jsx';
import { SiteTitle } from './SiteTitle.jsx';
import { ShelfMenu } from './ShelfMenu.jsx';
// Staircase drawing from Illustrator. BG-01…03 are other colourways.
import bgDrawingUrl from '../assets/home/backgrounds/BG-04.svg';
import bgDrawing from '../assets/home/backgrounds/BG-04.svg?raw';

const STAGE_W = 1440;
const STAGE_H = 900; // the Figma frame; scaled to the window width
const SHELF_CENTER_Y = (148 + 756) / 2; // middle of menu + shelves in the Figma frame
const PHONE_GAP = 5;
const PHONE_TOP = 135;
const PHONE_BOTTOM = 45;

function itemsOf(root, key) {
  return root.querySelectorAll(`[data-key="${CSS.escape(key)}"]`);
}

// Every shelf item in reading order: shelf by shelf, then left to right.
// `at` is a position on the page that grows left→right within a shelf and
// top→bottom between shelves, used for the scroll sweep on phones.
function readingOrder(root) {
  const order = [];
  for (const shelf of root.querySelectorAll('.shelf')) {
    const s = shelf.getBoundingClientRect();
    const keys = new Map();
    for (const el of shelf.querySelectorAll('.shelf-item:not(.spine-text)')) {
      const key = el.getAttribute('data-key');
      const left = el.getBoundingClientRect().left;
      keys.set(key, Math.min(keys.get(key) ?? Infinity, left));
    }
    [...keys]
      .sort((a, b) => a[1] - b[1])
      .forEach(([key, left]) => {
        const across = Math.max(0, (left - s.left) / s.width);
        order.push({ key, at: s.top + window.scrollY + across * s.height });
      });
  }
  return order;
}

function setClass(els, name, on) {
  els.forEach((el) => el.classList.toggle(name, on));
}

export function Home({ onOpen, onFilter, paused = false }) {
  const rootRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 900px) and (min-aspect-ratio: 1/1)');
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const { w, h: vh } = useViewport();

  // Desktop: the Figma frame always fills the full width; if that makes it
  // taller than the window, the page scrolls. Phone: shelves fill the width.
  // Desktop: the Figma frame fills the width — unless the window is so wide
  // and short that the shelf wouldn't fit, then it shrinks to fit the height.
  const scale = isDesktop ? Math.min(w / STAGE_W, (vh - 48) / (756 - 115)) : Math.min((w - 26) / SHELF_W, 1.6);
  const elasticY = useElasticEdges(isDesktop && canHover && !paused);
  // Centre the bookshelf (menu → bottom shelf, Figma y 148–756) on the screen.
  const stageTop = vh / 2 - SHELF_CENTER_Y * scale;

  // While something is open on top (a book, the wallet, the projector…), the
  // page behind it stays still: no scrolling, no bounce.
  useEffect(() => {
    if (!paused) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [paused]);
  const glow = useShelfGlow(rootRef, canHover, scale, sfx.hover);

  // Touch screens: no hover, so the books light up in reading order instead.
  // Phone layout follows the scroll; desktop layout on a tablet sweeps once on load.
  useEffect(() => {
    if (canHover) return;
    const root = rootRef.current;
    let order = readingOrder(root);
    // Looked up each time so spine titles added later light up too.
    const sweep = (key, on) => setClass(itemsOf(root, key), 'is-swept', on);
    const clear = () => order.forEach(({ key }) => sweep(key, false));

    if (isDesktop) {
      const timers = order.map(({ key }, i) => setTimeout(() => sweep(key, true), 400 + i * 30));
      return () => {
        timers.forEach(clearTimeout);
        clear();
      };
    }

    // A line travels from the top of the screen (not scrolled) to the bottom
    // of the page (fully scrolled); every book it has passed is lit.
    const update = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const progress = range > 0 ? Math.min(1, window.scrollY / range) : 1;
      const line = window.scrollY + window.innerHeight * progress;
      order.forEach(({ key, at }) => sweep(key, progress >= 1 || at <= line));
    };
    const onResize = () => {
      order = readingOrder(root);
      update();
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      clear();
    };
  }, [canHover, isDesktop]);

  // Category filter: everything outside the chosen category turns light grey
  // and goes quiet. Clicking anywhere but a coloured item clears it.
  const [filter, setFilter] = useState(null);
  useEffect(() => onFilter?.(filter), [filter, onFilter]);
  useEffect(() => {
    const root = rootRef.current;
    for (const wrap of root.querySelectorAll('.shelf-pop')) {
      const category = targets.get(wrap.getAttribute('data-pop'))?.category;
      wrap.classList.toggle('is-dimmed', !!filter && category !== filter);
    }
    for (const box of root.querySelectorAll('.hit-area')) {
      const category = targets.get(box.getAttribute('data-key'))?.category;
      box.classList.toggle('is-dimmed', !!filter && category !== filter);
    }
  }, [filter, isDesktop]);
  const isDimmed = (e) => !!e.target.closest?.('.is-dimmed');

  // Every item lights up on hover; only items with a project or link open something.
  const keyFrom = (e, selector) =>
    isDimmed(e) ? null : (e.target.closest?.(selector)?.getAttribute('data-key') ?? null);

  const handlers = {
    onMouseOver: canHover ? (e) => glow.current.setHover(keyFrom(e, '.shelf-item')) : undefined,
    onMouseMove: canHover ? (e) => glow.current.setPointer({ x: e.clientX, y: e.clientY }) : undefined,
    onMouseLeave: canHover
      ? () => {
          glow.current.setHover(null);
          glow.current.setPointer(null);
        }
      : undefined,
    onClick: (e) => {
      if (e.target.closest?.('.shelf-menu')) return;
      const key = keyFrom(e, '.is-interactive');
      if (key) onOpen(targets.get(key));
      else if (filter && !keyFrom(e, '.shelf-item')) setFilter(null);
    },
    onKeyDown: (e) => {
      const key = keyFrom(e, '.is-interactive');
      if (key && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onOpen(targets.get(key));
      }
    },
  };

  const touchClass = canHover ? '' : ' home--touch';

  if (isDesktop) {
    return (
      <main className={`home home--desktop${touchClass}`} ref={rootRef} {...handlers}>
        <motion.div
          className="stage-frame"
          style={{ width: STAGE_W * scale, height: STAGE_H * scale, top: stageTop, left: (w - STAGE_W * scale) / 2, y: elasticY }}
        >
          <div className="stage" style={{ transform: `scale(${scale})` }}>
            <img className="stage-bg" src={bgDrawingUrl} alt="" />
            <SilhouetteQuote drawing={bgDrawing} />
            <SiteTitle className="site-title--desktop" />
            <ShelfMenu className="shelf-menu--desktop" width={SHELF_W} active={filter} onPick={setFilter} />
            <div className="bookshelf bookshelf--grid">
              {shelves.map((shelf) => (
                <Shelf key={shelf.no} shelf={shelf} />
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  const stackH = shelves.length * SHELF_H + (shelves.length - 1) * PHONE_GAP;
  return (
    <main className={`home home--phone${touchClass}`} ref={rootRef} {...handlers}>
      <div className="phone-title" style={{ width: SHELF_W * scale, height: PHONE_TOP * scale, '--s': scale }}>
        <SiteTitle className="site-title--phone" />
      </div>
      <ShelfMenu className="shelf-menu--phone" width={SHELF_W * scale} active={filter} onPick={setFilter} />
      <div
        className="phone-stack"
        style={{
          width: SHELF_W * scale,
          height: stackH * scale,
          marginBottom: PHONE_BOTTOM * scale,
        }}
      >
        <div className="bookshelf bookshelf--column" style={{ transform: `scale(${scale})`, gap: PHONE_GAP }}>
          {shelves.map((shelf) => (
            <Shelf key={shelf.no} shelf={shelf} />
          ))}
        </div>
      </div>
    </main>
  );
}
