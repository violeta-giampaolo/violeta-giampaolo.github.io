// Turns a project into the list of pages inside its binder:
//   1. title page   2. text page (EN / ES)   3+. picture pages
// Picture pages come from "pages" in project.json if it's there, otherwise
// every picture in the project's pages/ folder gets its own framed page.

const LAYOUTS = ['full', 'framed', 'pair', 'wide'];

export function buildPages(project) {
  const pages = [{ type: 'title' }, { type: 'text' }];
  const files = project.images ?? {};
  const url = (name) => files[name] ?? null;

  const listed = Array.isArray(project.pages) ? project.pages : null;
  const pictures = listed
    ? listed.map((p) => ({
        layout: LAYOUTS.includes(p.layout) ? p.layout : 'framed',
        images: (p.images ?? (p.image ? [p.image] : [])).map(url),
        caption: p.caption ?? '',
      }))
    : Object.values(files).map((src) => ({ layout: 'framed', images: [src], caption: '' }));

  for (const p of pictures) pages.push({ type: 'image', ...p });

  // Page numbers as in Figma: picture pages start at 02.
  pages.forEach((p, i) => {
    p.folio = i >= 2 ? String(i).padStart(2, '0') : '';
  });
  return pages;
}
