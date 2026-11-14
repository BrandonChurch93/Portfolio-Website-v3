import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { hex } from '../config/palette';
import { lamp } from '../lamp/lamp';
import { clock } from '../world/clock';

// A derby of small 3D things for the rows of skills: two for each row, rough, each struck by a stand in for the
// stream and put together out of what the strike throws. Not designs to build on.

export const THINGS = [
  { id: 'cpu-open', row: 'AI Product Engineering', name: 'The CPU, opened up', pick: true },
  { id: 'cpu-socket', row: 'AI Product Engineering', name: 'The CPU, in its socket', pick: false },
  { id: 'screen', row: 'Full-Stack Engineering', name: 'A screen with its back off', pick: true },
  { id: 'tower', row: 'Full-Stack Engineering', name: 'A tower in section', pick: false },
  { id: 'palette', row: 'Design Systems & Craft', name: 'Palette and brush', pick: true },
  { id: 'samples', row: 'Design Systems & Craft', name: 'Samples under a loupe', pick: false },
] as const;

// The stage, in the scene's own units: three columns, two rows, seen from in front and above.
export const STAGE = { wide: 8.4, tall: 6.1, cols: [-2.75, 0, 2.75], rows: [1.42, -1.5] };
// A strike, in seconds: the stream runs in, each part sets out a beat after the one before and flies home, and the
// thing's lights come on last.
export const LIFE = { run: 0.5, each: 0.09, fly: 0.85, lights: 0.6, loose: 2.4 };
// Where the stream comes from, strikes and leaves, across and up from a thing's middle, and the border it falls to.
const HIT = { from: [-1.36, 1.4], at: [-1.02, 0.12], to: [-1.36, -1.36], floor: -1.36 };

type Live = (t: number, on: number, mx: number) => void;
interface Part { obj: THREE.Object3D; home: THREE.Vector3; turn: THREE.Quaternion; wild: THREE.Quaternion; out: THREE.Vector3; shard: THREE.Mesh }
interface Glow { mat: THREE.MeshStandardMaterial; max: number; order: number }
interface Loose { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3 }
interface Thing { body: THREE.Group; fx: THREE.Group; parts: Part[]; glows: Glow[]; live: Live; inn: THREE.Mesh[]; out: THREE.Mesh[]; flash: THREE.Mesh; end: THREE.Mesh; loose: Loose[] }

const metal = (c: number, r = 0.34) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: r });
const matte = (c: number, r = 0.72) => new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: r });
const wet = (c: number) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const rod = (r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 28) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); o.position.set(x, y, z); return o; };
const group = (at: [number, number, number], ...of: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...of); g.position.set(...at); return g; };
const ease = (u: number) => 1 - (1 - u) ** 3;
const clamp = (u: number) => Math.min(1, Math.max(0, u));

