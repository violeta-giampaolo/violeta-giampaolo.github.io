import { useEffect, useMemo } from 'react';

const TILE = 512; // css px; the grain repeats every 512px, too random to notice

// Paper grain drawn in the browser at the screen's real resolution, so it is
// always crisp (the original texture file was lost and was too small anyway).
function drawTile() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE * dpr;
  const ctx = canvas.getContext('2d');

  // Fine grain: every pixel a little darker or not.
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const shade = 90 + Math.random() * 60;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = shade;
    img.data[i + 3] = Math.random() < 0.55 ? Math.random() * 22 : 0;
  }
  ctx.putImageData(img, 0, 0);
  ctx.scale(dpr, dpr);

  // Draw at the tile edges too, so specks crossing the edge wrap around.
  const wrapped = (draw) => {
    for (const dx of [-TILE, 0, TILE]) for (const dy of [-TILE, 0, TILE]) draw(dx, dy);
  };

  // Specks of dust and pulp.
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * TILE;
    const y = Math.random() * TILE;
    const r = 0.3 + Math.random() ** 3 * 1.4;
    const dark = Math.random() < 0.85;
    ctx.fillStyle = dark ? `rgba(60,60,60,${0.15 + Math.random() * 0.35})` : 'rgba(255,255,255,0.7)';
    wrapped((dx, dy) => {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // A few faint fibres.
  ctx.lineCap = 'round';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * TILE;
    const y = Math.random() * TILE;
    const len = 4 + Math.random() * 10;
    const a = Math.random() * Math.PI;
    ctx.strokeStyle = `rgba(80,80,80,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.4;
    wrapped((dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.quadraticCurveTo(x + dx + len / 2, y + dy + (Math.random() - 0.5) * 4, x + dx + Math.cos(a) * len, y + dy + Math.sin(a) * len);
      ctx.stroke();
    });
  }
  return canvas.toDataURL('image/png');
}

// The grain covers the shelf scene, and is also shared as the CSS variable
// --paper so the outside of the books and binders can wear it too.
// The binder pages never get it (the projects have their own paper).
export function PaperTexture() {
  const url = useMemo(drawTile, []);
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--paper', `url(${url})`);
    root.setProperty('--paper-size', `${TILE}px`);
  }, [url]);
  return <div className="paper-texture" style={{ backgroundImage: `url(${url})`, backgroundSize: `${TILE}px` }} />;
}
