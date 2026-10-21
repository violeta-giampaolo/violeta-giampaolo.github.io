// Texts that appear around the site (not tied to a project).

// Under the title on each binder's first page (a project can override it with "subtitle").
export const author = 'Violeta Giampaolo';

// Where quote requests (the “ glyph on the shelf) are sent.
// formEndpoint: a form service URL (e.g. Formspree) — requests arrive in your inbox.
// email: used only if there's no formEndpoint; opens the visitor's email app instead.
export const contact = {
  formEndpoint: 'https://formspree.io/f/maeqzlvd',
  email: '',
};

// The notes floating beside the playlist wheel (the slide projector).
// Each string is one paragraph.
export const playlistsText = {
  left: [
    'We’re imaginative creatures: when we listen to music, we make movies in our heads that show how it makes us feel.',
    'This very personal project began as a simple playlist cover and became my way of picturing how each playlist feels — a probably-failed attempt to capture the scenes that flash through my head while I listen.',
    'I believe there’s a perfect song for every moment in life, so I keep making playlists for the memories that are yet to come.',
  ],
  right: ['Started in September 2023.', 'Pick the one that calls to you the most.'],
};

// The contact card (the ♥ on the shelf). No social media on purpose.
export const contactCard = {
  name: 'Violeta Giampaolo',
  tagline: 'graphic & UX/UI designer',
  hello: 'Let’s talk.',
  email: 'giampaolovioleta@gmail.com',
  city: 'Caracas, Venezuela',
  // Engraved on the gold NFC card
  nfcQuote:
    'I am Alive to learn and unlearn, to relearn and unlearn and learn again. I am here to unpack and develop and understand the value in struggle. I am here to hold my grief the way it deserves to be held for as long as that takes. I am here to learn that there is no judgment where there is love. I am here to understand that I am not small. I am here, and I am learning that this is a Big Thing.',
};

// Options in the quote request form.
export const quoteForm = {
  services: ['Branding', 'Editorial', 'Illustration', 'Architecture', 'Web / UX-UI', 'Something else'],
  budgets: ['Under $500', '$500 – $1,500', '$1,500 – $5,000', '$5,000+', 'Not sure yet'],
};

// Revealed inside the walking silhouette when you hover it.
// "intro" is set in bold; the text loops until the whole figure is filled.
export const silhouetteQuote = {
  intro: 'Originality is a myth. Attention is not.',
  body:
    'No idea is entirely mine. Each one is built from what I’ve seen, loved and been moved by. ' +
    'The designers before me taught me to notice beauty, and noticing is what made me want to build. ' +
    'I take what they gave me, add my own life to it, and make something for the people who come next. ' +
    'That’s how beauty travels: person to person, drawing to drawing. ' +
    'I borrow the question, never the answer: what would make this better for the person living in it? ' +
    'Pass it on.',
};
