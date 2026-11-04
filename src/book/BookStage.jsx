import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { projects } from '../content/projects.js';
import { bookFrame } from '../home/spines.js';
import { sfx } from '../sound/sfx.js';
import { Book3D, COVER_RATIO } from './Book3D.jsx';
import { Binder } from '../binder/Binder.jsx';

// The books you can browse: all of them, or only the chosen category from the shelf menu.
const catalogueFor = (category) =>
  projects.filter((p) => p.shelfBook && (!category || p.category === category));

// Resting pose in the middle of the screen (Figma "2 - Cover floating"):
// turned so the spine shows on the left, tipped so the top edge shows.
const TURN = 24;
const TIP = -10;

const FLY_IN = { type: 'spring', stiffness: 110, damping: 15, mass: 1 };
// Back to the shelf: a timed glide that slows into the slot (a spring would
// crawl over the last few pixels and linger in an in-between pose).
const FLY_OUT = { type: 'tween', duration: 0.7, ease: [0.45, 0, 0.2, 1] };
const SLIDE = { type: 'spring', stiffness: 170, damping: 24 };
const WHEEL_STEP = 90; // how much scrolling moves one book (a mouse-wheel click is ~100)
const WHEEL_GAP = 560; // ms between books at most — about the time a slide takes

// Where the books next to the centre one sit (offset −1 = previous, +1 = next).
// Figma spacing on wide screens; on narrow ones they move out so they only
// peek in from the edges instead of covering the main book.
function slotFor(offset, w, W, showSides) {
  if (offset === 0) return { x: 0, scale: 1, opacity: 1 };
  const side = Math.sign(offset);
  const far = Math.abs(offset) > 1;
  const near = side > 0 ? Math.max(0.34 * w, 0.92 * W) : Math.max(0.38 * w, 0.88 * W);
  return {
    x: side * (far ? near + 0.3 * w : near),
    scale: far ? 0.3 : side > 0 ? 0.55 : 0.45,
    opacity: !showSides || far ? 0 : side > 0 ? 0.38 : 0.22,
  };
}

const shelfItem = (key) => document.querySelector(`[data-pop="${CSS.escape(key)}"] > [id]`);
const setShelfBookVisible = (key, visible) => {
  document.querySelectorAll(`[data-pop="${CSS.escape(key)}"]`).forEach((el) => {
    el.style.visibility = visible ? '' : 'hidden';
  });
};

// How thick each book is compared to its height, taken from the shelf drawing.
function depthRatioOf(key) {
  const el = shelfItem(key);
  const f = el && bookFrame(el, (shape) => shape.getScreenCTM());
  return f ? Math.min(0.22, Math.max(0.05, f.thickness / f.length)) : 0.1;
}

// The pose that puts the 3D book exactly over its spine on the shelf.
function shelfPose(key, H) {
  const el = shelfItem(key);
  const f = el && bookFrame(el, (shape) => shape.getScreenCTM());
  if (!f) return null;
  // A spine looks the same either way up, so take the smaller turn
  // (leaning books swing upright instead of tumbling over).
  let rz = (Math.atan2(-f.along.x, f.along.y) * 180) / Math.PI;
  if (rz > 90) rz -= 180;
  if (rz < -90) rz += 180;
  return {
    px: f.cx,
    py: f.cy,
    rz,
    s: f.length / H,
    ry: 90,
    rx: 0,
  };
}

