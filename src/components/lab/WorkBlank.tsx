'use client';

import { useEffect, useRef, useState } from 'react';
import { software } from '../../content/work';
import { registry } from '../../hooks/registry';
import { CARD } from '../../metal/mask';
import { plates } from '../../metal/renderer';
import { band, edge, veil, WAKE } from '../../metal/wake';
import { clock } from '../../world/clock';
import { WorkCard } from '../WorkCard';
import styles from './WorkBlanks.module.css';

// Where the band sets out from on each card, as shares of its width and height: where the stream strikes that card
// on the Work page. The first row is struck on its top near its outer end, the second on its outer side.
const FROM: [number, number][] = [[0.12, 0], [0.88, 0], [0, 0.4], [1, 0.4]];

// Study 20: the blank a sleeping card is, as it is built in the card's own plate, with no stream near it. Four real
// cards asleep. Each can be woken and put back to sleep, which plays the band of light across it.
// ?wake=0.5 holds every band half way across for a still, and blankHold(i, amount) holds one.
export function WorkBlank() {
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const want = useRef([0, 0, 0, 0]);
  const held = useRef<(number | null)[]>([null, null, null, null]);
  const rate = useRef(1);
  const [awake, setAwake] = useState([false, false, false, false]);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('wake');
    if (q !== null) held.current = held.current.map(() => Number(q));
    registry.tool('blankHold', (i: number, amount?: number) => { held.current[i] = amount ?? null; });
    const at = [0, 0, 0, 0], wipes = FROM.map(() => new Float32Array(6)), wore = ['', '', '', ''];
    const off = clock.onFrame((_, dt) => {
      slots.current.forEach((slot, i) => {
        const card = slot?.querySelector<HTMLElement>('article'), host = slot?.querySelector('[data-kind="card"]');
        if (!card || !host) return;
        const hold = held.current[i];
        at[i] = hold ?? Math.max(0, Math.min(1, at[i] + Math.sign(want.current[i] - at[i]) * (dt * rate.current) / WAKE.cross));
        const hw = card.offsetWidth / 2, hh = card.offsetHeight / 2, unit = card.offsetWidth / CARD.width;
        const whole = at[i] >= 1;
        const burn = whole ? 0 : band(wipes[i], 0, hw, hh, unit, edge(hw * (2 * FROM[i][0] - 1), hh * (2 * FROM[i][1] - 1), hw, hh), at[i]);
        if (!whole) band(wipes[i], 1, hw, hh, unit, [0, -hh, 0, -1], 0);
        plates.setWipes(host, whole ? null : wipes[i], burn, 0);
        const words = veil(whole ? null : wipes[i], hw, hh);
        if (words !== wore[i]) { wore[i] = words; card.style.setProperty('--veil', words); }
      });
    });
    return off;
  }, []);

  useEffect(() => { want.current = awake.map((on) => (on ? 1 : 0)); }, [awake]);
  useEffect(() => { rate.current = slow ? 0.25 : 1; }, [slow]);

  const flip = (i: number) => { held.current[i] = null; setAwake((a) => a.map((on, n) => (n === i ? !on : on))); };
  const all = awake.every(Boolean);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 20 · the blank</p>
      <h1 className={styles.title}>Engine turned</h1>
      <p className={styles.lede}>
        The blank a sleeping card is, built in the card&rsquo;s own plate: rays cut round a turned handle, inside the card&rsquo;s polished
        edge, lit by long lights that stand off the screen. Scroll the page and move the cursor beside a blank: the light on it
        moves. Wake one to see the band of light cross it, and put it back to sleep to see the band run back.
      </p>
      <div className={styles.controls}>
        <button type="button" className={styles.go} onClick={() => { held.current = [null, null, null, null]; setAwake(FROM.map(() => !all)); }}>{all ? 'Put all to sleep' : 'Wake all'}</button>
        <button type="button" className={styles.go} aria-pressed={slow} onClick={() => setSlow((s) => !s)}>Quarter speed · {slow ? 'on' : 'off'}</button>
      </div>
      <div className={styles.stage}>
        <div className={styles.grid}>
          {FROM.map((_, i) => (
            <section key={software[i].slug} className={styles.item}>
              <div ref={(el) => { slots.current[i] = el; }} className={styles.slot} data-awake={awake[i]}>
                <WorkCard item={software[i]} />
              </div>
              <button type="button" className={styles.go} onClick={() => flip(i)}>{awake[i] ? 'Put to sleep' : 'Wake'}</button>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
