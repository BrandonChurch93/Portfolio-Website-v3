'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { READING_LINE } from '../../config/site';
import { FOOT, FORM, LAUNCH, ROCKET, TABLE, TOWER, W, WORDS, climbed, plan } from '../../contact/plan';
import { point, reach } from '../../page-sketch/plan';
import { clock } from '../../world/clock';
import styles from './ContactDraft.module.css';
import draft from './SkillsAboutDraft.module.css';

// The most of its line the stream's end covers in a second, and the gap past which it catches up faster.
const SPEED = 1150;
const FAR = 2600;
// Near the foot of the page the place the stream's end is read from slides down the screen, so the stream reaches
// the engine before the page runs out on any height of screen. This is the share of a screen it slides over.
const SLIDE = 0.5;

const P = plan();
const ENGINE = P.cues.find((c) => c.id === 'engine')!.at;
const K = ROCKET, H = K.half;
const tr = (x: number, y: number) => `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u: number) => { const k = clamp(u); return k * k * (3 - 2 * k); };

const BRACES = (() => {
  let d = `M${TOWER.l} ${TABLE.top}`, left = true;
  for (let y = TABLE.top - 42; y >= -TOWER.top; y -= 42) { d += ` L${left ? TOWER.r : TOWER.l} ${y}`; left = !left; }
  return d;
})();
const NOSE = `M${-H} ${-(K.upper + K.band)} C${-H} ${-(K.upper + 52)} -15 ${-(K.nose - 18)} -3 ${-K.nose} L3 ${-K.nose} C15 ${-(K.nose - 18)} ${H} ${-(K.upper + 52)} ${H} ${-(K.upper + K.band)} Z`;

type Sent = 'idle' | 'sending' | 'sent';

// Study 26: Contact and the footer as a wireframe, with the launch roughed in.
// ?whole, ?launch=2 (seconds into the launch, held), ?sent, ?speed=half and ?ui=0 open it on those.
export function ContactDraft() {
  const id = useId().replace(/:/g, '');
  const [slow, setSlow] = useState(false);
  const [ui, setUi] = useState(true);
  const [whole, setWhole] = useState(false);
  const [hold, setHold] = useState<number | null>(null);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState(false);
  const [aloft, setAloft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<Sent>('idle');
  const board = useRef<HTMLDivElement>(null);
  const stream = useRef<SVGGElement>(null), head = useRef<SVGGElement>(null), flare = useRef<SVGGElement>(null);
  const rocket = useRef<SVGGElement>(null), jet = useRef<SVGGElement>(null), drop = useRef<SVGGElement>(null), fire = useRef<SVGGElement>(null);
  const wash = useRef<SVGGElement>(null), arms = useRef<SVGGElement>(null);
  const at = useRef(0), burn = useRef(0), replaying = useRef(false);
  const live = useRef({ reached, whole, slow, hold, aloft });
  live.current = { reached, whole, slow, hold, aloft };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('speed') === 'half') setSlow(true);
    if (q.get('ui') === '0') setUi(false);
    if (q.has('sent')) setSent('sent');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (q.has('whole') || q.has('launch') || still) { setWhole(true); setHold(Number(q.get('launch')) || 0); }
  }, []);

  useEffect(() => clock.onFrame((_, dt) => {
    const el = board.current, { reached: was, whole: held, slow: half, hold: fixed, aloft: flying } = live.current;
    if (!el) return;
    const box = el.getBoundingClientRect(), scale = box.width / W, l = P.line, k = half ? 0.5 : 1;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    const read = READING_LINE + (1 - READING_LINE) * smooth(1 - left / (innerHeight * SLIDE));
    const want = held ? ENGINE : Math.min(ENGINE, reach(l, (innerHeight * read - box.top) / scale));
    const still = dt <= 0 || clock.isFrozen();
    let len = at.current;
    if (still || held) len = want;
    else {
      const gap = want - len, step = (Math.abs(gap) > FAR && !replaying.current ? Math.abs(gap) * 4 : SPEED * k) * dt;
      len += clamp(gap, -step, step);
      if (Math.abs(want - len) < 1) replaying.current = false;
    }
    at.current = len;
    const lit = len >= ENGINE - 1;
    let b = burn.current;
    if (fixed !== null) b = fixed;
    else if (!still) b = clamp(b + (lit ? dt * k : -dt * k * LAUNCH.back), 0, LAUNCH.end);
    else if (!lit) b = 0;
    burn.current = b;
    if (b > 0.001 !== flying) setAloft(b > 0.001);
    const up = climbed(b), tail = P.engine[1] - up;

    if (stream.current) {
      for (const path of stream.current.children) path.setAttribute('stroke-dasharray', `${Math.min(len, P.strike).toFixed(1)} 99999`);
      stream.current.style.opacity = len > 0.5 ? '1' : '0';
    }
    if (head.current) {
      const [hx, hy] = point(l, len);
      head.current.style.opacity = len > 2 && !lit ? '1' : '0';
      head.current.setAttribute('transform', tr(hx, hy));
    }
    if (flare.current) flare.current.style.opacity = len >= P.strike - 1 && up < 2 ? '1' : '0';
    if (rocket.current) {
      rocket.current.setAttribute('transform', tr(K.x, tail));
      rocket.current.style.opacity = clamp(tail / 240).toFixed(3);
    }
    if (jet.current) {
      jet.current.setAttribute('transform', `scale(1 ${(0.34 + 0.66 * smooth((b - LAUNCH.lift) / 0.8)).toFixed(3)})`);
      jet.current.style.opacity = smooth(b / 0.35).toFixed(3);
    }
    if (arms.current) {
      const s = 1 - 0.74 * smooth((b - LAUNCH.arms) / 0.55);
      for (const arm of arms.current.children) arm.setAttribute('transform', `translate(${TOWER.l} 0) scale(${s.toFixed(3)} 1) translate(${-TOWER.l} 0)`);
    }
    if (drop.current) {
      const from = reach(l, Math.max(P.tip[1], tail));
      for (const part of drop.current.children) part.setAttribute('stroke-dasharray', `0 ${from.toFixed(1)} ${(l.total - from).toFixed(1)} 99999`);
      drop.current.style.opacity = up > 1 ? '1' : '0';
    }
    if (fire.current) fire.current.style.opacity = smooth(b / 0.4).toFixed(3);
    if (wash.current) wash.current.style.opacity = (smooth(b / 0.9) * (1 - 0.66 * smooth((b - 2) / 2.2))).toFixed(3);

    const next = new Set<string>();
    for (const c of P.cues) if (len >= c.at - 1) next.add(c.id);
    if (next.size !== was.size || [...next].some((c) => !was.has(c))) setReached(next);
  }), []);

  const got = (c: string) => reached.has(c);
  // While the rocket is off its table nothing of the pad goes dark, however far the stream has drawn back.
  const lit = (c: string) => reached.has(c) || aloft;
  const on = got('strike') || focused;
  const top = P.top, [ex, ey] = P.engine;
  const glow = `${id}-flare`, heat = `${id}-heat`, land = `${id}-land`, burnt = `${id}-jet`, clip = `${id}-clip`;
  const place = (x: number, y: number, w?: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / P.h) * 100}%`, width: w ? `${(w / W) * 100}%` : undefined });
  const step = (d: number) => ({ '--d': d }) as CSSProperties;
  const again = () => { replaying.current = true; at.current = 0; burn.current = 0; };
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent('sending');
    setTimeout(() => setSent('sent'), 700);
  };

  return (
    <main className={draft.main}>
      <header className={draft.head}>
        <p className={draft.label}>Study 26 · Contact</p>
        <h1 className={draft.heading}>Contact and the footer, a wireframe</h1>
        <p className={draft.lede}>
          What the section holds, where it sits, and what the stream does at the foot of the page. Scroll: the line is the
          stream. It strikes the spike on the rocket’s nose, its light runs down the rocket, the engine lights, and the
          rocket goes up the way the stream came down.
        </p>
        <ul className={draft.caveats}>
          <li>Yours: a calendar button first, a way to copy your email, and a working form. Nothing waits for a message to be sent. The launch plays either way.</li>
          <li>My calls, yours to overturn: no phone number, one short line for where you are based, and LinkedIn in the footer with GitHub and the résumé.</li>
          <li>Not ruled, drawn as I would have it: the rocket and its tower in the middle, the ways to reach you at once at the left, the form at the right, and the launch pad standing on the footer’s top edge.</li>
          <li>Not ruled: the rocket launches every time the stream reaches it. Scroll back up and it comes back down the stream and lands, and the section goes dark again.</li>
          <li>Once the rocket has gone the stream falls on to the empty table and burns there. The page ends on that.</li>
          <li>Every word is a stand in, most of them your live site’s. The email address is a made up one. The buttons and the links go nowhere, and the form sends nothing: it only shows what it says once a message has gone.</li>
          <li>The rocket, the tower and the table are outlines after the rocket you carried over. The real one is made new. The stream is still a line, and the buttons are stand ins for the metal ones you approved.</li>
          <li>For judging: what is in the section, where it sits, what happens and in what order. Not a phone.</li>
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
            <linearGradient id={land} gradientUnits="userSpaceOnUse" x1={90} y1={0} x2={W - 90} y2={0}>
              <stop offset="0" stopColor="var(--copper-light)" stopOpacity="0" />
              <stop offset="0.22" stopColor="var(--copper-light)" stopOpacity="0.36" />
              <stop offset="0.5" stopColor="var(--copper-light)" stopOpacity="0.8" />
              <stop offset="0.78" stopColor="var(--copper-light)" stopOpacity="0.36" />
              <stop offset="1" stopColor="var(--copper-light)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={burnt} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--pale)" />
              <stop offset="0.3" stopColor="var(--hot)" stopOpacity="0.9" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clip}><rect x={0} y={0} width={W} height={P.ground} /></clipPath>
          </defs>

          <line x1={90} y1={P.ground} x2={W - 90} y2={P.ground} stroke={`url(#${land})`} strokeWidth={1.5} />
          <g ref={wash} className={styles.heat}>
            <ellipse cx={ex} cy={P.ground - 6} rx={650} ry={96} fill={`url(#${heat})`} />
            <circle cx={ex} cy={ey + 20} r={180} fill={`url(#${glow})`} />
          </g>

          <g transform={tr(ex, ey)} className={styles.pad} data-shown={lit('near')}>
            <ellipse cx={15} cy={TABLE.ground} rx={252} ry={22} className={styles.ring} />
            <ellipse cx={15} cy={TABLE.ground} rx={150} ry={12} className={styles.ring} />
            {TABLE.legs.map((x) => <path key={x} d={`M${x - 5} ${TABLE.top + TABLE.deep} L${x - 5} ${TABLE.ground - 4} L${x - 9} ${TABLE.ground} L${x + 9} ${TABLE.ground} L${x + 5} ${TABLE.ground - 4} L${x + 5} ${TABLE.top + TABLE.deep} Z`} />)}
            <path d={`M${TABLE.l} ${TABLE.top} L${TABLE.r} ${TABLE.top} L${TABLE.r + 10} ${TABLE.top + TABLE.deep} L${TABLE.l - 10} ${TABLE.top + TABLE.deep} Z`} />
            {[-1, 1].map((s) => <rect key={s} x={s * 40 - 6} y={-8} width={12} height={14} rx={2} />)}
            <path d={`M${TOWER.l} ${TABLE.top} L${TOWER.l} ${-TOWER.top} M${TOWER.r} ${TABLE.top} L${TOWER.r} ${-TOWER.top}`} className={styles.post} />
            <path d={BRACES} className={styles.brace} />
            <rect x={TOWER.l - 6} y={-TOWER.top - 10} width={TOWER.r - TOWER.l + 12} height={10} rx={2} />
            <line x1={(TOWER.l + TOWER.r) / 2} y1={-TOWER.top - 10} x2={(TOWER.l + TOWER.r) / 2} y2={-TOWER.lamp} />
            <circle cx={(TOWER.l + TOWER.r) / 2} cy={-TOWER.lamp} r={3.6} className={styles.lamp} data-on={lit('strike')} />
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
          <g ref={drop} className={draft.line}>
            {[draft.haze, draft.glow, draft.body, draft.core].map((c) => <path key={c} d={P.line.d} className={c} strokeDasharray="0 99999" />)}
          </g>

          <g clipPath={`url(#${clip})`}>
            <g ref={rocket} transform={tr(ex, ey)} className={styles.pad} data-shown={lit('near')}>
              <g ref={jet} className={styles.jet}>
                <path d="M-13 0 C-21 48 -8 130 0 200 C8 130 21 48 13 0 Z" fill={`url(#${burnt})`} />
                <path d="M-5 0 C-8 30 -3 78 0 118 C3 78 8 30 5 0 Z" className={styles.white} />
              </g>
              {[-1, 1].map((s) => <path key={s} d={`M${s * H} ${-K.fin.top} L${s * K.fin.out} -12 L${s * K.fin.out} 6 L${s * H} -26 Z`} />)}
              <path d={`M-9 ${-K.bell} L-14 0 L14 0 L9 ${-K.bell} Z`} />
              <g className={styles.hull} data-on={lit('lower')}>
                <path d={`M${-H} ${-K.bell} L${-H} ${-K.lower} L${H} ${-K.lower} L${H} ${-K.bell} Z`} />
                <path d="M-3 -100 L-3 -5 L3 -5 L3 -100 Z" />
              </g>
              <rect x={-H - 2} y={-K.lower - K.band} width={H * 2 + 4} height={K.band} rx={1.5} />
              <g className={styles.hull} data-on={lit('upper')}>
                <path d={`M${-H} ${-K.lower - K.band} L${-H} ${-K.upper} L${H} ${-K.upper} L${H} ${-K.lower - K.band} Z`} />
              </g>
              <rect x={-H - 2} y={-K.upper - K.band} width={H * 2 + 4} height={K.band} rx={1.5} />
              <g className={styles.hull} data-on={lit('strike')}>
                <path d={NOSE} />
                <circle cx={0} cy={-K.upper - 40} r={5.5} className={styles.port} />
              </g>
              <line x1={0} y1={-K.nose} x2={0} y2={-K.tall} />
            </g>
          </g>

          <g ref={fire} className={styles.heat} transform={tr(ex, ey)}>
            <circle cx={0} cy={2} r={44} fill={`url(#${glow})`} />
            <path d="M-9 6 C-13 -10 -4 -22 0 -36 C4 -22 13 -10 9 6 Z" className={styles.white} />
          </g>
          <g ref={flare} className={draft.lead} transform={tr(P.tip[0], P.tip[1])}>
            <circle r={26} fill={`url(#${glow})`} />
            {[20, 75, 130, 200, 255, 320].map((a) => <line key={a} x1={0} y1={0} x2={15} y2={0} transform={`rotate(${a})`} />)}
            <circle r={2.6} className={draft.dot} />
          </g>
          <g ref={head} className={draft.lead}>
            <circle r={34} fill={`url(#${glow})`} />
            {[70, 100, 125, 55, 150].map((a) => <line key={a} x1={0} y1={0} x2={20} y2={0} transform={`rotate(${a})`} />)}
            <circle r={3.4} className={draft.dot} />
          </g>
        </svg>

        <section aria-label="Contact" onFocus={() => setFocused(true)}>
          <h2 className={draft.title} data-on={on} style={place(WORDS.l, top + WORDS.title)}>Contact</h2>
          <p className={`${styles.lede} ${draft.reveal}`} data-on={on} style={{ ...place(WORDS.l, top + WORDS.lede, WORDS.w), ...step(2) }}>
            Let’s talk. <span className={styles.tag}>Stand in words</span>
          </p>
          <div className={`${styles.spot} ${draft.reveal}`} data-on={on} style={{ ...place(WORDS.l, top + WORDS.book, WORDS.w), ...step(4) }}>
            <button type="button" className={styles.primary}>Book a call <span aria-hidden="true">↗</span></button>
          </div>
          <div className={`${styles.spot} ${styles.mail} ${draft.reveal}`} data-on={on} style={{ ...place(WORDS.l, top + WORDS.mail, WORDS.w), ...step(6) }}>
            <span className={styles.address}>name@example.com</span>
            <button type="button" className={styles.accent} onClick={copy}>
              <span aria-live="polite">{copied ? 'Copied' : 'Copy email'}</span>
            </button>
          </div>
          <p className={`${styles.spot} ${styles.where} ${draft.reveal}`} data-on={on} style={{ ...place(WORDS.l, top + WORDS.where, WORDS.w), ...step(8) }}>
            City, State · Mountain Time
          </p>

          {sent === 'sent' ? (
            <div role="status" className={`${styles.spot} ${styles.done} ${draft.reveal}`} data-on={on} style={{ ...place(FORM.l, top + FORM.t, FORM.w), ...step(5) }}>
              <p className={styles.doneTitle}>Message sent</p>
              <p>I’ll get back to you within 24 hours.</p>
              <button type="button" className={styles.accent} onClick={() => setSent('idle')}>Send another</button>
            </div>
          ) : (
            <form className={`${styles.spot} ${styles.form} ${draft.reveal}`} data-on={on} style={{ ...place(FORM.l, top + FORM.t, FORM.w), ...step(5) }} onSubmit={send}>
              <p className={styles.formName}>Or send a message</p>
              <div className={styles.pair}>
                <label className={styles.field}>Name<input name="name" type="text" required autoComplete="name" /></label>
                <label className={styles.field}>Email<input name="email" type="email" required autoComplete="email" /></label>
              </div>
              <label className={styles.field}>Message<textarea name="message" required rows={5} /></label>
              <button type="submit" className={`${styles.accent} ${styles.send}`} disabled={sent === 'sending'}>
                {sent === 'sending' ? 'Sending' : 'Send message'} {sent === 'idle' && <span aria-hidden="true">→</span>}
              </button>
            </form>
          )}
        </section>

        <footer className={styles.foot} style={place(WORDS.l, P.foot + FOOT.words, W - WORDS.l * 2)}>
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
