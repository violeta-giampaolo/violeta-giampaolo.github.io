import { useMemo } from 'react';
import { silhouetteQuote } from '../content/site.js';
import { sfx } from '../sound/sfx.js';

const LINE_HEIGHT = 1.18; // × font size
const INSET = 1.5; // stage px kept free along the outline
const MIN_SEGMENT = 1.4; // × font size; narrower gaps are left empty
const font = (size, bold) => `italic ${bold ? 'bold ' : ''}${size}px Georgia, 'Times New Roman', serif`;

// Horizontal spans inside the polygon at height y. Uses the nonzero rule
// (like Illustrator's fill), so where the outline crosses itself — the arm
// over the body — it still counts as inside.
function spansAt(poly, y) {
  const hits = [];
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    if (y1 === y2 || y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
    hits.push({ x: x1 + ((y - y1) / (y2 - y1)) * (x2 - x1), dir: y2 > y1 ? 1 : -1 });
  }
  hits.sort((a, b) => a.x - b.x);
  const spans = [];
  let winding = 0;
  let start = 0;
  for (const { x, dir } of hits) {
    const before = winding;
    winding += dir;
    if (before === 0 && winding !== 0) start = x;
    if (before !== 0 && winding === 0) spans.push([start, x]);
  }
  return spans;
}

// Spans that are inside the figure for the whole height of a line.
function lineSpans(poly, top, bottom) {
  const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => top + (bottom - top) * t);
  let spans = spansAt(poly, samples[0]);
  for (const y of samples.slice(1)) {
    const next = spansAt(poly, y);
    const out = [];
    for (const [a1, b1] of spans) {
      for (const [a2, b2] of next) {
        const a = Math.max(a1, a2);
        const b = Math.min(b1, b2);
        if (b > a) out.push([a, b]);
      }
    }
    spans = out;
  }
  return spans.map(([a, b]) => [a + INSET, b - INSET]).filter(([a, b]) => b > a);
}

// Sets the quote inside the figure line by line, from the top of the hood
// down. Returns the placed words, or null if it doesn't all fit at this size.
function layout(poly, box, words, size, measure) {
  const lineH = size * LINE_HEIGHT;
  const space = measure(' ', size, false);
  const placed = [];
  let w = 0;
  let carry = null; // second half of a hyphenated word

  // The longest start of `word` that fits in `room` with a hyphen.
  // Only words of 6+ letters, with at least 3 letters on each side.
  const hyphenate = (word, room) => {
    const letters = (s) => (s.match(/\p{L}/gu) ?? []).length;
    if (letters(word.text) < 6) return null;
    for (let n = word.text.length - 1; n >= 3; n--) {
      if (letters(word.text.slice(0, n)) < 3 || letters(word.text.slice(n)) < 3) continue;
      if (/[^\p{L}]/u.test(word.text[n - 1]) || /[^\p{L}]/u.test(word.text[n])) continue;
      const head = `${word.text.slice(0, n)}-`;
      const width = measure(head, size, word.bold);
      if (width <= room) return { head: { ...word, text: head, width }, tail: { ...word, text: word.text.slice(n) } };
    }
    return null;
  };

  for (let top = box.y; top + lineH * 0.6 <= box.y + box.h; top += lineH) {
    for (const [a, b] of lineSpans(poly, top, Math.min(top + lineH, box.y + box.h))) {
      if (w >= words.length && !carry) return placed;
      if (b - a < size * MIN_SEGMENT) continue;
      const line = [];
      let used = 0;
      while (carry || w < words.length) {
        const word = carry ?? words[w];
        const width = measure(word.text, size, word.bold);
        const lead = line.length ? used + space : 0;
        if (lead + width > b - a) {
          // Fill the rest of the line with part of the word, if it's worth it.
          // A word is only ever broken once.
          const room = b - a - lead;
          const split = !carry && room > size * 1.6 ? hyphenate(word, room) : null;
          if (split) {
            line.push(split.head);
            used = lead + split.head.width;
            w++; // the word now lives on in its second half
            carry = split.tail;
          }
          break;
        }
        line.push({ ...word, width });
        used = lead + width;
        if (carry) carry = null;
        else w++;
      }
      if (!line.length) continue;
      // Justify every line except the very last one.
      const last = w >= words.length && !carry;
      const gap = line.length > 1 && !last ? (b - a - (used - space * (line.length - 1))) / (line.length - 1) : space;
      let x = line.length > 1 || last ? a : a + (b - a - used) / 2;
      for (const word of line) {
        placed.push({ text: word.text, bold: word.bold, x, y: top + size * 0.95 });
        x += word.width + gap;
      }
    }
  }
  return w >= words.length && !carry ? placed : null;
}

// The walking figure from the background drawing (layer "SILHOUETTE").
// Hovering it swaps the solid figure for your quote, set inside its outline
// at the largest size where the whole quote fits.
export function SilhouetteQuote({ drawing }) {
  const { points, poly, box } = useMemo(() => {
    const layer = drawing.slice(drawing.indexOf('id="SILHOUETTE"'));
    const pts = layer.match(/points="([^"]+)"/)[1].trim();
    const nums = pts.split(/[\s,]+/).map(Number);
    const p = [];
    for (let i = 0; i + 1 < nums.length; i += 2) p.push([nums[i], nums[i + 1]]);
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { points: pts, poly: p, box: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } };
  }, [drawing]);

  const { words, size } = useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    const cache = new Map();
    const measure = (text, s, bold) => {
      const k = `${s}|${bold}|${text}`;
      if (!cache.has(k)) {
        ctx.font = font(s, bold);
        cache.set(k, ctx.measureText(text).width);
      }
      return cache.get(k);
    };
    const split = (text, bold) => text.trim().split(/\s+/).map((t) => ({ text: t, bold }));
    const list = [...split(silhouetteQuote.intro, true), ...split(silhouetteQuote.body, false)];

    let lo = 3;
    let hi = 20;
    let best = { words: layout(poly, box, list, lo, measure) ?? [], size: lo };
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      const fit = layout(poly, box, list, mid, measure);
      if (fit) {
        best = { words: fit, size: mid };
        lo = mid;
      } else hi = mid;
    }
    return best;
  }, [poly, box]);

  const label = `${silhouetteQuote.intro} ${silhouetteQuote.body}`;
  return (
    <svg className="silhouette-quote" viewBox="0 0 1440 900" aria-label={label} role="img">
      <g className="silhouette-fill">
        {/* Covers the solid figure from the drawing */}
        <polygon points={points} fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        {words.map((w, i) => (
          <text key={i} x={w.x} y={w.y} fontSize={size} fontWeight={w.bold ? 'bold' : undefined}>
            {w.text}
          </text>
        ))}
      </g>
      {/* Invisible hover target in the exact shape of the figure */}
      <polygon className="silhouette-hit" points={points} onMouseEnter={sfx.hover} />
    </svg>
  );
}
