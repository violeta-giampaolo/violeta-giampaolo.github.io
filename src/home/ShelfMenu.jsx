import { useLayoutEffect, useRef } from 'react';
import { categories, shelfLinks } from '../content/shelfLinks.js';
import { projects } from '../content/projects.js';

// Only categories with something in them (e.g. 'spaces' appears once it has a project).
const shown = categories.filter((c) => projects.some((p) => p.category === c) || shelfLinks.some((l) => l.category === c));
import { sfx } from '../sound/sfx.js';

const BASE = 11; // px the menu is measured at

// The category menu above the left shelf (Figma "Group 1").
// Its text is sized so the menu runs exactly from one edge of the shelf to
// the other (`width`). Clicking a category filters the shelf; clicking it
// again clears it.
export function ShelfMenu({ active, onPick, width, className = '', style }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      // Two passes: the thin dividers don't grow with the text, so the second
      // pass corrects for them. scrollWidth ignores the stage's scaling.
      let size = BASE;
      for (let i = 0; i < 2; i++) {
        el.style.fontSize = `${size}px`;
        const natural = el.scrollWidth;
        if (!natural) return;
        size *= width / natural;
      }
      el.style.fontSize = `${size}px`;
      // Safety net: never wider than the shelf (rounding, font fallbacks…)
      for (let i = 0; i < 20 && el.scrollWidth > width; i++) {
        size *= 0.99;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    document.fonts.load(`400 ${BASE}px "DM Mono"`).then(fit, fit);
    document.fonts.load(`500 ${BASE}px "DM Mono"`).then(fit, fit);
    return () => {
      alive = false;
    };
  }, [width]);

  return (
    <nav ref={ref} className={`shelf-menu ${className}`} aria-label="Filter the shelf" style={style}>
      {shown.map((c, i) => (
        <span key={c} className="shelf-menu__item">
          {i > 0 && <span className="shelf-menu__rule" aria-hidden="true" />}
          <button
            type="button"
            aria-pressed={active === c}
            onMouseEnter={sfx.hover}
            onClick={() => {
              sfx.click();
              onPick(active === c ? null : c);
            }}
          >
            {/* The bold copy holds the width, so the menu never shifts on hover */}
            <span className="shelf-menu__label" data-text={c}>
              {c}
            </span>
          </button>
        </span>
      ))}
    </nav>
  );
}
