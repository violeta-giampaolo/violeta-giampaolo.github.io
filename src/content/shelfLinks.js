// What the letters and symbols on the shelf open.
// "startsWith" matches the layer name from Figma (e.g. "letter-01-V", "glyph-08-heart-pink").
// The first rule that matches wins. "category" puts it under a menu filter
// (the easter egg has none, so it stays hidden).
export const shelfLinks = [
  { startsWith: 'glyph-08-heart', link: 'contact', label: 'Contact', category: 'behind the shelf' },
  { startsWith: 'glyph-06-quote', link: 'quote', label: 'Request a quote', category: 'behind the shelf' },
  { startsWith: 'glyph-05-asterisk', link: 'resume', label: 'Resume', category: 'behind the shelf' },
  { startsWith: 'object-06-projector', link: 'playlists', label: 'Playlists', category: 'side quests' },
  { startsWith: 'glyph-09-punctuation', link: 'secret', label: '¿?' },
  { startsWith: 'letter-', link: 'about', label: 'About me', category: 'behind the shelf' },
];

// Layers that are drawn as several shapes in Figma but should light up together.
export const shelfGroups = [];

// The menu above the shelf (Figma "Group 1"), in order. A project joins one
// with "category" in its project.json.
export const categories = ['identities', 'campaigns', 'spaces', 'side quests', 'picks', 'behind the shelf'];
