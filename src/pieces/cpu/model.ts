import * as THREE from 'three';
import { Builder, at, lathe, pause, rbox, xf, type Vec3 } from '../../world/build';
import { circle, rounded, rrect, slab, type V } from '../../world/shape';
import { dielectric, lin, metal } from '../../world/surface';
import { hex } from '../../config/palette';
import { ETCH_MM, boardArt, lidEtch, printSheet, printUv, smallParts, type PrintCell } from './art';
import {
  BODY, BOARD, CAP, CHOKE, DEG, EPS, FAN, FRAME, HOLE, HOLES, IHS, LED, LEVER, MOS, PHASES, PKG, PLATE, QFN, QFP, SCREWS, SHOULDER,
  SMALL_SIZE, SOCKET, SOIC, type P2,
} from './layout';
import { partChunks, shared, depthMaterial, type Shared } from './shading';

// The processor in its socket on a square of board, in millimetres under a root scaled by 0.001. Every part is
// merged by material with the others, and carries its own number so the shaders can move it alone.

export type Kind = 'board' | 'frame' | 'body' | 'cpu' | 'plate' | 'lever' | 'round';
export interface PartDef {
  kind: Kind;
  // Where it sits, and about how large it is.
  c: Vec3;
  r: number;
  // A part that swings shut on a hinge: a point on the axis, the axis, and how far open it stands.
  hinge?: { p: Vec3; d: Vec3; open: number };
}

export interface CpuModel {
  root: THREE.Group;
  parts: PartDef[];
  u: Shared;
  meshes: THREE.Mesh[];
  shadow: THREE.Mesh;
  led: THREE.MeshStandardMaterial;
  contacts: THREE.MeshPhysicalMaterial;
}

const PATINA: [number, number, number] = [0.72, 0.62, 0.55];
const shade = (name: Parameters<typeof hex>[0], k: number) => new THREE.Color(hex(name)).multiplyScalar(k).getHex();
const S = (p: P2, y = 0): Vec3 => [p[0] + SOCKET.x, y, p[1] + SOCKET.z];

// A flat outline lying on the board: slab() extrudes along z, so it is turned to stand along y. A point (x, z) of the
// board is drawn at (x, -z) of the outline.
function flat(outline: THREE.Vector2[], holes: THREE.Vector2[][], y0: number, y1: number, bev: number, segs = 2): THREE.BufferGeometry {
  const g = slab(outline, holes, y0, y1, bev, segs);
  g.rotateX(-Math.PI / 2);
  return g;
}
const flip = (pts: THREE.Vector2[]) => pts.map((p) => new THREE.Vector2(p.x, -p.y));

// A path of straight runs with each corner rounded, for bent rod.
function bent(pts: Vec3[], rc: number): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const v = pts.map((p) => new THREE.Vector3(...p));
  let from = v[0].clone();
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i].clone().sub(v[i - 1]).normalize(), b = v[i + 1].clone().sub(v[i]).normalize();
    const p0 = v[i].clone().addScaledVector(a, -rc), p1 = v[i].clone().addScaledVector(b, rc);
    path.add(new THREE.LineCurve3(from, p0));
    path.add(new THREE.QuadraticBezierCurve3(p0, v[i].clone(), p1));
    from = p1;
  }
  path.add(new THREE.LineCurve3(from, v[v.length - 1]));
  return path;
}

// A six lobed recess for a screw head, as a flat star.
function star(r: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const k = 0.72 + 0.28 * Math.cos(a * 6); pts.push(new THREE.Vector2(Math.cos(a) * r * k, Math.sin(a) * r * k)); }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2);
  return g;
}

// Uvs for a part whose top carries ink: a flat projection of the top face into its cell of the print sheet. The
// shader only inks faces that look up.
function printed(g: THREE.BufferGeometry, cell: PrintCell, w: number, d: number): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const [u, v] = printUv(cell, THREE.MathUtils.clamp(p.getX(i), -w / 2, w / 2), THREE.MathUtils.clamp(p.getZ(i), -d / 2, d / 2), w, d);
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.userData.printed = true;
  return g;
}

