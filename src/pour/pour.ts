import { registry, stats } from '../hooks/registry';
import { hooksWanted } from '../hooks/site-hooks';
import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { POUR, POUR_BUDGET, POUR_FRAME_MS, POUR_SLOW, POUR_STILL_AT } from './config';
import { PourRenderer } from './renderer';
import { layout } from './scene';
import { POUR_STEP, PourSim } from './sim';

export interface PourState {
  seed: number;
  time: number;
  pouring: boolean;
  particles: number;
  sparks: number;
}

export interface PourHandle {
  // Start a new pour. With no seed it takes a new one, so no two pours are alike.
  again(seed?: number): void;
  slow(on: boolean): void;
  state(): PourState;
  dispose(): void;
}

const newSeed = () => 10000 + Math.floor(Math.random() * 90000);

// Puts the pour on a canvas and runs it from the one clock. The simulation only ever moves in fixed steps, so with the
// clock frozen at a time the same seed always draws the same frame.
export function mountPour(host: HTMLElement, opts: { seed?: number; onChange?: (s: PourState) => void } = {}): PourHandle {
  const hooked = hooksWanted();
  // The canvas is made here and removed on dispose: a canvas whose context has been let go cannot be given a new one.
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(canvas);
  let seed = opts.seed ?? (hooked ? 1 : newSeed());
  let sim: PourSim | null = null;
  let renderer: PourRenderer | null = new PourRenderer(canvas);
  let still = false;
  let built = '';
  // tau is the pour's own time. start is the clock time at which tau was zero.
  let tau = 0;
  let start = hooked ? 0 : clock.now();
  let rate = 1;
  let spent = 0;
  let told = '';

  // Builds the scene for the screen and tier as they are now. A change of either starts the pour over.
  const build = () => {
    if (!renderer) return;
    const tier = tiers.get();
    const cssW = Math.max(1, host.clientWidth);
    const cssH = Math.max(1, host.clientHeight);
    const key = `${tier}:${cssW}:${cssH}`;
    if (key === built) return;
    built = key;
    still = tier === 'static';
    const budget = POUR_BUDGET[tier === 'static' ? 'low' : tier];
    const scene = layout(cssW, cssH, { lean: POUR.stream.lean, speed: POUR.stream.speed, gravity: POUR.gravity });
    sim = new PourSim(scene, budget);
    sim.reset(seed);
    renderer.show(scene, budget, sim);
    const ratio = Math.min(devicePixelRatio || 1, budget.pixelRatio);
    renderer.resize(Math.round(cssW * ratio), Math.round(cssH * ratio), scene.unit * ratio);
    host.dataset.pour = renderer.ok ? 'on' : 'off';
    tau = 0;
    start = hooked ? 0 : clock.now();
  };

  const tell = () => {
    if (!sim || !opts.onChange) return;
    const s = state();
    const key = `${s.seed}:${s.pouring}`;
    if (key === told) return;
    told = key;
    opts.onChange(s);
  };

  const state = (): PourState => ({
    seed,
    time: sim ? sim.time : 0,
    pouring: !!sim && !sim.done,
    particles: sim ? sim.n : 0,
    sparks: sim ? sim.sparkCount : 0,
  });

  const frame = (t: number, dt: number) => {
    if (!sim || !renderer) return;
    const frozen = clock.isFrozen();
    if (still) tau = POUR_STILL_AT;
    else if (frozen) tau = Math.max(0, t - start);
    else tau += dt * rate;
    if (tau < sim.time - POUR_STEP * 0.5) sim.reset(seed);
    const began = performance.now();
    while (sim.time + POUR_STEP <= tau + 1e-9) {
      sim.step();
      // Live, a slow device gets a pour that runs a little slow, never a frame that takes too long.
      if (!frozen && !still && !hooked && performance.now() - began > POUR_FRAME_MS) {
        tau = sim.time;
        break;
      }
    }
    if (!frozen) start = t - tau;
    spent += (performance.now() - began - spent) * 0.1;
    stats.pourSimMs = spent;
    stats.pourParticles = sim.n;
    stats.pourSparks = sim.sparkCount;
    renderer.draw(lamp.get());
    tell();
  };

  const again = (next?: number) => {
    seed = next ?? newSeed();
    sim?.reset(seed);
    tau = 0;
    start = clock.now();
    told = '';
    frame(clock.now(), 0);
  };

  build();
  const offFrame = clock.onFrame(frame);
  const offTier = tiers.subscribe(build);
  const resized = new ResizeObserver(build);
  resized.observe(host);
  registry.tool('pour', (next?: number) => again(next));
  registry.tool('pourState', () => state());

  return {
    again,
    slow(on) { rate = on ? POUR_SLOW : 1; },
    state,
    dispose() {
      offFrame();
      offTier();
      resized.disconnect();
      renderer?.dispose();
      canvas.remove();
      sim = null;
      renderer = null;
    },
  };
}
