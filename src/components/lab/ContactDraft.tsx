'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type FormEvent } from 'react';
import { READING_LINE } from '../../config/site';
import { BLOCK, FOOT, FUEL, LAUNCH, ROCKET, STONE, TABLE, TOWER, W, WAKE, climbed, plan } from '../../contact/plan';
import { point, reach } from '../../page-sketch/plan';
import { clock } from '../../world/clock';
import styles from './ContactDraft.module.css';
import draft from './SkillsAboutDraft.module.css';

// The most of its line the stream's end covers in a second, the gap past which it catches up faster, and the most
// of the stone that lights in a second.
const SPEED = 1150;
const FAR = 2600;
const POUR = 1.3;
// Near the foot of the page the place the stream's end is read from slides down the screen, so the stone is full
// when the page runs out on any height of screen. This is the share of a screen it slides over.
const SLIDE = 0.5;

const P = plan();
const K = ROCKET, H = K.half, S = STONE, SX = K.x, SY = P.ground;
const f1 = (v: number) => v.toFixed(1);
const tr = (x: number, y: number) => `translate(${f1(x)} ${f1(y)})`;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => { const k = clamp(u); return k * k * (3 - 2 * k); };

const BRACES = (() => {
  let d = `M${TOWER.l} ${TABLE.top}`, left = true;
  for (let y = TABLE.top - 42; y >= -TOWER.top; y -= 42) { d += ` L${left ? TOWER.r : TOWER.l} ${y}`; left = !left; }
  return d;
})();
const NOSE = `M${-H} ${-(K.upper + K.band)} C${-H} ${-(K.upper + 52)} -15 ${-(K.nose - 18)} -3 ${-K.nose} L3 ${-K.nose} C15 ${-(K.nose - 18)} ${H} ${-(K.upper + 52)} ${H} ${-(K.upper + K.band)} Z`;

// The stone is a disc seen from above and in front, so every circle on it is an oval.
const on = (k: number, a: number) => `${f1(SX + S.rx * k * Math.cos(a))} ${f1(SY + P.ry * k * Math.sin(a))}`;
const oval = (k: number) => `M${f1(SX - S.rx * k)} ${SY} a${f1(S.rx * k)} ${f1(P.ry * k)} 0 1 0 ${f1(2 * S.rx * k)} 0 a${f1(S.rx * k)} ${f1(P.ry * k)} 0 1 0 ${f1(-2 * S.rx * k)} 0 Z`;
const BANDS = S.rings.map((k, i) => oval(k) + (i + 1 < S.rings.length ? ` ${oval(S.rings[i + 1])}` : ''));
const turn = (n: number, i: number) => (Math.PI * 2 * i) / n;
const TICKS = Array.from({ length: S.ticks }, (_, i) => `M${on(S.rings[1] - 0.025, turn(S.ticks, i))} L${on(S.rings[2] + 0.025, turn(S.ticks, i))}`).join(' ');
const RAYS = Array.from({ length: S.rays }, (_, i) => { const a = turn(S.rays, i); return `M${on(S.rings[4] + 0.02, a - 0.1)} L${on(S.rings[3] - 0.02, a)} L${on(S.rings[4] + 0.02, a + 0.1)} Z`; }).join(' ');
const STUDS = Array.from({ length: 24 }, (_, i) => on((S.rings[0] + S.rings[1]) / 2, turn(24, i) + 0.13).split(' '));
const EDGE = `M${SX - S.rx} ${SY} v${S.edge} a${S.rx} ${P.ry} 0 0 0 ${S.rx * 2} 0 v${-S.edge} Z`;

type Sent = 'idle' | 'sending' | 'sent';

