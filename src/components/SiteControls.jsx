import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '../sound/sfx.js';

// Pinned to the top left: a menu with the "behind the shelf" pages (so nobody
// has to guess which letter opens what) and a mute / unmute button.
const LINKS = [
  { link: 'about', label: 'about me' },
  { link: 'contact', label: 'contact' },
  { link: 'resume', label: 'resume' },
  { link: 'quote', label: 'quote' },
  { link: 'privacy', label: 'privacy', small: true },
];

function BurgerIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

function SpeakerIcon({ on }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className="fill" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
    </svg>
  );
}

export function SiteControls({ onOpen }) {
  const [on, setOn] = useState(sfx.isOn());
  const [menu, setMenu] = useState(false);
  const root = useRef(null);
  useEffect(() => sfx.subscribe(setOn), []);

  // Clicking anywhere else, or Esc, closes the menu.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => !root.current?.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <div className="site-controls" ref={root}>
      <button
        type="button"
        className="icon-btn"
        aria-label={menu ? 'Close menu' : 'Menu'}
        aria-expanded={menu}
        onClick={() => {
          sfx.click();
          setMenu((m) => !m);
        }}
      >
        <BurgerIcon open={menu} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={on ? 'Mute sounds' : 'Unmute sounds'}
        aria-pressed={!on}
        onClick={() => {
          sfx.setOn(!on);
          if (!on) setTimeout(() => sfx.click(), 0);
        }}
      >
        <SpeakerIcon on={on} />
      </button>

      <AnimatePresence>
        {menu && (
          <motion.nav
            className="site-menu"
            aria-label="Menu"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {LINKS.map((l) => (
              <button
                key={l.link}
                type="button"
                className={l.small ? 'is-small' : undefined}
                onClick={() => {
                  setMenu(false);
                  onOpen(l.link);
                }}
              >
                {l.label}
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
