'use client';

import { useEffect, useState, type PointerEvent } from 'react';
import { software, type WorkItem } from '../../content/work';
import type { CardLayout } from '../../metal/mask';
import type { PlateTone } from '../../metal/renderer';
import { Plate } from '../Plate';
import { PICTURE_ASPECT, WorkCard } from '../WorkCard';
import styles from './WorkCards.module.css';

const TONES: { tone: PlateTone; name: string; note: string }[] = [
  { tone: 'toned', name: '1 · Toned', note: 'The picture’s lights and darks mapped onto our copper and bronze, under clean glass.' },
  { tone: 'cast', name: '2 · Cast', note: 'The picture as a shallow relief in one metal.' },
  { tone: 'etched', name: '3 · Etched', note: 'The picture as copper lines on a dark ground, wider where it is lighter.' },
];

const LAYOUTS: { layout: CardLayout; name: string; note: string }[] = [
  { layout: 'set', name: 'A · Set in', note: 'The picture sits inside the card with its own frame. The facts and the links are in the words.' },
  { layout: 'edge', name: 'B · Edge to edge', note: 'The picture fills the top of the card to the bead, over a copper rail. The same words.' },
  { layout: 'band', name: 'C · Data plate', note: 'Edge to edge, with a band of dark bronze under the picture that carries the kind, the year and the links. The shortest card.' },
];

const [glasses, , , genui] = software;

// One picture in its window, with no words: for comparing how a picture rests.
function Picture({ item, tone }: { item: WorkItem; tone: PlateTone }) {
  const [hover, setHover] = useState({ on: false, x: 0, y: 0 });
  const at = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  return (
    <div
      className={styles.tile}
      data-plate-area=""
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHover({ on: true, ...at(e) }); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setHover((h) => ({ ...h, on: false })); }}
      onPointerDown={(e) => { if (e.pointerType === 'touch') { const p = at(e); setHover((h) => ({ on: !h.on, ...p })); } }}
    >
      <Plate finish="card" kind="card" card={{ layout: 'set', aspect: PICTURE_ASPECT }} tone={tone} photo={{ src: item.picture.src, focus: item.picture.focus }} hover={hover} tilt={false} className={styles.tilePlate}>
        <span role="img" aria-label={item.picture.alt} />
      </Plate>
    </div>
  );
}

export function WorkCards() {
  const [layout, setLayout] = useState<CardLayout>('edge');
  const [tone, setTone] = useState<PlateTone>('toned');

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const l = q.get('layout');
    const t = q.get('tone');
    if (l === 'set' || l === 'edge' || l === 'band') setLayout(l);
    if (t === 'toned' || t === 'cast' || t === 'etched' || t === 'true') setTone(t);
  }, []);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 14 · the card</p>
      <h1 className={styles.title}>The card</h1>
      <p className={styles.lede}>
        The words and the screenshots are your live site&rsquo;s. Every card is a dark face inside a bead of lit copper: move the cursor
        and the light moves on it. A picture rests in bronze and shows its own colors under the cursor. On a touch screen, the cards
        nearest the middle of the screen show them.
      </p>

      <h2 id="picture" className={styles.group}>How the picture rests · three ways</h2>
      <p className={styles.hint}>Put the cursor on one, or tap it, to see its own colors come back.</p>
      <div className={styles.tones}>
        {TONES.map((t) => (
          <section key={t.tone} className={styles.item}>
            <Picture item={glasses} tone={t.tone} />
            <Picture item={genui} tone={t.tone} />
            <h3 className={styles.name}>{t.name}</h3>
            <p className={styles.note}>{t.note}</p>
          </section>
        ))}
      </div>

      <h2 id="layouts" className={styles.group}>The card · three layouts</h2>
      <p className={styles.hint}>Left, at rest. Right, as it is under the cursor.</p>
      {LAYOUTS.map((l) => (
        <section key={l.layout} id={`layout-${l.layout}`} className={styles.layout}>
          <div className={styles.pair}>
            <WorkCard item={glasses} layout={l.layout} tone="toned" />
            <WorkCard item={glasses} layout={l.layout} tone="toned" held={[0.62, 0.22]} />
          </div>
          <h3 className={styles.name}>{l.name}</h3>
          <p className={styles.note}>{l.note}</p>
        </section>
      ))}

      <h2 id="grid" className={styles.group}>In the grid · at the size on the page</h2>
      <p className={styles.hint}>Four real projects, laid out as the Work section lays them out. Switch the layout and the picture.</p>
      <div className={styles.switches}>
        <div className={styles.switch} role="group" aria-label="Layout">
          {LAYOUTS.map((l) => (
            <button key={l.layout} type="button" aria-pressed={layout === l.layout} onClick={() => setLayout(l.layout)}>{l.name}</button>
          ))}
        </div>
        <div className={styles.switch} role="group" aria-label="Picture">
          {TONES.map((t) => (
            <button key={t.tone} type="button" aria-pressed={tone === t.tone} onClick={() => setTone(t.tone)}>{t.name}</button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {software.map((item) => <WorkCard key={`${item.slug}-${layout}-${tone}`} item={item} layout={layout} tone={tone} />)}
      </div>
    </main>
  );
}
