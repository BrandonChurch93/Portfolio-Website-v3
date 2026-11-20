import { BLANK, STILLS, STILLS_UNDER, type StillName } from '../config/stills';

// A picture of a 3D piece, in the page for a screen too narrow for the live one. A wide screen matches no source
// and never fetches it. The page's own stylesheet shows it only when it is narrow.
export function Still({ name, className }: { name: StillName; className?: string }) {
  const s = STILLS[name];
  return (
    <div className={className} data-part="still" data-still={name} aria-hidden="true">
      <picture>
        <source media={`(max-width: ${STILLS_UNDER - 0.02}px)`} srcSet={s.file} />
        <img src={BLANK} alt="" width={s.keep.w} height={s.keep.h} decoding="async" style={{ minWidth: s.least }} />
      </picture>
    </div>
  );
}