export async function buildCpu(): Promise<CpuModel> {
  const root = new THREE.Group();
  root.scale.setScalar(0.001);
  const art = await boardArt();
  const u = shared(art.pulse);
  await pause();

  // ---- materials ----------------------------------------------------------------------------------------
  const printTex = printSheet();
  // A material whose parts carry ink on their tops reads it through their uvs.
  const ink = (base: THREE.MeshPhysicalMaterial) => {
    base.defines = { ...(base.defines ?? {}), USE_UV: '' };
    base.userData.uniforms = { ...u, uPrint: { value: printTex } };
    return base;
  };
  const inkChunks = (color: number, metalInk: boolean) => ({
    head: 'uniform sampler2D uPrint;',
    color: `vec4 cpuPr = texture2D(uPrint, vUv) * step(0.95, vObjN.y);\n  diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(color)}, cpuPr.r);\n  diffuseColor.rgb *= 1.0 - 0.75 * cpuPr.g;`,
    rough: 'roughnessFactor = mix(roughnessFactor, 0.75, cpuPr.r);',
    ...(metalInk ? { metal: 'metalnessFactor = mix(metalnessFactor, 0.0, cpuPr.r);' } : {}),
  });
  const wear = {
    head: `float cpuWear(){ float k = 1.0 - abs(vObjN.y); float bev = smoothstep(0.06, 0.3, k) * (1.0 - smoothstep(0.7, 0.96, k)); return bev * (0.35 + 0.65 * smoothstep(0.32, 0.62, wFbm(vObj * 0.8 + 5.0))); }`,
    color: `diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(hex('bronze'))}, cpuWear() * 0.9);`,
    rough: 'roughnessFactor = mix(roughnessFactor, 0.24, cpuWear());',
  };
  const steel = metal({ name: 'cpuSteel', color: shade('bronze-deep', 0.5), rough: 0.22, brush: 'x', tarnish: 0.25, patina: PATINA, extra: partChunks(wear) });
  steel.userData.uniforms = u;
  const etch = lidEtch();
  const lidC = `vec2(${SOCKET.x.toFixed(2)}, ${SOCKET.z.toFixed(2)})`;
  const lid = metal({
    name: 'cpuLid', color: shade('copper', 1.0), rough: 0.16, brush: 'x', aniso: 0.95, tarnish: 0.12, patina: PATINA,
    extra: partChunks({
      head: `uniform sampler2D uEtch; float cpuEtch(vec2 o){ if (vObjN.y < 0.99 || vObj.y < ${(IHS.y2 - 0.02).toFixed(2)}) return 0.0; return texture2D(uEtch, (vObj.xz + o - ${lidC}) / ${ETCH_MM.toFixed(1)} + 0.5).r; }`,
      color: 'float cpuEt = cpuEtch(vec2(0.0));\n  diffuseColor.rgb *= 1.0 - 0.7 * cpuEt;',
      rough: 'roughnessFactor = mix(roughnessFactor, 0.66, cpuEt);',
      normal: `{ float e = 0.035; float gx = cpuEtch(vec2(e, 0.0)) - cpuEtch(vec2(-e, 0.0)); float gz = cpuEtch(vec2(0.0, e)) - cpuEtch(vec2(0.0, -e)); vec3 axZ = normalize(cross(vAxX, vAxY)); normal = normalize(normal + (gx * vAxX + gz * axZ) * 0.35); }`,
    }),
  });
  lid.userData.uniforms = { ...u, uEtch: { value: etch } };
  // The lid is the brightest thing on the board: its brushing carries the studio's strip lights even with the cursor far off.
  lid.envMapIntensity = 2.2;
  const copper = metal({ name: 'cpuCopper', color: shade('copper', 0.85), rough: 0.45, tarnish: 0.2, patina: PATINA, extra: partChunks() });
  copper.userData.uniforms = u;
  const bronze = metal({ name: 'cpuBronze', color: hex('bronze'), rough: 0.3, brush: 'radial-z', tarnish: 0.2, patina: PATINA, extra: partChunks() });
  bronze.userData.uniforms = u;
  const leverMetal = metal({ name: 'cpuLever', color: hex('bronze'), rough: 0.38, brush: 'x', tarnish: 0.18, patina: PATINA, extra: partChunks() });
  leverMetal.userData.uniforms = u;
  const contacts = metal({
    name: 'cpuContacts', color: shade('copper', 0.85), rough: 0.42, extra: partChunks({ emissive: `totalEmissiveRadiance += cpuRamp(uSeam * uGlow) * uSeam * uGlow * 1.5;` }, { bounce: false }),
  });
  contacts.userData.uniforms = u;
  const can = ink(metal({ name: 'cpuCan', color: shade('bronze-deep', 1.15), rough: 0.3, brush: 'radial-z', tarnish: 0.15, patina: PATINA, extra: partChunks(inkChunks(shade('bronze', 0.55), true)) }));
  const plastic = dielectric('cpuPlastic', shade('bg-3', 0.9), 0.38, { coat: 0, vary: 0.08, scale: 0.5, extra: partChunks() });
  plastic.userData.uniforms = u;
  const ferrite = ink(dielectric('cpuFerrite', shade('bg-3', 1.35), 0.93, { vary: 0.16, scale: 1.6, extra: partChunks(inkChunks(shade('copper-light', 0.9), false)) }));
  const epoxy = ink(dielectric('cpuEpoxy', shade('bg-3', 0.62), 0.64, { coat: 0, vary: 0.06, scale: 0.9, extra: partChunks(inkChunks(hex('text-3'), false)) }));
  const substrate = dielectric('cpuSubstrate', shade('bronze-deep', 0.42), 0.55, { coat: 0.12, vary: 0.05, scale: 0.4, extra: partChunks() });
  substrate.userData.uniforms = u;
  const ceramic = dielectric('cpuCeramic', shade('bronze-deep', 1.1), 0.62, { vary: 0.12, scale: 2.0, extra: partChunks() });
  ceramic.userData.uniforms = u;
  const rubber = dielectric('cpuRubber', shade('bg-2', 1.0), 0.86, { vary: 0.08, extra: partChunks() });
  rubber.userData.uniforms = u;
  const recess = dielectric('cpuRecess', shade('bg', 1.0), 0.9, { extra: partChunks({}, { bounce: false }) });
  recess.userData.uniforms = u;
  const led = new THREE.MeshStandardMaterial({ color: shade('ember', 0.9), emissive: new THREE.Color(hex('flame')), emissiveIntensity: 0, roughness: 0.25 });
  led.name = 'cpuLed';
  const ledM = led as unknown as THREE.MeshPhysicalMaterial;
  {
    const ch = partChunks({}, { bounce: false });
    led.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${ch.vhead}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${ch.vert}`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${ch.head}`).replace('#include <color_fragment>', `#include <color_fragment>\n${ch.color}`);
    };
    led.customProgramCacheKey = () => 'cpu-led';
  }
  const board = boardMaterial(u, art.art);
  await pause();

  // ---- parts ------------------------------------------------------------------------------------------------
  const b = new Builder();
  const parts: PartDef[] = [];
  const part = (d: PartDef) => { parts.push(d); return parts.length - 1; };
  const inked = new Set<THREE.Material>([can, ferrite, epoxy]);
  const add = (i: number, geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) => {
    const hasInk = !!geo.userData.printed;
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    if (inked.has(mat) && !hasInk) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) cell[k * 4 + 3] = i;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    b.add(g, mat);
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  // The board, its plated holes.
  const iBoard = part({ kind: 'board', c: [0, -0.8, 0], r: 78 });
  {
    const sq = rounded(rrect(0, 0, BOARD.half * 2, BOARD.half * 2, 0.6));
    add(iBoard, flat(flip(sq), HOLES.map(([x, z]) => circle(x, z, HOLE.r, 48)).map(flip), -BOARD.thick, 0, 0.1, 1), board);
  }
  await pause();

  // The socket's frame, screwed down, with the hinge's lugs and pin, the lever's bearings and hook, the shoulder screw.
  const iFrame = part({ kind: 'frame', c: S([0, 0], 0.6), r: 34 });
  {
    const out = rounded(rrect(0, 0, FRAME.out[0] * 2, FRAME.out[1] * 2, 2.4));
    const inner = rounded(rrect(0, 0, BODY.out[0] * 2 + 0.6, BODY.out[1] * 2 + 0.6, 1.0));
    add(iFrame, flat(flip(out), [flip(inner)], 0, FRAME.t, 0.2, 2), steel, at(SOCKET.x, 0, SOCKET.z));
    // Stamped ribs that stiffen the frame along its long sides.
    for (const sz of [-1, 1]) add(iFrame, rbox(40, 0.5, 1.2, 0.24, 2), steel, at(SOCKET.x, FRAME.t + 0.1, SOCKET.z + sz * (FRAME.out[1] - 1.5)));
    const [hx, hy] = PLATE.hinge;
    for (const [z0, z1] of [[-16.6, -14.5], [-4.3, 4.3], [14.5, 16.6]]) {
      const lug = slab(rounded([[hx - 1.4, 0, 0.2], [hx + 1.4, 0, 0.2], [hx + 1.4, hy + 0.6, 1.25], [hx - 1.4, hy + 0.6, 1.25]] as V[]), [circle(hx, hy, 0.62, 20)], z0, z1, 0.14, 2);
      add(iFrame, lug, steel, at(SOCKET.x, 0, SOCKET.z));
    }
    const pin = new THREE.CylinderGeometry(0.6, 0.6, 34.2, 20); pin.rotateX(Math.PI / 2);
    add(iFrame, pin, bronze, at(...S([hx, 0], hy)));
    for (const sz of [-1, 1]) { const head = new THREE.CylinderGeometry(0.95, 0.95, 0.5, 24); head.rotateX(Math.PI / 2); add(iFrame, head, bronze, at(...S([hx, sz * 17.35], hy))); }
    // Bearings the lever turns in, and the hook that holds it shut.
    for (const bx of [-13, 24.6]) {
      const sleeve = new THREE.CylinderGeometry(1.45, 1.45, 3.0, 28, 1, true); sleeve.rotateZ(Math.PI / 2);
      add(iFrame, sleeve, steel, at(...S([bx, LEVER.z], LEVER.y)));
      add(iFrame, rbox(3.0, LEVER.y, 1.6, 0.3), steel, at(...S([bx, LEVER.z - 1.2], LEVER.y / 2)));
    }
    add(iFrame, rbox(2.6, 3.3, 0.6, 0.22), steel, at(...S([-18.4, FRAME.out[1] + 0.1], 1.65)));
    add(iFrame, rbox(2.6, 0.55, 3.3, 0.22), steel, at(...S([-18.4, FRAME.out[1] + 1.35], 3.25)));
    // Four screws, and the shoulder screw the plate's tongue slides under.
    const head = lathe([[0, 1.05], [1.1, 1.0], [1.85, 0.82], [2.25, 0.5], [2.35, 0.2], [2.35, 0]].reverse() as [number, number][], 40);
    for (const p of SCREWS) {
      add(iFrame, head.clone(), steel, at(...S(p, FRAME.t)));
      add(iFrame, star(0.85), recess, at(...S(p, FRAME.t + 1.06)));
    }
    const shoulder = new THREE.CylinderGeometry(1.5, 1.5, PLATE.y + PLATE.t + 0.05 - FRAME.t, 32);
    add(iFrame, shoulder, steel, at(...S(SHOULDER, (FRAME.t + PLATE.y + PLATE.t) / 2)));
    const sh = lathe([[0, 1.1], [1.2, 1.05], [2.3, 0.86], [2.6, 0.5], [2.65, 0.2], [2.6, 0]].reverse() as [number, number][], 40);
    add(iFrame, sh, steel, at(...S(SHOULDER, PLATE.y + PLATE.t + 0.05)));
    add(iFrame, star(0.95), recess, at(...S(SHOULDER, PLATE.y + PLATE.t + 1.16)));
  }
  await pause();

  // The socket's body, with keys in its cavity and the rows of contacts that show in the gap.
  const iBody = part({ kind: 'body', c: S([0, 0], 1.3), r: 30 });
  {
    const out = rounded(rrect(0, 0, BODY.out[0] * 2, BODY.out[1] * 2, 0.8));
    const cav = rounded(rrect(0, 0, BODY.cav[0] * 2, BODY.cav[1] * 2, 0.4));
    add(iBody, flat(flip(out), [flip(cav)], 0, BODY.top, 0.12, 2), plastic, at(SOCKET.x, 0, SOCKET.z));
    add(iBody, flat(flip(cav), [], 0, BODY.floor, 0), plastic, at(SOCKET.x, 0, SOCKET.z));
    for (const kx of [-12.2, 9.8]) add(iBody, rbox(1.3, 1.4, 0.8, 0.2), plastic, at(...S([kx, -(BODY.cav[1] - 0.4)], BODY.floor + 0.7)));
    const pad = box(0.34, 0.1, 0.5), arm = box(0.26, 0.08, 0.72);
    for (const sz of [-1, 1]) for (const [row, shift] of [[19.18, 0], [19.92, 0.45]] as const) for (let k = 0; k < 49; k++) {
      const x = -21.9 + k * 0.9 + shift, z = sz * row;
      add(iBody, pad.clone(), contacts, at(...S([x, z], BODY.floor + 0.05)));
      add(iBody, arm.clone(), contacts, xf({ p: S([x, z - sz * 0.18], BODY.floor + 0.32), r: [sz * 30 * DEG, 0, 0] }));
    }
  }
  await pause();

  // The processor: substrate, the capacitors on its rim, the lid.
  const iCpu = part({ kind: 'cpu', c: S([0, 0], 3.4), r: 28 });
  {
    add(iCpu, rbox(PKG.hw * 2, PKG.y1 - PKG.y0, PKG.hd * 2, 0.14, 2), substrate, at(...S([0, 0], (PKG.y0 + PKG.y1) / 2)));
    const body = box(0.55, 0.42, 0.5), end = box(0.2, 0.44, 0.52);
    for (const sz of [-1, 1]) for (let k = 0; k < 21; k++) {
      const x = -13 + k * 1.3, z = sz * 17.15 + (k % 2 ? 0.55 : -0.55) * sz;
      add(iCpu, body.clone(), ceramic, at(...S([x, z], PKG.y1 + 0.21)));
      for (const e of [-1, 1]) add(iCpu, end.clone(), copper, at(...S([x + e * 0.37, z], PKG.y1 + 0.22)));
    }
    const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.8, 0), new THREE.Vector2(0, 1.8)]);
    const triG = new THREE.ShapeGeometry(tri); triG.rotateX(-Math.PI / 2);
    add(iCpu, triG, copper, at(...S([-15.4, 18.3], PKG.y1 + 0.012)));
    const [sx, sz] = IHS.skirt, [wx, wz] = IHS.wing, rr = 0.5;
    const skirt: V[] = [[-sx, -sz, 1.0], [sx, -sz, 1.0], [sx, -wz, rr], [wx, -wz, rr], [wx, wz, rr], [sx, wz, rr], [sx, sz, 1.0], [-sx, sz, 1.0], [-sx, wz, rr], [-wx, wz, rr], [-wx, -wz, rr], [-sx, -wz, rr]];
    add(iCpu, flat(flip(rounded(skirt)), [], PKG.y1, IHS.y1, 0.14, 2), lid, at(SOCKET.x, 0, SOCKET.z));
    const top = rounded(rrect(0, 0, IHS.top[0] * 2, IHS.top[1] * 2, 1.4));
    add(iCpu, flat(flip(top), [], IHS.y1 - 0.01, IHS.y2, IHS.chamfer, 1), lid, at(SOCKET.x, 0, SOCKET.z));
    const mark = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(0, 1.1)]));
    mark.rotateX(-Math.PI / 2);
    add(iCpu, mark, recess, at(...S([-sx + 0.4, sz - 0.35], IHS.y1 + 0.012)));
  }
  await pause();

  // The load plate, closed: a window for the lid, rails over the long sides, a tongue under the shoulder screw, the
  // knuckles of its hinge, flanges turned down and ribs pressed into its ends.
  const [hx, hy] = PLATE.hinge;
  const iPlate = part({ kind: 'plate', c: S([0, 0], PLATE.y + 0.4), r: 30, hinge: { p: S([hx, 0], hy), d: [0, 0, 1], open: -104 * DEG } });
  {
    const y0 = PLATE.y, y1 = PLATE.y + PLATE.t;
    const out = rounded(rrect(0, 0, PLATE.out[0] * 2, PLATE.out[1] * 2, 1.6));
    const win = rounded(rrect(0, 0, PLATE.win[0] * 2, PLATE.win[1] * 2, 1.4));
    add(iPlate, flat(flip(out), [flip(win)], y0, y1, 0.16, 2), steel, at(SOCKET.x, 0, SOCKET.z));
    for (const pz of [-2.15, 2.15]) add(iPlate, rbox(5.0, PLATE.t, 1.1, 0.3, 2), steel, at(...S([-(PLATE.out[0] + 2.2), pz], (y0 + y1) / 2)));
    add(iPlate, rbox(2.6, PLATE.t, 4.3, 0.3, 2), steel, at(...S([-(PLATE.out[0] + 0.9), 0], (y0 + y1) / 2)));
    for (const sz of [-1, 1]) add(iPlate, rbox(PLATE.out[0] * 2 - 3, 1.0, 0.5, 0.2, 2), steel, at(...S([0, sz * (PLATE.out[1] - 0.3)], y0 - 0.35)));
    for (const sx of [-1, 1]) for (const k of [-1, 1]) add(iPlate, rbox(1.4, 0.5, 13.5, 0.24, 2), steel, at(...S([sx * 21.3, k * 8.6], y1 + 0.05)));
    for (const [z0, z1] of [[-14.1, -4.9], [4.9, 14.1]]) {
      const knuckle = new THREE.CylinderGeometry(1.05, 1.05, z1 - z0, 28); knuckle.rotateX(Math.PI / 2);
      add(iPlate, knuckle, steel, at(...S([hx, (z0 + z1) / 2], hy)));
      add(iPlate, rbox(2.2, PLATE.t, z1 - z0, 0.3, 2), steel, at(...S([hx - 1.2, (z0 + z1) / 2], (y0 + y1) / 2)));
    }
    add(iPlate, rbox(9.0, PLATE.t, 2.4, 0.3, 2), steel, at(...S([0, PLATE.out[1] + 0.6], (y0 + y1) / 2)));
  }
  await pause();

  // The lever: a bent rod turning in its bearings, its handle bent out at the end and tipped with a grip.
  const iLever = part({ kind: 'lever', c: S([3, LEVER.z], LEVER.y), r: 26, hinge: { p: S([LEVER.x1, LEVER.z], LEVER.y), d: [0, 0, 1], open: -118 * DEG } });
  {
    const y = LEVER.y, z = LEVER.z;
    const path = bent([S([LEVER.x1, z], y), S([LEVER.x0, z], y), S([LEVER.x0, LEVER.handle], y + 0.4)], 1.8);
    add(iLever, new THREE.TubeGeometry(path, 220, LEVER.r, 14, false), leverMetal);
    add(iLever, new THREE.SphereGeometry(LEVER.r, 16, 10), leverMetal, at(...S([LEVER.x1, z], y)));
    const grip = lathe([[0, -2.8], [0.9, -2.75], [1.3, -2.3], [1.42, -1.2], [1.42, 1.6], [1.25, 2.4], [0.7, 2.75], [0, 2.8]], 28);
    grip.rotateX(Math.PI / 2);
    add(iLever, grip, leverMetal, at(...S([LEVER.x0, LEVER.handle + 1.4], y + 0.42)));
  }
  await pause();

  // The power header in the corner the stream strikes: eight keyed cavities with a pin in each, a latch ramp.
  const iEps = part({ kind: 'round', c: [EPS.x, EPS.h / 2, EPS.z], r: 10 });
  {
    const outl = rounded(rrect(0, 0, EPS.w, EPS.d, 0.7));
    const holes: THREE.Vector2[][] = [];
    for (let i = 0; i < 4; i++) for (const j of [-1, 1]) {
      const cx = -6.3 + i * 4.2, cz = j * 2.1, s = 1.68, c = (i + (j > 0 ? 1 : 0)) % 2 ? 0.9 : 0.15;
      const v: V[] = j > 0 ? [[cx - s, cz - s, 0.15], [cx + s, cz - s, 0.15], [cx + s, cz + s, c], [cx - s, cz + s, c]] : [[cx - s, cz - s, c], [cx + s, cz - s, c], [cx + s, cz + s, 0.15], [cx - s, cz + s, 0.15]];
      holes.push(rounded(v));
      add(iEps, rbox(1.1, 6.6, 1.1, 0.2, 1), copper, at(EPS.x + cx, 6.0, EPS.z + cz));
    }
    add(iEps, flat(flip(outl), [], 0, 2.9, 0.2, 2), plastic, at(EPS.x, 0, EPS.z));
    add(iEps, flat(flip(outl), holes.map(flip), 2.8, EPS.h, 0.24, 2), plastic, at(EPS.x, 0, EPS.z));
    const ramp = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.7, 0.6), new THREE.Vector2(1.7, 3.0), new THREE.Vector2(0, 4.2)]);
    const rg = new THREE.ExtrudeGeometry(ramp, { depth: 3.8, bevelEnabled: false });
    rg.rotateY(-Math.PI / 2);
    add(iEps, rg, plastic, at(EPS.x + 1.9, EPS.h - 5.4, EPS.z + EPS.d / 2));
    for (const sx of [-1, 1]) add(iEps, rbox(0.9, EPS.h - 1.2, 0.8, 0.25), plastic, at(EPS.x + sx * 3.4, EPS.h / 2 - 0.2, EPS.z + EPS.d / 2 + 0.3));
  }

  // The power stages.
  const iPhase: number[] = [];
  for (const [n, ph] of PHASES.entries()) {
    const i = part({ kind: 'round', c: [ph.choke[0], 2.5, ph.choke[1]], r: 9 });
    iPhase.push(i);
    const turn = (x: number, y: number, z: number, cx: number, cz: number) => xf({ p: [cx + (ph.turn ? z : x), y, cz + (ph.turn ? -x : z)], r: [0, ph.turn, 0].map((v) => (v ? Math.PI / 2 : 0)) as Vec3 });
    const [cx, cz] = ph.choke;
    add(i, printed(rbox(CHOKE.w, CHOKE.h, CHOKE.w, 0.5, 2), n % 2 ? 'choke2' : 'choke', CHOKE.w - 0.6, CHOKE.w - 0.6), ferrite, turn(0, 0.22 + CHOKE.h / 2, 0, cx, cz));
    add(i, rbox(CHOKE.w - 0.2, 0.25, CHOKE.w - 0.2, 0.1, 1), rubber, turn(0, 0.12, 0, cx, cz));
    for (const s of [-1, 1]) {
      add(i, box(0.24, 1.7, 3.6), copper, turn(s * (CHOKE.w / 2 + 0.1), 0.85, 0, cx, cz));
      add(i, box(1.2, 0.2, 3.6), copper, turn(s * (CHOKE.w / 2 + 0.45), 0.1, 0, cx, cz));
    }
    const [mx, mz] = ph.mos;
    add(i, printed(rbox(MOS.w, MOS.h, MOS.d, 0.1, 1), 'mos', MOS.w, MOS.d), epoxy, turn(0, 0.06 + MOS.h / 2, 0, mx, mz));
    for (let k = 0; k < 4; k++) add(i, box(0.42, 0.22, 0.55), copper, turn(-1.8 + k * 1.2, 0.11, MOS.d / 2 + 0.12, mx, mz));
    add(i, box(MOS.w - 0.8, 0.22, 0.5), copper, turn(0, 0.11, -MOS.d / 2 - 0.1, mx, mz));
    const [px, pz] = ph.cap;
    const can0: [number, number][] = [[3.04, 0.62], [3.15, 0.75], [3.15, 1.2], [3.0, 1.38], [2.9, 1.56], [3.0, 1.74], [3.15, 1.92], [3.15, CAP.h - 0.6], [3.12, CAP.h - 0.3], [3.0, CAP.h - 0.1], [2.82, CAP.h - 0.02], [2.6, CAP.h], [0, CAP.h]];
    const cg = printed(lathe(can0, 44), 'cap', 5.7, 5.7);
    add(i, cg, can, turn(0, 0, 0, px, pz));
    const base = new THREE.Shape(); const bw = 3.3, ch = 1.0;
    base.moveTo(-bw, -bw); base.lineTo(bw - ch, -bw); base.lineTo(bw, -bw + ch); base.lineTo(bw, bw - ch); base.lineTo(bw - ch, bw); base.lineTo(-bw, bw); base.closePath();
    add(i, flat(base.getPoints(1), [], 0, 0.62, 0.12, 1), rubber, turn(0, 0, 0, px, pz));
    for (const s of [-1, 1]) add(i, box(0.9, 0.18, 1.6), copper, turn(0, 0.09, s * (CAP.r + 0.45), px, pz));
  }
  await pause();

  // The fan header: a base, a friction wall behind the pins, four pins with pointed tips.
  const iFan = part({ kind: 'round', c: [FAN.x, 3, FAN.z], r: 6 });
  {
    add(iFan, rbox(10.2, 2.4, 2.6, 0.25, 2), plastic, at(FAN.x, 1.2, FAN.z + 0.4));
    add(iFan, rbox(10.2, 5.9, 0.85, 0.25, 2), plastic, at(FAN.x, 2.95, FAN.z - 2.35));
    add(iFan, rbox(3.2, 4.4, 0.6, 0.2, 2), plastic, at(FAN.x - 1.27, 2.6, FAN.z - 1.75));
    for (let k = 0; k < 4; k++) {
      const x = FAN.x - 3.81 + k * FAN.pitch;
      add(iFan, box(0.64, 7.4, 0.64), copper, at(x, 3.7, FAN.z + 0.4));
      const tip = new THREE.ConeGeometry(0.45, 0.6, 4); tip.rotateY(Math.PI / 4);
      add(iFan, tip, copper, at(x, 7.7, FAN.z + 0.4));
    }
  }

  // Chips: the clock chip with gull wing leads, the controller, the flash with its eight legs.
  const gull = (i: number, x: number, z: number, a: number, top: number, out: number, step: number, pitch: number, n: number, side: number) => {
    const lead = (p: Vec3, r: Vec3, s: Vec3) => add(i, box(1, 1, 1), copper, xf({ p, r, s }));
    for (let k = 0; k < n; k++) {
      const t = (k - (n - 1) / 2) * pitch;
      const dir = side * Math.PI / 2;
      const ca = Math.cos(dir + a), sa = Math.sin(dir + a);
      const pos = (r: number, y: number): Vec3 => [x + ca * r - sa * t, y, z + sa * r + ca * t];
      lead(pos(out + 0.25, top), [0, -(dir + a), 0], [0.6, 0.16, 0.22]);
      lead(pos(out + 0.62, top / 2 + 0.05), [0, -(dir + a), -1.1], [0.95, 0.16, 0.22]);
      lead(pos(out + 0.62 + step, 0.08), [0, -(dir + a), 0], [0.62, 0.16, 0.22]);
    }
  };
  const iQfp = part({ kind: 'round', c: [QFP.x, 1, QFP.z], r: 6 });
  add(iQfp, printed(rbox(QFP.w, 1.3, QFP.w, 0.16, 1), 'qfp', QFP.w, QFP.w), epoxy, at(QFP.x, 0.3 + 0.65, QFP.z));
  for (let s = 0; s < 4; s++) gull(iQfp, QFP.x, QFP.z, 0, 0.92, QFP.w / 2, 0.42, 0.5, 12, s);
  const iQfn = part({ kind: 'round', c: [QFN.x, 0.5, QFN.z], r: 4 });
  add(iQfn, printed(rbox(QFN.w, 0.85, QFN.w, 0.08, 1), 'qfn', QFN.w, QFN.w), epoxy, at(QFN.x, 0.43, QFN.z));
  for (let s = 0; s < 4; s++) for (let k = 0; k < 10; k++) {
    const t = -2.25 + k * 0.5, o = QFN.w / 2 + 0.01;
    const [dx, dz] = s === 0 ? [t, -o] : s === 1 ? [o, t] : s === 2 ? [-t, o] : [-o, -t];
    add(iQfn, box(s % 2 ? 0.08 : 0.24, 0.2, s % 2 ? 0.24 : 0.08), copper, at(QFN.x + dx, 0.1, QFN.z + dz));
  }
  const iSoic = part({ kind: 'round', c: [SOIC.x, 0.8, SOIC.z], r: 4 });
  add(iSoic, printed(rbox(4.9, 1.45, 3.9, 0.14, 1), 'soic', 4.9, 3.9), epoxy, at(SOIC.x, 0.2 + 0.72, SOIC.z));
  for (const s of [1, 3]) gull(iSoic, SOIC.x, SOIC.z, Math.PI / 2, 0.85, 1.95, 0.55, 1.27, 4, s);
  const iLed = part({ kind: 'round', c: [LED.x, 0.4, LED.z], r: 2 });
  add(iLed, box(1.0, 0.55, 0.8), ledM, at(LED.x, 0.3, LED.z));
  for (const s of [-1, 1]) add(iLed, box(0.32, 0.58, 0.82), copper, at(LED.x + s * 0.64, 0.3, LED.z));
  await pause();

  // The small parts, a run at a time.
  const smalls = smallParts();
  const groups = new Map<number, number>();
  for (const p of smalls) {
    if (!groups.has(p.group)) groups.set(p.group, part({ kind: 'round', c: [p.x, 0.4, p.z], r: 6 }));
    const i = groups.get(p.group)!;
    const [w, h, d] = SMALL_SIZE[p.kind];
    const ry = p.turn ? Math.PI / 2 : 0;
    const res = p.kind.endsWith('r');
    const bodyG = res ? printed(box(w * 0.62, h, d), 'res', w * 0.62, d) : box(w * 0.62, h * 0.96, d * 0.96);
    add(i, bodyG, res ? epoxy : ceramic, xf({ p: [p.x, h / 2 + 0.02, p.z], r: [0, ry, 0] }));
    for (const s of [-1, 1]) {
      const ex = s * (w / 2 - w * 0.1);
      add(i, box(w * 0.2, h, d), copper, xf({ p: [p.x + (p.turn ? 0 : ex), h / 2 + 0.02, p.z + (p.turn ? -ex : 0)], r: [0, ry, 0] }));
    }
  }
  // Group centres: the middle of each run, so it flies to where it lands.
  for (const [g, i] of groups) {
    const ps = smalls.filter((p) => p.group === g);
    parts[i].c = [ps.reduce((s, p) => s + p.x, 0) / ps.length, 0.4, ps.reduce((s, p) => s + p.z, 0) / ps.length];
  }
  await pause();

  const meshes = b.build(root, 'cpu');
  const depth = depthMaterial(u);
  for (const m of meshes) { m.customDepthMaterial = depth; m.frustumCulled = false; }

  // The board's soft contact shadow, moving with the board.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), shadowMaterial(u));
  {
    const g = shadow.geometry;
    g.rotateX(-Math.PI / 2);
    g.translate(0, -BOARD.thick - 0.05, 0);
    g.setAttribute('cell', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 4), 4));
    shadow.frustumCulled = false;
    shadow.renderOrder = -1;
    shadow.userData.noWire = true;
    root.add(shadow);
  }
  return { root, parts, u, meshes, shadow, led, contacts };
}

