import { privacy } from '../content/privacy.js';
import { FoldedPaper } from './FoldedPaper.jsx';

// The privacy note: a folded note like "About me".
export function PrivacyNote({ onClose }) {
  return (
    <FoldedPaper width={440} height={700} folds={2} className="note" label="Privacy" onClosed={onClose}>
      <div className="note__page privacy">
        <h2 className="note__title">{privacy.title}</h2>
        {privacy.sections.map((s) => (
          <section key={s.heading}>
            <h3>{s.heading}</h3>
            <p>{s.text}</p>
          </section>
        ))}
        <p className="privacy__updated">{privacy.updated}</p>
      </div>
    </FoldedPaper>
  );
}
