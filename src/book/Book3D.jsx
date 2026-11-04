import { useMemo } from 'react';
import { motion, useTransform } from 'framer-motion';
import { shade } from '../content/palette.js';
import { inkBox, SPINE_FONT_SIZE, stackedLetters } from '../home/spines.js';

// The book is a ring binder: its boards are a binder page (560 × 720, Figma)
// plus a 14px border of hard cover all round.
export const PAGE_W = 560;
export const PAGE_H = 720;
export const BOARD_MARGIN = 14;
export const COVER_RATIO = (PAGE_W + 2 * BOARD_MARGIN) / (PAGE_H + 2 * BOARD_MARGIN);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Mixes two hex colours (t = 0 → a, 1 → b).
function mixHex(a, b, t) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return b;
  const [ca, cb] = [rgb(a), rgb(b)];
  return `rgb(${ca.map((c, i) => Math.round(lerp(c, cb[i], t))).join(',')})`;
}

// Builds the CSS transform for a pose. The book turns around its own centre,
// which sits at (px, py) on screen.
//   rz  tilt in the picture plane        s   scale
//   ry  turn: 90 = only the spine faces you, smaller shows the cover
//   rx  tip: negative shows the top edge with the pages
function transformFor({ px, py, rz, s, ry, rx }) {
  return `translate(${px}px, ${py}px) rotateZ(${rz}deg) scale(${s}) rotateY(${ry}deg) rotateX(${rx}deg)`;
}

// The title stretched to fill the whole spine, reading top → bottom — the same
// look as the spines on the shelf (see addSpineTitles in home/spines.js).
// With `stack`, the letters stand upright one above the next instead.
export function SpineTitle({ text, color, stack = false }) {
  if (stack) return <StackedSpineTitle text={text} color={color} />;
  return <RunningSpineTitle text={text} color={color} />;
}

function StackedSpineTitle({ text, color }) {
  const letters = useMemo(() => stackedLetters(text), [text]);
  return (
    <svg className="book3d__spine-title" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      {letters.map(({ letter, y, h, sx, sy, ink }, i) => (
        <text
          key={i}
          fontSize={SPINE_FONT_SIZE}
          fill={color}
          transform={`translate(0 ${y}) scale(${sx} ${h * sy}) translate(${ink.left} ${ink.ascent})`}
        >
          {letter}
        </text>
      ))}
    </svg>
  );
}

function RunningSpineTitle({ text, color }) {
  const ink = useMemo(() => inkBox(text), [text]);
  // Rotated a quarter turn, the letters' ink spans x: −descent…ascent and
  // y: −left…right; that box is stretched over the whole spine.
  const viewBox = `${-ink.descent} ${-ink.left} ${ink.height} ${ink.width}`;
  return (
    <svg className="book3d__spine-title" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      <text transform="rotate(90)" fontSize={SPINE_FONT_SIZE} fill={color}>
        {text}
      </text>
    </svg>
  );
}

// A project as a real 3D book (cover, spine, top edge with pages).
// `progress` goes 0 → 1 from pose `from` to pose `to`; it may overshoot
// past 1 with a spring, which makes the book settle with a little bounce.
// `cameraLift`: how far above the book the camera sits once it's presented.
export function Book3D({ project, size, from, to, progress, arc = 0, cameraLift = 0, onClick }) {
  const { W, H, D } = size;
  const poseAt = (t) =>
    from
      ? {
          px: lerp(from.px, to.px, t),
          py: lerp(from.py, to.py, t) - Math.sin(Math.PI * clamp01(t)) * arc,
          rz: lerp(from.rz, to.rz, t),
          s: lerp(from.s, to.s, t),
          ry: lerp(from.ry, to.ry, t),
          rx: lerp(from.rx, to.rx, t),
        }
      : to;
  const transform = useTransform(progress, (t) => transformFor(poseAt(t)));
  // The camera travels with the book: on the shelf it looks straight at the
  // spine (so it's perfectly flat, like the drawing), and it rises as the book
  // flies to the centre, so we end up looking down onto its top edge.
  const perspectiveOrigin = useTransform(progress, (t) => {
    const p = poseAt(t);
    return `${p.px}px ${p.py - cameraLift * clamp01(t)}px`;
  });

  const color = project.color ?? '#8C162C';
  // On the shelf the spine has the book's own colour; it darkens a little as
  // the book turns, so the spine reads as a separate side of the 3D book.
  const spineColor = useTransform(progress, (t) => mixHex(color, shade(color), clamp01(t * 3)));
  const spineTitle = project.spine?.title ?? project.title ?? '';
  const cover = project.cover ?? {};

  return (
    <motion.div className="book-persp" style={{ perspectiveOrigin }}>
      <motion.div
        className="book3d"
        style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, transform }}
        onClick={onClick}
      >
        {/* Each face sits half the book's size out from its centre, facing outwards */}
        <div
          className="book3d__top"
          style={{
            width: W,
            height: D,
            top: (H - D) / 2,
            background: project.type === 'magazine' ? '#f4f2ec' : color,
            transform: `rotateX(90deg) translateZ(${H / 2}px)`,
          }}
        >
          {/* a DVD case's edge is plain plastic, no page block */}
          {project.type !== 'dvd' && <div className="book3d__pages" />}
        </div>
        <motion.div
          className="book3d__spine"
          style={{
            width: D,
            height: H,
            left: (W - D) / 2,
            background: spineColor,
            transform: `rotateY(-90deg) translateZ(${W / 2}px)`,
          }}
        >
          {spineTitle && <SpineTitle text={spineTitle} color={project.spine?.color ?? '#fff'} stack={!!project.spine?.stack} />}
        </motion.div>
        {/* Cover: the book's colour with the project's texture picture blended on top */}
        <div className="book3d__cover" style={{ background: color, transform: `translateZ(${D / 2}px)` }}>
          {project.type === 'magazine' && project.pdfPages?.[0] ? (
            // A magazine's cover is the first page of its PDF, with a gloss.
            <>
              <img className="book3d__texture" src={project.pdfPages[0]} alt="" draggable="false" />
              <span className="gloss" />
            </>
          ) : (
            project.texture && (
              <img
                className="book3d__texture"
                src={project.texture}
                alt=""
                draggable="false"
                style={{ mixBlendMode: cover.blend ?? 'overlay', opacity: cover.opacity ?? 1 }}
              />
            )
          )}
          {/* the poster sits under the case's clear plastic sleeve */}
          {project.type === 'dvd' && <span className="gloss" />}
          {project.type === 'book' && <span className="crease" />}
        </div>
      </motion.div>
    </motion.div>
  );
}