// The board: solder mask over copper. Traces and planes show through the mask as a lighter, raised tone; pads and
// rings are bare copper; the ink is a warm pale; the cut edge shows the layers; the plated holes are copper.
function boardMaterial(u: Shared, art: THREE.Texture): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: shade('bg', 0.9), roughness: 0.85, clearcoat: 0.22, clearcoatRoughness: 0.16, metalness: 0 });
  m.name = 'cpuBoard';
  m.envMapIntensity = 0.4;
  m.specularIntensity = 0.05;
  const holes = HOLES.map(([x, z]) => `vec2(${x.toFixed(1)}, ${z.toFixed(1)})`).join(', ');
  const own = {
    head: /* glsl */ `
uniform sampler2D uArt;
vec2 cpuBuv(vec2 o){ return (vObj.xz + o + 55.0) / 110.0; }
float cpuTop(){ return step(0.5, vObjN.y); }
float cpuHole(){ const vec2 H[4] = vec2[4](${holes}); float d = 1e3; for (int i = 0; i < 4; i++) d = min(d, length(vObj.xz - H[i])); return step(d, ${(HOLE.r + 0.25).toFixed(2)}) * (1.0 - cpuTop()); }
// The cut edge: mask, copper layers in a core of glass and resin, mask.
float cpuLayer(){ float y = -vObj.y; float w = max(fwidth(y), 0.012);
  float k = 0.0; for (int i = 0; i < 6; i++){ float c = (i == 0 ? 0.045 : i == 5 ? 1.555 : 0.2 + float(i - 1) * 0.3); k = max(k, 1.0 - smoothstep(0.022, 0.022 + w, abs(y - c))); } return k; }
float cpuEdgeMask(){ float y = -vObj.y; return 1.0 - smoothstep(0.02, 0.04, y) * smoothstep(1.58, 1.56, y); }`,
    color: /* glsl */ `
  vec4 cpuA = texture2D(uArt, cpuBuv(vec2(0.0)));
  vec4 cpuP = texture2D(uPulse, cpuBuv(vec2(0.0)));
  float cpuT = cpuTop();
  float cpuCu = cpuA.r * cpuT, cpuSilk = cpuA.g * cpuT, cpuPad = cpuA.b * cpuT;
  vec3 cpuCol = diffuseColor.rgb;
  cpuCol = mix(cpuCol, cpuCol * 1.3 + ${lin(hex('copper'))} * 0.022, cpuCu);
  cpuCol *= 1.0 - 0.5 * cpuP.a * cpuSeat * cpuT;
  cpuCol = mix(cpuCol, ${lin(shade('text-3', 0.92))}, cpuSilk);
  float cpuEdge = 1.0 - cpuT - cpuHole();
  float cpuLay = cpuLayer() * cpuEdge * step(abs(vObjN.y), 0.5);
  vec3 core = ${lin(shade('bronze-deep', 0.95))} * (0.85 + 0.15 * sin((vObj.x + vObj.z) * 9.0 + vObj.y * 31.0) * sin((vObj.x - vObj.z) * 23.0));
  cpuCol = mix(cpuCol, core, cpuEdge * (1.0 - cpuEdgeMask()) * step(abs(vObjN.y), 0.5));
  float cpuMet = max(max(cpuPad, cpuLay), cpuHole());
  cpuCol = mix(cpuCol, ${lin(shade('copper', 0.72))}, cpuMet);`,
    rough: 'roughnessFactor = mix(roughnessFactor, 0.72, cpuSilk); roughnessFactor = mix(roughnessFactor, 0.42, cpuMet);',
    metal: 'metalnessFactor = cpuMet;',
    normal: /* glsl */ `
  if (cpuT > 0.5) {
    float e = 0.07;
    vec4 ax0 = texture2D(uArt, cpuBuv(vec2(-e, 0.0))), ax1 = texture2D(uArt, cpuBuv(vec2(e, 0.0)));
    vec4 az0 = texture2D(uArt, cpuBuv(vec2(0.0, -e))), az1 = texture2D(uArt, cpuBuv(vec2(0.0, e)));
    float gx = dot(ax1.rgb - ax0.rgb, vec3(0.5, 0.35, 0.2)), gz = dot(az1.rgb - az0.rgb, vec3(0.5, 0.35, 0.2));
    vec3 axZ = normalize(cross(vAxX, vAxY));
    normal = normalize(normal - (gx * vAxX + gz * axZ) * 0.22);
  }`,
    emissive: /* glsl */ `
  if (uGlow > 0.001 && cpuT > 0.5) {
    float g = 0.0;
    if (cpuP.r > 0.08) g += cpuWave(cpuP.g / cpuP.r, floor(cpuP.b / cpuP.r * 8.0)) * cpuA.r * min(1.0, cpuP.r * 1.4) * 1.7;
    vec4 ph = textureLod(uPulse, cpuBuv(vec2(0.0)), 2.6);
    if (ph.r > 0.03) g += cpuWave(ph.g / ph.r, floor(ph.b / ph.r * 8.0)) * ph.r * 0.6;
    g = min(g, 1.12) * uGlow;
    totalEmissiveRadiance += cpuRamp(g) * g * 2.9;
  }`,
  };
  const ch = partChunks(own, { bounce: false });
  ch.head = `uniform float uSeat;\nfloat cpuSeat = 1.0;\n${ch.head}`;
  ch.color = `cpuSeat = uSeat;\n${ch.color}`;
  const out = shadeBoard(m, ch);
  out.userData.uniforms = { ...u, uArt: { value: art }, uSeat: { value: 1 } };
  return out;
}