function rand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function spot(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!, fill = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  fill.addColorStop(0, 'rgba(255,236,205,1)');
  fill.addColorStop(0.25, 'rgba(255,170,80,0.7)');
  fill.addColorStop(1, 'rgba(120,50,0,0)');
  g.fillStyle = fill;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// A made up screen: a bar, a column, three cards and a chart, in the site's colors.
function face(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 520; c.height = 320;
  const g = c.getContext('2d')!, css = (n: Parameters<typeof hex>[0]) => `#${hex(n).toString(16).padStart(6, '0')}`;
  g.fillStyle = '#140b05'; g.fillRect(0, 0, 520, 320);
  g.fillStyle = css('ember'); g.fillRect(0, 0, 520, 34); g.fillRect(0, 34, 96, 286);
  g.fillStyle = css('hot'); g.fillRect(14, 11, 70, 12);
  for (let i = 0; i < 6; i++) { g.fillStyle = i === 1 ? css('flame') : css('bronze'); g.fillRect(14, 58 + i * 30, 62, 10); }
  for (let i = 0; i < 3; i++) { g.fillStyle = css('bronze'); g.fillRect(118 + i * 130, 56, 112, 78); g.fillStyle = css('hot'); g.fillRect(128 + i * 130, 68, 60, 9); g.fillStyle = css('flame'); g.fillRect(128 + i * 130, 104, 36 + i * 22, 14); }
  g.strokeStyle = css('flame'); g.lineWidth = 4; g.beginPath();
  [0, 30, 18, 52, 44, 80, 70, 96].forEach((v, i) => (i ? g.lineTo(122 + i * 52, 292 - v) : g.moveTo(122, 292)));
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function build(id: string, add: (o: THREE.Object3D) => THREE.Object3D, lit: (c: number, max: number, order?: number) => THREE.MeshStandardMaterial, body: THREE.Group): Live {
  const bronze = metal(hex('bronze')), copper = metal(hex('copper'), 0.28), gold = metal(hex('copper-light'), 0.22), dark = matte(0x15100c), board = matte(0x21160d, 0.6), steel = metal(0x2a221c, 0.45);

  if (id === 'cpu-open') {
    const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), gold, 121), m = new THREE.Matrix4();
    for (let i = 0; i < 121; i++) pads.setMatrixAt(i, m.makeTranslation(-0.4 + (i % 11) * 0.08, -0.03, -0.4 + Math.floor(i / 11) * 0.08));
    add(group([0, -0.5, 0], box(0.96, 0.03, 0.96, dark), pads));
    const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), gold, 20);
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; caps.setMatrixAt(i, m.makeTranslation(Math.cos(a) * 0.33, 0.04, Math.sin(a) * 0.3)); }
    add(group([0, -0.22, 0], box(0.96, 0.05, 0.96, board), box(0.98, 0.012, 0.98, copper, 0, -0.03, 0), caps));
    add(group([0, 0.04, 0], box(0.44, 0.012, 0.38, dark), box(0.36, 0.04, 0.3, lit(hex('flame'), 2.6), 0, 0.024, 0)));
    const lid = group([0, 0.42, 0], box(0.88, 0.05, 0.88, copper), box(0.66, 0.05, 0.66, copper, 0, 0.045, 0));
    lid.rotation.z = 0.1;
    add(lid);
    body.rotation.x = 0.18;
    return (t) => { body.rotation.y = t * 0.4; };
  }

  if (id === 'cpu-socket') {
    add(box(1.56, 0.05, 1.56, dark, 0, -0.2, 0));
    const lines = new THREE.Group();
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + 0.2, l = box(0.34, 0.006, 0.014, lit(hex('flame'), 2.2, i / 14)); l.position.set(Math.cos(a) * 0.58, -0.172, Math.sin(a) * 0.58); l.rotation.y = -a; lines.add(l); }
    add(lines);
    add(group([0, -0.15, 0], box(1.02, 0.07, 0.07, bronze, 0, 0, 0.475), box(1.02, 0.07, 0.07, bronze, 0, 0, -0.475), box(0.07, 0.07, 0.88, bronze, 0.475, 0, 0), box(0.07, 0.07, 0.88, bronze, -0.475, 0, 0)));
    add(group([0, -0.12, 0], box(0.86, 0.04, 0.86, board), box(0.8, 0.012, 0.8, lit(hex('flame'), 1.8, 0.4), 0, 0.02, 0), box(0.74, 0.06, 0.74, copper, 0, 0.05, 0)));
    const lever = rod(0.014, 1.04, gold, 0.6, -0.1, 0.04);
    lever.rotation.x = Math.PI / 2;
    add(group([0, 0, 0], lever, rod(0.03, 0.05, gold, 0.6, -0.1, 0.56)));
    const cans = new THREE.Group();
    for (let i = 0; i < 7; i++) cans.add(rod(0.05, 0.14, steel, -0.62 + i * 0.2, -0.105, -0.66), rod(0.042, 0.004, gold, -0.62 + i * 0.2, -0.033, -0.66));
    add(cans);
    const chokes = new THREE.Group();
    for (let i = 0; i < 5; i++) chokes.add(box(0.15, 0.1, 0.15, steel, -0.66, -0.125, -0.38 + i * 0.2));
    add(chokes);
    body.rotation.x = 0.5;
    return (t, _on, mx) => { body.rotation.y = -0.55 + Math.sin(t * 0.5) * 0.18 + (mx - 0.5) * 1.2; };
  }

  if (id === 'screen') {
    add(group([0, 0, 0], box(1.44, 0.05, 0.07, bronze, 0, 0.45, 0), box(1.44, 0.05, 0.07, bronze, 0, -0.45, 0), box(0.05, 0.9, 0.07, bronze, 0.695, 0, 0), box(0.05, 0.9, 0.07, bronze, -0.695, 0, 0)));
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.85), lit(0xffffff, 1.15));
    (pane.material as THREE.MeshStandardMaterial).emissiveMap = face();
    pane.position.z = 0.03;
    add(pane);
    add(box(1.34, 0.85, 0.02, board, 0, 0, 0));
    add(group([0, 0, -0.03], box(0.3, 0.3, 0.03, copper, -0.28, 0.12, 0), box(0.14, 0.14, 0.025, steel, 0.02, 0.24, 0), box(0.14, 0.14, 0.025, steel, 0.02, 0.04, 0), box(0.07, 0.3, 0.02, gold, 0.2, 0.14, 0), box(0.07, 0.3, 0.02, gold, 0.3, 0.14, 0)));
    add(box(0.62, 0.3, 0.035, dark, -0.3, -0.22, -0.035));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 10, 36), lit(hex('flame'), 2.2, 0.5));
    ring.position.set(0.44, -0.2, -0.035);
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.28, 0.12, -0.06), new THREE.Vector3(0.1, -0.02, -0.06), new THREE.Vector3(0.44, -0.2, -0.06)]), 20, 0.022, 8), copper);
    add(group([0, 0, 0], ring, rod(0.1, 0.02, steel, 0.44, -0.2, -0.035).rotateX(Math.PI / 2), pipe));
    return (t, _on, mx) => { body.rotation.y = 0.5 + Math.sin(t * 0.5) * 1.75 + (mx - 0.5) * 3; body.rotation.x = 0.1; };
  }

  if (id === 'tower') {
    for (let i = 0; i < 6; i++) {
      const y = -0.8 + i * 0.27, rooms = [0, 1, 2].map((k) => box(0.13, 0.12, 0.13, lit(k === i % 3 ? hex('hot') : hex('flame'), 2, i / 6), -0.16 + k * 0.17, 0.085, -0.12 + ((k + i) % 2) * 0.16));
      add(group([0, y, 0], box(0.66, 0.03, 0.66, bronze), box(0.66, 0.26, 0.03, dark, 0, 0.13, -0.315), box(0.03, 0.26, 0.66, dark, 0.315, 0.13, 0), ...rooms));
    }
    add(group([0, -0.67, 0.34], rod(0.1, 0.05, gold).rotateX(Math.PI / 2), rod(0.03, 0.08, bronze).rotateX(Math.PI / 2)));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 4), copper);
    cap.rotation.y = Math.PI / 4;
    add(group([0, 0.99, 0], box(0.66, 0.03, 0.66, bronze, 0, -0.17, 0), cap));
    return (t, _on, mx) => { body.rotation.y = -0.25 + Math.sin(t * 0.45) * 0.2 + (mx - 0.5) * 1.3; };
  }

  if (id === 'palette') {
    const top = rod(0.74, 0.045, matte(0x3b2414, 0.5), 0, 0, 0, 48);
    top.scale.z = 0.74;
    add(group([0, 0, 0], top, rod(0.085, 0.05, dark, 0.44, 0.002, 0.2)));
    const paints = [hex('ember'), hex('flame'), hex('hot'), hex('pale'), hex('copper'), hex('bronze')];
    const dab = (i: number) => { const a = Math.PI * (0.92 - i * 0.165), d = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 16), wet(paints[i]!)); d.scale.y = 0.42; d.position.set(Math.cos(a) * 0.52, 0.04, -Math.sin(a) * 0.36 + 0.02); return d; };
    add(group([0, 0, 0], dab(0), dab(1), dab(2)));
    add(group([0, 0, 0], dab(3), dab(4), dab(5)));
    const smear = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.1, 12, 1, 1), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.2, clearcoat: 1 }));
    const from = new THREE.Color(hex('flame')), to = new THREE.Color(hex('pale')), at = smear.geometry.getAttribute('position'), cols: number[] = [];
    for (let i = 0; i < at.count; i++) { const c = from.clone().lerp(to, at.getX(i) / 0.5 + 0.5); cols.push(c.r, c.g, c.b); }
    smear.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    smear.position.set(-0.05, 0.03, 0.18);
    add(smear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 16), wet(hex('flame')));
    tip.position.y = -0.55;
    tip.rotation.x = Math.PI;
    const brush = group([-0.05, 0.42, 0.18], rod(0.022, 0.8, dark, 0, 0, 0), rod(0.032, 0.14, gold, 0, -0.42, 0), tip);
    brush.rotation.z = -0.5;
    brush.rotation.x = 0.35;
    add(brush);
    body.rotation.x = 0.55;
    return (t, on, mx) => { body.rotation.y = -0.2 + (mx - 0.5) * 1.1; if (on >= 1) brush.position.x = -0.05 + Math.sin(t * 1.4) * 0.2; };
  }

  const leaves = [bronze, copper, matte(0x4a2c16, 0.5), matte(0x1b1512, 0.85), metal(hex('pale'), 0.3)];
  leaves.forEach((mat, i) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.036, 0.84), mat);
    leaf.geometry.translate(0, 0, -0.36);
    const g = group([0, -0.1 + i * 0.038, 0.36], leaf);
    g.rotation.y = (i - 2) * 0.34;
    add(g);
  });
  add(rod(0.05, 0.26, gold, 0, -0.02, 0.36));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 40), new THREE.MeshPhysicalMaterial({ color: hex('hot'), transparent: true, opacity: 0.2, roughness: 0.05 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 12, 48), gold);
  rim.rotation.x = Math.PI / 2;
  const legs = [0, 1, 2].map((k) => rod(0.012, 0.3, gold, Math.cos(k * 2.09) * 0.26, -0.15, Math.sin(k * 2.09) * 0.26));
  add(group([0.05, 0.36, -0.12], rim, lens, ...legs));
  body.rotation.x = 0.75;
  body.scale.setScalar(1.45);
  return (t, _on, mx) => { body.rotation.y = 0.1 + Math.sin(t * 0.5) * 0.15 + (mx - 0.5) * 1.2; };
}

