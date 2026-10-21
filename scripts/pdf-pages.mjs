// Turns each project's PDF(s) into one picture per page, so the website loads
// light images (one at a time, as you turn) instead of a whole PDF.
//
//   projects/<project>/*.pdf  →  projects/<project>/pdf-pages/001.webp, 002.webp …
//
// It uses Microsoft Edge (already on Windows) to draw the pages. Runs on its
// own when the site starts and whenever a PDF is added or changed; can also be
// run by hand with `npm run pages`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(ROOT, 'projects');
const OUT = 'pdf-pages';
const WIDTH = 1680; // px per page (3× the 560 design width — sharp on any screen)
const QUALITY = 0.85;

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));

const pdfsOf = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort()
    .map((f) => path.join(dir, f));

// A fingerprint of the PDFs, so unchanged projects are skipped.
const stamp = (files) => files.map((f) => `${path.basename(f)}:${fs.statSync(f).size}:${fs.statSync(f).mtimeMs}`).join('|');

function needsWork(dir) {
  const files = pdfsOf(dir);
  const out = path.join(dir, OUT);
  const manifest = path.join(out, 'manifest.json');
  if (!files.length) return fs.existsSync(out); // PDF removed → clean up
  if (!fs.existsSync(manifest)) return true;
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).stamp !== stamp(files);
}

let browserPromise = null;
async function browser() {
  if (!EDGE) throw new Error('Microsoft Edge (or Chrome) was not found.');
  const { default: puppeteer } = await import('puppeteer-core');
  browserPromise ??= puppeteer.launch({ executablePath: EDGE, headless: true });
  return browserPromise;
}

async function convert(dir) {
  const files = pdfsOf(dir);
  const out = path.join(dir, OUT);
  fs.rmSync(out, { recursive: true, force: true });
  if (!files.length) return 0;
  fs.mkdirSync(out, { recursive: true });

  const page = await (await browser()).newPage();
  const lib = fs.readFileSync(path.join(ROOT, 'node_modules/pdfjs-dist/build/pdf.min.mjs'), 'utf8');
  const worker = fs.readFileSync(path.join(ROOT, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), 'utf8');
  await page.evaluate(
    async (lib, worker) => {
      const url = (code) => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      window.pdfjs = await import(url(lib));
      window.pdfjs.GlobalWorkerOptions.workerSrc = url(worker);
    },
    lib,
    worker,
  );

  let n = 0;
  let aspect = null;
  for (const file of files) {
    const data = fs.readFileSync(file).toString('base64');
    const count = await page.evaluate(async (data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      window.doc = await window.pdfjs.getDocument({ data: bytes }).promise;
      return window.doc.numPages;
    }, data);
    for (let i = 1; i <= count; i++) {
      const [webp, ratio] = await page.evaluate(
        async (i, width, quality) => {
          const p = await window.doc.getPage(i);
          const base = p.getViewport({ scale: 1 });
          const viewport = p.getViewport({ scale: width / base.width });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await p.render({ canvasContext: ctx, viewport }).promise;
          return [canvas.toDataURL('image/webp', quality).split(',')[1], canvas.width / canvas.height];
        },
        i,
        WIDTH,
        QUALITY,
      );
      n++;
      aspect ??= ratio;
      fs.writeFileSync(path.join(out, `${String(n).padStart(3, '0')}.webp`), Buffer.from(webp, 'base64'));
    }
  }
  await page.close();
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ stamp: stamp(files), pages: n, aspect }, null, 2));
  return n;
}

// Converts every project that changed. Returns the projects it touched.
export async function convertAll(log = console.log) {
  const done = [];
  for (const name of fs.readdirSync(PROJECTS)) {
    const dir = path.join(PROJECTS, name);
    if (!fs.statSync(dir).isDirectory() || !needsWork(dir)) continue;
    try {
      const n = await convert(dir);
      log(n ? `  pdf → pages: ${name} (${n} pages)` : `  pdf → pages: ${name} (removed)`);
      done.push(name);
    } catch (err) {
      log(`  pdf → pages: ${name} FAILED — ${err.message}`);
    }
  }
  if (browserPromise) {
    await (await browserPromise).close();
    browserPromise = null;
  }
  return done;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  convertAll().then((d) => console.log(d.length ? 'Done.' : 'Everything was already up to date.'));
}
