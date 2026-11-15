import * as THREE from 'three';
import { Builder, at } from '../../../world/build';
import { SCREEN } from '../layout';
import type { PartFactory, PartState } from '../part';
import { drawArt } from './monitor/art';
import { ACTIVE, GLASS, MID, PANEL } from './monitor/frame';
import { GLASS_SPEC, monitorMats } from './monitor/materials';
import { makeScreen, WAKE } from './monitor/screen';
import { curvedSlab, shell } from './monitor/shape';
import { stand } from './monitor/stand';

// The ultrawide: 38 inches, curved, behind the mat. A thin panel with a hair of border under its glass and a slim
// chin, a back shell whose top shows as a ledge, and a stand on a V of two legs. Its screen shows his work on this
// site: the editor with the stream's code, and beside it the page that code runs, its stream alive. See ./monitor/.

// How the alone view frames it: its middle, and how far from it the frame reaches.
const ALONE = { y: 262, r: 252 };
// The caret's blink, in seconds on and off.
const BLINK = { on: 0.56, off: 0.44 };
// Where the windows' shadows fall: how far across and down for each millimetre a window stands in front, and how
// far the cursor's light leans them.
const SUN = { x: 1.2, y: 2.4, lean: 0.6 };
// How far the layers slide against each other as the pointer crosses the desk, as a head moving before the glass: the
// most slant across and up, how far the pointer goes across and back on the desk to give most of it, and how many
// seconds the layers take to follow it.
const HEAD = { x: 1.6, y: 0.6, across: 600, deep: 320, ease: 0.16 };
// The time a screen that must not move is held at.
const HELD = 4;

const ramp = ([a, b]: readonly [number, number], k: number) => { const t = Math.min(1, Math.max(0, (k - a) / (b - a))); return t * t * (3 - 2 * t); };

export const build: PartFactory = async ({ tier }) => {
  const group = new THREE.Group();
  group.name = 'monitor';
  const M = monitorMats();
  const b = new Builder(), put = at(...MID);
  for (const g of curvedSlab(PANEL.W, -PANEL.H / 2, PANEL.H / 2, PANEL.back, PANEL.face, 7, PANEL.edge)) b.add(g, M.body, put);
  // The chin stands flush with the glass, under it.
  for (const g of curvedSlab(PANEL.W - 2 * PANEL.lip, -PANEL.H / 2 + 0.6, GLASS.y0 - 0.25, PANEL.face - 3, PANEL.glassFront, 6, 1.2)) b.add(g, M.body, put);
  b.add(shell(), M.shell, put);
  stand(b, M);
  for (const g of curvedSlab(GLASS.x1 - GLASS.x0, GLASS.y0, GLASS.y1, PANEL.glassBack, PANEL.glassFront, 5.6, 0.45)) b.add(g, M.glass, put, { shadow: false });
  for (const mesh of b.build(group, 'monitor')) if (mesh.material === M.glass) { mesh.renderOrder = 4; mesh.receiveShadow = false; mesh.userData.noWire = true; }

  const art = await drawArt([ACTIVE.w, ACTIVE.h], 8);
  const screen = makeScreen(art);
  screen.mesh.position.set(...MID);
  group.add(screen.mesh);

  const u = screen.material.uniforms;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quiet = reduced || tier === 'static';
  let lastT = 0;

  return {
    group,
    alone: { at: [SCREEN.x, ALONE.y, SCREEN.z - 30], r: ALONE.r },
    update(s: PartState) {
      const k = s.lights.monitor;
      const g = M.glass.userData.uniforms as { uRoom: { value: number }; uOn: { value: number } };
      g.uRoom.value = s.lights.room;
      g.uOn.value = ramp(WAKE.wall, k);
      M.glass.specularIntensity = GLASS_SPEC.off + (GLASS_SPEC.on - GLASS_SPEC.off) * g.uOn.value;
      u.uBack.value = ramp(WAKE.back, k);
      u.uWall.value = ramp(WAKE.wall, k);
      u.uEd.value = ramp(WAKE.editor, k);
      u.uPg.value = ramp(WAKE.page, k);
      u.uLive.value = ramp(WAKE.live, k);
      u.uPn.value = ramp(WAKE.panel, k);
      u.uPt.value = ramp(WAKE.pointer, k);
      const t = quiet ? HELD : s.t;
      u.uT.value = t;
      const ph = t % (BLINK.on + BLINK.off);
      u.uCaret.value = s.still ? 1 : 1 - ramp([BLINK.on - 0.05, BLINK.on + 0.03], ph) + ramp([BLINK.on + BLINK.off - 0.05, BLINK.on + BLINK.off + 0.03], ph);
      // The windows' shadows fall down and to the left, as from a light above and to the right, and lean a little away
      // from the cursor's light.
      const lx = Math.max(-1, Math.min(1, (s.cursor.x - SCREEN.x) / 900));
      u.uSun.value.set(SUN.x + lx * SUN.lean, SUN.y);
      const hx = s.still ? 0 : HEAD.x * Math.tanh((s.pointer.x - SCREEN.x) / HEAD.across);
      const hy = s.still ? 0 : HEAD.y * Math.tanh((s.pointer.z - 100) / HEAD.deep);
      const head = u.uHead.value as THREE.Vector2;
      const dt = Math.min(0.1, Math.max(0, s.t - lastT));
      lastT = s.t;
      const f = 1 - Math.exp(-dt / HEAD.ease);
      if (s.still) head.set(hx, hy); else head.set(head.x + (hx - head.x) * f, head.y + (hy - head.y) * f);
      const settling = Math.abs(hx - head.x) + Math.abs(hy - head.y) > 0.002;
      return !s.still && (k > WAKE.live[0] || (settling && k > 0));
    },
    dispose() {
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      for (const t of [art.wall, art.editor, art.page, art.panel, art.pointer]) t.dispose();
      screen.material.dispose();
    },
  };
};
