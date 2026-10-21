import { about } from '../content/about.js';
import { FoldedPaper } from './FoldedPaper.jsx';

// "About me": a small note folded in half (opens from the letters of your name).
export function AboutNote({ onClose }) {
  return (
    <FoldedPaper width={440} height={700} folds={2} className="note" label="About me" onClosed={onClose}>
      <div className="note__page">
        <p className="note__greeting">{about.greeting}</p>
        <h2 className="note__title">{about.title}</h2>
        {about.paragraphs.map((p, i) => (
          <p key={i} className="note__text">
            {p}
          </p>
        ))}
        <p className="note__signature">— {about.signature}</p>
      </div>
    </FoldedPaper>
  );
}
