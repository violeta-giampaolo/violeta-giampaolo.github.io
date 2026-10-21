import { useEffect, useRef, useState } from 'react';
import { sfx } from '../sound/sfx.js';

// The inside of a DVD case (movie picks). Laid out in a fixed design space
// the shape of a real case (135 × 190 mm) and scaled to the book's size.
export const DVD_W = 540;
export const DVD_H = 760;

function Face({ scale, className, children }) {
  return (
    <div className={`dvd-face ${className}`} style={{ width: DVD_W, height: DVD_H, transform: `scale(${scale})` }}>
      {children}
    </div>
  );
}

// Five stars, with a half star for x.5 ratings, and a heart if she loved it.
function Rating({ rating = 0, heart }) {
  return (
    <p className="dvd-rating" aria-label={`${rating} out of 5 stars${heart ? ', loved' : ''}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="dvd-star" style={{ '--fill': `${Math.max(0, Math.min(1, rating - i)) * 100}%` }}>
          ★
        </span>
      ))}
      {heart && <span className="dvd-heart">♥</span>}
    </p>
  );
}

function Review({ project, compact = false }) {
  const review = String(project.review ?? '');
  const long = review.length > 280;
  return (
    <div className={`dvd-insert${compact ? ' is-compact' : ''}${long ? ' is-long' : ''}`}>
      <p className="dvd-insert__kicker">pick nº {String(Number(project.number) - 17).padStart(2, '0')}</p>
      <h2 className="dvd-insert__title">{project.title}</h2>
      <p className="dvd-insert__meta">
        {project.year} · {project.director}
      </p>
      <Rating rating={project.rating} heart={project.heart} />
      <div className="dvd-insert__review">
        {review.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {project.letterboxd && (
        <a
          className="dvd-insert__link"
          href={project.letterboxd}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          see it on Letterboxd ↗
        </a>
      )}
    </div>
  );
}

// Left side: the inside of the front cover, with the review card held by
// the case's clear plastic clips.
export function DvdInsert({ project, scale }) {
  return (
    <Face scale={scale} className="dvd-face--left">
      <span className="dvd-clip dvd-clip--top" />
      <span className="dvd-clip dvd-clip--bottom" />
      <Review project={project} />
    </Face>
  );
}

// The disc spins up when you tap it and slows down when you tap again.
function useSpin() {
  const disc = useRef(null);
  const [on, setOn] = useState(false);
  const state = useRef({ angle: 0, speed: 0 });
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const s = state.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.speed += ((on ? 540 : 0) - s.speed) * Math.min(1, dt * (on ? 2.2 : 1.4));
      if (!on && s.speed < 0.5) s.speed = 0;
      s.angle = (s.angle + s.speed * dt) % 360;
      if (disc.current) disc.current.style.transform = `rotate(${s.angle}deg)`;
      if (on || s.speed > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return { disc, on, toggle: () => setOn((v) => !v) };
}

// Right side: the tray with the disc on its hub. The disc print is the poster.
// On phones only this side shows, so the review card sits under the disc.
export function DvdDisc({ project, scale, withInsert = false }) {
  const { disc, on, toggle } = useSpin();
  return (
    <Face scale={scale} className={`dvd-face--right${withInsert ? ' is-phone' : ''}`}>
      <div className="dvd-tray">
        <button
          type="button"
          className={`dvd-disc${on ? ' is-spinning' : ''}`}
          aria-label={on ? 'Stop the disc' : 'Spin the disc'}
          onClick={(e) => {
            e.stopPropagation();
            sfx.click();
            toggle();
          }}
        >
          <span className="dvd-disc__print" ref={disc} style={{ backgroundImage: project.texture ? `url(${project.texture})` : undefined }} />
          {/* The light stays put while the disc turns underneath it */}
          <span className="dvd-disc__sheen" />
          <span className="dvd-disc__ring" />
        </button>
        <span className="dvd-hub" />
      </div>
      {withInsert ? <Review project={project} compact /> : <p className="dvd-emboss">DVD VIDEO</p>}
    </Face>
  );
}
