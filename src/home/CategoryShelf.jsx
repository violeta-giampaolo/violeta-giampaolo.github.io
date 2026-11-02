import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { COVER_RATIO, CoverArt, SpineTitle } from '../book/Book3D.jsx';
import { projects } from '../content/projects.js';
import { shelfLinks } from '../content/shelfLinks.js';
import { useMediaQuery, useViewport } from '../hooks/useMediaQuery.js';
import { useShelfGlow } from '../hooks/useShelfGlow.js';
import { sfx } from '../sound/sfx.js';
import { ShelfMenu } from './ShelfMenu.jsx';
import { SiteTitle } from './SiteTitle.jsx';
import { targets } from './shelves.js';
import projectorUrl from '../assets/home/projector.svg';

// One category on a single shelf (Figma ".projects" and ".projects phone"):
// the title, the filter under it, and that category's books standing in a row.

// Desktop, in the Figma frame's 1440 × 900 space.
const STAGE_W = 1440;
const STAGE_H = 900;
const SHELF_TOP = 722.8; // the books stand on this line
const ROW_W = 1241.5; // widest the row of books can be
const GAP = 7;
// The spines she drew, [width, height], used in turn.
const SPINES = [
  [84.6, 336.9], [84.6, 392], [76.5, 354.1], [87.4, 409.4], [78.4, 394], [91.4, 426.6], [85.3, 387.8],
  [67, 348.3], [90.9, 408.1], [75, 367.5], [90.2, 421.6], [82, 382.8], [72.3, 343.4], [84.6, 393.7],
];

// Phone, in the Figma frame's 458px width: three covers per shelf.
const PHONE_W = 458;
const PER_ROW = 3;
const COVERS = [
  [94, 126], [99, 146], [89, 132], [95, 153], [105, 148], [108, 160], [99, 145],
  [96, 130], [105, 153], [94, 137], [106, 158], [93, 143], [94, 129], [101, 147],
];
const COVER_MAX_W = 112;

// A category's books, plus the projector for side quests (it isn't a book,
// but it lives on the shelf with them).
function itemsOf(category) {
  const books = projects.filter((p) => p.shelfBook && p.category === category).map((project) => ({ key: project.shelfBook, project }));
  const objects = shelfLinks
    .filter((l) => l.category === category && l.startsWith.startsWith('object-'))
    .map((l) => ({ key: l.startsWith, object: true, label: l.label }));
  return [...books, ...objects];
}

// Covers keep their real shape if they have one; binders use the shape she drew.
function coverSize(project, i) {
  const [w, h] = COVERS[i % COVERS.length];
  const aspect =
    project.type === 'book' ? project.aspect : project.type === 'dvd' ? 135 / 190 : project.type === 'magazine' ? project.pageAspect : null;
  if (!aspect) return { width: w, height: h };
  const width = Math.min(h * (aspect ?? COVER_RATIO), COVER_MAX_W);
  return { width, height: width / aspect };
}

const spineTitleOf = (p) => p.spine?.title || p.title;

function open(item, onOpen) {
  onOpen(item.object ? targets.get(item.key) : targets.get(item.project.shelfBook));
}

