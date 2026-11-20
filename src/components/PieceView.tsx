'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HANDHELD, PIECE_MOUNT, READING_LINE, SMALL_PIECES } from '../config/site';
import { site } from '../content/site';
import { registry, type PieceHandle } from '../hooks/registry';
import { lamp } from '../lamp/lamp';
import { loaderFor } from '../pieces/load';
import { budget, distanceOf } from '../world/budget';
import { handheld, webgl } from '../world/device';
import { loading as wait } from '../world/loading';
import { tiers } from '../world/tier';
import type { Piece } from '../world/piece';
import styles from './PieceView.module.css';

interface Props {
  name: string;
  // Play the piece's entrance. With `once`, it plays only on the first visit of this tab's session.
  entrance?: boolean;
  once?: string;
  making?: boolean;
  className?: string;
  onReady?: () => void;
  frame?: { shift?: number; scale?: number; x?: number };
  entranceFrom?: number;
  // Called with the mounted piece (and null when it goes), for a page that times things to it.
  onPiece?: (p: Piece | null) => void;
  children?: ReactNode;
  switchSide?: 'left' | 'right';
  // How many screens away the piece is mounted from, in place of the usual one. A page whose stream brings a piece
  // on mounts it well before it is reached: building a piece holds the page for a moment, and that must not fall in
  // the middle of a scroll.
  reach?: number;
  // Made at once, wherever it is on the page, and never let go, on anything but a handheld (which has no memory to
  // spare): the page's preloader waits for it, so no piece is built while the visitor scrolls. Building Skills' and
  // Contact's pieces from five screens away fell in the middle of the scroll through the hero's debris field, which
  // is where he felt the page lag (Nov 18). 'quiet' is the same without telling the preloader, for a piece that
  // tells it itself.
  early?: boolean | 'quiet';
}

type Extra = Piece & { opening?: (t: number | null) => void; skip?: () => void };

