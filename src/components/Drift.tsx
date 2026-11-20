import type { CSSProperties } from 'react';
import { ROCKS, type Adrift } from '../config/debris';
import styles from './Drift.module.css';

// What broke away from the hero's planet, hanging in a place the live field cannot reach (BRIEF.md, Open 36):
// still pictures of the hero's own pieces, each passed at its own pace as the page scrolls, and where `sway` is
// asked for each swaying a little on a clock of its own. No script and no canvas: the browser moves them, and with
// reduced motion they are still. A sway never rests, so it is for a page with little else on it: on the home page,
// under a phone's hero, the pieces move with the scroll and are otherwise at rest, which costs a slow phone nothing.
export function Drift({ field, className, sway = false }: { field: readonly Adrift[]; className?: string; sway?: boolean }) {
  return (
    <div className={`${styles.field} ${className ?? ''}`} data-sway={sway || undefined} aria-hidden="true">
      {field.map((p, i) => {
        const r = ROCKS[p.rock], far = p.far ?? 0;
        // Each piece's sway is its own: its length and where in it the page finds it follow from its place in the
        // list, so no two keep time and the field is the same every visit.
        const vars = {
          '--x': `${p.x * 100}%`, '--y': `${p.y * 100}%`, '--w': `${p.w * 100}%`, '--turn': `${p.turn ?? 0}deg`,
          '--far': far, '--dur': `${17 + ((i * 7) % 11) * 2.3}s`, '--delay': `${-((i * 5.3) % 19)}s`, '--flip': p.flip ? -1 : 1,
        } as CSSProperties;
        return (
          <span key={i} className={styles.piece} style={vars}>
            <img src={r.file} alt="" width={r.w} height={r.h} loading="lazy" decoding="async" />
          </span>
        );
      })}
    </div>
  );
}
