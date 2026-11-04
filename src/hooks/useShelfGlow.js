import { useEffect, useRef } from 'react';

const RADIUS = 150; // stage px around the cursor where books start to wake up
const HALO = 0.5; // how bright neighbours get (0–1) — the book under the cursor gets 1
const EASE_IN = 0.22; // per-frame catch-up when brightening (higher = faster)
const EASE_OUT = 0.04; // per-frame fade when the cursor moves away (lower = longer trail)
const POP_STIFFNESS = 0.16; // how hard the hovered book springs out
const POP_DAMPING = 0.72; // lower = more wobble before it settles

// Desktop hover: every shelf item has a "glow" between 0 (idle) and 1 (full).
// Items near the cursor glow a little, the hovered one fully, and all of them
// fade back slowly, so the cursor leaves a soft trail across the shelf.
// The hovered item also springs out of the shelf ("pop").
// Both are written as CSS variables (--glow, --pop) on the item's wrapper.
export function useShelfGlow(rootRef, enabled, scale, onEnter) {
  const api = useRef({ setHover: () => {}, setPointer: () => {} });
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    let items = [];
    let hovered = null;
    let pointer = null;
    let rectsDirty = true;
    let frame = 0;

    const collect = () => {
      const byKey = new Map();
      for (const wrap of root.querySelectorAll('.shelf-pop')) {
        const key = wrap.getAttribute('data-pop');
        if (!byKey.has(key)) {
          byKey.set(key, { key, wraps: [], els: [], glow: 0, pop: 0, vel: 0, shown: '', rect: null });
        }
        const item = byKey.get(key);
        item.wraps.push(wrap);
        item.els.push(...wrap.querySelectorAll('.shelf-item'));
      }
      items = [...byKey.values()];
      rectsDirty = true;
    };

    const measure = () => {
      for (const item of items) {
        const body = item.els.find((el) => !el.classList.contains('spine-text')) ?? item.els[0];
        item.rect = body.getBoundingClientRect();
      }
      rectsDirty = false;
    };

    const distance = (r, p) => {
      const dx = Math.max(r.left - p.x, 0, p.x - r.right);
      const dy = Math.max(r.top - p.y, 0, p.y - r.bottom);
      return Math.hypot(dx, dy);
    };

    const tick = () => {
      frame = 0;
      if (rectsDirty) measure();
      const radius = RADIUS * scale;
      let busy = false;

      for (const item of items) {
        const isHovered = item.key === hovered;
        let target = 0;
        if (isHovered) target = 1;
        else if (pointer) {
          const f = Math.max(0, 1 - distance(item.rect, pointer) / radius);
          target = HALO * f * f;
        }
        item.glow += (target - item.glow) * (target > item.glow ? EASE_IN : EASE_OUT);
        if (Math.abs(target - item.glow) < 0.002) item.glow = target;

        // Spring: overshoots a little, then settles.
        const popTarget = isHovered ? 1 : 0;
        item.vel = (item.vel + (popTarget - item.pop) * POP_STIFFNESS) * POP_DAMPING;
        item.pop += item.vel;
        if (Math.abs(item.vel) < 0.0005 && Math.abs(popTarget - item.pop) < 0.002) {
          item.pop = popTarget;
          item.vel = 0;
        }
        if (item.glow !== target || item.pop !== popTarget) busy = true;

        const shown = `${item.glow.toFixed(3)}|${item.pop.toFixed(3)}`;
        if (shown !== item.shown) {
          item.shown = shown;
          for (const wrap of item.wraps) {
            wrap.style.setProperty('--glow', item.glow.toFixed(3));
            wrap.style.setProperty('--pop', item.pop.toFixed(3));
          }
        }
      }
      if (busy) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    api.current = {
      setHover: (key) => {
        if (key === hovered) return;
        hovered = key;
        if (key) {
          // Bring the hovered item in front of its neighbours while it pops out.
          const item = items.find((i) => i.key === key);
          item?.wraps.forEach((w) => w.parentNode.appendChild(w));
          onEnterRef.current?.(key);
        }
        wake();
      },
      setPointer: (p) => {
        if (p && !pointer) collect(); // spine titles may have been added since
        pointer = p;
        wake();
      },
    };

    const onMove = () => {
      rectsDirty = true;
      wake();
    };
    collect();
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
      for (const item of items) {
        for (const wrap of item.wraps) {
          wrap.style.removeProperty('--glow');
          wrap.style.removeProperty('--pop');
        }
      }
      api.current = { setHover: () => {}, setPointer: () => {} };
    };
  }, [rootRef, enabled, scale]);

  return api;
}
