const SVG_NS = 'http://www.w3.org/2000/svg';
const POLYGON_PATH = /^[MLZ\d\s.,eE-]+$/i;

// The outline points of a book shape, in its own coordinates.
function localPoints(shape) {
  if (shape.tagName === 'rect') {
    const x = +shape.getAttribute('x') || 0;
    const y = +shape.getAttribute('y') || 0;
    const w = +shape.getAttribute('width');
    const h = +shape.getAttribute('height');
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  const d = shape.getAttribute('d') ?? '';
  if (POLYGON_PATH.test(d)) {
    const n = d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    if (pts.length >= 4) return pts;
  }
  const b = shape.getBBox();
  return [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]];
}

// Books drawn as a group: use the biggest shape inside.
function mainShape(el) {
  if (el.tagName !== 'g') return el;
  let best = null;
  let bestArea = 0;
  for (const s of el.querySelectorAll('rect, path')) {
    const b = s.getBBox();
    if (b.width * b.height > bestArea) {
      best = s;
      bestArea = b.width * b.height;
    }
  }
  return best;
}


// Where a book sits: centre, length, thickness and direction (top → bottom of
// the book). `toSpace(shape)` gives the matrix into the wanted coordinates —
// the shelf's SVG for spine titles, the screen for the flying book.
// Standing books point down, lying books point right.
export function bookFrame(book, toSpace) {
  const shape = mainShape(book);
  if (!shape) return null;
  const m = toSpace(shape);
  const pts = localPoints(shape).map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));

  // The book's longest edge gives its direction; measuring every outline
  // point along and across it gives length, thickness and centre.
  let along = { x: 1, y: 0 };
  let longest = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len > longest) {
      longest = len;
      along = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    }
  });
  const standing = Math.abs(along.y) >= Math.abs(along.x);
  if ((standing && along.y < 0) || (!standing && along.x < 0)) along = { x: -along.x, y: -along.y };
  const across = { x: -along.y, y: along.x };

  const project = (axis) => pts.map((p) => p.x * axis.x + p.y * axis.y);
  const a = project(along);
  const c = project(across);
  const [aMin, aMax, cMin, cMax] = [Math.min(...a), Math.max(...a), Math.min(...c), Math.max(...c)];
  const mid = { a: (aMin + aMax) / 2, c: (cMin + cMax) / 2 };
  return {
    shape,
    along,
    length: aMax - aMin,
    thickness: cMax - cMin,
    cx: along.x * mid.a + across.x * mid.c,
    cy: along.y * mid.a + across.y * mid.c,
    angle: (Math.atan2(along.y, along.x) * 180) / Math.PI,
  };
}

// Writes each project's title along its book: centred on the spine, reading
// top→bottom on standing books and left→right on lying ones.
export function addSpineTitles(root) {
  for (const book of root.querySelectorAll('[data-spine]')) {
    const svg = book.ownerSVGElement;
    const key = book.getAttribute('data-key');
    if (svg.querySelector(`.spine-text[data-key="${CSS.escape(key)}"]`)) continue;

    const frame = bookFrame(book, (shape) => svg.getScreenCTM().inverse().multiply(shape.getScreenCTM()));
    if (!frame) continue;
    const { shape, length, thickness, cx, cy, angle } = frame;

    // Stretch the title so its letters touch both ends and both edges of the
    // spine (the font's proportions change to fit — that's intended).
    const title = book.getAttribute('data-spine');
    const stacked = book.hasAttribute('data-spine-stack');

    let text;
    if (stacked) {
      // One upright letter above the next, each stretched to fill its share
      // of the spine ("spine": { "stack": true }).
      text = document.createElementNS(SVG_NS, 'g');
      text.setAttribute(
        'transform',
        `translate(${cx} ${cy}) rotate(${angle - 90}) translate(${-thickness / 2} ${-length / 2})`,
      );
      stackedLetters(title).forEach(({ letter, y, h, sx, sy, ink }) => {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('font-size', MEASURE_SIZE);
        t.setAttribute(
          'transform',
          `translate(0 ${y * length}) scale(${thickness * sx} ${length * h * sy}) translate(${ink.left} ${ink.ascent})`,
        );
        t.textContent = letter;
        text.appendChild(t);
      });
    } else {
      const ink = inkBox(title);
      text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('font-size', MEASURE_SIZE);
      text.setAttribute(
        'transform',
        `translate(${cx} ${cy}) rotate(${angle}) scale(${length / ink.width} ${thickness / ink.height}) translate(${-ink.cx} ${-ink.cy})`,
      );
      text.textContent = title;
    }
    text.setAttribute('class', `${book.getAttribute('class')} spine-text`);
    text.setAttribute('data-key', key);
    text.setAttribute('aria-hidden', 'true');
    // White unless the project sets "spine": { "color": … }
    text.setAttribute('fill', book.getAttribute('data-spine-color') || '#fff');
    // Inside the book's pop-out wrapper so the title moves with the book.
    (book.closest('.shelf-pop') ?? svg).appendChild(text);
  }
}

const MEASURE_SIZE = 100;
const SPINE_FONT = `600 ${MEASURE_SIZE}px Oswald, 'Arial Narrow', sans-serif`;
let measureCtx = null;

// The exact area the letters' ink covers (not the font's line box), measured
// at 100px with the baseline at y = 0. Also used by the 3D book's spine.
export function inkBox(text) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  measureCtx.font = SPINE_FONT;
  const m = measureCtx.measureText(text);
  const left = m.actualBoundingBoxLeft;
  const right = m.actualBoundingBoxRight;
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  return {
    left,
    right,
    ascent,
    descent,
    width: left + right,
    height: ascent + descent,
    cx: (right - left) / 2,
    cy: (descent - ascent) / 2,
  };
}

export const SPINE_FONT_SIZE = MEASURE_SIZE;

const STACK_GAP = 0.06; // space between stacked letters, as a share of each letter's cell

// Layout of a stacked spine title in a 1 × 1 box: each letter gets an equal
// slice of the height (y, h) and the scale (sx, sy) that stretches its ink
// to fill the slice's full width and height.
export function stackedLetters(title) {
  const letters = [...title.replace(/\s+/g, '')];
  const cell = 1 / letters.length;
  return letters.map((letter, i) => {
    const ink = inkBox(letter);
    return {
      letter,
      ink,
      y: i * cell + (cell * STACK_GAP) / 2,
      h: cell * (1 - STACK_GAP),
      sx: 1 / ink.width,
      sy: 1 / ink.height,
    };
  });
}
