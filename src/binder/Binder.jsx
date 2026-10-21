import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { shade } from '../content/palette.js';
import { sfx } from '../sound/sfx.js';
import { BOARD_MARGIN, PAGE_H, PAGE_W, SpineTitle } from '../book/Book3D.jsx';
import { buildPages } from './pages.js';
import { BlankPage, Page } from './Page.jsx';
import { BoxLid, MemoryBox, MemoryBoxItems } from './MemoryBox.jsx';
import { DVD_W, DvdDisc, DvdInsert } from './Dvd.jsx';
import { PICK_W, PickAbout, PickSingle, PickTitlePage } from './BookPick.jsx';

const BOARD_W = PAGE_W + 2 * BOARD_MARGIN;
const OPEN = { duration: 1.25, ease: [0.45, 0, 0.2, 1] };
const CLOSE = { duration: 1.05, ease: [0.45, 0, 0.2, 1] };
const TURN = { duration: 0.85, ease: [0.45, 0.05, 0.25, 1] };
const RINGS = [0.17, 0.49, 0.81]; // heights of the rings on the page

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => t * t * (3 - 2 * t);

// A sheet turning around the rings. Front = what you see while it lies on the
// right (angle 0); back = what you see once it lies on the left (−180).
function Leaf({ angle, origin, front, back }) {
  const shadeOpacity = useTransform(angle, (a) => Math.sin((Math.abs(a) * Math.PI) / 180) * 0.32);
  // Lifted a hair so it never flickers against the pages it lies on.
  const transform = useTransform(angle, (a) => `translateZ(0.6px) rotateY(${a}deg)`);
  return (
    <motion.div className="leaf" style={{ transform, transformOrigin: `${origin}px 50%` }}>
      <div className="leaf__face leaf__face--front">
        {front}
        <motion.span className="leaf__shade" style={{ opacity: shadeOpacity }} />
      </div>
      <div className="leaf__face leaf__face--back">
        {back}
        <motion.span className="leaf__shade leaf__shade--back" style={{ opacity: shadeOpacity }} />
      </div>
    </motion.div>
  );
}