// Desktop: every book has its own fixed spot, because the hover effect moves
// the hovered book to the end of the list to draw it in front of the others.
function SpineRow({ items, onOpen, canHover, scale }) {
  const root = useRef(null);
  const glow = useShelfGlow(root, canHover, scale, sfx.hover);

  const sizes = items.map((item, i) => (item.object ? [270, 155] : SPINES[i % SPINES.length]));
  const natural = sizes.reduce((sum, [w]) => sum + w, 0) + GAP * (items.length - 1);
  const k = Math.min(1, ROW_W / natural); // lots of books: thinner spines
  let x = (STAGE_W - natural * k) / 2;

  const keyFrom = (e) => e.target.closest?.('.shelf-pop')?.getAttribute('data-pop') ?? null;

  return (
    <div
      className="cat-spines"
      ref={root}
      onMouseOver={canHover ? (e) => glow.current.setHover(keyFrom(e)) : undefined}
      onMouseMove={canHover ? (e) => glow.current.setPointer({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseLeave={
        canHover
          ? () => {
              glow.current.setHover(null);
              glow.current.setPointer(null);
            }
          : undefined
      }
    >
      {items.map((item, i) => {
        const [w, h] = sizes[i];
        const width = item.object ? w : w * k;
        const left = x;
        x += (item.object ? w : w * k) + GAP * k;
        const style = { left, width, height: h, top: SHELF_TOP - h, '--enter': `${i * 28}ms` };
        return (
          <div key={item.key} className="shelf-pop cat-pop" data-pop={item.key} style={style}>
            {item.object ? (
              <button type="button" className="shelf-item cat-object" aria-label={item.label} onClick={() => open(item, onOpen)}>
                <img src={projectorUrl} alt="" draggable="false" />
              </button>
            ) : (
              <button
                type="button"
                className="shelf-item cat-book"
                data-book={item.key}
                data-view="spine"
                aria-label={item.project.title}
                style={{ background: item.project.color }}
                onClick={() => open(item, onOpen)}
              >
                <SpineTitle
                  text={spineTitleOf(item.project)}
                  color={item.project.spine?.color ?? '#fff'}
                  stack={!!item.project.spine?.stack}
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Phone: covers instead of spines, rising into place as you scroll to them
// (a phone can't hover, so this stands in for the hover animation).
function CoverRows({ items, onOpen, scale }) {
  const rows = [];
  for (let i = 0; i < items.length; i += PER_ROW) rows.push(items.slice(i, i + PER_ROW));

  return (
    <div className="cat-rows" style={{ '--s': scale }}>
      {rows.map((row, r) => (
        <div key={r} className="cat-row">
          <div className="cat-row__books">
            {row.map((item, c) => {
              const i = r * PER_ROW + c;
              const size = item.object ? { width: 150, height: 86 } : coverSize(item.project, i);
              return (
                <motion.div
                  key={item.key}
                  className="shelf-pop cat-pop--cover"
                  data-pop={item.key}
                  style={{ width: size.width * scale, height: size.height * scale }}
                  initial={{ y: 28, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  whileTap={{ scale: 1.08 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: c * 0.06 }}
                >
                  {item.object ? (
                    <button type="button" className="cat-object" aria-label={item.label} onClick={() => open(item, onOpen)}>
                      <img src={projectorUrl} alt="" draggable="false" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cat-book cat-book--cover"
                      data-book={item.key}
                      data-view="cover"
                      aria-label={item.project.title}
                      style={{ background: item.project.color }}
                      onClick={() => open(item, onOpen)}
                    >
                      <CoverArt project={item.project} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
          <span className="cat-row__shelf" />
        </div>
      ))}
    </div>
  );
}

export function CategoryShelf({ category, onPick, onHome, onOpen, controls }) {
  const isDesktop = useMediaQuery('(min-width: 900px) and (min-aspect-ratio: 1/1)');
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const { w, h } = useViewport();
  const items = itemsOf(category);
  const scroller = useRef(null);

  // Spine titles are measured letter by letter, so they wait for their font
  // (arriving straight at …/#identities, it may not have loaded yet).
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setFontReady(true);
    document.fonts.load('600 100px Oswald', 'ABCabc').then(done, done);
    return () => {
      alive = false;
    };
  }, []);

  // A new category starts at the top of the page.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [category]);

  const title = (
    <a
      className="cat-title"
      href="#"
      aria-label="Back to the bookshelf"
      onClick={(e) => {
        e.preventDefault();
        onHome();
      }}
    >
      <SiteTitle text=".projects" />
    </a>
  );

  if (isDesktop) {
    const scale = Math.min(w / STAGE_W, h / STAGE_H);
    return (
      <motion.div className="cat-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        {controls}
        <div
          className="cat-stage"
          style={{ left: (w - STAGE_W * scale) / 2, top: (h - STAGE_H * scale) / 2, transform: `scale(${scale})` }}
        >
          {title}
          <ShelfMenu className="shelf-menu--category" active={category} onPick={onPick} />
          {fontReady && <SpineRow key={category} items={items} onOpen={onOpen} canHover={canHover} scale={scale} />}
          <span className="cat-shelf" />
        </div>
      </motion.div>
    );
  }

  const scale = Math.min(w / PHONE_W, 1.3);
  return (
    <motion.div
      ref={scroller}
      className="cat-page cat-page--phone"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ '--s': scale }}
    >
      {controls}
      {title}
      <ShelfMenu className="shelf-menu--category shelf-menu--category-phone" active={category} onPick={onPick} />
      <CoverRows key={category} items={items} onOpen={onOpen} scale={scale} />
    </motion.div>
  );
}
