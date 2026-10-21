import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { sfx } from '../sound/sfx.js';

const clamp01 = (t) => Math.min(1, Math.max(0, t));

// A sheet of paper that arrives folded and unfolds in front of you.
//   folds = 2 → folded in half (the top half lies over the bottom half)
//   folds = 3 → letter fold (bottom third folded up, top third folded down)
// The content is drawn once per panel and clipped, so each panel shows its
// own slice of the page and the folds carry the real text with them.
// Esc, or clicking outside, folds it back up and closes it.
// `behind(open, scale)`: optional extra sheets drawn in the same spot, behind
// or in front of this one. `front` (default true) says whether this sheet is
// on top; when it isn't, it steps back and peeks out on the right.
export function FoldedPaper({
  width,
  height,
  folds = 2,
  className = '',
  label,
  onClosed,
  children,
  footer,
  behind,
  front = true,
  onBring,
  extraWidth = 0,
}) {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const open = useMotionValue(0); // 0 folded … 1 flat
  const shown = useMotionValue(0); // 0 hidden … 1 on screen
  const closing = useRef(false);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Arrive, then unfold.
  useEffect(() => {
    const a = animate(shown, 1, { type: 'spring', stiffness: 180, damping: 20 });
    const b = animate(open, 1, { duration: folds === 3 ? 1.25 : 0.85, ease: [0.45, 0, 0.2, 1], delay: 0.3 });
    const t = setTimeout(() => sfx.page(), 320);
    const t2 = folds === 3 ? setTimeout(() => sfx.page(), 900) : null;
    return () => {
      a.stop();
      b.stop();
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [shown, open, folds]);

  const close = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    sfx.page();
    await animate(open, 0, { duration: folds === 3 ? 0.9 : 0.6, ease: [0.45, 0, 0.2, 1] });
    await animate(shown, 0, { duration: 0.25 });
    onClosed();
  }, [open, shown, folds, onClosed]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Fit on screen. Tall pages on narrow screens fit the width and scroll.
  const narrow = vp.w < 700;
  const scale = narrow
    ? Math.min(1, (vp.w - 24) / (width + extraWidth))
    : Math.min(1.25, (vp.w - 48) / (width + extraWidth), (vp.h - (footer ? 110 : 64)) / height);

  // Panels: [top, middle, bottom] for 3 folds, [top, bottom] for 2.
  const ph = height / folds;
  const fixedIndex = 1; // the panel that never moves (bottom half, or middle third)
  // Each flap's share of the unfolding (top opens first, then the bottom).
  const topT = useTransform(open, (o) => (folds === 3 ? clamp01(o / 0.55) : o));
  const bottomT = useTransform(open, (o) => clamp01((o - 0.45) / 0.55));

  const topFlap = useTransform(topT, (t) => `rotateX(${-180 * (1 - t)}deg)`);
  const bottomFlap = useTransform(bottomT, (t) => `rotateX(${180 * (1 - t)}deg)`);
  const topShade = useTransform(topT, (t) => Math.sin(Math.PI * t) * 0.28);
  const bottomShade = useTransform(bottomT, (t) => Math.sin(Math.PI * t) * 0.28);
  const paperOpacity = useTransform(shown, (s) => s);
  // While folded, the visible part (the fixed panel) sits in the middle of the screen.
  const shift = folds === 2 ? (-ph / 2) * scale : 0;
  const paperY = useTransform([open, shown], ([o, s]) => shift * (1 - o) + (1 - s) * 60);
  const paperScale = useTransform(shown, (s) => scale * (0.85 + 0.15 * s));

  const slice = (i) => (
    <div className="fold-slice" style={{ top: -i * ph, height }}>
      {children}
    </div>
  );

  return (
    <div
      className={`fold-scrim${narrow ? ' is-narrow' : ''}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <motion.div className="fold-scrim__bg" style={{ opacity: paperOpacity }} />
      <div
        className="fold-stage"
        style={{ width: width * scale, height: height * scale, marginRight: extraWidth * scale }}
      >
        {behind?.(open, scale)}
        <motion.div
          className="fold-swap"
          initial={false}
          animate={front ? { x: 0, y: 0, rotate: 0, zIndex: 2 } : { x: 46 * scale, y: 10 * scale, rotate: 0, zIndex: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          onClick={(e) => {
            e.stopPropagation();
            if (!front) onBring?.();
          }}
          style={{ cursor: front ? 'default' : 'pointer' }}
        >
        <motion.div
          className={`fold-paper ${className}`}
          style={{ width, height, scale: paperScale, y: paperY, opacity: paperOpacity }}
        >
          {/* The panel that never moves */}
          <div className="fold-panel" style={{ top: fixedIndex * ph, height: ph }}>
            {slice(fixedIndex)}
          </div>

          {/* Bottom third (letter fold only): folds up from the middle panel's bottom edge */}
          {folds === 3 && (
            <motion.div
              className="fold-flap"
              style={{ top: 2 * ph, height: ph, transformOrigin: '50% 0', transform: bottomFlap, zIndex: 1 }}
            >
              <div className="fold-face">
                {slice(2)}
                <motion.span className="fold-shade" style={{ opacity: bottomShade }} />
              </div>
              <div className="fold-face fold-face--back" />
            </motion.div>
          )}

          {/* Top: folds down from the next panel's top edge (always on top) */}
          <motion.div
            className="fold-flap"
            style={{ top: 0, height: ph, transformOrigin: '50% 100%', transform: topFlap, zIndex: 2 }}
          >
            <div className="fold-face">
              {slice(0)}
              <motion.span className="fold-shade fold-shade--up" style={{ opacity: topShade }} />
            </div>
            <div className="fold-face fold-face--back" />
          </motion.div>

          {/* Fold creases stay faintly visible once open, like real paper */}
          {Array.from({ length: folds - 1 }, (_, i) => (
            <span key={i} className="fold-crease" style={{ top: (i + 1) * ph }} />
          ))}
        </motion.div>
        </motion.div>
      </div>
      {footer && (
        <motion.div className="fold-footer" style={{ opacity: open }} onClick={(e) => e.stopPropagation()}>
          {footer}
        </motion.div>
      )}
    </div>
  );
}
