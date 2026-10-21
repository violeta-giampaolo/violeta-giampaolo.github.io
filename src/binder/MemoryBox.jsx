import { useEffect, useMemo, useRef, useState } from 'react';
import { shade } from '../content/palette.js';
import { sfx } from '../sound/sfx.js';

// The inside of a "memory box" book (campaign projects): a hollow book-box
// seen from above, with the project's pictures as polaroids you can push
// around. Laid out in the binder's page space (560 × 720).
const W = 560;
const H = 720;
const WALL = 34; // how deep the inner walls look from above
// Polaroid width (the picture keeps its own proportions); smaller when the
// box is fuller so they still fit.
const photoWidth = (n) => (n <= 6 ? 210 : n <= 9 ? 180 : 160);

// Repeatable "random" so the polaroids land in the same mess every time.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Where each polaroid starts: a loose grid with jitter and a little tilt.
function scatter(n, PHOTO_W) {
  const rnd = seeded(7 + n * 13);
  const cols = n <= 6 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cellW = (W - 2 * WALL) / cols;
  const cellH = (H - 2 * WALL) / Math.max(rows, 2);
  return Array.from({ length: n }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return {
      x: WALL + c * cellW + cellW / 2 - PHOTO_W / 2 + (rnd() - 0.5) * 50,
      y: WALL + r * cellH + (rnd() - 0.5) * 30 - 10,
      rot: (rnd() - 0.5) * 16,
    };
  });
}

// Lets something be pushed around the box with the mouse or a finger.
// `onTap` fires when it's clicked without being moved.
function useDrag(start, scale, onLift, width, onTap) {
  const [pos, setPos] = useState({ x: start.x, y: start.y });
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const node = useRef(null);

  // iPhone Safari can ignore touch-action inside the 3D book and start
  // scrolling instead, which cancels the drag. Blocking the touch's default
  // directly always works.
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const block = (e) => e.preventDefault();
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  const onPointerDown = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, moved: false };
    setDragging(true);
    onLift();
    sfx.hover();
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    // The box is drawn scaled; turn screen pixels back into box pixels.
    const d = drag.current;
    if (Math.hypot(e.clientX - d.px, e.clientY - d.py) > 5) d.moved = true;
    setPos({
      x: Math.min(W - width * 0.4, Math.max(-width * 0.4, d.x + (e.clientX - d.px) / scale)),
      y: Math.min(H - 80, Math.max(-60, d.y + (e.clientY - d.py) / scale)),
    });
  };
  const onPointerUp = () => {
    const tapped = drag.current && !drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (tapped) onTap?.();
  };

  return {
    pos,
    dragging,
    handlers: {
      ref: node,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClick: (e) => e.stopPropagation(),
    },
  };
}

// A polaroid — or, with "cutout": true, just the object itself (no frame,
// no caption, 1.5× bigger), like a label lying loose in the box.
function Polaroid({ photo, start, z, scale, onLift, width }) {
  // "size" in project.json scales a single item (1 = normal, 2 = twice as big).
  const w = width * (photo.size ?? (photo.cutout ? 1.5 : 1));
  // "at": [x, y, tilt] in project.json pins where it starts; otherwise it's
  // scattered. Always start fully inside the box walls.
  const inside = useMemo(() => {
    const s = photo.at ? { x: photo.at[0], y: photo.at[1], rot: photo.at[2] ?? 0 } : start;
    return { ...s, x: Math.max(WALL + 6, Math.min(s.x, W - WALL - 6 - w)) };
  }, [start, w, photo.at]);
  const { pos, dragging, handlers } = useDrag(inside, scale, onLift, w);
  return (
    <figure
      className={`polaroid${photo.cutout ? ' is-cutout' : ''}${dragging ? ' is-dragging' : ''}`}
      style={{ left: pos.x, top: pos.y, width: w, zIndex: z, rotate: `${start.rot}deg` }}
      {...handlers}
    >
      <img src={photo.src} alt={photo.caption ?? ''} draggable="false" loading="lazy" />
      {!photo.cutout && <figcaption>{photo.caption}</figcaption>}
    </figure>
  );
}


// A memory-game card: face down shows the shared back; tap to flip it,
// drag to move it.
function MemoryCard({ card, start, z, scale, size, faceUp, matched, onLift, onTap }) {
  const { pos, dragging, handlers } = useDrag(start, scale, onLift, size, onTap);
  return (
    <div
      className={`mcard${faceUp ? ' is-up' : ''}${matched ? ' is-matched' : ''}${dragging ? ' is-dragging' : ''}`}
      style={{ left: pos.x, top: pos.y, width: size, height: size, zIndex: z, rotate: `${start.rot}deg` }}
      {...handlers}
    >
      <div className="mcard__inner">
        <img className="mcard__face mcard__back" src={card.back} alt="" draggable="false" />
        <img className="mcard__face mcard__front" src={card.front} alt="" draggable="false" />
      </div>
    </div>
  );
}

