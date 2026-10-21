import { motion } from 'framer-motion';

// ".archives" — each letter drops onto the page like a book landing on a shelf.
export function SiteTitle({ text = '.archives', className = '' }) {
  return (
    <h1 className={`site-title ${className}`} aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={{ y: -120, rotate: (i % 2 ? 1 : -1) * (8 + (i % 3) * 4), opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={{
            delay: 0.25 + i * 0.07,
            y: { type: 'spring', stiffness: 420, damping: 16, mass: 0.9 },
            rotate: { type: 'spring', stiffness: 300, damping: 12 },
            opacity: { duration: 0.12 },
          }}
          whileHover={{ y: -6, rotate: (i % 2 ? 1 : -1) * 6, transition: { type: 'spring', stiffness: 500, damping: 10 } }}
        >
          {ch}
        </motion.span>
      ))}
    </h1>
  );
}
