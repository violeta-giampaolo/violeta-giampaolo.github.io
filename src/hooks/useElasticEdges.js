import { useEffect } from 'react';
import { animate, useMotionValue } from 'framer-motion';

const MAX_PULL = 70; // px the page can stretch past its top / bottom edge
const SETTLE = { type: 'spring', stiffness: 170, damping: 13 }; // slightly bouncy return

// Scrolling with the mouse wheel or trackpad past the top or bottom edge
// pulls the page a little, then it springs back — a soft "nothing more here".
export function useElasticEdges(enabled) {
  const y = useMotionValue(0);

  useEffect(() => {
    if (!enabled) return;
    let pull = 0;
    let timer;
    let anim;

    const release = () => {
      pull = 0;
      anim = animate(y, 0, SETTLE);
    };

    const onWheel = (e) => {
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const doc = document.documentElement;
      const atTop = window.scrollY <= 0;
      const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 1;
      if (!((delta < 0 && atTop) || (delta > 0 && atBottom))) return;

      anim?.stop();
      pull -= delta;
      // The further you pull, the harder it resists.
      y.set(MAX_PULL * Math.tanh(pull / (MAX_PULL * 4)));
      clearTimeout(timer);
      timer = setTimeout(release, 140);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      clearTimeout(timer);
      anim?.stop();
      y.set(0);
    };
  }, [enabled, y]);

  return y;
}
