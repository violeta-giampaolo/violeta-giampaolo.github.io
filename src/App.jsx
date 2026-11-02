import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Home } from './home/Home.jsx';
import { CategoryShelf } from './home/CategoryShelf.jsx';
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
import { categories } from './content/shelfLinks.js';

// "behind the shelf" stays a filter on the home page; every other category
// has its own shelf page, with its own address (…/#side-quests), so the
// browser's back button works and a category can be linked to directly.
const STAYS_HOME = 'behind the shelf';
const slugOf = (category) => category.replace(/\s+/g, '-');
const pageFromHash = () =>
  categories.find((c) => c !== STAYS_HOME && slugOf(c) === decodeURIComponent(window.location.hash.slice(1))) ?? null;

export default function App() {
  const [open, setOpen] = useState(null);
  const [book, setBook] = useState(null); // shelf key of the book that flew out
  const closeBook = useCallback(() => setBook(null), []);
  const [filter, setFilter] = useState(null); // the home page's filter ("behind the shelf")
  const [page, setPage] = useState(pageFromHash); // the category page that's open
  const [privacyOver, setPrivacyOver] = useState(false); // privacy note on top of the quote form

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTo = useCallback((category) => {
    window.location.hash = category ? slugOf(category) : '';
  }, []);

  // The filter on either page: a category opens its shelf. Clicking the one
  // you're on arrives here as null, which goes back to the bookshelf.
  const pick = useCallback(
    (category) => {
      const staysHome = !category || category === STAYS_HOME;
      setFilter(staysHome ? category : null);
      goTo(staysHome ? null : category);
    },
    [goTo],
  );

  const goHome = useCallback(() => goTo(null), [goTo]);

  // Esc leaves a category page (unless something is open on top of it).
  useEffect(() => {
    if (!page || book || open) return;
    const onKey = (e) => e.key === 'Escape' && goHome();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, book, open, goHome]);

  const openTarget = (target) => {
    sfx.click();
    if (target.kind === 'project') {
      if (!book) setBook(target.project.shelfBook);
    } else setOpen(target);
  };

  const controls = (
    <SiteControls
      onHome={page ? goHome : undefined}
      onOpen={(link) => {
        sfx.click();
        setOpen({ kind: 'link', link });
      }}
    />
  );

  return (
    <>
      <ShelfFilters />
      <PaperTexture />

      <Home paused={!!book || !!open || !!page} filter={filter} onPick={pick} onOpen={openTarget} />
      <AnimatePresence>
        {page && (
          <CategoryShelf key="category" category={page} onPick={pick} onHome={goHome} onOpen={openTarget} controls={controls} />
        )}
      </AnimatePresence>
      {book && <BookStage startKey={book} category={page ?? filter} onClosed={closeBook} />}
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
      {!page && controls}
    </>
  );
}
