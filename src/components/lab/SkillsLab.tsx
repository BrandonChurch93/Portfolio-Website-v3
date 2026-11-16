'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ABOUT_TABS, COMPETENCIES } from '../../skills-about/content';
import type { DeskPiece } from '../../pieces/desk/index';
import { ABOUT, BOARD, SKILLS, throwLine } from '../../skills/plan';
import type { SkillsStage } from '../../skills/stage';
import type { Piece } from '../../world/piece';
import { WAYS, type StruckPiece, type Way } from '../../world/struck';
import { PieceView } from '../PieceView';
import { Still } from '../Still';
import type { Hub } from '../../whole/hub';
import { Shell } from './Shell';
import styles from './SkillsLab.module.css';

const WAY_NAMES: Record<Way, string> = { shards: 'Shards', band: 'Band', flash: 'Flash' };
// The small pieces are mounted from this many screens away, so none is being built as the stream reaches it.
const REACH = 5;
const u = (n: number) => `calc(var(--u) * ${Number(n.toFixed(2))})`;
const at = (x: number, y: number, w?: number, h?: number): CSSProperties => ({ left: u(x), top: u(y), width: w === undefined ? undefined : u(w), height: h === undefined ? undefined : u(h) });

// The light behind him and the light the studio light throws, as the page draws them. It is drawn twice: under the
// stream, and again inside his own outline over the stream, which is how the stream is hidden behind him.
function Glow() {
  const P = ABOUT.portrait, G = ABOUT.glow, { lens, enter, along } = throwLine();
  const far = Math.hypot(enter[0] - lens[0], enter[1] - lens[1]) + ABOUT.beam.past;
  const bearing = (Math.atan2(along[0], -along[1]) * 180) / Math.PI, half = (Math.atan(ABOUT.beam.wide) * 180) / Math.PI;
  const where = `${u(lens[0])} ${u(lens[1])}`;
  // The light spreads from the lens as a wedge with soft sides.
  const wedge = `conic-gradient(from ${(bearing - half).toFixed(2)}deg at ${where}, transparent 0deg, rgb(0 0 0 / 0.16) ${(half * 0.16).toFixed(2)}deg, rgb(0 0 0 / 0.55) ${(half * 0.38).toFixed(2)}deg, #000 ${(half * 0.68).toFixed(2)}deg, #000 ${(half * 1.32).toFixed(2)}deg, rgb(0 0 0 / 0.55) ${(half * 1.62).toFixed(2)}deg, rgb(0 0 0 / 0.16) ${(half * 1.84).toFixed(2)}deg, transparent ${(half * 2).toFixed(2)}deg)`;
  return (
    <>
      <div className={styles.aura} data-part="aura" style={{ background: `radial-gradient(ellipse ${u(G.rx)} ${u(G.ry)} at ${u(P.x + P.w / 2)} ${u(P.y + P.h * G.at)}, color-mix(in srgb, var(--flame) 55%, transparent), color-mix(in srgb, var(--ember) 50%, transparent) 50%, transparent)` }} />
      <div
        className={styles.beam}
        data-part="beam"
        style={{
          background: `radial-gradient(circle ${u(far)} at ${where}, color-mix(in srgb, var(--hot) 62%, transparent), color-mix(in srgb, var(--flame) 40%, transparent) 20%, color-mix(in srgb, var(--ember) 36%, transparent) 65%, transparent)`,
          maskImage: wedge,
          WebkitMaskImage: wedge,
        }}
      />
    </>
  );
}

