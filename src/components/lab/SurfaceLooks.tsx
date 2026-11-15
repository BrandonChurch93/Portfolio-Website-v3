'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { registry } from '../../hooks/registry';
import { lamp } from '../../lamp/lamp';
import { HOST, SPIRE } from '../../pieces/skycity/layout';
import { LOOKS, VIEWS, type LookName, type LooksScene, type ViewName } from '../../surface-looks/scene';
import { clock } from '../../world/clock';
import { tiers } from '../../world/tier';
import styles from './SurfaceLooks.module.css';

// Study 31: two worlds for the top of the hero's planet, each standing on the real planet, for him to pick from. He
// ruled that the planet comes first, and the city is laid on a planet of that kind. ?look=shards&view=crown opens
// it on those, ?planet=0 leaves the torn underside, the core and the debris out, and ?ui=0 hides the switches.

const NAMES: Record<LookName, { tag: string; name: string; says: string }> = {
  rings: { tag: 'A', name: 'A river world', says: 'The planet is dark bronze, turned in rings. Its water is the stream’s light: it rises in a spring under the spire and runs out in five rivers to the tear. The city follows the rivers. Terraced fields, groves of copper trees and still ponds lie between them. One spire, with great gold rings.' },
  shards: { tag: 'C', name: 'A crystal world', says: 'The planet grows crystal: great shards of amber glass thrust out of it at angles. The city is built into them and between them, with lit floors inside the glass, copper decks and bridges, and a town at their feet. Groves of small crystals, veins and pools of light. The tallest shard is the spire.' },
};
const VIEW_NAMES: Record<ViewName, string> = { page: 'The page', crown: 'The crown', edge: 'The edge' };

export function SurfaceLooks() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<LooksScene | null>(null);
  const [ready, setReady] = useState(false);
  const [ui, setUi] = useState(true);
  const [look, setLook] = useState<LookName>('rings');
  const [view, setView] = useState<ViewName>('page');

  useEffect(() => {
    const h = host.current;
    if (!h) return;
    const q = new URLSearchParams(location.search);
    const l = LOOKS.find((x) => x === q.get('look')) ?? 'rings', v = VIEWS.find((x) => x === q.get('view')) ?? 'page';
    if (q.get('ui') === '0') setUi(false);
    setLook(l);
    setView(v);
    lamp.bind();
    tiers.detect();
    let alive = true, off: (() => void) | null = null;
    void registry.track(import('../../surface-looks/scene').then(async ({ mountLooks }) => {
      const made = await mountLooks(h, tiers.get(), { planet: q.get('planet') !== '0', look: l, view: v });
      if (!alive) { made.dispose(); return; }
      scene.current = made;
      off = clock.onFrame(() => {
        const r = h.getBoundingClientRect(), m = lamp.get();
        made.lamp((m.px - r.left) / Math.max(1, r.width), (m.py - r.top) / Math.max(1, r.height));
      });
      setReady(true);
    }));
    return () => { alive = false; off?.(); scene.current?.dispose(); scene.current = null; };
  }, []);

  const pick = (l: LookName) => { setLook(l); void scene.current?.look(l); };
  const see = (v: ViewName) => { setView(v); scene.current?.view(v); };
  const vars = { '--wide': HOST.wide, '--tall': HOST.tall, '--top': HOST.over + SPIRE.tall } as CSSProperties;
  const n = NAMES[look];

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.label}>Study 31 · The surface of the world</p>
        <h1 className={styles.heading}>Two worlds</h1>
        <p className={styles.lede}>
          The planet is yours as built: the torn underside, the core, the debris. What changes is what kind of planet
          it is, and how a city lies on a planet of that kind. A is a river world. C is a crystal world.
        </p>
        <ul className={styles.caveats}>
          <li>For picking a world. Each is a first build by one hand: the idea, the shape and the materials are here, the fine detail is not.</li>
          <li>The page is the size and the side the hero shows it from. The crown and the edge are the same side, closer.</li>
          <li>Short of the bar in both: buildings are simple forms, and nothing moves but the lights on A’s rings.</li>
          <li>Left out on purpose: your words, the sky and the moon, the streams from the torn face, anything that flies.</li>
          <li>The glow behind the world is a stand in for the page’s own.</li>
        </ul>
      </header>

      <div className={styles.stage} style={vars}>
        <div className={styles.frame} data-view={view}>
          <div className={styles.glow} aria-hidden="true" />
          <div ref={host} className={styles.host} data-ready={ready} />
          {!ready && <p className={styles.wait}>Building the world</p>}
        </div>
        <p className={styles.caption}><b>{n.tag} · {n.name}</b> {n.says}</p>
      </div>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="The look">
              {LOOKS.map((l) => (
                <button key={l} type="button" className={styles.choice} aria-pressed={look === l} onClick={() => pick(l)}>{NAMES[l].tag} · {NAMES[l].name}</button>
              ))}
            </div>
            <div className={styles.group} role="group" aria-label="The view">
              {VIEWS.map((v) => (
                <button key={v} type="button" className={styles.choice} aria-pressed={view === v} onClick={() => see(v)}>{VIEW_NAMES[v]}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
