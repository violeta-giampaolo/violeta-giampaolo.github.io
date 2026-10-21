import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import playlists from '../content/playlists.json';
import { playlistsText } from '../content/site.js';
import { sfx } from '../sound/sfx.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { PHONE } from '../content/projects.js';

// Cover pictures, matched to playlists.json by file name.
// WebP copies; phones get small ones (a slide there is only ~100px wide).
const coverFiles = PHONE
  ? import.meta.glob('../assets/playlists/*.jpg', { eager: true, query: { w: '320', format: 'webp', quality: '80' }, import: 'default' })
  : import.meta.glob('../assets/playlists/*.jpg', { eager: true, query: { format: 'webp', quality: '84' }, import: 'default' });
const coverUrl = (file) => coverFiles[`../assets/playlists/${file}`];

const N = playlists.length;
const STEP = 360 / N;
const TILT = -16; // we look down on it a little
// Phones can't hover, so the slide standing here (front right, facing you)
// rises on its own, and its neighbours rise a little less — a wave that
// travels round the wheel as you swipe.
const FRONT = -56;
// How many slides join the wave: a long tail behind the raised slide, and
// barely any in front of it, so nothing covers its picture.
const WAVE_BEHIND = 2.6;
const WAVE_FRONT = 1.1;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const frontIndex = (r) => ((Math.round((FRONT - r) / STEP) % N) + N) % N;

// A slide on a phone: lifted by the wave instead of by hovering.
function WaveMount({ rot, i, S, children, ...props }) {
  const y = useTransform(rot, (r) => {
    const s = wrap(r + i * STEP - FRONT) / STEP; // < 0: nearer to you than the raised slide
    const wave = s < 0 ? WAVE_FRONT : WAVE_BEHIND;
    const d = Math.abs(s);
    const k = d >= wave ? 0 : (1 + Math.cos((Math.PI * d) / wave)) / 2;
    return -S * (5 / 6) * k;
  });
  return (
    <motion.a className="slide__mount" style={{ y }} {...props}>
      {children}
    </motion.a>
  );
}

