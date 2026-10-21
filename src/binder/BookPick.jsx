// The inside of a real book (book picks): what it's about and where to get
// it on the left, the title page with her ex libris stamp on the right.
// Laid out 540 px wide at the book's own shape and scaled to its size.
export const PICK_W = 540;

function Page({ scale, aspect, side, children }) {
  const height = PICK_W / aspect;
  return (
    <div
      className={`pick-page pick-page--${side}${height < 620 ? ' is-short' : ''}`}
      style={{ width: PICK_W, height, transform: `scale(${scale})` }}
    >
      {children}
    </div>
  );
}

function About({ project }) {
  return (
    <>
      <p className="pick-page__kicker">from my shelf</p>
      <h2 className="pick-page__title">{project.title}</h2>
      <p className="pick-page__meta">
        {project.author} · {project.year}
      </p>
      <p className="pick-page__synopsis">{project.synopsis}</p>
      {project.amazon && (
        <>
          <a
            className="pick-page__buy"
            href={project.amazon}
            target="_blank"
            rel="noreferrer sponsored"
            onClick={(e) => e.stopPropagation()}
          >
            get it on Amazon ↗
          </a>
          {/* Amazon requires this line next to affiliate links */}
          <p className="pick-page__disclosure">As an Amazon Associate I earn from qualifying purchases.</p>
        </>
      )}
    </>
  );
}

export function PickAbout({ project, scale, aspect }) {
  return (
    <Page scale={scale} aspect={aspect} side="left">
      <About project={project} />
    </Page>
  );
}

export function PickTitlePage({ project, scale, aspect }) {
  return (
    <Page scale={scale} aspect={aspect} side="right">
      <div className="pick-title">
        <h2 className="pick-title__name">{project.title}</h2>
        <span className="pick-title__rule" />
        <p className="pick-title__author">{project.author}</p>
      </div>
      <p className="pick-stamp" aria-label="Ex libris Violeta">
        <span>ex libris</span>
        Violeta
      </p>
    </Page>
  );
}

// Phones show one page: the "about" page, with the stamp in the corner.
export function PickSingle({ project, scale, aspect }) {
  return (
    <Page scale={scale} aspect={aspect} side="right">
      <About project={project} />
      <p className="pick-stamp is-small" aria-hidden="true">
        <span>ex libris</span>
        Violeta
      </p>
    </Page>
  );
}