// The board is not a metal() or dielectric(), so it is wired to the same chunks by hand.
function shadeBoard(m: THREE.MeshPhysicalMaterial, c: ReturnType<typeof partChunks>): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms ?? {});
    const pre = 'varying vec3 vObj;\nvarying vec3 vObjN;\nvarying vec3 vAxX;\nvarying vec3 vAxY;';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${pre}\n${c.vhead}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObj = position;\nvObjN = normal;\nvAxX = normalize(mat3(modelViewMatrix) * vec3(1.0, 0.0, 0.0));\nvAxY = normalize(mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0));\n${c.vert}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${pre}\n${c.head}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${c.color}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${c.rough}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${c.metal}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${c.normal}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${c.emissive}`);
  };
  m.customProgramCacheKey = () => 'cpu-board';
  return m;
}

// A soft dark square under the board that fades out a little beyond its edge.
function shadowMaterial(u: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uShadow: { value: 1 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
${'attribute vec4 cell;\nuniform highp sampler2D uParts;\nvarying vec3 vCpuP;\nvarying vec4 vReveal;'}
void main(){
  vReveal = texelFetch(uParts, ivec2(4, 0), 0);
  vec4 r0 = texelFetch(uParts, ivec2(0, 0), 0), r1 = texelFetch(uParts, ivec2(1, 0), 0), r2 = texelFetch(uParts, ivec2(2, 0), 0);
  vec3 q = position;
  vec3 p = vec3(dot(r0.xyz, q) + r0.w, dot(r1.xyz, q) + r1.w, dot(r2.xyz, q) + r2.w);
  vCpuP = q;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */ `
uniform float uBandOn, uShadow;
uniform vec4 uBand;
varying vec3 vCpuP;
varying vec4 vReveal;
void main(){
  if (uBandOn > 0.5 && length(vCpuP.xz - uBand.xy) > uBand.z) discard;
  if (vReveal.w < 9e4 && length(vCpuP.xz - vReveal.xz) > vReveal.w) discard;
  vec2 q = abs(vCpuP.xz) - vec2(${(BOARD.half - 4).toFixed(1)});
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 4.0;
  float a = (1.0 - smoothstep(-3.0, 10.0, sd)) * 0.72 * uShadow;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
}
