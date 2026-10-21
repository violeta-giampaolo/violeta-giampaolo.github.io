import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { contactCard } from '../content/site.js';
import { sfx } from '../sound/sfx.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import violetaScript from '../assets/contact/violeta-script.svg';
import twoDollarBill from '../assets/contact/two-dollar-bill.png';

const CW = 340; // credit-card proportions (85.6 × 54 mm)
const CH = 214;

// The cards in the wallet, back to front. `rest` is how far each one sticks
// out of the pocket while tucked in; `up` how far it rises when chosen.
const CARDS = [
  { id: 'nfc', rest: 50, up: 212 },
  { id: 'paper', rest: 28, up: 206 },
  { id: 'idcard', rest: 6, up: 58 },
];
const ORDER = ['idcard', 'paper', 'nfc']; // order you scroll through them

function IdCard() {
  return (
    <div className="wcard wcard--id">
      <p className="wcard-id__label">IDENTIFICATION · IDENTIFICACIÓN</p>
      <p className="wcard-id__name">{contactCard.name.toUpperCase()}</p>
      <p className="wcard-id__role">{contactCard.tagline}</p>
      <span className="wcard-id__chip" />
      <span className="wcard-id__code" />
    </div>
  );
}

function PaperCard({ active }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(contactCard.email);
      setCopied(true);
      sfx.click();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the mail link still works */
    }
  };
  const stop = (e) => e.stopPropagation();
  return (
    <div className="wcard wcard--paper">
      <p className="wcard-paper__name">{contactCard.name}</p>
      <p className="wcard-paper__role">{contactCard.tagline}</p>
      <ul tabIndex={-1} aria-hidden={!active}>
        <li>
          <a href={`mailto:${contactCard.email}`} onClick={stop}>
            {contactCard.email}
          </a>
          <button type="button" onClick={copy}>
            {copied ? 'copied!' : 'copy'}
          </button>
        </li>
        <li className="wcard-paper__city">{contactCard.city}</li>
      </ul>
    </div>
  );
}

function NfcCard({ active, onQuote }) {
  const [flipped, setFlipped] = useState(false);
  const [hover, setHover] = useState(false);
  const [sheen, setSheen] = useState(50);
  useEffect(() => {
    if (!active) setFlipped(false);
  }, [active]);

  // Hovering tilts the card a little, hinting that it has a back.
  const rotateY = flipped ? 180 : active && hover ? -24 : 0;
  return (
    <motion.div
      className="wcard-flip"
      animate={{ rotateY }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      // Only a real mouse tilts it: on phones a tap counts as hovering.
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setSheen(((e.clientX - r.left) / r.width) * 100);
      }}
      onClick={(e) => {
        if (!active) return;
        e.stopPropagation();
        sfx.slide();
        setFlipped((f) => !f);
      }}
      style={{ '--sheen': `${sheen}%` }}
    >
      <div className="wcard wcard--gold wcard-face">
        <p className="wcard-gold__quote">{contactCard.nfcQuote}</p>
        <img className="wcard-gold__name" src={violetaScript} alt="Violeta" draggable="false" />
        <p className="wcard-gold__email">{contactCard.email}</p>
        {active && !flipped && <span className="wcard-gold__hint">flip ↻</span>}
      </div>
      <div className="wcard wcard--gold wcard-face wcard-face--back">
        <span className="wcard-gold__nfc" aria-hidden="true">
          ))))
        </span>
        <button
          type="button"
          className="wcard-gold__quote-btn"
          onClick={(e) => {
            e.stopPropagation();
            onQuote();
          }}
        >
          Have a project?
          <br />
          Request a quote →
        </button>
        <span className="wcard-gold__hint">flip back ↺</span>
      </div>
    </motion.div>
  );
}