// Study 26, third round: arrangement A with the pool as a Sun stone laid flat and the plate asleep as the blank.
// ?whole, ?launch=2 (seconds into the launch, held), ?wake=0.5 (the plate's band held that far across), ?sent,
// ?speed=half and ?ui=0 open it on those.
export function ContactDraft() {
  const id = useId().replace(/:/g, '');
  const [slow, setSlow] = useState(false);
  const [ui, setUi] = useState(true);
  const [whole, setWhole] = useState(false);
  const [hold, setHold] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [fuel, setFuel] = useState(0);
  const [woken, setWoken] = useState(false);
  const [aloft, setAloft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<Sent>('idle');
  const board = useRef<HTMLDivElement>(null), plate = useRef<HTMLDivElement>(null);
  const stream = useRef<SVGGElement>(null), head = useRef<SVGGElement>(null), splash = useRef<SVGGElement>(null);
  const rocket = useRef<SVGGElement>(null), jet = useRef<SVGGElement>(null), arms = useRef<SVGGElement>(null);
  const lit = useRef<SVGGElement>(null), cut = useRef<SVGGElement>(null), wash = useRef<SVGGElement>(null);
  const at = useRef(0), full = useRef(0), burn = useRef(0), wake = useRef(0), replaying = useRef(false);
  const live = useRef({ reached, whole, slow, hold, held, aloft, fuel, woken });
  live.current = { reached, whole, slow, hold, held, aloft, fuel, woken };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('speed') === 'half') setSlow(true);
    if (q.get('ui') === '0') setUi(false);
    if (q.has('sent')) setSent('sent');
    if (q.has('wake')) setHeld(clamp(Number(q.get('wake')) || 0));
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (q.has('whole') || q.has('launch') || still) { setWhole(true); setHold(Number(q.get('launch')) || 0); }
  }, []);

  useEffect(() => clock.onFrame((_, dt) => {
    const el = board.current, now = live.current;
    if (!el) return;
    const box = el.getBoundingClientRect(), scale = box.width / W, l = P.line, k = now.slow ? 0.5 : 1;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    const read = READING_LINE + (1 - READING_LINE) * smooth(1 - left / (innerHeight * SLIDE));
    const y = (innerHeight * read - box.top) / scale;
    const want = now.whole ? l.total : reach(l, y);
    const still = dt <= 0 || clock.isFrozen();
    let len = at.current;
    if (still || now.whole) len = want;
    else {
      const gap = want - len, step = (Math.abs(gap) > FAR && !replaying.current ? Math.abs(gap) * 4 : SPEED * k) * dt;
      len += clamp(gap, -step, step);
      if (Math.abs(want - len) < 1) replaying.current = false;
    }
    at.current = len;
    const landed = len >= l.total - 1;
    const fill = now.whole ? 1 : landed ? clamp((y - P.landAt[1]) / (P.h - 40 - P.landAt[1])) : 0;
    let f = full.current;
    if (still || now.whole) f = fill;
    else f += clamp(fill - f, -POUR * k * dt * 2, POUR * k * dt);
    full.current = f;
    const ready = f >= 0.995;
    let b = burn.current;
    if (now.hold !== null) b = now.hold;
    else if (!still) b = clamp(b + (ready ? dt * k : -dt * k * LAUNCH.back), 0, LAUNCH.end);
    else if (!ready) b = 0;
    burn.current = b;
    if (b > 0.001 !== now.aloft) setAloft(b > 0.001);
    const up = climbed(b), tail = P.engine[1] - up;

    if (stream.current) {
      for (const path of stream.current.children) path.setAttribute('stroke-dasharray', `${f1(len)} 99999`);
      stream.current.style.opacity = len > 0.5 ? '1' : '0';
    }
    if (head.current) {
      const [hx, hy] = point(l, len);
      head.current.style.opacity = len > 2 && !landed ? '1' : '0';
      head.current.setAttribute('transform', tr(hx, hy));
    }
    if (splash.current) splash.current.style.opacity = landed ? '1' : '0';
    const n = BANDS.length, drawn = 1 - 0.3 * smooth((b - LAUNCH.lift) / 0.8) * (1 - smooth((b - 3) / 1.6));
    const share = (i: number) => smooth(f * n - i);
    if (lit.current) [...lit.current.children].forEach((band, i) => { (band as SVGElement).style.opacity = (share(i) * drawn).toFixed(3); });
    if (cut.current) {
      const [studs, ticks, rays] = cut.current.children as unknown as SVGElement[];
      studs.style.opacity = (0.4 + 0.6 * share(0)).toFixed(3);
      ticks.style.opacity = (0.4 + 0.6 * share(1)).toFixed(3);
      rays.style.opacity = (0.4 + 0.6 * share(3)).toFixed(3);
    }
    if (wash.current) wash.current.style.opacity = clamp(0.5 * f + 0.5 * smooth(b / 0.9) * (1 - 0.7 * smooth((b - 2) / 2.4))).toFixed(3);
    if (rocket.current) {
      rocket.current.setAttribute('transform', `${tr(P.engine[0], tail)} scale(${K.scale})`);
      rocket.current.style.opacity = clamp(tail / 240).toFixed(3);
    }
    if (jet.current) {
      jet.current.setAttribute('transform', `scale(1 ${(0.3 + 0.7 * smooth((b - LAUNCH.lift) / 0.8)).toFixed(3)})`);
      jet.current.style.opacity = smooth(b / 0.35).toFixed(3);
    }
    if (arms.current) {
      const s = 1 - 0.74 * smooth((b - LAUNCH.arms) / 0.55);
      for (const arm of arms.current.children) arm.setAttribute('transform', `translate(${TOWER.l} 0) scale(${s.toFixed(3)} 1) translate(${-TOWER.l} 0)`);
    }

    const next = new Set<string>();
    for (const c of P.cues) if (len >= c.at - 1) next.add(c.id);
    if (next.size !== now.reached.size || [...next].some((c) => !now.reached.has(c))) setReached(next);
    const step = f >= FUEL.nose ? 3 : f >= FUEL.upper ? 2 : f >= FUEL.lower ? 1 : 0;
    if (step !== now.fuel) setFuel(step);

    const up2 = next.has('block') || now.woken;
    let w = wake.current;
    if (now.held !== null) w = now.held;
    else if (still || now.whole) w = up2 ? 1 : 0;
    else w = clamp(w + ((up2 ? 1 : -WAKE.back) * dt * k) / WAKE.run);
    wake.current = w;
    const face = plate.current;
    if (face) {
      const wide = face.offsetWidth, tall = face.offsetHeight;
      face.style.setProperty('--r', `${(w * (Math.hypot(wide * (1 - WAKE.from[0]), tall * (1 - WAKE.from[1])) + 40)).toFixed(1)}px`);
      face.style.setProperty('--band', (Math.sin(Math.PI * w) ** 0.6).toFixed(3));
      face.style.setProperty('--knob', (1 - smooth(w / WAKE.knob)).toFixed(3));
    }
  }), []);

  const got = (c: string) => reached.has(c);
  // While the rocket is off its table nothing of the pad goes dark, however far the stream has drawn back.
  const near = got('near') || aloft, fed = (n: number) => fuel >= n || aloft;
  const up = got('block') || woken;
  const [ex, ey] = P.engine;
  const glow = `${id}-flare`, heat = `${id}-heat`, burnt = `${id}-jet`, clip = `${id}-clip`;
  const place = (x: number, y: number, w?: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / P.h) * 100}%`, width: w ? `${(w / W) * 100}%` : undefined });
  const again = () => { replaying.current = true; at.current = 0; full.current = 0; burn.current = 0; wake.current = 0; };
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent('sending');
    setTimeout(() => setSent('sent'), 700);
  };
  const leave = (e: FocusEvent<HTMLDivElement>) => { if (!e.currentTarget.contains(e.relatedTarget)) setWoken(false); };

  return (
    <main className={draft.main}>
      <header className={draft.head}>
        <p className={draft.label}>Study 26 · Contact</p>
        <h1 className={draft.heading}>Contact, with the Sun stone and the sleeping plate</h1>
        <p className={draft.lede}>
          Arrangement A, with the two things you said yes to drawing. The pool is a Sun stone laid flat, and the plate
          sleeps as the engine turned blank. Scroll: the line is the stream.
        </p>
        <ul className={draft.caveats}>
          <li>The plate is asleep until the stream passes its top: the engine turned blank with its knob. A band of light crosses it from the corner nearest the stream, the knob draws back ahead of the band, and the form is there. Moving the pointer onto it, or tabbing into it, wakes it too.</li>
          <li>The stream lands on the stone’s outer band. The stone lights band by band from its rim to its middle as you scroll on, and the last to light is the boss the rocket stands on. Then the rocket goes.</li>
          <li>I told you the stone would light from the middle outward. Drawn, it lights from the rim in: the stream lands at the rim, so its light has to travel in to the rocket.</li>
          <li>The rocket lights from its foot up as the stone fills. After the launch the stone stays lit. Scroll back up and the stone goes dark from the middle out, the rocket comes back down, and the plate goes back to sleep.</li>
          <li>The plate no longer lies over the pool: the stone is round and reads better whole.</li>
          <li>Every word is a stand in. The email address is a made up one, the buttons go nowhere and the form sends nothing.</li>
          <li>All of it is outline: the stone’s carving is a few rings, ticks and rays, the blank is drawn lines and a drawn knob, the rocket is the carried one’s outline, the stream is a line.</li>
          <li>For judging: the idea of the stone under the rocket, the idea of the blank on the plate, and the order things happen in. Not the look, not the motion’s feel, not a phone.</li>
        </ul>
      </header>

      <div ref={board} className={draft.board} style={{ aspectRatio: `${W} / ${P.h}`, '--slow': slow ? 2 : 1 } as CSSProperties}>
        <svg className={draft.layer} viewBox={`0 0 ${W} ${P.h}`} aria-hidden="true">
          <defs>
            <radialGradient id={glow}>
              <stop offset="0" stopColor="var(--hot)" stopOpacity="0.9" />
              <stop offset="0.35" stopColor="var(--flame)" stopOpacity="0.45" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={heat}>
              <stop offset="0" stopColor="var(--flame)" stopOpacity="0.5" />
              <stop offset="0.45" stopColor="var(--ember)" stopOpacity="0.34" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={burnt} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--pale)" />
              <stop offset="0.3" stopColor="var(--hot)" stopOpacity="0.9" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clip}><rect x={0} y={0} width={W} height={P.ground + 4} /></clipPath>
          </defs>

          <g ref={wash} className={styles.heat}>
            <ellipse cx={SX} cy={SY - 6} rx={S.rx + 150} ry={130} fill={`url(#${heat})`} />
          </g>
          <g className={styles.pad} data-shown={near}>
            <path d={EDGE} className={styles.side} />
            <path d={oval(1)} className={styles.face} />
            <g ref={lit}>
              {BANDS.map((d, i) => <path key={d} d={d} fillRule="evenodd" className={styles.lit} data-boss={i === BANDS.length - 1} />)}
            </g>
            {S.rings.map((k) => <path key={k} d={oval(k)} className={styles.ring} />)}
            <g ref={cut}>
              <g className={styles.studs}>{STUDS.map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={4.2} ry={1.5} />)}</g>
              <path d={TICKS} className={styles.ring} />
              <path d={RAYS} className={styles.ray} />
            </g>
          </g>

          <g transform={`${tr(ex, ey)} scale(${-K.scale} ${K.scale})`} className={styles.pad} data-shown={near}>
            {TABLE.legs.map((x) => <path key={x} d={`M${x - 4} ${TABLE.top + TABLE.deep} L${x - 4} ${TABLE.ground} L${x + 4} ${TABLE.ground} L${x + 4} ${TABLE.top + TABLE.deep} Z`} />)}
            <path d={`M${TABLE.l} ${TABLE.top} L${TABLE.r} ${TABLE.top} L${TABLE.r + 8} ${TABLE.top + TABLE.deep} L${TABLE.l - 8} ${TABLE.top + TABLE.deep} Z`} />
            {[-1, 1].map((s) => <rect key={s} x={s * 40 - 6} y={-8} width={12} height={14} rx={2} />)}
            <path d={`M${TOWER.l} ${TABLE.top} L${TOWER.l} ${-TOWER.top} M${TOWER.r} ${TABLE.top} L${TOWER.r} ${-TOWER.top}`} className={styles.post} />
            <path d={BRACES} className={styles.brace} />
            <rect x={TOWER.l - 6} y={-TOWER.top - 10} width={TOWER.r - TOWER.l + 12} height={10} rx={2} />
            <line x1={(TOWER.l + TOWER.r) / 2} y1={-TOWER.top - 10} x2={(TOWER.l + TOWER.r) / 2} y2={-TOWER.lamp} />
            <circle cx={(TOWER.l + TOWER.r) / 2} cy={-TOWER.lamp} r={3.6} className={styles.lamp} data-on={fed(1)} />
            <g ref={arms}>
              {TOWER.arms.map((y) => (
                <g key={y}>
                  <rect x={H + 1} y={-y - 3} width={TOWER.l - H - 1} height={6} rx={1.5} />
                  <line x1={H + 6} y1={-y - 9} x2={TOWER.l} y2={-y - 9} />
                </g>
              ))}
            </g>
          </g>

          <g ref={stream} className={draft.line}>
            {[draft.haze, draft.glow, draft.body, draft.core].map((c) => <path key={c} d={P.line.d} className={c} strokeDasharray="0 99999" />)}
          </g>

          <g clipPath={`url(#${clip})`}>
            <g ref={rocket} transform={`${tr(ex, ey)} scale(${K.scale})`} className={styles.pad} data-shown={near}>
              <g ref={jet} className={styles.jet}>
                <path d="M-13 0 C-21 48 -8 130 0 200 C8 130 21 48 13 0 Z" fill={`url(#${burnt})`} />
                <path d="M-5 0 C-8 30 -3 78 0 118 C3 78 8 30 5 0 Z" className={styles.white} />
              </g>
              {[-1, 1].map((s) => <path key={s} d={`M${s * H} ${-K.fin.top} L${s * K.fin.out} -12 L${s * K.fin.out} 6 L${s * H} -26 Z`} />)}
              <path d={`M-9 ${-K.bell} L-14 0 L14 0 L9 ${-K.bell} Z`} />
              <g className={styles.hull} data-on={fed(1)}>
                <path d={`M${-H} ${-K.bell} L${-H} ${-K.lower} L${H} ${-K.lower} L${H} ${-K.bell} Z`} />
                <path d="M-3 -100 L-3 -5 L3 -5 L3 -100 Z" />
              </g>
              <rect x={-H - 2} y={-K.lower - K.band} width={H * 2 + 4} height={K.band} rx={1.5} />
              <g className={styles.hull} data-on={fed(2)}>
                <path d={`M${-H} ${-K.lower - K.band} L${-H} ${-K.upper} L${H} ${-K.upper} L${H} ${-K.lower - K.band} Z`} />
              </g>
              <rect x={-H - 2} y={-K.upper - K.band} width={H * 2 + 4} height={K.band} rx={1.5} />
              <g className={styles.hull} data-on={fed(3)}>
                <path d={NOSE} />
                <circle cx={0} cy={-K.upper - 40} r={5.5} className={styles.port} />
              </g>
              <line x1={0} y1={-K.nose} x2={0} y2={-K.tall} />
            </g>
          </g>

          <g ref={splash} className={draft.lead} transform={tr(P.landAt[0], P.landAt[1])}>
            <ellipse rx={44} ry={16} fill={`url(#${glow})`} />
            {[200, 228, 262, 300, 334].map((a) => <line key={a} x1={0} y1={0} x2={17} y2={0} transform={`rotate(${a})`} />)}
            <circle r={2.6} className={draft.dot} />
          </g>
          <g ref={head} className={draft.lead}>
            <circle r={34} fill={`url(#${glow})`} />
            {[70, 100, 125, 55, 150].map((a) => <line key={a} x1={0} y1={0} x2={20} y2={0} transform={`rotate(${a})`} />)}
            <circle r={3.4} className={draft.dot} />
          </g>
        </svg>

        <section aria-label="Contact" className={styles.block} style={place(BLOCK.l, P.top + BLOCK.t, BLOCK.w)}>
          <div className={styles.over}>
            <h2 className={`${styles.title} ${draft.reveal}`} data-on={up}>Contact</h2>
            <span className={`${styles.tag} ${draft.reveal}`} data-on={up} style={{ '--d': 2 } as CSSProperties}>Stand in words</span>
          </div>
          <div ref={plate} className={styles.plate} style={{ '--fx': `${WAKE.from[0] * 100}%`, '--fy': `${WAKE.from[1] * 100}%` } as CSSProperties} onPointerMove={() => setWoken(true)} onPointerLeave={(e) => { if (!e.currentTarget.contains(document.activeElement)) setWoken(false); }} onFocus={() => setWoken(true)} onBlur={leave}>
            <div className={styles.blank} aria-hidden="true">
              <svg className={styles.rays} viewBox="0 0 100 100" preserveAspectRatio="none">
                {Array.from({ length: 120 }, (_, i) => {
                  const a = turn(120, i);
                  return <line key={i} x1={50} y1={50} x2={f1(50 + 90 * Math.cos(a))} y2={f1(50 + 90 * Math.sin(a))} data-odd={i % 2 === 1} />;
                })}
              </svg>
              <svg className={styles.knob} viewBox="-50 -50 100 100">
                <circle r={46} className={styles.rim} />
                <circle r={38.5} className={styles.beads} />
                <circle r={31} />
                {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0 -5 C7 -12 7 -22 0 -28 C-7 -22 -7 -12 0 -5 Z" transform={`rotate(${i * 45})`} />)}
                <circle r={5.5} className={styles.rim} />
              </svg>
            </div>
            <div className={styles.awake}>
              <div className={styles.fast}>
                <button type="button" className={styles.primary}>Book a call <span aria-hidden="true">↗</span></button>
                <span className={styles.address}>name@example.com</span>
                <button type="button" className={`${styles.accent} ${styles.small}`} onClick={copy}>
                  <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className={styles.or}><span>or send a message</span></p>
              {sent === 'sent' ? (
                <div role="status" className={styles.done}>
                  <p className={styles.doneTitle}>Message sent</p>
                  <p>I’ll get back to you within 24 hours.</p>
                  <button type="button" className={`${styles.accent} ${styles.small}`} onClick={() => setSent('idle')}>Send another</button>
                </div>
              ) : (
                <form className={styles.form} onSubmit={send}>
                  <div className={styles.pair}>
                    <label className={styles.field}>Name<input name="name" type="text" required autoComplete="name" /></label>
                    <label className={styles.field}>Email<input name="email" type="email" required autoComplete="email" /></label>
                  </div>
                  <label className={styles.field}>Message<textarea name="message" required rows={4} /></label>
                  <button type="submit" className={`${styles.accent} ${styles.send}`} disabled={sent === 'sending'}>
                    {sent === 'sending' ? 'Sending' : 'Send message'} {sent === 'idle' && <span aria-hidden="true">→</span>}
                  </button>
                </form>
              )}
              <p className={styles.where}>City, State · Mountain Time</p>
            </div>
            <div className={styles.band} aria-hidden="true" />
          </div>
        </section>

        <footer className={styles.foot} style={place(150, P.foot + FOOT.words, W - 300)}>
          <p>Designed and built by Brandon Church · © 2026</p>
          <ul>
            {['LinkedIn', 'GitHub', 'Résumé'].map((name) => <li key={name}>{name}</li>)}
          </ul>
        </footer>
      </div>

      {ui && (
        <div className={draft.panel}>
          <div className={draft.controls}>
            <div className={draft.group} role="group" aria-label="How fast everything runs">
              <span className={draft.groupName}>Speed</span>
              <button type="button" className={draft.choice} aria-pressed={!slow} onClick={() => setSlow(false)}>Full</button>
              <button type="button" className={draft.choice} aria-pressed={slow} onClick={() => setSlow(true)}>Half</button>
            </div>
            <div className={draft.group} role="group" aria-label="Play it again">
              <span className={draft.groupName}>Play again</span>
              <button type="button" className={draft.choice} onClick={again}>From the top</button>
              <button type="button" className={draft.choice} onClick={() => { wake.current = 0; }}>The plate</button>
              <button type="button" className={draft.choice} onClick={() => { burn.current = 0; }}>The launch</button>
            </div>
            <div className={draft.group} role="group" aria-label="What the form shows">
              <span className={draft.groupName}>Form</span>
              <button type="button" className={draft.choice} aria-pressed={sent !== 'sent'} onClick={() => setSent('idle')}>Empty</button>
              <button type="button" className={draft.choice} aria-pressed={sent === 'sent'} onClick={() => setSent('sent')}>Sent</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
