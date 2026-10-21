import { useState } from 'react';
import { motion, useTransform } from 'framer-motion';
import { resume } from '../content/resume.js';
import { sfx } from '../sound/sfx.js';
import { FoldedPaper } from './FoldedPaper.jsx';

const W = 595; // A4 at 72 dpi
const H = 842;
const PEEK = 46; // how far the sheet behind sticks out on the right

function PageOne() {
  return (
    <div className="resume">
      <header className="resume__head">
        <h2>{resume.name}</h2>
        <p>{resume.contact.filter(Boolean).join('  ·  ')}</p>
      </header>

      <section>
        <h3>Experience</h3>
        {resume.experience.map((x) => (
          <div key={x.company} className="resume__entry">
            <p className="resume__row">
              <strong>{x.company}</strong>
              <span>{x.place}</span>
            </p>
            <p className="resume__role">{x.role}</p>
            <ul>
              {x.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <p className="resume__folio">1 / 2</p>
    </div>
  );
}

function PageTwo() {
  return (
    <div className="resume">
      <header className="resume__head resume__head--small">
        <h2>{resume.name}</h2>
      </header>

      <section>
        <h3>Education</h3>
        {resume.education.map((e) => (
          <div key={e.school} className="resume__entry">
            <p className="resume__row">
              <strong>{e.school}</strong>
              <span>{e.place}</span>
            </p>
            {e.detail && <p className="resume__role">{e.detail}</p>}
          </div>
        ))}
      </section>

      <section>
        <h3>Skills &amp; Interests</h3>
        {resume.skills.map((s) => (
          <p key={s.label} className="resume__skill">
            <strong>{s.label}:</strong> {s.value}
          </p>
        ))}
      </section>
      <p className="resume__folio">2 / 2</p>
    </div>
  );
}

// The second sheet: lies behind the letter (peeking out on the right with an
// arrow) and comes to the front when clicked.
function SecondSheet({ open, scale, front, onBring }) {
  const opacity = useTransform(open, (o) => Math.min(1, Math.max(0, (o - 0.85) / 0.15)));
  return (
    <motion.div
      className="fold-swap"
      initial={false}
      animate={front ? { x: 0, y: 0, rotate: 0, zIndex: 2 } : { x: PEEK * scale, y: 10 * scale, rotate: 0, zIndex: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      style={{ opacity, cursor: front ? 'default' : 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        if (!front) onBring();
      }}
    >
      <div className="fold-sheet letter" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <PageTwo />
        {!front && <span className="fold-peek" aria-hidden="true">→</span>}
      </div>
    </motion.div>
  );
}

// The resume: an A4 letter (folded in thirds) with a second page tucked
// behind it, in the Harvard resume format. Opens from the * on the shelf.
export function ResumeLetter({ onClose }) {
  const [page, setPage] = useState(0);
  const show = (p) => {
    sfx.page();
    setPage(p);
  };

  return (
    <>
      {/* Flat copies used only for printing / saving as PDF */}
      <div className="print-only">
        <PageOne />
        <PageTwo />
      </div>
      <FoldedPaper
        width={W}
        height={H}
        folds={3}
        className="letter"
        label="Resume"
        onClosed={onClose}
        extraWidth={PEEK}
        front={page === 0}
        onBring={() => show(0)}
        behind={(open, scale) => (
          <SecondSheet open={open} scale={scale} front={page === 1} onBring={() => show(1)} />
        )}
        footer={
          <div className="fold-footer__row">
            <button type="button" className="fold-page" onClick={() => show(page === 0 ? 1 : 0)}>
              {page === 0 ? 'Page 2 →' : '← Page 1'}
            </button>
            <button type="button" className="fold-print" onClick={() => window.print()}>
              Save as PDF / Print
            </button>
          </div>
        }
      >
        <PageOne />
        {page === 1 && <span className="fold-peek" aria-hidden="true">←</span>}
      </FoldedPaper>
    </>
  );
}