// Hosts one 3D piece: mounts it near the viewport, feeds it the lamp and the tier, and registers it for the test hooks.
// The "how this is made" switch is off unless a page asks for it (BRIEF.md, Open).
export function PieceView({ name, entrance = false, once, making = false, className, onReady, frame, entranceFrom, onPiece, children, switchSide = 'right', reach, early }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [isMaking, setMaking] = useState(false);
  const piece = useRef<Extra | null>(null);

  useEffect(() => {
    const h = host.current;
    const load = loaderFor(name);
    if (!h || !load || !webgl()) return;
    let alive = true;
    let offs: (() => void)[] = [];
    let mounted: Extra | null = null;
    let loading: Promise<void> | null = null;
    let played = false;
    let again = false;
    tiers.detect();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = once ? sessionStorage.getItem(`played:${once}`) === '1' : false;
    const start = async () => {
      const make = await load();
      if (!alive) return;
      const p = make() as Extra;
      // The entrance plays on the first mount only; coming back later the piece is already at rest.
      const play = entrance && !reduced && !seen && !played;
      played = true;
      // A piece made while it is on the screen, as after a jump down the page or a long way back up it, comes on
      // over a quarter second where it used to cut in. Never the first piece of a page that has not been scrolled:
      // that would be an opening, and the site has none.
      const eased = !reduced && (again || scrollY > 0);
      const ready = () => {
        if (eased && distanceOf(h) === 0) h.querySelector('canvas')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: PIECE_MOUNT.fade, easing: 'ease-out' });
        onReady?.();
      };
      await p.mount(h, { tier: tiers.get(), entrance: play, onReady: ready, frame, entranceFrom: play ? entranceFrom : 0 });
      if (!alive || !near || evicted) { p.dispose(); loading = null; budget.drop(id); return; }
      mounted = p;
      again = true;
      piece.current = p;
      onPiece?.(p);
      if (once && play) sessionStorage.setItem(`played:${once}`, '1');
      registry.piece(name, p as unknown as PieceHandle);
      if (p.opening) registry.opening((t) => p.opening?.(t));
      // The host's place is read on scroll and resize, not each time the lamp moves (every frame), when reading it
      // would force the page to lay out again after the frame's writes.
      let r = h.getBoundingClientRect();
      const place = () => { r = h.getBoundingClientRect(); };
      const hostObs = new ResizeObserver(place);
      hostObs.observe(h);
      offs.push(() => hostObs.disconnect());
      offs.push(lamp.subscribe((s) => {
        p.setLamp((s.px - r.left) / Math.max(1, r.width), (s.py - r.top) / Math.max(1, r.height));
      }));
      offs.push(tiers.subscribe((t) => p.setTier(t)));
      // Progress: how far the page's reading line (two thirds down the viewport) has
      // passed through the host, as a fraction of its height. 0 is its top, 1 its bottom.
      const prog = () => { place(); p.setProgress((innerHeight * READING_LINE - r.top) / Math.max(1, r.height)); };
      addEventListener('scroll', prog, { passive: true });
      addEventListener('resize', prog);
      offs.push(() => { removeEventListener('scroll', prog); removeEventListener('resize', prog); });
      prog();
      // Any input skips an opening that plays once per visit (the hero's), never an entrance met while scrolling.
      if (play && once && p.skip) {
        const skip = () => p.skip?.();
        const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
        for (const e of evs) addEventListener(e, skip, { once: true, passive: true });
        offs.push(() => { for (const e of evs) removeEventListener(e, skip); });
      }
      loading = null;
    };
    const stop = () => {
      for (const o of offs) o();
      offs = [];
      if (mounted) {
        registry.piece(name, null);
        if (mounted.opening) registry.opening(null);
        onPiece?.(null);
        mounted.dispose();
        mounted = null;
        piece.current = null;
      }
      budget.drop(id);
    };
    // Mount when the host comes within a screen of the viewport; dispose when it is three screens away, so only the
    // pieces near the visitor hold a WebGL context.
    // Within the budget of contexts (src/world/budget.ts): a piece that gives way waits for a place to come free.
    let near = false;
    let evicted = false;
    const id = `piece:${name}`;
    // On a handheld a piece is mounted from nearer and let go sooner, so fewer hold their memory at once: the hero's
    // world is let go before Skills' pieces are made, and the desk before Contact's pad.
    const small = SMALL_PIECES.includes(name), held = handheld(), first = !!early && !held;
    const from = first ? Infinity : held ? Math.min(reach ?? PIECE_MOUNT.near, small ? HANDHELD.small : HANDHELD.reach) : reach ?? PIECE_MOUNT.near;
    const gone = first ? Infinity : held ? from + HANDHELD.past : Math.max(PIECE_MOUNT.far, (reach ?? 0) + 1.5);
    // The preloader waits for it only on a page opened at its top, as it does for the hero's world.
    const awaited = first && early !== 'quiet' && scrollY < innerHeight * 1.5;
    if (awaited) wait.begin(id, 2);
    const check = () => {
      const dist = distanceOf(h), vh = innerHeight;
      // A small piece on a handheld is let go a screen and a half after it has gone off the top, and made again a
      // screen before it comes back: held as long behind the visitor as ahead, the five of them and the pad were
      // all alive at the foot of the page, 500 MB over what the page held before.
      const behind = held && small && h.getBoundingClientRect().bottom < 0;
      if (dist < vh * (behind ? PIECE_MOUNT.near : from)) {
        near = true;
        // A piece that gave its place up asks again once any of it is on the screen.
        if (evicted && dist === 0) evicted = false;
        if (!mounted && !loading && !evicted) {
          if (small || budget.claim(id, { distance: () => distanceOf(h), keepsStill: false, release: () => { evicted = true; stop(); } })) loading = registry.track(start().finally(() => { if (awaited) wait.end(id); }));
          else evicted = true;
        }
      } else if (dist > vh * (behind ? PIECE_MOUNT.near + 0.5 : gone)) {
        near = false;
        evicted = false;
        stop();
      }
    };
    const offFree = budget.onFree(() => { if (alive && evicted) { evicted = false; check(); } });
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
    return () => {
      alive = false;
      offFree();
      removeEventListener('scroll', check);
      removeEventListener('resize', check);
      stop();
    };
  }, [name, entrance, once]);

  const toggle = () => {
    const next = !isMaking;
    setMaking(next);
    piece.current?.setMaking(next);
  };

  return (
    <div ref={host} className={`${styles.host} ${className ?? ''}`} data-piece={name} data-switch={switchSide}>
      {children}
      {making && (
        <button type="button" className={styles.making} aria-pressed={isMaking} onClick={toggle}>
          <span className={styles.dot} aria-hidden="true" />
          {isMaking ? site.ui.makingOn : site.ui.making}
        </button>
      )}
    </div>
  );
}