function CatalogueBook({ project, offset, size, center, fly, showSides, reading, onSelect, onOpen, onFlown }) {
  const flying = fly?.slug === project.slug;
  const progress = useMotionValue(flying && fly.dir === 'in' ? 0 : 1);
  const bounce = useRef(null);

  useEffect(() => {
    if (!flying) return;
    let cancelled = false;
    const controls = animate(progress, fly.dir === 'in' ? 1 : 0, fly.dir === 'in' ? FLY_IN : FLY_OUT);
    controls.then(() => !cancelled && onFlown(fly.dir));
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [flying, fly, progress, onFlown]);

  const onClick = (e) => {
    e.stopPropagation();
    if (offset !== 0) return onSelect(offset);
    onOpen();
  };

  // While the binder is open the books beside it fade away, and the centre
  // book hands over to the binder instantly (they're in the exact same pose,
  // so it reads as one object).
  const slot = slotFor(offset, size.vw, size.W, showSides);
  const target = reading ? { ...slot, opacity: 0 } : slot;
  const instant = offset === 0 && (reading || showSides);

  return (
    <motion.div
      className={`book-slot ${offset === 0 ? 'is-center' : offset < 0 ? 'is-prev' : 'is-next'}`}
      initial={false}
      animate={target}
      transition={reading ? { duration: instant ? 0 : 0.35 } : instant ? { ...SLIDE, opacity: { duration: 0 } } : SLIDE}
    >
      <div className="book-bounce" ref={bounce}>
        <Book3D
          project={project}
          size={size.book(project)}
          from={flying ? fly.from : null}
          to={center}
          progress={progress}
          arc={flying ? size.vh * 0.06 : 0}
          cameraLift={size.vh * 0.63}
          onClick={onClick}
        />
      </div>
    </motion.div>
  );
}

// The overlay where a book flies off the shelf and presents its cover.
// A real book (book picks) keeps its cover's shape and its thickness; square
// and landscape books get shorter so they're never wider than a binder.
function bookPick(p, H) {
  const a = p.aspect ?? COVER_RATIO;
  const h = H * Math.min(1, COVER_RATIO / a);
  return { W: h * a, H: h, D: h * (p.thickness ?? 0.1) };
}

// Book size: about two thirds of the screen height, narrower on phones.
const bookHeight = (vp) => Math.min(vp.h * 0.68, (vp.w * 0.62) / COVER_RATIO);
const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });

export function BookStage({ startKey, category, onClosed }) {
  const [catalogue] = useState(() => {
    const list = catalogueFor(category);
    return list.some((p) => p.shelfBook === startKey) ? list : catalogueFor(null);
  });
  const [index, setIndex] = useState(() => Math.max(0, catalogue.findIndex((p) => p.shelfBook === startKey)));
  const [phase, setPhase] = useState('in'); // in → shown (⇄ reading) → out
  const [vp, setVp] = useState(viewport);
  // Take off from the exact spot of the book on the shelf.
  const [fly, setFly] = useState(() => ({
    slug: catalogue[index]?.slug,
    from: shelfPose(startKey, bookHeight(viewport())),
    dir: 'in',
  }));
  const overlay = useRef(null);
  const n = catalogue.length;
  const current = catalogue[index];

  useEffect(() => {
    const onResize = () => setVp(viewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const H = bookHeight(vp);
  const W = H * COVER_RATIO;
  const depths = useMemo(() => Object.fromEntries(catalogue.map((p) => [p.slug, depthRatioOf(p.shelfBook)])), [catalogue]);
  const size = useMemo(
    () => ({
      vw: vp.w,
      vh: vp.h,
      W,
      // Magazines keep their PDF's page shape and are only a few sheets thick.
      book: (p) =>
        p.type === 'magazine'
          ? { W: H * p.pageAspect, H, D: H * 0.016 }
          : p.type === 'dvd'
            ? { W: H * (135 / 190), H, D: H * (14 / 190) } // a DVD case: 135 × 190 × 14 mm
            : p.type === 'book'
              ? bookPick(p, H)
              : { W, H, D: H * depths[p.slug] },
    }),
    [vp, W, H, depths],
  );
  const center = useMemo(() => ({ px: vp.w / 2, py: vp.h * 0.48, rz: 0, s: 1, ry: TURN, rx: TIP }), [vp]);

  // Take off: the shelf book disappears as its 3D twin lifts off.
  useEffect(() => {
    setShelfBookVisible(startKey, false);
    sfx.whoosh();
  }, [startKey]);

  const onFlown = useCallback(
    (dir) => {
      setFly(null);
      if (dir === 'in') setPhase('shown');
      else {
        setShelfBookVisible(current.shelfBook, true);
        onClosed();
      }
    },
    [current, onClosed],
  );

  const close = useCallback(() => {
    if (phase !== 'shown') return;
    setPhase('out');
    sfx.whoosh(true);
    setFly({ slug: current.slug, from: shelfPose(current.shelfBook, H), dir: 'out' });
  }, [phase, current, H]);

  // The first spread starts loading as soon as a book is presented.
  useEffect(() => {
    current?.pdfPages?.slice(0, 2).forEach((src) => {
      new Image().src = src;
    });
  }, [current]);

  const openBinder = useCallback(() => {
    if (phase !== 'shown') return;
    sfx.click();
    setPhase('reading');
  }, [phase]);
  const closeBinder = useCallback(() => setPhase('shown'), []);

  const lastGo = useRef(0);
  const go = useCallback(
    (step) => {
      if (phase !== 'shown') return;
      // Held-down arrow keys or rapid swipes can't stack slides on top of each other.
      const now = performance.now();
      if (now - lastGo.current < 320) return;
      lastGo.current = now;
      const next = (index + step + n) % n;
      setShelfBookVisible(current.shelfBook, true);
      setShelfBookVisible(catalogue[next].shelfBook, false);
      setIndex(next);
      sfx.slide();
    },
    [phase, index, n, current],
  );

  // Keyboard, mouse wheel / trackpad and swipes.
  useEffect(() => {
    const el = overlay.current;
    // A calm scroll wheel: it takes a real nudge to move one book, at most one
    // book per WHEEL_GAP ms however hard you scroll, and leftover scrolling is
    // thrown away instead of queuing up (so books never go flying).
    let acc = 0;
    let last = 0;
    let idle = 0;
    const onWheel = (e) => {
      e.preventDefault(); // the page behind doesn't scroll
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const px = e.deltaMode === 1 ? delta * 16 : delta;
      clearTimeout(idle);
      idle = setTimeout(() => (acc = 0), 220); // scrolling stopped: start fresh
      const now = performance.now();
      if (now - last < WHEEL_GAP) return; // still moving: ignore, don't save it up
      acc += px;
      if (Math.abs(acc) >= WHEEL_STEP) {
        go(acc > 0 ? 1 : -1);
        acc = 0;
        last = now;
      }
    };
    let start = null;
    const onTouchStart = (e) => {
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      start = null;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); // swipe left / up → next
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [go, close]);

  // Books within two places of the centre (wrapping around the catalogue).
  const visible = catalogue
    .map((project, i) => {
      let offset = (i - index + n) % n;
      if (offset > n / 2) offset -= n;
      return { project, offset };
    })
    .filter(({ offset }) => Math.abs(offset) <= 2);

  const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

  return (
    <div className="book-stage" ref={overlay} onClick={close} role="dialog" aria-modal="true" aria-label={current.title}>
      <motion.div
        className="book-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'out' ? 0 : 1 }}
        transition={{ duration: phase === 'out' ? 0.45 : 0.6 }}
      />
      {visible.map(({ project, offset }) => (
        <CatalogueBook
          key={project.slug}
          project={project}
          offset={offset}
          size={size}
          center={center}
          fly={fly}
          showSides={phase === 'shown'}
          reading={phase === 'reading'}
          onSelect={go}
          onOpen={openBinder}
          onFlown={onFlown}
        />
      ))}
      <motion.p
        className="book-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'shown' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {touch ? 'tap to open   ·   swipe for the next book' : 'click to open   ·   scroll for the next book'}
      </motion.p>
      {phase === 'reading' && (
        <Binder
          project={current}
          size={size.book(current)}
          center={center}
          cameraLift={vp.h * 0.63}
          vp={vp}
          onClosed={closeBinder}
        />
      )}
    </div>
  );
}