export interface Derby { strike(i?: number): void; hold(at: number | null): void; slow(on: boolean): void; dispose(): void }

export function mountThings(host: HTMLElement): Derby {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  const cam = new THREE.OrthographicCamera(-STAGE.wide / 2, STAGE.wide / 2, STAGE.tall / 2, -STAGE.tall / 2, 0.1, 60);
  cam.position.set(-4.2, 5.2, 10.5);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), toward = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2);
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x1a0e06, 0.55));
  const key = new THREE.DirectionalLight(0xffd9b0, 2.4), rim = new THREE.DirectionalLight(hex('flame'), 1.6), cursor = new THREE.PointLight(hex('hot'), 30, 9, 1.6);
  key.position.set(3, 6, 5);
  rim.position.set(-5, 2, -4);
  scene.add(key, rim, cursor);

  const glow = spot(), shardGeo = new THREE.TetrahedronGeometry(0.075), shardMat = metal(hex('copper-light'), 0.25);
  const beam = (c: number, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthTest: false, toneMapped: false });
  const strip = () => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0.5, 0, 0); return g; };
  const things: Thing[] = THINGS.map((def, i) => {
    const at = right.clone().multiplyScalar(STAGE.cols[Math.floor(i / 2)]!).addScaledVector(up, STAGE.rows[i % 2]!);
    const body = new THREE.Group(), fx = new THREE.Group(), parts: Part[] = [], glows: Glow[] = [], rnd = rand(31 + i * 17);
    body.position.copy(at);
    fx.position.copy(at).addScaledVector(toward, 4);
    fx.quaternion.copy(cam.quaternion);
    scene.add(body, fx);
    const add = (obj: THREE.Object3D) => {
      const shard = new THREE.Mesh(shardGeo, shardMat), a = rnd() * Math.PI * 2;
      body.add(obj, shard);
      parts.push({ obj, shard, home: obj.position.clone(), turn: obj.quaternion.clone(), wild: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)), out: new THREE.Vector3(Math.cos(a) * 0.9, 0.5 + rnd() * 0.7, Math.sin(a) * 0.9) });
      return obj;
    };
    const lit = (c: number, max: number, order = 0) => { const mat = new THREE.MeshStandardMaterial({ color: 0x140b06, emissive: c, emissiveIntensity: max, roughness: 0.5 }); glows.push({ mat, max, order }); return mat; };
    body.scale.setScalar(1.12);
    const live = build(def.id, add, lit, body);
    parts.forEach((p) => { p.home.copy(p.obj.position); p.turn.copy(p.obj.quaternion); });
    const line = (a: number[], b: number[]) => [beam(hex('flame'), 0.2), beam(hex('hot'), 0.9)].map((m, k) => {
      const s = new THREE.Mesh(strip(), m);
      s.position.set(a[0]!, a[1]!, 0);
      s.rotation.z = Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!);
      s.userData.len = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
      s.userData.thick = k ? 0.02 : 0.085;
      fx.add(s);
      return s;
    });
    const dot = (size: number) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, toneMapped: false })); fx.add(s); return s; };
    const flash = dot(1), end = dot(0.55);
    flash.position.set(HIT.at[0]!, HIT.at[1]!, 0);
    const loose: Loose[] = Array.from({ length: 14 }, () => {
      const mesh = new THREE.Mesh(shardGeo, shardMat), a = -0.5 + rnd() * 1.9;
      fx.add(mesh);
      return { mesh, v: new THREE.Vector3(Math.cos(a) * (1.2 + rnd() * 1.6), Math.sin(a) * (1.2 + rnd() * 1.8), 0), spin: new THREE.Vector3(rnd() * 8, rnd() * 8, rnd() * 8) };
    });
    return { body, fx, parts, glows, live, inn: line(HIT.from, HIT.at), out: line(HIT.at, HIT.to), flash, end, loose };
  });

  const starts = THINGS.map(() => -1e9);
  let held: number | null = null, half = false, last = '';
  const from = new THREE.Vector3(), mid = new THREE.Vector3(), q = new THREE.Vector3();

  const place = (th: Thing, tau: number, t: number, mx: number) => {
    const n = th.parts.length, done = LIFE.run + n * LIFE.each + LIFE.fly, on = clamp((tau - done) / LIFE.lights), g = 2.6;
    th.live(t, on, mx);
    th.body.updateMatrixWorld();
    th.fx.updateMatrixWorld();
    from.set(HIT.at[0]!, HIT.at[1]!, 0);
    th.body.worldToLocal(th.fx.localToWorld(from).addScaledVector(toward, -4));
    th.parts.forEach((p, i) => {
      const u = clamp((tau - LIFE.run - i * LIFE.each) / LIFE.fly), e = ease(u), grown = ease(clamp((u - 0.3) / 0.7));
      p.obj.visible = u > 0.3;
      p.shard.visible = u > 0 && u < 0.62;
      mid.copy(from).lerp(p.out, e);
      q.copy(mid).lerp(p.home, e);
      p.obj.position.copy(q);
      p.obj.scale.setScalar(Math.max(grown, 0.001));
      p.obj.quaternion.copy(p.wild).slerp(p.turn, e);
      p.shard.position.copy(q);
      p.shard.scale.setScalar(1 - clamp((u - 0.3) / 0.32));
      p.shard.rotation.set(tau * 7 + i, tau * 5, i);
    });
    th.glows.forEach((gl) => { gl.mat.emissiveIntensity = gl.max * clamp((on - gl.order * 0.6) / 0.4); });
    const inn = clamp(tau / LIFE.run), out = clamp((tau - LIFE.run) / 0.35), since = tau - LIFE.run;
    th.inn.forEach((s) => { s.visible = tau > 0; s.scale.set(Math.max(s.userData.len * inn, 0.001), s.userData.thick, 1); });
    th.out.forEach((s) => { s.visible = since > 0; s.scale.set(Math.max(s.userData.len * out, 0.001), s.userData.thick, 1); });
    th.end.visible = tau > 0 && out < 1;
    const [a, b, k] = since < 0 ? [HIT.from, HIT.at, inn] : [HIT.at, HIT.to, out];
    th.end.position.set(a[0]! + (b[0]! - a[0]!) * k, a[1]! + (b[1]! - a[1]!) * k, 0);
    th.flash.visible = since > 0;
    th.flash.scale.setScalar(0.35 + 1.5 * Math.exp(-since * 5));
    th.loose.forEach((l, i) => {
      const s = since - 0.02 * i, fall = HIT.at[1]! + l.v.y * s - 0.5 * g * s * s, landed = s > 0 && fall <= HIT.floor;
      const when = (l.v.y + Math.sqrt(l.v.y * l.v.y + 2 * g * (HIT.at[1]! - HIT.floor))) / g, rest = Math.max(0, s - when);
      l.mesh.visible = s > 0 && rest < 0.9;
      l.mesh.position.set(HIT.at[0]! + l.v.x * Math.min(s, when), landed ? HIT.floor + 0.04 : fall, 0);
      l.mesh.rotation.set(l.spin.x * Math.min(s, when), l.spin.y * Math.min(s, when), 0);
      l.mesh.scale.setScalar(landed ? 1 - rest / 0.9 : 1);
    });
  };

  const size = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    last = '';
  };
  const watch = new ResizeObserver(size);
  watch.observe(host);
  size();

  const off = clock.onFrame((t) => {
    const m = lamp.get(), stamp = `${t.toFixed(3)}|${m.x.toFixed(3)}|${m.y.toFixed(3)}|${held}|${host.clientWidth}`;
    if (clock.isFrozen() && stamp === last) return;
    last = stamp;
    cursor.position.copy(right).multiplyScalar((m.x - 0.5) * STAGE.wide).addScaledVector(up, (0.5 - m.y) * STAGE.tall).addScaledVector(toward, 2.6);
    things.forEach((th, i) => place(th, held ?? (clock.isFrozen() ? 99 : (t - starts[i]!) * (half ? 0.5 : 1)), t, m.x));
    renderer.render(scene, cam);
  });

  return {
    strike(i) { const now = clock.now(); THINGS.forEach((_, k) => { if (i === undefined || i === k) starts[k] = now + (i === undefined ? k * 0.12 : 0); }); },
    hold(at) { held = at; },
    slow(on) { half = on; },
    dispose() { off(); watch.disconnect(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
