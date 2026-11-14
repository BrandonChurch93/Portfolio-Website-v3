'use client';

import { useEffect, useRef, useState } from 'react';
import type { DeskScene } from '../../desk-drafts/scene';
import { registry } from '../../hooks/registry';
import { lamp } from '../../lamp/lamp';
import { tiers } from '../../world/tier';
import { clock } from '../../world/clock';
import styles from './DeskDrafts.module.css';

// Study 23: the desk for Skills as a rough draft. He picked A · Bench from three, and this is its second round, with
// the scene on it roughed in after his notes. ?stream=1 draws a line for the stream along the front edge,
// ?turn=40,10 turns the view by those degrees, and ?ui=0 hides the switches.
export function DeskDrafts() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<DeskScene | null>(null), drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null), turned = useRef({ az: 0, el: 0 });
  const [ready, setReady] = useState(false);
  const [ui, setUi] = useState(true);
  const [moved, setMoved] = useState(false);
  const [stream, setStream] = useState(false);

  useEffect(() => {
    const h = host.current;
    if (!h) return;
    const q = new URLSearchParams(location.search);
    const turn = (q.get('turn') ?? '').split(',').map(Number);
    const flowing = q.get('stream') === '1';
    if (q.get('ui') === '0') setUi(false);
    setStream(flowing);
    lamp.bind();
    tiers.detect();
    let alive = true, off: (() => void) | null = null;
    void registry.track(import('../../desk-drafts/scene').then(async ({ mountDesk }) => {
      const made = await mountDesk(h, tiers.get());
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

  const flow = (on: boolean) => { setStream(on); scene.current?.stream(on); };
  const reset = () => { turned.current = { az: 0, el: 0 }; scene.current?.turn(null); setMoved(false); };

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.label}>Study 23 · The desk</p>
        <h1 className={styles.heading}>The bench, second round</h1>
        <p className={styles.lede}>
          Your pick, A, with the scene on it roughed in after your notes: a mat over most of the top, an ultrawide, a
          wireless gaming keyboard and a gaming mouse lit in the site’s colors, and a PC laid out like the build you sent.
          Drag to look round it.
        </p>
        <ul className={styles.caveats}>
          <li>For agreeing what is on the desk and where, before it is built for real. Still rough: nothing here has its finish or its detail.</li>
          <li>New in this round, each a rough form: the mat, the monitor, the keyboard, the mouse and the PC.</li>
          <li>Still the old build’s, as stand ins: the lamp, the iPad with its pencil, the camera with its lens and cap. They are made new with the desk.</li>
          <li>The PC is a stand in too. The real one is your PC Builder’s own case and parts brought over from its code, lit in the site’s colors.</li>
          <li>The stream is a plain line you can switch on. The headphones and a phone are not here.</li>
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
        {!ready && <p className={styles.wait}>Building the desk</p>}
        <p className={styles.caption}><b>A · Bench</b> A joiner’s bench. A thick slab on two trestles, a wedged stretcher, a bronze angle screwed over the front edge.</p>
      </div>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
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