// "Contact" (the ♥ on the shelf): a little cardholder that opens and lets
// you browse three cards — scroll, arrow keys, swipe or click a card.
export function ContactWallet({ onClose, onQuote }) {
  const [active, setActive] = useState(0); // index in ORDER
  const touch = !useMediaQuery('(hover: hover) and (pointer: fine)');
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef(null);
  const lastStep = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(true);
      sfx.slide();
    }, 450);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setLeaving(true);
  }, []);

  const step = useCallback((dir) => {
    const now = performance.now();
    if (now - lastStep.current < 380) return;
    lastStep.current = now;
    setActive((i) => {
      const next = Math.min(ORDER.length - 1, Math.max(0, i + dir));
      if (next !== i) sfx.slide();
      return next;
    });
  }, []);

  useEffect(() => {
    const el = root.current;
    const onWheel = (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 8) step(e.deltaY > 0 ? 1 : -1);
    };
    let startY = null;
    const onTouchStart = (e) => (startY = e.touches[0].clientY);
    const onTouchEnd = (e) => {
      if (startY == null) return;
      const dy = e.changedTouches[0].clientY - startY;
      startY = null;
      if (Math.abs(dy) > 30) step(dy < 0 ? 1 : -1);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [step, close]);

  const activeId = ORDER[active];

  return (
    <motion.div
      ref={root}
      className="wallet-scrim"
      onClick={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.3, delay: leaving ? 0.45 : 0 }}
      onAnimationComplete={() => leaving && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Contact"
    >
      <motion.div
        className="wallet"
        initial={{ y: -240, rotate: -6 }}
        animate={leaving ? { y: 220, rotate: 4, opacity: 0 } : { y: 0, rotate: -1.5, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 17, opacity: { duration: 0.3 } }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back of the wallet */}
        <div className="wallet__back" />

        {/* A folded $2 bill tucked into the middle compartment, behind the cards, for good luck */}
        <motion.div
          className="wallet__bill"
          title="for good luck"
          initial={{ y: 90, opacity: 0 }}
          animate={open ? { y: 0, opacity: 1 } : { y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 16, delay: open ? 0.5 : 0 }}
          whileHover={{ rotate: 3, y: -12 }}
          onClick={() => sfx.hover()}
        >
          <img className="bill" src={twoDollarBill} alt="A folded two-dollar bill" draggable="false" />
          <span className="bill__luck">for good luck ✿</span>
        </motion.div>

        {/* The cards, back to front */}
        {CARDS.map((c) => {
          const isActive = open && c.id === activeId;
          const y = !open ? 0 : isActive ? -c.up : -c.rest;
          return (
            <motion.div
              key={c.id}
              className={`wallet__slot${isActive ? ' is-active' : ''}`}
              animate={{ y }}
              transition={{ type: 'spring', stiffness: 170, damping: 19 }}
              onClick={() => {
                const i = ORDER.indexOf(c.id);
                if (i !== active) {
                  sfx.slide();
                  setActive(i);
                }
              }}
            >
              {c.id === 'idcard' && <IdCard />}
              {c.id === 'paper' && <PaperCard active={isActive} />}
              {c.id === 'nfc' && <NfcCard active={isActive} onQuote={onQuote} />}
            </motion.div>
          );
        })}

        {/* Front pocket */}
        <div className="wallet__pocket">
          <span className="wallet__stitch" />
          <span className="wallet__brand">v.g.</span>
        </div>

        {/* Flap: closed over the cards on arrival, swings open */}
        <motion.div
          className="wallet__flap"
          initial={false}
          animate={{ rotateX: open ? 172 : 0, opacity: open ? 0 : 1 }}
          transition={{
            rotateX: { duration: 0.55, ease: [0.45, 0, 0.2, 1] },
            opacity: { duration: 0.2, delay: open ? 0.35 : 0 },
          }}
        />
      </motion.div>
      <p className="wallet-hint">
        {touch ? 'swipe to browse the cards · tap outside to close' : 'scroll to browse the cards · esc to close'}
      </p>
    </motion.div>
  );
}

export const WALLET_CARD = { width: CW, height: CH };