// The memory game: pairs of cards, all face down. Flip two — if they match
// they stay up, if not they turn back over.
function useMemoryGame(project) {
  const cfg = project.memory;
  const deck = useMemo(() => {
    if (!cfg) return [];
    const img = (n) => project.cardImages?.[n];
    const rnd = seeded(31);
    const cards = cfg.fronts.flatMap((f) => [0, 1].map((k) => ({ id: `${f}-${k}`, pair: f, front: img(f), back: img(cfg.back) })));
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    // Laid out in a loose grid inside cfg.area: [x, y, width, height]
    const [ax, ay, aw, ah] = cfg.area ?? [60, 440, 440, 220];
    const cols = Math.ceil(cards.length / 2);
    return cards.map((c, i) => ({
      ...c,
      start: {
        x: ax + (i % cols) * (aw / cols) + (rnd() - 0.5) * 12,
        y: ay + Math.floor(i / cols) * (ah / 2) + (rnd() - 0.5) * 12,
        rot: (rnd() - 0.5) * 14,
      },
    }));
  }, [cfg, project.cardImages]);

  const [up, setUp] = useState([]); // flipped, not yet matched
  const [matched, setMatched] = useState([]);
  const busy = useRef(false);

  const tap = (card) => {
    if (busy.current || matched.includes(card.id)) return;
    if (up.includes(card.id)) {
      setUp((u) => u.filter((x) => x !== card.id));
      sfx.page();
      return;
    }
    sfx.page();
    const next = [...up, card.id];
    if (next.length < 2) return setUp(next);
    setUp(next);
    const [a, b] = next.map((id) => deck.find((c) => c.id === id));
    if (a.pair === b.pair) {
      setTimeout(() => {
        setMatched((m) => [...m, a.id, b.id]);
        setUp([]);
        sfx.click();
      }, 350);
    } else {
      busy.current = true;
      setTimeout(() => {
        setUp([]);
        busy.current = false;
        sfx.page();
      }, 1000);
    }
  };
  // Once every pair is found, the "correct" outlines fade away after 5 s.
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!deck.length || matched.length < deck.length) return;
    const t = setTimeout(() => setFinished(true), 5000);
    return () => clearTimeout(t);
  }, [matched.length, deck.length]);

  return { deck, up, matched, finished, tap, size: cfg?.size ?? 92 };
}

function StickyNote({ project, className = '', style }) {
  const text = project.description?.en ?? project.description ?? '';
  return (
    <div className={`sticky-note ${className}`} style={style}>
      {String(text)
        .split(/\n\s*\n/)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}

// Inside of the hard cover: the title and a sticky note with the description.
export function BoxLid({ project }) {
  return (
    <div className="box-lid">
      <h2 className="box-lid__title">{project.title}</h2>
      {project.subtitle && <p className="box-lid__subtitle">{project.subtitle}</p>}
      <StickyNote project={project} />
    </div>
  );
}

// The empty box (walls and floor). It lives inside the 3D book.
export function MemoryBox({ project }) {
  const color = project.color ?? '#8C162C';
  return (
    <div className="memory-box" style={{ '--floor': shade(color, 0.93), '--wall-a': shade(color, 0.8), '--wall-b': shade(color, 0.7), '--wall-c': shade(color, 0.86) }}>
      {/* The four inner walls, seen from above */}
      <span className="memory-box__wall memory-box__wall--top" style={{ height: WALL }} />
      <span className="memory-box__wall memory-box__wall--left" style={{ width: WALL }} />
      <span className="memory-box__wall memory-box__wall--right" style={{ width: WALL }} />
      <span className="memory-box__wall memory-box__wall--bottom" style={{ height: WALL }} />
      <span className="memory-box__floor" style={{ inset: WALL }} />
    </div>
  );
}

// What's inside the box: the polaroids and the memory game. Drawn on a flat
// layer over the open box, not inside the 3D book: iPhone Safari loses taps
// on things inside 3D (they fell through and closed the book) and drew them
// through the cover while it swung. (On phones there's no lid, so no note.)
export function MemoryBoxItems({ project, scale }) {
  const photos = useMemo(
    () =>
      (project.photos ?? []).map((p) => ({
        ...p,
        src: project.images?.[p.image] ?? null,
      })),
    [project],
  );
  const PHOTO_W = photoWidth(photos.length);
  const starts = useMemo(() => scatter(photos.length, PHOTO_W), [photos.length, PHOTO_W]);
  // Stacking order, last = on top.
  const game = useMemoryGame(project);
  const [order, setOrder] = useState(() => [...photos.map((_, i) => i), ...game.deck.map((c) => c.id)]);
  const lift = (i) => setOrder((o) => [...o.filter((x) => x !== i), i]);

  return (
    <div className="memory-box__items" style={{ width: W, height: H, transform: `scale(${scale})` }}>
      {photos.map((p, i) => (
        <Polaroid key={p.image} photo={p} start={starts[i]} z={10 + order.indexOf(i)} scale={scale} width={PHOTO_W} onLift={() => lift(i)} />
      ))}

      {game.deck.map((c) => (
        <MemoryCard
          key={c.id}
          card={c}
          start={c.start}
          size={game.size}
          z={10 + order.indexOf(c.id)}
          scale={scale}
          faceUp={game.up.includes(c.id) || game.matched.includes(c.id)}
          matched={!game.finished && game.matched.includes(c.id)}
          onLift={() => lift(c.id)}
          onTap={() => game.tap(c)}
        />
      ))}
    </div>
  );
}
