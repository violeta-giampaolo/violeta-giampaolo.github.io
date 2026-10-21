import { useEffect } from 'react';

// Temporary stand-in until the book/binder animation (step 2) and the
// About / Contact / Resume pages are built.
const linkCopy = {
  about: 'About me page — coming soon.',
  contact: 'Contact page — coming soon.',
  resume: 'Resume — coming soon.',
  secret: 'You found the easter egg spot ¿?',
};

export function Placeholder({ target, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isProject = target.kind === 'project';
  return (
    <div className="placeholder-scrim" onClick={onClose}>
      <div
        className="placeholder-card"
        role="dialog"
        aria-modal="true"
        style={isProject ? { borderTopColor: target.project.color } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {isProject ? (
          <>
            <p className="placeholder-kicker">{target.project.number}</p>
            <h2>{target.project.title}</h2>
            <p>The book will fly off the shelf here (step 2).</p>
          </>
        ) : (
          <>
            <h2>{target.label}</h2>
            <p>{linkCopy[target.link]}</p>
          </>
        )}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
