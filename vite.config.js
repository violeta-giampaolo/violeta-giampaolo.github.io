import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imagetools } from 'vite-imagetools';
import { convertAll } from './scripts/pdf-pages.mjs';

// Keeps projects/<project>/pdf-pages/ in sync with the PDFs: on start, on
// build, and whenever a PDF is added, changed or removed while the site runs.
function pdfPages() {
  let running = Promise.resolve();
  const run = () => (running = running.then(() => convertAll()));
  return {
    name: 'pdf-pages',
    // On GitHub the PDFs aren't uploaded (only the pages made from them), so
    // there's nothing to convert — and converting would delete those pages.
    buildStart: () => (process.env.CI ? undefined : run()),
    configureServer(server) {
      const onPdf = async (file) => {
        if (!file.toLowerCase().endsWith('.pdf')) return;
        const changed = await run();
        if (changed.length) server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onPdf);
      server.watcher.on('change', onPdf);
      server.watcher.on('unlink', onPdf);
    },
  };
}

export default defineConfig({
  // imagetools: converts pictures to WebP / phone sizes when they're imported (see src/content/projects.js)
  plugins: [react(), imagetools(), pdfPages()],
  // Relative paths so the built site works on GitHub Pages and on a custom domain.
  base: './',
  // Wait until a dropped-in file (e.g. a big PDF) has finished copying
  // before reacting to it — Windows locks files while they're being written.
  server: { watch: { awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 } } },
});
