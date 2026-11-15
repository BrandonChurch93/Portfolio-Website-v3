'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SWING, swingOf } from '../../skills/plan';
import { FILL, LAUNCH } from '../../pieces/pad/layout';
import { clock } from '../../world/clock';
import type { Piece } from '../../world/piece';
import { WAYS, type Struck, type Way } from '../../world/struck';
import { PieceView } from '../PieceView';
import styles from './PieceLab.module.css';

const WAY_NAMES: Record<Way, string> = { shards: 'Shards', band: 'Band', flash: 'Flash' };
// A piece that hangs: the angle it hangs at, in radians from straight down.
interface Swung { setSwing(angle: number): void }
// A piece that launches (the pad in Contact): how far its stone is lit, and the seconds since it was full.
interface Launched { setFill(k: number): void; setLaunch(age: number): void }
// How long after the strike the stream is taken to be fully on a struck piece.
const WARM = 0.3;

// One piece alone, filling the viewport, for building and checking it.
// ?entrance=1 plays its entrance. ?making=1 shows the "how this is made" switch. ?label=0 hides the label.
// ?size=220 draws it in a host that many pixels tall, which is how large it is on a page.
// A piece the stream strikes (src/world/struck.ts) gets a Strike button, and one that comes to life at its strike a
// switch between the three ways and a quarter speed switch. ?way=band opens it on that way, ?at=0.4 holds it that
// many seconds after its strike, ?stream=1 opens it with the stream on it, and ?ui=0 hides the buttons.
// A piece that hangs and swings (the headphones) gets a Knock button, which swings it as the Skills page does, and
// one that launches a Launch button, which lights its stone and sends its rocket up as the Contact page does.
// ?wide=800 with ?size sets how wide the host is, for a piece that is taller than it is wide.
export function PieceLab({ name }: { name: string }) {
  const [opts, setOpts] = useState<{ entrance: boolean; making: boolean; label: boolean; ui: boolean; size: number | null; wide: number | null } | null>(null);
  const [struck, setStruck] = useState<{ life: boolean } | null>(null);
  const [hangs, setHangs] = useState(false);
  const [launches, setLaunches] = useState(false);
  const [way, setWay] = useState<Way>('shards');
  const [slow, setSlow] = useState(false);
  const piece = useRef<(Piece & Partial<Struck> & Partial<Swung> & Partial<Launched>) | null>(null);
  const live = useRef({ way, slow, at: null as number | null, from: null as number | null, on: false, knock: null as number | null, lift: null as number | null });
  live.current.way = way;
  live.current.slow = slow;

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const asked = q.get('way') as Way | null, at = q.get('at'), size = Number(q.get('size'));
    if (asked && WAYS.includes(asked)) setWay(asked);
    live.current.at = at === null ? null : Number(at);
    live.current.on = q.get('stream') === '1';
    setOpts({ entrance: q.get('entrance') === '1', making: q.get('making') === '1', label: q.get('label') !== '0', ui: q.get('ui') !== '0', size: size > 0 ? size : null, wide: Number(q.get('wide')) > 0 ? Number(q.get('wide')) : null });
    return clock.onFrame((t) => {
      const p = piece.current, s = live.current;
      if (p?.setSwing && s.knock !== null) {
        const e = (t - s.knock) * (s.slow ? 0.25 : 1);
        p.setSwing((swingOf(SWING.struck, e) * Math.PI) / 180);
        if (e > SWING.lasts) s.knock = null;
      }
      if (p?.setFill && p.setLaunch && s.lift !== null) {
        const e = (t - s.lift) * (s.slow ? 0.25 : 1);
        p.setFill(e / FILL.run);
        p.setLaunch(e - FILL.run);
        if (e > FILL.run + LAUNCH.end + 1.5) { s.lift = null; p.setFill(0); p.setLaunch(0); }
        return;
      }
      // Until the page has something to say the piece is left as it is, so a script can set it.
      if (!p?.setStream || (s.at === null && s.from === null && !s.on)) return;
      const age = s.at ?? (s.from === null ? (s.on ? 60 : -1) : (t - s.from) * (s.slow ? 0.25 : 1));
      p.setLife?.(s.way, s.at === null && s.from === null ? 60 : age);
      p.setStream(Math.max(0, Math.min(1, age / WARM)), age < 0 ? 60 : age);
    });
  }, []);

  const strike = () => { live.current.at = null; live.current.from = clock.now(); };

  return (
    <main className={styles.main} style={opts?.size ? ({ '--size': `${opts.size}px`, ...(opts.wide ? { '--wide': `${opts.wide}px` } : {}) } as CSSProperties) : undefined}>
      {opts?.label && <h1 className={styles.title}>piece · {name}</h1>}
      {opts && (
        <PieceView
          name={name}
          className={opts.size ? styles.sized : styles.stage}
          entrance={opts.entrance}
          making={opts.making}
          onPiece={(p: (Piece & Partial<Struck> & Partial<Swung> & Partial<Launched>) | null) => { piece.current = p; p?.setLife?.(live.current.way, 60); setStruck(p?.setStream ? { life: !!p.setLife } : null); setHangs(!!p?.setSwing); setLaunches(!!p?.setLaunch); }}
        />
      )}
      {opts?.ui && hangs && (
        <div className={styles.controls}>
          <div className={styles.group}>
            <button type="button" className={styles.choice} onClick={() => { live.current.knock = clock.now(); }}>Knock</button>
            <button type="button" className={styles.choice} aria-pressed={slow} onClick={() => setSlow(!slow)}>Quarter speed</button>
          </div>
        </div>
      )}
      {opts?.ui && launches && (
        <div className={styles.controls}>
          <div className={styles.group}>
            <button type="button" className={styles.choice} onClick={() => { live.current.lift = clock.now(); }}>Launch</button>
            <button type="button" className={styles.choice} aria-pressed={slow} onClick={() => setSlow(!slow)}>Quarter speed</button>
          </div>
        </div>
      )}
      {opts?.ui && struck && !hangs && !launches && (
        <div className={styles.controls}>
          {struck.life && (
            <div className={styles.group} role="group" aria-label="How it comes to life">
              {WAYS.map((w) => <button key={w} type="button" className={styles.choice} aria-pressed={way === w} onClick={() => { setWay(w); strike(); }}>{WAY_NAMES[w]}</button>)}
            </div>
          )}
          <div className={styles.group}>
            <button type="button" className={styles.choice} onClick={strike}>Strike</button>
            <button type="button" className={styles.choice} aria-pressed={slow} onClick={() => setSlow(!slow)}>Quarter speed</button>
          </div>
        </div>
      )}
    </main>
  );
}
