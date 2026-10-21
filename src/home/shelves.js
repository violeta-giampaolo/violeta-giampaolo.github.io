import { projects } from '../content/projects.js';
import { shelfLinks, shelfGroups } from '../content/shelfLinks.js';

// Shelf artwork exported from Figma (Desktop - Home → shelf-XX-items).
// Every book / letter / glyph keeps its Figma layer name as its id.
const svgs = import.meta.glob('../assets/home/shelf-*.svg', { eager: true, query: '?raw', import: 'default' });

// Objects drawn in Figma that sit on a shelf but aren't part of its artwork.
// [shelf, file, x, y] — x/y are where the object sits inside the shelf.
import projectorSvg from '../assets/home/projector.svg?raw';
const shelfObjects = [['06', projectorSvg, 10.14, 4.66]];

export const SHELF_W = 431.944;
export const SHELF_H = 93.519;

// Where each shelf's items sit inside the shelf (from Figma).
const itemOffsets = {
  '01': [0.87, 0.76],
  '02': [178.49, 3.1],
  '03': [35.78, 2.03],
  '04': [85.76, 3.77],
  '05': [6.25, 2.68],
  '06': [245.92, 4.25],
  '07': [2.5, 0.36],
  '08': [6.63, 2.13],
  '09': [5.53, 1.52],
  '10': [8.94, 1.89],
  '11': [85.15, 0.86],
  '12': [6.63, 3.07],
};

const ITEM_ID = /^(book|letter|glyph|object)-/;
const SVG_NS = 'http://www.w3.org/2000/svg';

function groupKey(id) {
  return shelfGroups.find((g) => id.startsWith(g.startsWith))?.key ?? id;
}

// What happens when an item is clicked: open a project, a link, or nothing.
function targetFor(key) {
  const project = projects.find((p) => p.shelfBook === key);
  if (project) return { kind: 'project', project, label: project.title, category: project.category };
  const link = shelfLinks.find((l) => key.startsWith(l.startsWith));
  if (link) return { kind: 'link', link: link.link, label: link.label, category: link.category };
  return null;
}

export const targets = new Map();

// Layers named as letters in Figma that are really books on the shelf.
const renamed = {
  'letter-12-L-stem-pink': 'book-12-06-pink',
  'letter-12-L-base-burgundy': 'book-12-07-burgundy',
};

function prepare(svgText, no) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;

  // Add this shelf's objects, moved into the items artwork's coordinates.
  const [ox, oy] = itemOffsets[no];
  for (const [shelf, text, x, y] of shelfObjects) {
    if (shelf !== no) continue;
    const obj = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
    const g = doc.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${x - ox} ${y - oy})`);
    for (const child of [...obj.childNodes]) g.appendChild(doc.importNode(child, true));
    svg.appendChild(g);
  }
  svg.removeAttribute('style');
  svg.setAttribute('class', 'shelf-svg');
  svg.setAttribute('aria-hidden', 'false');

  for (const el of svg.querySelectorAll('[id]')) {
    if (renamed[el.id]) el.id = renamed[el.id];
    if (!ITEM_ID.test(el.id) || el.parentElement.closest('[data-key]')) continue;
    const key = groupKey(el.id);
    el.setAttribute('data-key', key);
    el.setAttribute('class', 'shelf-item');

    // Wrapper that pops the item out on hover. The item keeps its own Figma
    // transform; the pop is applied to the wrapper so the two don't clash.
    const pop = doc.createElementNS(SVG_NS, 'g');
    pop.setAttribute('class', 'shelf-pop');
    pop.setAttribute('data-pop', key);
    el.replaceWith(pop);
    pop.appendChild(el);

    const target = targetFor(key);
    if (!target) continue;
    el.setAttribute('class', 'shelf-item is-interactive');
    // Only the first shape of a group is a keyboard stop.
    if (!targets.has(key)) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', target.label);
    }
    targets.set(key, target);

    if (target.kind === 'project') {
      const { color, spine, title } = target.project;
      if (color) {
        const painted = el.hasAttribute('fill') ? [el] : [...el.querySelectorAll('[fill]')];
        painted.forEach((p) => p.setAttribute('fill', color));
      }
      const spineTitle = spine?.title ?? title;
      if (spineTitle) el.setAttribute('data-spine', spineTitle);
      if (spine?.color) el.setAttribute('data-spine-color', spine.color);
      if (spine?.stack) el.setAttribute('data-spine-stack', '');
    }
  }
  return new XMLSerializer().serializeToString(svg);
}

export const shelves = Object.entries(svgs)
  .map(([path, text]) => {
    const no = path.match(/shelf-(\d+)\.svg$/)[1];
    return { no, html: prepare(text, no), offset: itemOffsets[no] };
  })
  .sort((a, b) => a.no.localeCompare(b.no));
