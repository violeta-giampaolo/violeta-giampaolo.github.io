import { author } from '../content/site.js';

// One binder page (560 × 720, the Figma page size). `side` is which side of
// the rings it sits on, so the punch holes and fold shadow go on the inner edge.
export function Page({ page, project, side }) {
  return (
    <div className={`page page--${side}`}>
      {page?.type === 'pdf' && <img className="page-pdf" src={page.src} alt="" draggable="false" decoding="async" />}
      {page?.type === 'title' && <TitlePage project={project} />}
      {page?.type === 'text' && <TextPage project={project} />}
      {page?.type === 'image' && <ImagePage page={page} />}
      <span className="page__fold" />
      <span className="page__hole" style={{ top: '17%' }} />
      <span className="page__hole" style={{ top: '49%' }} />
      <span className="page__hole" style={{ top: '81%' }} />
    </div>
  );
}

function TitlePage({ project }) {
  return (
    <>
      {project.story && (
        <div className="page-title__story" aria-hidden="true">
          <p>{project.story}</p>
        </div>
      )}
      {project.number && <p className="page-title__number">{project.number}.</p>}
      <h2 className="page-title__title">{project.title}</h2>
      <p className="page-title__subtitle">{project.subtitle ?? author}</p>
    </>
  );
}

function TextPage({ project }) {
  const d = project.description ?? {};
  const en = typeof d === 'string' ? d : d.en;
  const es = typeof d === 'string' ? null : d.es;
  return (
    <>
      <p className="page-text__head">
        {(project.title ?? '').toUpperCase()}
        {project.year && (
          <>
            <br />({project.year})
          </>
        )}
      </p>
      <div className="page-text__body">
        {en && (
          <section>
            <p className="page-text__label">EN</p>
            <p className="page-text__copy">{en}</p>
          </section>
        )}
        {es && (
          <section className="is-second">
            <p className="page-text__label">ES</p>
            <p className="page-text__copy">{es}</p>
          </section>
        )}
      </div>
    </>
  );
}

function Picture({ src, className }) {
  return src ? (
    <img className={`page-image ${className}`} src={src} alt="" draggable="false" />
  ) : (
    <div className={`page-image page-image--empty ${className}`}>IMAGE</div>
  );
}

function ImagePage({ page }) {
  const [a, b] = page.images;
  return (
    <div className={`page-pic page-pic--${page.layout}`}>
      {page.layout === 'pair' ? (
        <>
          <Picture src={a} className="page-pic__one" />
          <Picture src={b} className="page-pic__two" />
        </>
      ) : (
        <Picture src={a} className="page-pic__one" />
      )}
      {page.caption && <p className="page-pic__caption">{page.caption}</p>}
      <p className="page__folio">{page.folio}</p>
    </div>
  );
}

// The back of the cover, or the back of a sheet on a phone.
export function BlankPage({ side }) {
  return <Page page={null} side={side} />;
}

export function CoverFace({ project }) {
  const cover = project.cover ?? {};
  return (
    <div className="page page--cover" style={{ background: project.color }}>
      {project.texture && (
        <img
          className="page-cover__texture"
          src={project.texture}
          alt=""
          draggable="false"
          style={{ mixBlendMode: cover.blend ?? 'overlay', opacity: cover.opacity ?? 1 }}
        />
      )}
    </div>
  );
}
