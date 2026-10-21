import { resolveColor } from './palette.js';

// Every folder inside /projects with a project.json becomes a book.
const files = import.meta.glob('../../projects/*/project.json', { eager: true, import: 'default' });

// Pictures are converted to WebP when the site is built (same size in
// pixels, a fraction of the weight), and phones get lighter copies — a phone
// screen never needs more than about 1000px. The files in /projects stay as
// they are. Each set is listed twice (full / phone) and only one is used.
export const PHONE = typeof window !== 'undefined' && Math.min(window.screen.width, window.screen.height) < 600;
const pick = (full, phone) => (PHONE ? phone : full);

// Optional cover texture: drop texture.jpg / .png / .webp into the project folder.
// It's blended onto the book's colour (see "cover" in projects/README.md).
const textures = pick(
  import.meta.glob('../../projects/*/texture.{jpg,jpeg,png,webp}', { eager: true, query: { format: 'webp', quality: '86' }, import: 'default' }),
  import.meta.glob('../../projects/*/texture.{jpg,jpeg,png,webp}', { eager: true, query: { w: '800', format: 'webp', quality: '80' }, import: 'default' }),
);

// Pictures for the binder pages and memory boxes: projects/<slug>/pages/01.jpg, 02.jpg …
const pageImages = pick(
  import.meta.glob('../../projects/*/pages/*.{jpg,jpeg,png,webp}', { eager: true, query: { format: 'webp', quality: '86' }, import: 'default' }),
  import.meta.glob('../../projects/*/pages/*.{jpg,jpeg,png,webp}', { eager: true, query: { w: '1000', format: 'webp', quality: '80' }, import: 'default' }),
);

// The project's PDF, already turned into one picture per page
// (projects/<slug>/pdf-pages/ — made automatically by scripts/pdf-pages.mjs).
const pdfPageFiles = pick(
  import.meta.glob('../../projects/*/pdf-pages/*.webp', { eager: true, query: '?url', import: 'default' }),
  import.meta.glob('../../projects/*/pdf-pages/*.webp', { eager: true, query: { w: '1100', format: 'webp', quality: '80' }, import: 'default' }),
);

// Memory-game card faces (memory boxes): projects/<slug>/cards/*.jpg
const cardFiles = import.meta.glob('../../projects/*/cards/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: { w: '400', format: 'webp', quality: '84' },
  import: 'default',
});
const cardsBySlug = {};
for (const path of Object.keys(cardFiles)) {
  const parts = path.split('/');
  (cardsBySlug[parts.at(-3)] ??= {})[parts.at(-1)] = cardFiles[path];
}

// Each converted PDF's manifest (page count and page shape).
const manifests = import.meta.glob('../../projects/*/pdf-pages/manifest.json', { eager: true, import: 'default' });
const aspectBySlug = Object.fromEntries(
  Object.entries(manifests).map(([path, m]) => [path.split('/').at(-3), m.aspect ?? null]),
);

const slugOf = (path) => path.split('/').at(-2);
const pdfPagesBySlug = {};
for (const path of Object.keys(pdfPageFiles).sort()) (pdfPagesBySlug[path.split('/').at(-3)] ??= []).push(pdfPageFiles[path]);
const textureBySlug = Object.fromEntries(Object.entries(textures).map(([path, url]) => [slugOf(path), url]));

// { slug: { "01.jpg": url, … } } in file-name order.
const imagesBySlug = {};
for (const path of Object.keys(pageImages).sort()) {
  const parts = path.split('/');
  const slug = parts.at(-3);
  (imagesBySlug[slug] ??= {})[parts.at(-1)] = pageImages[path];
}

// "hidden": true in a project.json takes it off the shelf: its book stays a
// plain, unclickable book until the project is ready.
export const projects = Object.entries(files)
  .filter(([, data]) => !data.hidden)
  .map(([path, data]) => ({
    ...data,
    slug: slugOf(path),
    color: resolveColor(data.color),
    texture: textureBySlug[slugOf(path)] ?? null,
    images: imagesBySlug[slugOf(path)] ?? {},
    pdfPages: pdfPagesBySlug[slugOf(path)] ?? [],
    cardImages: cardsBySlug[slugOf(path)] ?? {},
    // width ÷ height of the PDF's pages (used by magazines, which keep their own shape)
    pageAspect: aspectBySlug[slugOf(path)] ?? 0.707,
  }))
  .sort((a, b) => String(a.number ?? '').localeCompare(String(b.number ?? '')));