// Skills and About, built for real (BRIEF.md, Settled, "Skills and About, the first build"). The page only lays
// things out. The stream plans its route from where they are (src/stream/route-skills.ts) and brings each onto the
// page as its leading end reaches it (src/skills/stage.ts).
// The desk is the piece in src/pieces/desk, at whatever stage its parts have reached. The section's title is a word
// lying on the desk's floor, drawn by the desk: the heading in the page is for a screen reader, and is the title on a
// screen too narrow for the desk. The second and third rows keep an empty place for their thing. The words are placeholders and his to write.
// ?way=band or flash opens it on that way of bringing the CPU to life, and ?ui=0 hides the label and the switch.
// Pressing a way while the stream is on the first row strikes the row again, so the three can be compared in place.
// On a page with more sections than this one (hub), it hands the hub its plan and the hub mounts the one stream.
export function SkillsLab({ hub }: { hub?: Hub }) {
  const id = useId().replace(/:/g, '');
  const page = useRef<HTMLElement>(null), board = useRef<HTMLDivElement>(null), skills = useRef<HTMLElement>(null), about = useRef<HTMLElement>(null);
  const stage = useRef<SkillsStage | null>(null);
  const pieces = useRef<{ cpu: StruckPiece | null; reflector: StruckPiece | null; light: StruckPiece | null; desk: DeskPiece | null }>({ cpu: null, reflector: null, light: null, desk: null });
  const [ui, setUi] = useState(true);
  const [way, setWay] = useState<Way>('shards');
  const [tab, setTab] = useState(0);
  const [showing, setShowing] = useState(0);
  // Whether the screen is wide enough for the layout. Narrower, the page is a plain stand in with no stream, no
  // desk and no small pieces. Not known until the page is in a browser.
  const [wide, setWide] = useState<boolean | null>(null);
  const live = useRef({ way });
  live.current.way = way;

  useEffect(() => {
    const q = new URLSearchParams(location.search), asked = q.get('way') as Way | null;
    setUi(q.get('ui') !== '0' && !hub);
    if (asked && WAYS.includes(asked)) setWay(asked);
    const fits = matchMedia(`(min-width: ${BOARD.least}px)`), read = () => setWide(fits.matches);
    read();
    fits.addEventListener('change', read);
    return () => fits.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    if (!wide || !page.current || !board.current || !skills.current || !about.current) return;
    let alive = true, made: SkillsStage | null = null;
    void import('../../skills/stage').then(({ mountSkills }) => {
      if (!alive) return;
      made = mountSkills({ page: hub?.page() ?? page.current!, root: page.current!, board: board.current!, skills: skills.current!, about: about.current!, pieces: () => pieces.current, way: () => live.current.way }, hub?.skills(skills.current!));
      stage.current = made;
    });
    return () => { alive = false; stage.current = null; made?.dispose(); };
  }, [wide, hub]);

  const hold = (name: 'cpu' | 'reflector' | 'light') => (p: Piece | null) => { pieces.current[name] = p as StruckPiece | null; };
  const holdDesk = (p: Piece | null) => { pieces.current.desk = p as DeskPiece | null; };
  const pick = (i: number) => {
    if (i === tab) return;
    setTab(i);
    const el = document.getElementById(`${id}-tab-${i}`);
    if (stage.current && el) stage.current.tab(el, () => setShowing(i));
    else setShowing(i);
  };
  const step = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, n = ABOUT_TABS.length;
    const end = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (!by && end < 0) return;
    e.preventDefault();
    const next = end >= 0 ? end : (i + by + n) % n;
    pick(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  const T = ABOUT.words, P = ABOUT.portrait, K = SKILLS.thing;
  return (
    <Shell ref={page} className={styles.page} data-embed={hub ? '' : undefined}>
      {ui && (
        <header className={styles.head}>
          <p className={styles.label}>Study 25 · Skills and About</p>
          <h1 className={styles.heading}>Scroll down</h1>
          <p className={styles.note}>The desk's things are being made round by round. The second and third rows keep an empty place for their thing. The words are placeholders.</p>
        </header>
      )}
      <div ref={board} className={styles.board}>
        <section ref={skills} className={styles.skills} aria-labelledby={`${id}-skills`}>
          <h2 id={`${id}-skills`} className={`${styles.title} ${styles.heading2}`}>Skills</h2>
          {/* The desk as one picture, with the section's title on its floor, on a screen too narrow for the live desk. */}
          <Still name="desk" className={styles.still} />
          <div className={styles.desk} data-part="desk" aria-hidden="true" style={at(SKILLS.desk.x, SKILLS.desk.y, SKILLS.desk.w, SKILLS.desk.h)}>
            {wide && <PieceView name="desk" reach={REACH} className={styles.piece} onPiece={holdDesk} />}
          </div>
          <div className={styles.rows} style={{ marginLeft: u(SKILLS.rows.l), width: u(SKILLS.rows.r - SKILLS.rows.l), paddingTop: u(SKILLS.rows.t), paddingBottom: u(SKILLS.foot), '--thing': K.w, '--least': SKILLS.rows.least, '--meet': K.meet, '--wide': K.wide, '--host': K.host, '--rise': K.rise } as CSSProperties}>
            {COMPETENCIES.map((c, i) => (
              <article key={c.name} className={styles.row} data-part="row">
                <div className={styles.thing} aria-hidden="true">
                  {i === 0 && wide && (
                    <div className={styles.thingHost} data-part="thing">
                      <PieceView name="cpu" reach={REACH} className={styles.piece} onPiece={hold('cpu')} />
                    </div>
                  )}
                </div>
                <h3 className={styles.name} data-part="name">{c.name}</h3>
                <dl className={styles.groups} data-part="lists">
                  {c.groups.map(([label, items]) => (
                    <div key={label} className={styles.group}>
                      <dt>{label}</dt>
                      <dd><span className={styles.items}>{items.map((item) => <span key={item} className={styles.item}>{item}</span>)}</span></dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section ref={about} className={styles.about} aria-labelledby={`${id}-about`} style={{ height: u(ABOUT.h) }}>
          <div className={styles.glow} aria-hidden="true"><Glow /></div>
          <div className={styles.prop} data-part="reflector" aria-hidden="true" style={{ width: u(ABOUT.reflector.host), height: u(ABOUT.reflector.host) }}>
            {wide && <PieceView name="reflector" reach={REACH} className={styles.piece} onPiece={hold('reflector')} />}
          </div>
          <div className={styles.prop} data-part="light" aria-hidden="true" style={{ width: u(ABOUT.light.host), height: u(ABOUT.light.host) }}>
            {wide && <PieceView name="studio-light" reach={REACH} className={styles.piece} onPiece={hold('light')} />}
          </div>
          <div className={styles.cover} data-part="cover" aria-hidden="true" style={at(P.x, P.y, P.w, P.h * 1.02)}>
            <div className={styles.coverGlow} style={{ left: u(-P.x), top: u(-P.y), height: u(ABOUT.h) }}><Glow /></div>
          </div>
          <div className={styles.words} data-part="words" style={at(T.l, 0, T.w)}>
            <h2 id={`${id}-about`} className={styles.title} data-part="about-title" style={{ top: u(T.title) }}>About</h2>
            <div className={styles.tabs} role="tablist" aria-label="About" data-part="tabs" style={{ top: u(T.tabs) }}>
              {ABOUT_TABS.map((t, i) => (
                <button key={t.name} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={tab === i} aria-controls={`${id}-panel`} tabIndex={tab === i ? 0 : -1} className={styles.tab} onClick={() => pick(i)} onKeyDown={(e) => step(e, i)}>{t.name}</button>
              ))}
            </div>
            <div className={styles.panel} role="tabpanel" tabIndex={0} id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} data-part="panel" data-swapping={showing !== tab} style={{ top: u(T.text) }}>
              <p className={styles.tag}>Placeholder text</p>
              {ABOUT_TABS[showing].text.map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/portrait-cut-1600.webp" srcSet="/media/portrait-cut-960.webp 960w, /media/portrait-cut-1600.webp 1600w" sizes="62vw" width={1600} height={1552} alt="Brandon Church" className={styles.portrait} data-part="portrait" style={at(P.x, P.y, P.w)} />
        </section>
      </div>

      {ui && (
        <div className={styles.switch}>
          <div className={styles.set} role="group" aria-label="How the CPU comes to life when the stream strikes it">
            <span className={styles.setName}>The CPU comes to life by</span>
            {WAYS.map((w) => <button key={w} type="button" className={styles.choice} aria-pressed={way === w} onClick={() => { setWay(w); live.current.way = w; stage.current?.again(); }}>{WAY_NAMES[w]}</button>)}
          </div>
        </div>
      )}
    </Shell>
  );
}
