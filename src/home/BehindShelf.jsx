import { sfx } from '../sound/sfx.js';
import portrait from '../assets/behind/portrait.webp';
import stand from '../assets/behind/stand.svg';
import asterisk from '../assets/behind/asterisk.svg';
import heart from '../assets/behind/heart.svg';
import punctuation from '../assets/behind/punctuation.svg';
import quote from '../assets/behind/quote.svg';

// The "behind the shelf" page (Figma ".behind the shelf"): her portrait in a
// frame and the same glyphs that open things on the main shelf.
// Everything is placed in the Figma frame's 1440 × 900 space.
const SHELF_TOP = 722.8;

// box: [left, top, width, height], the clickable area. art: the drawing's size.
const GLYPHS = [
  { link: 'quote', label: 'Request a quote', src: quote, box: [1218.51, 457.67, 133.76, 114.4], art: [135.76, 116.4], turn: 180, scene: 1 },
  { link: 'resume', label: 'Resume', src: asterisk, box: [101.77, 294.5, 124.36, 124.2], art: [126.36, 126.2], scene: 0 },
  { link: 'contact', label: 'Contact', src: heart, box: [329.45, 581.4, 213.03, 129.22], art: [215.03, 131.22], scene: 0 },
  { link: 'secret', label: '¿?', src: punctuation, box: [757.65, 503.64, 269.6, 231.56], art: [231.2, 173.67], turn: -17.13, scene: 1 },
];

// The two flat books the quote marks stand on: [left, top, width, height].
const SLABS = [
  [1016.32, 579.04, 343.41, 72.3],
  [988.1, 660, 377.68, 62.8],
];

// On a phone the page becomes two shelves. Each shows part of the Figma frame:
// [left edge, top edge, width].
const SCENES = [
  [93.46, 294.5, 449.02],
  [757.65, 457.67, 608.13],
];

const place = ([left, top, width, height]) => ({ left, top, width, height });

function Portrait({ onOpen, canHover }) {
  return (
    <button
      type="button"
      className="cat-piece cat-piece--portrait"
      style={{ ...place([163.95, 348.35, 262.49, 374.45]), '--enter': '0ms' }}
      aria-label="About me"
      onMouseEnter={canHover ? sfx.hover : undefined}
      onClick={() => onOpen({ kind: 'link', link: 'about', label: 'About me' })}
    >
      <span className="cat-piece__art">
        <img className="cat-portrait__stand" src={stand} alt="" draggable="false" />
        <span className="cat-portrait__frame">
          <img src={portrait} alt="" draggable="false" />
        </span>
      </span>
    </button>
  );
}

function Pieces({ scene, onOpen, canHover }) {
  const all = scene === undefined;
  return (
    <>
      {(all || scene === 1) &&
        SLABS.map((slab, i) => <span key={i} className="cat-solid cat-slab" style={{ ...place(slab), '--enter': `${120 + i * 40}ms` }} />)}
      {(all || scene === 0) && <Portrait onOpen={onOpen} canHover={canHover} />}
      {GLYPHS.filter((g) => all || g.scene === scene).map((g, i) => (
        <button
          key={g.link}
          type="button"
          className="cat-piece"
          style={{ ...place(g.box), '--enter': `${200 + i * 60}ms` }}
          aria-label={g.label}
          onMouseEnter={canHover ? sfx.hover : undefined}
          onClick={() => onOpen({ kind: 'link', link: g.link, label: g.label })}
        >
          <span className="cat-piece__art">
            <img
              src={g.src}
              alt=""
              draggable="false"
              style={{ width: g.art[0], height: g.art[1], transform: `translate(-50%, -50%) rotate(${g.turn ?? 0}deg)` }}
            />
          </span>
        </button>
      ))}
    </>
  );
}

// Desktop: everything on the one shelf, exactly like the prototype.
export function BehindStage({ onOpen, canHover }) {
  return <Pieces onOpen={onOpen} canHover={canHover} />;
}

// Phone: the same pieces on two shelves.
export function BehindRows({ onOpen, canHover, scale }) {
  return (
    <div className="cat-rows" style={{ '--s': scale }}>
      {SCENES.map(([left, top, width], i) => {
        const k = (Math.min(width, 430) / width) * scale * (i === 0 ? 0.88 : 0.95);
        return (
          <div key={i} className="cat-row">
            <div className="cat-scene" style={{ width: width * k, height: (SHELF_TOP - top) * k }}>
              <div style={{ transform: `scale(${k}) translate(${-left}px, ${-top}px)` }}>
                <Pieces scene={i} onOpen={onOpen} canHover={canHover} />
              </div>
            </div>
            <span className="cat-row__shelf" />
          </div>
        );
      })}
    </div>
  );
}
