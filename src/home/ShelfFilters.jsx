// How muted idle books are: 0 = fully grey, 1 = full colour.
export const IDLE_SATURATION = 1;
// Colour comes back in this many steps as a book wakes up.
export const SHELF_FILTER_STEPS = 5;

// Filters #shelf-0 … #shelf-4: from idle (muted colour + Figma's 0.5 blur)
// towards full colour. Full colour itself is just "no filter".
export function ShelfFilters() {
  const steps = Array.from({ length: SHELF_FILTER_STEPS }, (_, i) => i);
  return (
    <svg className="svg-defs" aria-hidden="true">
      {steps.map((i) => {
        const t = i / SHELF_FILTER_STEPS;
        const saturation = IDLE_SATURATION + (1 - IDLE_SATURATION) * t;
        return (
          <filter key={i} id={`shelf-${i}`} x="-10%" y="-10%" width="120%" height="120%">
            <feColorMatrix type="saturate" values={saturation.toFixed(3)} />
            {t < 0.6 && <feGaussianBlur stdDeviation="0.5" />}
          </filter>
        );
      })}
    </svg>
  );
}
