import { useCallback, useState } from 'react';
import { Home } from './home/Home.jsx';
import { Placeholder } from './components/Placeholder.jsx';
import { SiteControls } from './components/SiteControls.jsx';
import { QuoteForm } from './components/QuoteForm.jsx';
import { AboutNote } from './components/AboutNote.jsx';
import { PrivacyNote } from './components/PrivacyNote.jsx';
import { ResumeLetter } from './components/ResumeLetter.jsx';
import { ContactWallet } from './components/ContactWallet.jsx';
import { PlaylistCarousel } from './components/PlaylistCarousel.jsx';
import { BookStage } from './book/BookStage.jsx';
import { sfx } from './sound/sfx.js';
import { ShelfFilters } from './home/ShelfFilters.jsx';
import { PaperTexture } from './home/PaperTexture.jsx';

export default function App() {
  const [open, setOpen] = useState(null);
  const [book, setBook] = useState(null); // shelf key of the book that flew out
  const closeBook = useCallback(() => setBook(null), []);
  const [category, setCategory] = useState(null); // the shelf menu filter
  const [privacyOver, setPrivacyOver] = useState(false); // privacy note on top of the quote form

  return (
    <>
      <ShelfFilters />
      <PaperTexture />

      <Home
        paused={!!book || !!open}
        onFilter={setCategory}
        onOpen={(target) => {
          sfx.click();
          if (target.kind === 'project') {
            if (!book) setBook(target.project.shelfBook);
          } else setOpen(target);
        }}
      />
      {book && <BookStage startKey={book} category={category} onClosed={closeBook} />}
      {open?.link === 'quote' && (
        <QuoteForm onClose={() => setOpen(null)} onPrivacy={() => setPrivacyOver(true)} paused={privacyOver} />
      )}
      {open?.link === 'privacy' && <PrivacyNote onClose={() => setOpen(null)} />}
      {open?.link === 'about' && <AboutNote onClose={() => setOpen(null)} />}
      {open?.link === 'contact' && (
        <ContactWallet onClose={() => setOpen(null)} onQuote={() => setOpen({ kind: 'link', link: 'quote' })} />
      )}
      {open?.link === 'resume' && <ResumeLetter onClose={() => setOpen(null)} />}
      {open?.link === 'playlists' && <PlaylistCarousel onClose={() => setOpen(null)} />}
      {open && !['quote', 'about', 'resume', 'contact', 'playlists', 'privacy'].includes(open.link) && (
        <Placeholder target={open} onClose={() => setOpen(null)} />
      )}
      {privacyOver && <PrivacyNote onClose={() => setPrivacyOver(false)} />}
      <SiteControls
        onOpen={(link) => {
          sfx.click();
          setOpen({ kind: 'link', link });
        }}
      />
    </>
  );
}