// The book in your hands opens into its ring binder. It's the same object as
// the floating book: it starts in exactly that pose, turns to face you, moves
// a little closer, and the front cover swings open around the spine.
//
//   back board ── spine (stands up when closed, lies flat behind the rings
//                  when open) ── front cover (hinged on the spine)
export function Binder({ project, size, center, cameraLift, vp, onClosed }) {
  const { W, H, D } = size;
  // A magazine has no hard cover: its pages fill the whole book, and its
  // first PDF page is the cover itself.
  const mag = project.type === 'magazine';
  const box = project.type === 'memorybox';
  const dvd = project.type === 'dvd'; // a movie pick: a DVD case with a disc inside
  const pick = project.type === 'book'; // a book pick: a real book with its own cover
  const flat = mag || dvd || pick; // no hard-cover border: the inside fills the whole cover
  const k = W / BOARD_W; // design px (Figma) → book px
  const m = flat ? 0 : BOARD_MARGIN * k;

  // A project with a PDF shows its pages (already turned into pictures);
  // otherwise the template pages from project.json.
  const pages = useMemo(
    () => {
      if (!project.pdfPages?.length) return buildPages(project);
      const all = project.pdfPages.map((src) => ({ type: 'pdf', src }));
      return mag ? all.slice(1) : all;
    },
    [project, mag],
  );
  const single = vp.w < 760 || vp.h > vp.w * 1.1;

  const [at, setAt] = useState(0); // desktop: spread index, phone: page index
  const [turn, setTurn] = useState(null); // next | prev | null

  // Fetch the next pages in the background so turning is instant.
  useEffect(() => {
    const per = single ? 1 : 2;
    pages.slice(at * per, at * per + per * 3).forEach((p) => {
      if (p.type === 'pdf') new Image().src = p.src;
    });
  }, [pages, at, single]);
  const [closing, setClosing] = useState(false);
  const open = useMotionValue(0);
  const angle = useMotionValue(0);
  const root = useRef(null);

  // ----- Where the open binder sits: centred, a little closer than the book -----
  const focus = single ? -D / 2 : -W / 2 - D / 2; // book-x that ends up centre screen
  const fitScale = single
    ? Math.min((vp.w - 24) / (W + D), (vp.h - 150) / H)
    : Math.min((vp.w - 90) / (2 * W + D), (vp.h - 120) / H);
  // Book picks aren't her work, so they open at their own size instead of
  // filling the screen (a little bigger on phones, so the text stays readable).
  const openScale = pick ? Math.min(fitScale, single ? 1.6 : 1) : fitScale;
  const openPose = { px: vp.w / 2 - focus * openScale, py: vp.h * 0.47, rz: 0, s: openScale, ry: 0, rx: 0 };

  // First the book turns to face you, then (overlapping) the cover opens.
  const poseT = (o) => smooth(clamp01(o / 0.55));
  const coverT = (o) => smooth(clamp01((o - 0.3) / 0.7));

  const transform = useTransform(open, (o) => {
    const t = poseT(o);
    const p = Object.fromEntries(Object.keys(openPose).map((key) => [key, lerp(center[key], openPose[key], t)]));
    return `translate(${p.px}px, ${p.py}px) rotateZ(${p.rz}deg) scale(${p.s}) rotateY(${p.ry}deg) rotateX(${p.rx}deg)`;
  });
  const perspectiveOrigin = useTransform(open, (o) => {
    const t = poseT(o);
    return `${lerp(center.px, vp.w / 2, t)}px ${lerp(center.py - cameraLift, vp.h * 0.47, t)}px`;
  });
  const hinge = useTransform(open, (o) => `rotateY(${90 * (1 - coverT(o))}deg)`);
  const topOpacity = useTransform(open, (o) => 1 - clamp01(coverT(o) * 5));
  const ringOpacity = useTransform(open, (o) => clamp01(coverT(o) * 3 - 1.4));
  const hintOpacity = useTransform(open, (o) => clamp01((o - 0.92) * 12));

  // Open as soon as it appears. "settled" = fully open and still.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const controls = animate(open, 1, OPEN);
    controls.then(() => setSettled(true));
    const t = setTimeout(() => sfx.page(), 450);
    return () => {
      controls.stop();
      clearTimeout(t);
    };
  }, [open]);

  const close = useCallback(() => {
    if (turn || closing) return;
    setClosing(true);
    setSettled(false);
    setTimeout(() => sfx.page(), 150);
    animate(open, 0, CLOSE).then(onClosed);
  }, [turn, closing, open, onClosed]);

  // ----- Turning pages -----
  const last = box || dvd || pick ? 0 : single ? pages.length - 1 : Math.ceil(pages.length / 2) - 1;

  useEffect(() => {
    if (!turn) return;
    let cancelled = false;
    const from = turn === 'next' ? 0 : -180;
    angle.set(from);
    sfx.page();
    const controls = animate(angle, from === 0 ? -180 : 0, TURN);
    controls.then(() => {
      if (cancelled) return;
      setAt((i) => i + (turn === 'next' ? 1 : -1));
      setTurn(null);
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [turn, angle]);

  const go = useCallback(
    (step) => {
      if (turn || closing || open.get() < 0.98) return;
      if (step > 0 && at < last) setTurn('next');
      if (step < 0 && at > 0) setTurn('prev');
    },
    [turn, closing, open, at, last],
  );

  useEffect(() => setAt(0), [single, pages.length]);

  // Mouse wheel / trackpad, arrow keys, Esc, swipes.
  useEffect(() => {
    const el = root.current;
    let acc = 0;
    let lastWheel = 0;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const now = performance.now();
      if (Math.abs(acc) > 40 && now - lastWheel > 500) {
        go(acc > 0 ? 1 : -1);
        acc = 0;
        lastWheel = now;
      }
    };
    let start = null;
    const onTouchStart = (e) => {
      e.stopPropagation();
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e) => {
      e.stopPropagation();
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      start = null;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) > 40) go(d < 0 ? 1 : -1);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        close();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [go, close]);

  // ----- What lies where -----
  const sideOf = (i) => (single ? 'right' : i % 2 === 0 ? 'left' : 'right');
  const P = (i, side = sideOf(i)) =>
    i >= 0 && i < pages.length ? (
      <Page page={pages[i]} project={project} side={side} />
    ) : (
      <BlankPage side={side} />
    );

  let left = null; // lies on the inside of the front cover
  let right; // lies on the back board
  let leaf = null;
  if (single) {
    if (turn === 'next') {
      right = P(at + 1);
      leaf = { front: P(at), back: <BlankPage side="left" /> };
    } else if (turn === 'prev') {
      right = P(at);
      leaf = { front: P(at - 1), back: <BlankPage side="left" /> };
    } else right = P(at);
  } else {
    const s = at * 2;
    if (turn === 'next') {
      left = P(s);
      right = P(s + 3);
      leaf = { front: P(s + 1), back: P(s + 2) };
    } else if (turn === 'prev') {
      left = P(s - 2);
      right = P(s + 1);
      leaf = { front: P(s - 1), back: P(s) };
    } else {
      left = P(s);
      right = P(s + 1);
    }
  }

  // A memory box: hollow inside — the lid carries the title and a sticky
  // note, the box holds polaroids you can move around. No pages to turn.
  if (box) {
    left = single ? null : <BoxLid project={project} />;
    right = <MemoryBox project={project} />;
    leaf = null;
  }
  if (pick) {
    const page = { project, scale: W / PICK_W, aspect: W / H };
    left = single ? null : <PickAbout {...page} />;
    right = single ? <PickSingle {...page} /> : <PickTitlePage {...page} />;
    leaf = null;
  }
  if (dvd) {
    left = single ? null : <DvdInsert project={project} scale={W / DVD_W} />;
    right = <DvdDisc project={project} scale={W / DVD_W} withInsert={single} />;
    leaf = null;
  }

  const color = project.color ?? '#8C162C';
  const cover = project.cover ?? {};
  const lining = mag ? '#f4f2ec' : dvd ? '#232326' : pick ? '#f6f1e6' : shade(color, 0.9);
  const spineTitle = project.spine?.title ?? project.title ?? '';
  const pageBox = flat
    ? { left: 0, top: 0, width: W, height: H, transform: 'translateZ(1px)' }
    : { left: m, top: m, width: PAGE_W, height: PAGE_H, transform: `translateZ(1px) scale(${k})` };
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };
  // Only a tap outside the open book closes it. (iPhone Safari sometimes
  // misses things drawn inside the 3D book, and the tap would fall through.)
  const onBackdrop = (e) => {
    e.stopPropagation();
    const inside = [...root.current.querySelectorAll('.b3__back, .b3__front')].some((el) => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (!inside || !settled) close();
  };

  // The memory box's photos and cards sit on a flat layer exactly over the
  // open box (see MemoryBoxItems), measured once the book has settled.
  const boxPage = useRef(null);
  const [boxRect, setBoxRect] = useState(null);
  useLayoutEffect(() => {
    if (!box || !settled) return setBoxRect(null);
    const r = boxPage.current.getBoundingClientRect();
    setBoxRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [box, settled, vp]);

  return (
    <div
      ref={root}
      className={`binder${single ? ' is-single' : ''}${mag ? ' is-mag' : ''}${box ? ' is-box' : ''}${dvd ? ' is-dvd' : ''}${pick ? ' is-pick' : ''}`}
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} — binder`}
      style={{ '--lining': lining }}
    >
      <motion.div className="book-persp" style={{ perspectiveOrigin }}>
        <motion.div className="b3" style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, transform }}>
          {/* Back board, with the pages lying on the right */}
          <div className="b3__back" style={{ transform: `translateZ(${-D / 2}px)` }}>
            <div className="b3__face" style={{ background: lining }} />
            <motion.div
              className="b3__top"
              style={{ width: W, height: D, opacity: topOpacity }}
            >
              <div className="book3d__pages" />
            </motion.div>
            <div className="b3__page" style={pageBox} ref={boxPage} onClick={stop(() => go(1))}>
              {right}
              {leaf && (
                <Leaf
                  angle={angle}
                  origin={mag ? -D / 2 : -(BOARD_MARGIN + D / 2 / k)}
                  front={leaf.front}
                  back={leaf.back}
                />
              )}
            </div>
            {!mag && !box && !dvd && !pick && RINGS.map((r) => (
              <motion.span
                key={r}
                className="b3__ring"
                style={{
                  opacity: ringOpacity,
                  left: -D / 2 - 52 * k,
                  top: m + PAGE_H * k * r,
                  width: 104 * k,
                  height: 16 * k,
                  borderWidth: 4 * k,
                }}
              />
            ))}

            {/* Spine: stands up when closed, lies flat behind the rings when open */}
            <motion.div className="b3__spine" style={{ left: -D, width: D, transform: hinge }}>
              <div className="b3__face" style={{ background: flat ? lining : shade(color, 0.6) }} />
              <div className="b3__face b3__face--out" style={{ background: shade(color) }}>
                {spineTitle && <SpineTitle text={spineTitle} color={project.spine?.color ?? '#fff'} stack={!!project.spine?.stack} />}
              </div>

              {/* Front cover, hinged on the spine */}
              <motion.div className="b3__front" style={{ left: -W, width: W, transform: hinge }}>
                <div className="b3__face" style={{ background: lining }} />
                {left && (
                  <div className="b3__page" style={pageBox} onClick={stop(() => go(-1))}>
                    {left}
                  </div>
                )}
                <div className="b3__face b3__face--out b3__cover" style={{ background: color }}>
                  {mag && project.pdfPages?.[0] ? (
                    <>
                      <img className="book3d__texture" src={project.pdfPages[0]} alt="" draggable="false" />
                      <span className="gloss" />
                    </>
                  ) : project.texture && (
                    <img
                      className="book3d__texture"
                      src={project.texture}
                      alt=""
                      draggable="false"
                      style={{ mixBlendMode: cover.blend ?? 'overlay', opacity: cover.opacity ?? 1 }}
                    />
                  )}
                  {/* the poster sits under the case's clear plastic sleeve */}
                  {dvd && <span className="gloss" />}
                  {pick && <span className="crease" />}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      {boxRect && (
        <div className="box-overlay" style={boxRect}>
          <MemoryBoxItems project={project} scale={boxRect.width / PAGE_W} />
        </div>
      )}
      <motion.p className="book-hint" style={{ opacity: hintOpacity }}>
        {pick
          ? single ? 'tap outside to close' : 'esc to close'
          : dvd
          ? 'tap the disc to spin it   ·   ' + (single ? 'tap outside to close' : 'esc to close')
          : box
          ? 'move the photos around   ·   ' + (single ? 'tap outside to close' : 'esc to close')
          : single
            ? 'swipe to turn the page   ·   tap outside to close'
            : 'scroll to turn the page   ·   esc to close'}
      </motion.p>
    </div>
  );
}
