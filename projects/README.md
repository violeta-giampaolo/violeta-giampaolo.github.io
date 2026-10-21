# Projects — your "database"

Every folder in here is one book on the shelf. To add a project, copy any
`project-XX` folder, rename it, and edit its `project.json`.

```json
{
  "number": "01",
  "title": "Project Title 01",
  "shelfBook": "book-01-01-blue",
  "color": "blue",
  "spine": { "title": "Project Title 01" }
}
```

| Property    | What it does |
|-------------|--------------|
| `number`    | Order of the project (also used in the catalogue later). |
| `title`     | The project's name. |
| `shelfBook` | Which book on the shelf this project lives in. Use the layer name from Figma (e.g. `book-03-05-blue`). Books without a project stay faded and can't be clicked. |
| `color`     | `burgundy`, `orange`, `yellow`, `olive`, `pink`, `blue`, or any hex code like `#3A6EA5`. Repaints the book on the shelf. |
| `spine` (extras) | `"color": "#fff"` sets the title colour (white by default). `"stack": true` stands the letters upright one above the next, each stretched to fill its share of the spine — best for short names on narrow books. |
| `spine`     | `title` is printed along the book's spine (falls back to `title`). Only books with a project get text, so this is how visitors can tell them apart. Very thin books get very small text — pick a thicker book for long titles. |

| `cover`     | Optional. How the texture mixes with the colour: `{ "blend": "overlay", "opacity": 1 }`. Blend can be `overlay` (default), `hard-light`, `soft-light`, `multiply`, `screen` or `normal`; opacity goes from `0` to `1`. |

**Cover texture:** drop a black-and-white `texture.jpg` (or `.png` / `.webp`)
into the project's folder. The 3D book's cover is the project's colour with
this picture blended on top. It shows on the closed book and as a thin
border around the open binder. Use the binder's proportions — **588 : 748**
(e.g. 1572 × 2000 px); other sizes are cropped to fill. Without a texture the
cover is plain colour. The title lives on the spine, exactly like on the shelf.

How thick the 3D book is comes from how thick its spine is drawn on the shelf.

## Inside the binder — the easy way: a PDF

Drop a PDF into the project's folder (e.g. `projects/project-01/book.pdf`).
Every page of the PDF becomes a page of the binder, in order — page 1 on
the left of the first spread, page 2 on the right, and so on (on phones,
one page at a time).

- **Page size:** 560 × 720 (the Figma page frames). In Figma, design each
  page as a 560 × 720 frame, select them in order and export as **PDF**.
  Other sizes still work; they're fitted inside the page.
- **What happens behind the scenes:** while the site runs, each PDF is turned
  into one picture per page in a `pdf-pages/` folder next to it (it takes a
  few seconds, then the page reloads by itself). Don't edit that folder — it
  is rebuilt whenever the PDF changes. Visitors only download those
  pictures, one spread at a time, so it stays fast.
- **Several PDFs?** Name them in order — `01.pdf`, `02.pdf`, … — and they're
  read one after another.
- When a project has a PDF, the settings below (`story`, `description`,
  `pages`) are ignored for the inside; the spine, colour and texture still
  come from `project.json`.

## Inside the binder — the template way (no PDF)

| Property      | What it does |
|---------------|--------------|
| `year`        | Shown under the title on the text page, e.g. `"2024"`. |
| `subtitle`    | Optional. Under the title on the first page (defaults to your name). |
| `story`       | The long, faint text behind the title on the first page. |
| `description` | `{ "en": "…", "es": "…" }` — the text page. Leave `es` out for English only. |
| `pages`       | The picture pages, in order (see below). |

**Pictures:** put them in a `pages/` folder inside the project
(`projects/project-01/pages/01.jpg`, `02.jpg` …). Then list the pages:

```json
"pages": [
  { "layout": "full",   "image": "01.jpg", "caption": "Caption 02" },
  { "layout": "framed", "image": "02.jpg", "caption": "Caption 03" },
  { "layout": "pair",   "images": ["03.jpg", "04.jpg"], "caption": "Caption 04" }
]
```

Layouts (from the Figma page components): `full` (picture fills the page),
`framed` (smaller, with margins), `pair` (two pictures stacked). Page numbers
are added automatically. If you leave `pages` out, every picture in the
folder gets its own `framed` page, in file-name order. A picture that's
listed but missing shows the grey "IMAGE" placeholder.

## Movie picks (DVD cases)

A project with `"type": "dvd"` becomes a dark-grey DVD case. Its `texture.jpg`
is the movie poster (on the cover and printed on the disc). Copy any of
project-18 … project-23 to add a movie:

```json
{
  "number": "24",
  "title": "Movie Title",
  "year": "2020",
  "director": "Director Name",
  "type": "dvd",
  "category": "picks",
  "shelfBook": "book-XX-XX-colour",
  "color": "#2c2c2f",
  "spine": { "title": "MOVIE TITLE" },
  "cover": { "blend": "normal", "opacity": 1 },
  "rating": 4.5,
  "heart": true,
  "review": "Your review. A blank line starts a new paragraph.",
  "letterboxd": "https://letterboxd.com/film/movie-title/"
}
```

`rating` goes from 0 to 5 in half stars; `heart` adds the orange ♥.
The "pick nº" on the card is counted from `number` (18 = nº 01).

## Book picks (real books)

A project with `"type": "book"` is a real book: `texture.jpg` is its cover,
and it opens to a page with the summary and an Amazon button, plus a title page
with the ex libris stamp. Copy any of project-24 … project-38:

```json
{
  "number": "39",
  "title": "Book Title",
  "year": "2020",
  "author": "Author Name",
  "type": "book",
  "category": "picks",
  "shelfBook": "book-XX-XX-colour",
  "color": "blue",
  "spine": { "title": "BOOK TITLE" },
  "cover": { "blend": "normal", "opacity": 1 },
  "aspect": 0.66,
  "thickness": 0.1,
  "synopsis": "A few lines about the book.",
  "amazon": "https://amzn.to/xxxxxxx"
}
```

`aspect` = cover width ÷ height; `thickness` = spine thickness ÷ height.

## Hiding a project

Add `"hidden": true` to a project.json to take it off the shelf (its book
stays as a plain book, no title, not clickable). Delete the line to show it again.

**Where book covers come from:** don't save cover pictures from Amazon's
pages (Amazon's affiliate rules forbid it). Use Open Library
(covers.openlibrary.org) or the publisher's own website instead.
