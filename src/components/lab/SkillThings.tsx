'use client';

import { useEffect, useRef, useState } from 'react';
import { lamp } from '../../lamp/lamp';
import { THINGS, mountThings, type Derby } from '../../skill-things/things';
import base from './SkillsAboutDraft.module.css';
import styles from './SkillThings.module.css';

// Study 24: a derby of the small 3D things for the rows of skills. ?at=1.2 holds every strike at that many seconds,
// and ?ui=0 hides the buttons.
export function SkillThings() {
  const host = useRef<HTMLDivElement>(null), derby = useRef<Derby | null>(null);
  const [slow, setSlow] = useState(false);
  const [ui, setUi] = useState(true);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const q = new URLSearchParams(location.search), at = q.get('at');
    if (q.get('ui') === '0') setUi(false);
    lamp.bind();
    const d = mountThings(el);
    derby.current = d;
    if (at !== null) d.hold(Number(at));
    const first = at === null ? window.setTimeout(() => d.strike(), 900) : 0;
    return () => { window.clearTimeout(first); d.dispose(); derby.current = null; };
  }, []);

  useEffect(() => { derby.current?.slow(slow); }, [slow]);

  return (
    <main className={base.main}>
      <header className={base.head}>
        <p className={base.label}>Study 24 · The things in the rows of skills</p>
        <h1 className={base.heading}>A derby of six, two for each row</h1>
        <p className={base.lede}>
          Each is struck by a line that stands for the stream, and put together out of what the strike throws. Press a
          thing to strike it again. Move the cursor: each turns toward it, and the screen turns right round.
        </p>
        <ul className={base.caveats}>
          <li>Rough forms, to choose a direction from. Nothing here has the detail or the finish of the real thing.</li>
          <li>How each comes to life: the stream runs in and strikes. Shards fly out, and one for each part flies home and becomes that part. The thing’s own lights come on last. The other shards fall to the row’s border and fade.</li>
          <li>The top row is the one recommended for each skill set.</li>
          <li>Every light and every paint is one of the site’s colors.</li>
        </ul>
      </header>

      <div className={styles.stage}>
        <div ref={host} style={{ position: 'absolute', inset: 0 }} />
        <div className={styles.grid}>
          {THINGS.map((t, i) => (
            <button key={t.id} type="button" className={styles.cell} onClick={() => derby.current?.strike(i)}>
              <span className={styles.row}>{t.row}{t.pick && <span className={styles.pick}>recommended</span>}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {ui && (
        <div className={base.panel}>
          <div className={base.controls}>
            <div className={base.group} role="group" aria-label="Strike">
              <button type="button" className={base.choice} onClick={() => derby.current?.strike()}>Strike all</button>
            </div>
            <div className={base.group} role="group" aria-label="How fast everything runs">
              <span className={base.groupName}>Speed</span>
              <button type="button" className={base.choice} aria-pressed={!slow} onClick={() => setSlow(false)}>Full</button>
              <button type="button" className={base.choice} aria-pressed={slow} onClick={() => setSlow(true)}>Half</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
