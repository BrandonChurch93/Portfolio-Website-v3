'use client';

import { useEffect, useRef, useState } from 'react';
import { KINDS, type Kind } from '../../desk-drafts/desks';
import type { DeskScene } from '../../desk-drafts/scene';
import { registry } from '../../hooks/registry';
import { lamp } from '../../lamp/lamp';
import { tiers } from '../../world/tier';
import { clock } from '../../world/clock';
import styles from './DeskDrafts.module.css';

// Study 23: three rough desks for Skills, to choose a direction from. ?desk=bureau or rail opens on that one,
// ?stream=1 draws a line for the stream along the front edge, ?turn=40,10 turns the view by those degrees, and ?ui=0
// hides the switches.
export function DeskDrafts() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<DeskScene | null>(null), drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null), turned = useRef({ az: 0, el: 0 });
  const [kind, setKind] = useState<Kind>('bench');
  const [ready, setReady] = useState(false);
  const [ui, setUi] = useState(true);
  const [moved, setMoved] = useState(false);
  const [stream, setStream] = useState(false);

  useEffect(() => {
    const h = host.current;
    if (!h) return;
    const q = new URLSearchParams(location.search), want = KINDS.find((k) => k.id === q.get('desk'))?.id ?? 'bench';
    const turn = (q.get('turn') ?? '').split(',').map(Number);
    const flowing = q.get('stream') === '1';
    if (q.get('ui') === '0') setUi(false);
    setKind(want);
    setStream(flowing);
    lamp.bind();
    tiers.detect();
    let alive = true, off: (() => void) | null = null;
    void registry.track(import('../../desk-drafts/scene').then(async ({ mountDesks }) => {
      const made = await mountDesks(h, tiers.get(), want);
      if (!alive) { made.dispose(); return; }
      scene.current = made;
      made.stream(flowing);
      if (turn.length === 2 && turn.every(Number.isFinite)) { turned.current = { az: turn[0], el: turn[1] }; made.turn(turn[0], turn[1]); setMoved(true); }
      off = clock.onFrame(() => {
        const r = h.getBoundingClientRect(), m = lamp.get();
        made.lamp((m.px - r.left) / Math.max(1, r.width), (m.py - r.top) / Math.max(1, r.height));
      });
      setReady(true);
    }));
    return () => { alive = false; off?.(); scene.current?.dispose(); scene.current = null; };
  }, []);

  const pick = (k: Kind) => { setKind(k); scene.current?.show(k); };
  const flow = (on: boolean) => { setStream(on); scene.current?.stream(on); };
  const reset = () => { turned.current = { az: 0, el: 0 }; scene.current?.turn(null); setMoved(false); };
  const now = KINDS.find((k) => k.id === kind)!;

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.label}>Study 23 · The desk</p>
        <h1 className={styles.heading}>Three rough desks</h1>
        <p className={styles.lede}>
          Three directions for the desk in Skills, each built rough in 3D at the size and the angle the fuller draft drew it.
          Pick one, or say what to take from each. Drag to look round it.
        </p>
        <ul className={styles.caveats}>
          <li>For choosing a direction: the desk’s build, how its bronze front edge carries the stream, where its two drawers sit. Not its finish or its detail.</li>
          <li>The same in all three: a dark timber top 2 m long, the knob you chose on both drawers, the PC under the far end.</li>
          <li>The monitor, lamp, keyboard, mouse, iPad with its pencil and camera are the old build’s, set here as stand ins. They are made new with the desk.</li>
          <li>The PC is a stand in for your PC Builder’s case. The stream is a plain line you can switch on, to see which edge it rides. The headphones and a phone are not here.</li>
        </ul>
      </header>

      <div className={styles.stage}>
        <div
          ref={host}
          className={styles.host}
          data-ready={ready}
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, ...turned.current }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            turned.current = { az: Math.max(-70, Math.min(70, d.az - (e.clientX - d.x) * 0.22)), el: Math.max(-24, Math.min(30, d.el + (e.clientY - d.y) * 0.16)) };
            scene.current?.turn(turned.current.az, turned.current.el);
            setMoved(true);
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        />
        {!ready && <p className={styles.wait}>Building the desks</p>}
        <p className={styles.caption}><b>{now.letter} · {now.name}</b> {now.line}</p>
      </div>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="Which desk">
              <span className={styles.groupName}>Desk</span>
              {KINDS.map((k) => <button key={k.id} type="button" className={styles.choice} aria-pressed={kind === k.id} onClick={() => pick(k.id)}>{k.letter} · {k.name}</button>)}
            </div>
            <div className={styles.group} role="group" aria-label="A line standing in for the stream">
              <span className={styles.groupName}>Stream</span>
              <button type="button" className={styles.choice} aria-pressed={!stream} onClick={() => flow(false)}>Off</button>
              <button type="button" className={styles.choice} aria-pressed={stream} onClick={() => flow(true)}>On</button>
            </div>
            <div className={styles.group}>
              <button type="button" className={styles.choice} disabled={!moved} onClick={reset}>The page’s view</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
