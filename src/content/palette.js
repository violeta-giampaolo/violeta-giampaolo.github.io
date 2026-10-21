// The six book colours from the Figma file.
// In a project.json you can write either one of these names or any hex code (e.g. "#3A6EA5").
export const palette = {
  burgundy: '#8C162C',
  orange: '#F67522',
  yellow: '#EDD84B',
  olive: '#949C25',
  pink: '#F8B6B8',
  blue: '#9EC3E4',
};

export function resolveColor(value) {
  if (!value) return null;
  return palette[value.toLowerCase()] ?? value;
}

function rgbOf(hex) {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')?.[1];
  return h ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : null;
}

// A darker shade of a colour (used for the book's spine, like in Figma).
export function shade(hex, amount = 0.84) {
  const rgb = rgbOf(hex);
  if (!rgb) return hex;
  return `#${rgb.map((c) => Math.round(c * amount).toString(16).padStart(2, '0')).join('')}`;
}

// Dark ink on light colours, cream ink on dark ones.
export function inkOn(hex) {
  const rgb = rgbOf(hex);
  if (!rgb) return '#1a1713';
  const [r, g, b] = rgb.map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? '#1a1713' : '#f1eee6';
}
