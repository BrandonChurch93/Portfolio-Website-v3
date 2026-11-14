'use client';

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { drawer, hallmarks, medal, plate, stamp, stampedBar, token } from '../../accomplishments/arts';
import { FRAME, LAYOUTS, type Layout } from '../../accomplishments/layouts';
import { mountStage, type Art, type Slot, type Stage } from '../../accomplishments/stage';
import styles from './Accomplishments.module.css';

type Register = (key: string, el: HTMLElement | null, art: Art) => void;
const Slots = createContext<Register | null>(null);

// One canvas of lit bronze over whatever it holds. Each Metal inside it is a place the canvas draws a relief.
function Bronze({ antique, id, className, style, children }: { antique: boolean; id?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const slots = useRef(new Map<string, Slot>());
  const stage = useRef<Stage | null>(null);
  const register = useCallback<Register>((key, el, art) => { if (el) slots.current.set(key, { el, art }); else slots.current.delete(key); }, []);

  useEffect(() => {
    if (!canvas.current) return;
    const mounted = mountStage(canvas.current, [...slots.current.values()]);
    stage.current = mounted;
    return () => { mounted.dispose(); stage.current = null; };
  }, []);
  useEffect(() => { stage.current?.antique(antique ? 1 : 0); }, [antique]);

  return (
    <div id={id} className={`${styles.bronze} ${className ?? ''}`} style={style}>
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      <Slots.Provider value={register}>{children}</Slots.Provider>
    </div>
  );
}

function Metal({ art, name, className, style }: { art: Art; name: string; className?: string; style?: CSSProperties }) {
  const register = useContext(Slots), key = useId();
  return <div ref={(el) => register?.(key, el, art)} role="img" aria-label={name} className={`${styles.metal} ${className ?? ''}`} style={{ aspectRatio: `${art.w} / ${art.h}`, ...style }} />;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function Section({ l, antique, stream }: { l: Layout; antique: boolean; stream: boolean }) {
  const d = l.line.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <section className={styles.option}>
      <h3 className={styles.name}>{l.name}</h3>
      <p className={styles.note}>{l.note}</p>
      <p className={styles.note}>{l.stream}</p>
      <Bronze antique={antique} id={`layout-${l.id}`} className={styles.frame} style={{ aspectRatio: `${FRAME} / ${l.h}` }}>
        {l.pieces.map((p, i) => (
          <Metal key={i} art={p.art} name={p.name} className={styles.placed} style={{ left: pct(p.x, FRAME), top: pct(p.y, l.h), width: pct(p.w, FRAME) }} />
        ))}
        {l.words.map((w, i) => (
          <span key={i} className={styles.word} data-heavy={w.heavy ?? false} style={{ left: pct(w.x, FRAME), top: pct(w.y, l.h), width: pct(w.w, FRAME) }} />
        ))}
        <svg className={styles.stream} viewBox={`0 0 ${FRAME} ${l.h}`} data-on={stream} aria-hidden="true">
          <path className={styles.haze} d={d} />
          <path className={styles.glow} d={d} />
          <path className={styles.body} d={d} />
          <path className={styles.core} d={d} />
          {l.strikes.map(([x, y], i) => (
            <g key={i} className={styles.strike} transform={`translate(${x} ${y})`}>
              <circle className={styles.flare} r="20" />
              {[0, 1, 2, 3, 4, 5, 6].map((n) => { const a = -Math.PI * (0.08 + n * 0.14), r = 13 + ((n * 7) % 5) * 3; return <line key={n} x1={Math.cos(a) * 6} y1={Math.sin(a) * 6} x2={Math.cos(a) * r} y2={Math.sin(a) * r} />; })}
              <circle className={styles.dot} r="3.2" />
            </g>
          ))}
        </svg>
      </Bronze>
    </section>
  );
}

const PLATES = [
  { name: 'Plate · Plain', note: 'The figure in relief, what it counts cut in, and two lines of words. The two short bars stand for the words.', art: plate('10', 'YEARS', 1) },
  { name: 'Plate · With a picture', note: 'The same plate with a picture in relief at its low end, for your 3D image in each. The faceted stone stands in for a picture of the thing itself.', art: plate('10', 'YEARS', 1, 1) },
];
const MEDALS = [
  { name: 'Medal · Beaded', note: 'A beaded rim, the figure in mirror polish on a satin field, and what it counts round the foot.', art: medal('10', 'YEARS') },
  { name: 'Medal · Wreathed', note: 'A wreath in place of the beads, with what it counts on a band under the figure.', art: medal('10', 'YEARS', 'wreathed') },
  { name: 'Medal · Before it is struck', note: 'The blank a medal is until the stream reaches it: turned rays round a boss, the sleeping card’s family.', art: medal('', '', 'blank') },
];
const DRAWERS = [
  { name: 'Drawer · Label and knob', note: 'The figure and what it counts in a label holder, and a knob with a beaded rim and a flower in relief.', art: drawer('10', 'YEARS') },
  { name: 'Drawer · Cut figure and ring', note: 'The figure cut large into the panel, and a ring that hangs from a boss.', art: drawer('10', 'YEARS', 'ring') },
];

const BAR5 = stampedBar(5);
const TOKENS = [0, 1, 2, 3, 4].map(token);
const BAND = hallmarks(5);
const STAMPS = [0, 1, 2].map(stamp);
// A cloud: the tokens at three sizes, scattered. Each is left, top and width in a box 900 by 250.
const CLOUD: [number, number, number, number][] = [[0, 30, 70, 132], [1, 214, 14, 92], [2, 318, 112, 116], [3, 476, 20, 136], [4, 648, 122, 96], [5, 768, 16, 114]];
const CLOUD_ARTS = CLOUD.map(([i]) => token(i));

// Study 19: the accomplishments section as a derby in three parts. ?finish=antique, ?stream=0 and ?ui=0 open it on those.
export function Accomplishments() {
  const [antique, setAntique] = useState(false);
  const [stream, setStream] = useState(true);
  const [ui, setUi] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('finish') === 'antique') setAntique(true);
    if (q.get('stream') === '0') setStream(false);
    if (q.get('ui') === '0') setUi(false);
  }, []);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 19 · accomplishments</p>
      <h1 className={styles.title}>A derby in three parts</h1>
      <p className={styles.lede}>
        Three layouts for the section, the cards each is made of, and five ways to show the companies. All of it is bronze relief, lit
        by the same long lights as the sleeping card and by the cursor. Move the cursor over a piece and scroll: the reflections slide.
      </p>
      <ul className={styles.caveats}>
        <li>Every figure but 10 years is a stand in, shown as 00.</li>
        <li>The marks are made up shapes. None is any company’s.</li>
        <li>Grey bars stand for words. A line stands for the stream.</li>
      </ul>
      <nav className={styles.jump} aria-label="Parts of this study">
        <a href="#layout">1 · The layout</a>
        <a href="#card">2 · The card</a>
        <a href="#marks">3 · The marks</a>
      </nav>

      <h2 id="layout" className={styles.part}>1 · The layout</h2>
      <p className={styles.partNote}>Each is the whole section at the page’s size. The stream comes in at the middle of the top, where it leaves Work.</p>
      {LAYOUTS.map((l) => <Section key={l.id} l={l} antique={antique} stream={stream} />)}

      <h2 id="card" className={styles.part}>2 · The card</h2>
      <p className={styles.partNote}>One accomplishment, closer than the page shows it. Two of each kind, and the blank a medal is before the stream arrives.</p>
      <Bronze antique={antique} id="plates" className={styles.cards}>
        <div className={styles.rowOne}>
          {PLATES.map((p) => (
            <section key={p.name} className={styles.tile}>
              <h3 className={styles.name}>{p.name}</h3>
              <p className={styles.note}>{p.note}</p>
              <Metal art={p.art} name={`${p.name}, in bronze`} className={styles.plate} />
            </section>
          ))}
        </div>
      </Bronze>
      <Bronze antique={antique} id="medals" className={styles.cards}>
        <div className={styles.rowThree}>
          {MEDALS.map((p) => (
            <section key={p.name} className={styles.tile}>
              <h3 className={styles.name}>{p.name}</h3>
              <p className={styles.note}>{p.note}</p>
              <Metal art={p.art} name={`${p.name}, in bronze`} className={styles.medal} />
            </section>
          ))}
        </div>
      </Bronze>
      <Bronze antique={antique} id="drawers" className={styles.cards}>
        <div className={styles.rowTwo}>
          {DRAWERS.map((p) => (
            <section key={p.name} className={styles.tile}>
              <h3 className={styles.name}>{p.name}</h3>
              <p className={styles.note}>{p.note}</p>
              <Metal art={p.art} name={`${p.name}, in bronze`} className={styles.drawer} />
            </section>
          ))}
        </div>
      </Bronze>

      <h2 id="marks" className={styles.part}>3 · The marks</h2>
      <p className={styles.partNote}>The companies, as one material in place of a cloud of grey logos. The first four are rows. The fifth is the cloud you asked about, made the same way.</p>
      <Bronze antique={antique} id="rows" className={styles.cards}>
        <section className={styles.tile}>
          <h3 className={styles.name}>1 · Struck into one bar</h3>
          <p className={styles.note}>Each mark stamped into a single bar, with a cut line between. The one drawn in the layouts above.</p>
          <Metal art={BAR5} name="Five stand in marks struck into one bronze bar" className={styles.bar} />
        </section>
        <section className={styles.tile}>
          <h3 className={styles.name}>2 · Tokens</h3>
          <p className={styles.note}>Each mark raised on a token of its own, like a coin, in one row.</p>
          <div className={styles.tokens}>{TOKENS.map((t, i) => <Metal key={i} art={t} name={`Stand in mark ${i + 1} on a bronze token`} className={styles.token} />)}</div>
        </section>
        <section className={styles.tile}>
          <h3 className={styles.name}>3 · Hallmarks</h3>
          <p className={styles.note}>Small and close together on a narrow band, each raised inside a sunk shape of its own, as a silversmith marks a piece. The quietest.</p>
          <Metal art={BAND} name="Five stand in marks as hallmarks on a narrow bronze band" className={styles.band} />
        </section>
        <section className={styles.tile}>
          <h3 className={styles.name}>4 · Named</h3>
          <p className={styles.note}>For two or three companies: each mark on a small plate with the company’s name and one line beside it.</p>
          <div className={styles.named}>
            {STAMPS.map((s, i) => (
              <div key={i} className={styles.credit}>
                <Metal art={s} name={`Stand in mark ${i + 1} struck into a small bronze plate`} className={styles.stamp} />
                <span className={styles.lines}><i data-heavy="true" /><i /><i /></span>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.tile}>
          <h3 className={styles.name}>5 · A cloud</h3>
          <p className={styles.note}>The tokens at three sizes, scattered. It needs six or more marks to read as a cloud, and the sizes rank the companies whether you mean them to or not.</p>
          <div className={styles.cloud}>
            {CLOUD.map(([, x, y, w], i) => <Metal key={i} art={CLOUD_ARTS[i]} name="A stand in mark on a bronze token" className={styles.placed} style={{ left: pct(x, 900), top: pct(y, 250), width: pct(w, 900) }} />)}
          </div>
        </section>
      </Bronze>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="The finish of the bronze">
              <span className={styles.groupName}>Finish</span>
              <button type="button" className={styles.choice} aria-pressed={!antique} onClick={() => setAntique(false)}>Polished</button>
              <button type="button" className={styles.choice} aria-pressed={antique} onClick={() => setAntique(true)}>Antique</button>
            </div>
            <div className={styles.group} role="group" aria-label="The line that stands for the stream">
              <span className={styles.groupName}>Stream</span>
              <button type="button" className={styles.choice} aria-pressed={stream} onClick={() => setStream(true)}>On</button>
              <button type="button" className={styles.choice} aria-pressed={!stream} onClick={() => setStream(false)}>Off</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