// The slide wheel of the projector (the projector on the shelf).
// Every playlist cover stands upright like a page of a book opened all the
// way round: one edge on the central axis, the slide fanning outwards. Scroll
// (or swipe) to spin it; hover a slide and it rises; click to open the
// playlist on Spotify.
export function PlaylistCarousel({ onClose }) {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [lifted, setLifted] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const target = useMotionValue(0); // wheel rotation in degrees
  const rot = useSpring(target, { stiffness: 80, damping: 20 });
  const root = useRef(null);
  const lastTick = useRef(0);
  const touch = !useMediaQuery('(hover: hover) and (pointer: fine)');
  const [front, setFront] = useState(() => frontIndex(0));

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // A soft tick each time a slide passes.
  useEffect(
    () =>
      rot.on('change', (r) => {
        const i = Math.round(r / STEP);
        if (i !== lastTick.current) {
          lastTick.current = i;
          sfx.hover();
        }
        setFront(frontIndex(r));
      }),
    [rot],
  );

  const close = useCallback(() => setLeaving(true), []);
  const spin = useCallback((deg) => target.set(target.get() + deg), [target]);

  useEffect(() => {
    const el = root.current;
    const onWheel = (e) => {
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      spin(Math.max(-30, Math.min(30, d * 0.1)));
    };
    // Swipe sideways or up and down; on letting go it settles with a slide
    // standing exactly at the front.
    let p0 = null;
    const onTouchStart = (e) => (p0 = { x: e.touches[0].clientX, y: e.touches[0].clientY });
    const onTouchMove = (e) => {
      if (p0 == null) return;
      const { clientX: x, clientY: y } = e.touches[0];
      const dx = x - p0.x;
      const dy = y - p0.y;
      spin((Math.abs(dx) > Math.abs(dy) ? dx : -dy) * 0.4);
      p0 = { x, y };
    };
    const onTouchEnd = () => {
      p0 = null;
      target.set(FRONT - Math.round((FRONT - target.get()) / STEP) * STEP);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') spin(STEP);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') spin(-STEP);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [spin, close, target]);

  // About 600px across on a laptop (smaller on small screens).
  const OUTER = Math.max(140, Math.min(291, vp.w * 0.4, vp.h * 0.415)); // centre → outer edge
  const HOLE = OUTER * 0.35; // empty core in the middle
  const S = OUTER - HOLE;
  const wheel = useTransform(rot, (r) => `rotateX(${TILT}deg) rotateY(${r}deg)`);

  const side = (vp.w - 2 * OUTER * 1.06) / 2; // free space each side of the wheel
  // Too narrow for notes beside the wheel: the first note goes on top instead.
  const narrow = side < 210;
  const note = narrow ? { display: 'none' } : { width: Math.min(400, side * 0.78), '--gap': `${side * 0.1}px` };

  const slides = useMemo(() => playlists.map((p) => ({ ...p, src: coverUrl(p.cover) })), []);
  const hovered = touch ? slides[front] : lifted >= 0 ? slides[lifted] : null;
  // Tapping a slide that isn't up yet turns the wheel to it first.
  const bringToFront = (i) => target.set(target.get() + wrap(FRONT - i * STEP - target.get()));

  return (
    <motion.div
      ref={root}
      className="carousel-scrim"
      onClick={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.35, delay: leaving ? 0.2 : 0 }}
      onAnimationComplete={() => leaving && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Playlists"
    >
      <motion.div
        className={`carousel${narrow ? ' is-narrow' : ''}`}
        initial={{ y: 80, scale: 0.8, opacity: 0 }}
        animate={leaving ? { y: 80, scale: 0.8, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <motion.div className="carousel__wheel" style={{ transform: wheel }} onClick={(e) => e.stopPropagation()}>
          {slides.map((p, i) => (
            <div
              key={p.url}
              className="slide"
              style={{
                width: S,
                height: S,
                marginTop: -S / 2,
                transform: `rotateY(${i * STEP}deg) translateX(${HOLE}px)`,
              }}
            >
              {touch ? (
                <WaveMount
                  rot={rot}
                  i={i}
                  S={S}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${p.title} — open on Spotify`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i !== front) {
                      e.preventDefault();
                      bringToFront(i);
                    } else sfx.click();
                  }}
                >
                  <img src={p.src} alt="" draggable="false" loading="lazy" />
                </WaveMount>
              ) : (
              <motion.a
                className="slide__mount"
                href={p.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${p.title} — open on Spotify`}
                initial={false}
                animate={{ y: lifted === i ? -S * (5 / 6) : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                onMouseEnter={() => {
                  setLifted(i);
                  sfx.hover();
                }}
                onMouseLeave={() => setLifted((l) => (l === i ? -1 : l))}
                onFocus={() => setLifted(i)}
                onClick={(e) => {
                  e.stopPropagation();
                  sfx.click();
                }}
              >
                <img src={p.src} alt="" draggable="false" loading="lazy" />
              </motion.a>
              )}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Floating notes on either side of the wheel, sized to the space beside it */}
      <div className="carousel-note carousel-note--left" style={note}>
        {playlistsText.left.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="carousel-note carousel-note--right" style={note}>
        {playlistsText.right.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {narrow && (
        <div className="carousel-intro">
          {playlistsText.left.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {touch ? (
        <div className={`carousel-caption${narrow ? ' is-narrow' : ''}`}>
          <p className="carousel-caption__name" aria-live="polite">
            {hovered?.title}
          </p>
          <p className="carousel-caption__title">my playlists</p>
        </div>
      ) : (
        <p className="carousel-title" aria-live="polite">
          {hovered ? hovered.title : 'my playlists'}
        </p>
      )}
      <p className="carousel-hint">
        {touch
          ? 'swipe to spin · tap the raised slide to listen on Spotify'
          : 'scroll to spin · hover a slide · click to listen on Spotify · esc to close'}
      </p>
    </motion.div>
  );
}
