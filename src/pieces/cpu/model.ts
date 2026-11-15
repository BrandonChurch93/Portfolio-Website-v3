import * as THREE from 'three';
import { Builder, at, lathe, pause, rbox, seeded, xf, type Vec3 } from '../../world/build';
import { circle, rounded, rrect, slab, type V } from '../../world/shape';
import { dielectric, lin, metal } from '../../world/surface';
import { hex } from '../../config/palette';
import { ETCH_MM, PULSE_PX, boardArt, lidEtch, printSheet, printUv, smallParts, type PrintCell } from './art';
import {
  BODY, BOARD, CAP, CHOKE, DEG, EPS, FAN, FRAME, HOLE, HOLES, IHS, LED, LEVER, MOS, PHASES, PKG, PLATE, QFN, QFP, SCREWS, SHOULDER,
  SMALL_SIZE, SOCKET, SOIC, STRIKE, U44, XTAL, DBG, type P2,
} from './layout';
import { partChunks, shared, depthMaterial, type Shared } from './shading';

// The processor in its socket on a square of board, in millimetres under a root scaled by 0.001. Every part is
// merged by material with the others, and carries its own number so the shaders can move it alone.
//
// Only copper is orange: the lid, the capacitors' cans, the pads, pins and traces. The steel is grey beside it, the
// mask is near black, ferrite is charcoal, plastic is a flat dark and the ink is a pale cream. That is what tells the
// materials apart without a label, as black, white and metal do in the PC Builder's parts.

export type Kind = 'board' | 'frame' | 'body' | 'cpu' | 'plate' | 'lever' | 'round';
export interface PartDef {
  kind: Kind;
  // Where it sits, and about how large it is.
  c: Vec3;
  r: number;
  // A part that swings shut on a hinge: a point on the axis, the axis, and how far open it stands.
  hinge?: { p: Vec3; d: Vec3; open: number };
  // The row it comes home with, for the parts round the socket.
  row?: string;
  // Its extent at rest, filled in as it is built.
  lo: Vec3;
  hi: Vec3;
}

export interface CpuModel {
  root: THREE.Group;
  parts: PartDef[];
  u: Shared;
  meshes: THREE.Mesh[];
  shadow: THREE.Mesh;
  led: THREE.MeshStandardMaterial;
}

const shade = (name: Parameters<typeof hex>[0], k: number) => new THREE.Color(hex(name)).multiplyScalar(k).getHex();
const S = (p: P2, y = 0): Vec3 => [p[0] + SOCKET.x, y, p[1] + SOCKET.z];
// Tarnish on copper goes brown; on steel it only darkens.
const BROWN: [number, number, number] = [0.72, 0.62, 0.55];
const GREY: [number, number, number] = [0.86, 0.86, 0.86];

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
    const r = Math.min(rc, v[i].distanceTo(v[i - 1]) * 0.45, v[i + 1].distanceTo(v[i]) * 0.45);
    const p0 = v[i].clone().addScaledVector(a, -r), p1 = v[i].clone().addScaledVector(b, r);
    path.add(new THREE.LineCurve3(from, p0));
    path.add(new THREE.QuadraticBezierCurve3(p0, v[i].clone(), p1));
    from = p1;
  }
  path.add(new THREE.LineCurve3(from, v[v.length - 1]));
  return path;
}

// A strip of sheet steel bent along a path in a plane across x: the hook a lever clips under. The path is (z, y)
// points, the strip is w wide along x and t thick.
function strap(path: P2[], w: number, t: number, segs = 8): THREE.BufferGeometry {
  let pts: P2[] = [];
  for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < segs; k++) {
    const a = path[i], b = path[i + 1], f = k / segs;
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  pts.push(path[path.length - 1]);
  // Corners rounded by averaging, so the strip bends and does not fold.
  for (let pass = 0; pass < 4; pass++) pts = pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [(pts[i - 1][0] + 2 * p[0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * p[1] + pts[i + 1][1]) / 4]));
  const pos: number[] = [], idx: number[] = [];
  const ring = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy) || 1;
    const nz = -dy / l, ny = dz / l;
    return [[-w / 2, -1], [w / 2, -1], [w / 2, 1], [-w / 2, 1]].map(([x, s]) => [x, p[1] + ny * s * t / 2, p[0] + nz * s * t / 2]);
  });
  ring.forEach((r) => r.forEach((v) => pos.push(...v)));
  for (let i = 0; i < ring.length - 1; i++) for (let e = 0; e < 4; e++) {
    const a = i * 4 + e, b = i * 4 + ((e + 1) % 4), c = a + 4, d = b + 4;
    idx.push(a, c, b, b, c, d);
  }
  const last = (ring.length - 1) * 4;
  idx.push(0, 1, 2, 0, 2, 3, last, last + 2, last + 1, last, last + 3, last + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flatG = g.toNonIndexed();
  flatG.computeVertexNormals();
  return flatG;
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
  const ink = (base: THREE.MeshPhysicalMaterial) => {
    base.defines = { ...(base.defines ?? {}), USE_UV: '' };
    base.userData.uniforms = { ...u, uPrint: { value: printTex } };
    return base;
  };
  // Ink is a pale cream on every part; on a metal it is not metal.
  const inkChunks = (metalInk: boolean, own: { emissive?: string } = {}) => partChunks({
    head: 'uniform sampler2D uPrint;',
    color: `vec4 cpuPr = texture2D(uPrint, vUv) * step(0.95, vObjN.y);\n  diffuseColor.rgb = mix(diffuseColor.rgb, ${lin(shade('text-2', 0.82))}, cpuPr.r);\n  diffuseColor.rgb *= 1.0 - 0.75 * cpuPr.g;`,
    rough: 'roughnessFactor = mix(roughnessFactor, 0.8, cpuPr.r);',
    ...(metalInk ? { metal: 'metalnessFactor = mix(metalnessFactor, 0.0, cpuPr.r);' } : {}),
    ...own,
  });
  // Steel worn back to bright metal on its edges and corners.
  const wear = partChunks({
    head: `float cpuWear(){ float k = 1.0 - abs(vObjN.y); float bev = smoothstep(0.06, 0.3, k) * (1.0 - smoothstep(0.7, 0.96, k)); return bev * (0.3 + 0.7 * smoothstep(0.34, 0.64, wFbm(vObj * 0.8 + 5.0))); }`,
    color: `diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.5 + ${lin(hex('bronze'))} * 0.04, cpuWear() * 0.6);`,
    rough: 'roughnessFactor = mix(roughnessFactor, 0.16, cpuWear());',
  }, { bounce: false });
  const steel = metal({ name: 'cpuSteel', color: shade('text', 0.52), rough: 0.34, brush: 'x', tarnish: 0.18, patina: GREY, extra: wear });
  steel.userData.uniforms = u;
  // The lever's own steel: drawn from the same metal, a little brighter where it has been handled.
  const leverSteel = metal({ name: 'cpuLever', color: shade('text', 0.56), rough: 0.26, brush: 'z', tarnish: 0.12, patina: GREY, extra: partChunks({}, { bounce: false }) });
  leverSteel.userData.uniforms = u;
  const etch = lidEtch();
  const lidC = `vec2(${SOCKET.x.toFixed(2)}, ${SOCKET.z.toFixed(2)})`;
  // The lid: copper, brushed along its length. The brushing is fine lines of roughness, which show in what the lid
  // mirrors, and it carries the lamp's highlight out as a streak across it. The laser marks are dark and dull.
  const lid = metal({
    name: 'cpuLid', color: shade('copper', 1.0), rough: 0.075, brush: 'x', aniso: 0.2, anisoRot: Math.PI / 2, tarnish: 0.08, patina: BROWN,
    extra: partChunks({
      head: `uniform sampler2D uEtch;
float cpuEtch(vec2 o){ if (vObjN.y < 0.99 || vObj.y < ${(IHS.y2 - 0.02).toFixed(2)}) return 0.0; return texture2D(uEtch, (vObj.xz + o - ${lidC}) / ${ETCH_MM.toFixed(1)} + 0.5).r; }
float cpuLines(){ float px = length(fwidth(vObj.xz)); float a = 1.0 - smoothstep(0.012, 0.05, px), b = 1.0 - smoothstep(0.03, 0.12, px);
  return (wNoise(vec3(vObj.x * 0.9, vObj.z * 46.0, 1.0)) - 0.5) * a + (wNoise(vec3(vObj.x * 0.35, vObj.z * 14.0, 4.0)) - 0.5) * b * 0.35; }`,
      color: 'float cpuEt = cpuEtch(vec2(0.0));\n  float cpuLn = cpuLines();\n  diffuseColor.rgb *= (1.0 - 0.93 * cpuEt) * (1.0 + 0.1 * cpuLn);',
      rough: 'roughnessFactor = clamp(roughnessFactor + 0.07 * cpuLn, 0.06, 1.0); roughnessFactor = mix(roughnessFactor, 0.4, cpuEt);',
      normal: `{ float e = 0.03; float gx = cpuEtch(vec2(e, 0.0)) - cpuEtch(vec2(-e, 0.0)); float gz = cpuEtch(vec2(0.0, e)) - cpuEtch(vec2(0.0, -e)); vec3 axZ = normalize(cross(vAxX, vAxY)); normal = normalize(normal + (gx * vAxX + gz * axZ) * 0.3); }`,
    }),
  });
  lid.userData.uniforms = { ...u, uEtch: { value: etch } };
  lid.envMapIntensity = 0.5;
  const copper = metal({ name: 'cpuCopper', color: shade('copper', 0.8), rough: 0.36, tarnish: 0.2, patina: BROWN, extra: partChunks() });
  copper.userData.uniforms = u;
  const contacts = metal({
    name: 'cpuContacts', color: shade('copper', 0.85), rough: 0.4,
    extra: partChunks({ emissive: 'totalEmissiveRadiance += cpuRamp(cpuSeam(vCpuP)) * cpuSeam(vCpuP) * 0.45;' }, { bounce: false }),
  });
  contacts.userData.uniforms = u;
  const can = ink(metal({ name: 'cpuCan', color: shade('copper', 0.82), rough: 0.24, brush: 'radial-z', tarnish: 0.12, patina: BROWN, extra: inkChunks(true) }));
  const plastic = dielectric('cpuPlastic', shade('text', 0.075), 0.7, { vary: 0.06, scale: 0.5, extra: partChunks() });
  plastic.userData.uniforms = u;
  plastic.specularIntensity = 0.4;
  // The socket's body takes the seam's light on its inner wall.
  const body = dielectric('cpuBody', shade('text', 0.085), 0.62, { vary: 0.05, scale: 0.5, extra: partChunks({ emissive: 'totalEmissiveRadiance += cpuRamp(cpuSeam(vCpuP)) * cpuSeam(vCpuP) * 1.5;' }) });
  body.userData.uniforms = u;
  body.specularIntensity = 0.45;
  const ferrite = ink(dielectric('cpuFerrite', shade('text', 0.17), 0.9, { vary: 0.14, scale: 1.6, extra: inkChunks(false) }));
  ferrite.specularIntensity = 0.18;
  const epoxy = ink(dielectric('cpuEpoxy', shade('text', 0.07), 0.5, { vary: 0.05, scale: 0.9, extra: inkChunks(false) }));
  epoxy.specularIntensity = 0.45;
  // The processor's substrate, the site's dark where a real one is green, with the seam's light on its edge.
  const substrate = dielectric('cpuSubstrate', shade('bronze-deep', 0.46), 0.5, { coat: 0.2, vary: 0.05, scale: 0.4, extra: partChunks({ emissive: 'totalEmissiveRadiance += cpuRamp(cpuSeam(vCpuP)) * cpuSeam(vCpuP) * 0.7;' }) });
  substrate.userData.uniforms = u;
  const ceramic = dielectric('cpuCeramic', shade('text-3', 0.42), 0.6, { vary: 0.12, scale: 2.0, extra: partChunks() });
  ceramic.userData.uniforms = u;
  const rubber = dielectric('cpuRubber', shade('text', 0.05), 0.86, { vary: 0.08, extra: partChunks() });
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
  const part = (d: Omit<PartDef, 'lo' | 'hi'>) => { parts.push({ ...d, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }); return parts.length - 1; };
  const inked = new Set<THREE.Material>([can, ferrite, epoxy]);
  const add = (i: number, geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) => {
    const hasInk = !!geo.userData.printed;
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    g.computeBoundingBox();
    const bb = g.boundingBox!, pd = parts[i];
    for (let k = 0; k < 3; k++) { pd.lo[k] = Math.min(pd.lo[k], bb.min.getComponent(k)); pd.hi[k] = Math.max(pd.hi[k], bb.max.getComponent(k)); }
    if (inked.has(mat) && !hasInk) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) cell[k * 4 + 3] = i;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    b.add(g, mat);
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  // The board, as the jagged tiles it is struck from, with its plated holes.
  for (const tile of boardTiles()) {
    const i = part({ kind: 'board', c: [tile.c[0], -0.8, tile.c[1]], r: tile.r });
    const holes = HOLES.filter((h) => inside(h, tile.outline));
    add(i, flat(flip(tile.outline.map(([x, z]) => new THREE.Vector2(x, z))), holes.map(([x, z]) => flip(circle(x, z, HOLE.r, 48))), -BOARD.thick, 0, 0), board);
    // The plating stands a hair proud of the mask round each hole, and its edge catches the light.
    for (const [hx, hz] of holes) add(i, flat(flip(circle(hx, hz, HOLE.ring, 64)), [flip(circle(hx, hz, HOLE.r, 48))], 0, 0.05, 0.02, 1), copper);
  }
  await pause();

  // The socket's frame, screwed down, with the hinge's lugs and pin, the lever's bearings and hook, the shoulder screw.
  const iFrame = part({ kind: 'frame', c: S([0, 0], 0.6), r: 34 });
  {
    const out = rounded(rrect(0, 0, FRAME.out[0] * 2, FRAME.out[1] * 2, 2.4));
    const inner = rounded(rrect(0, 0, BODY.out[0] * 2 + 0.6, BODY.out[1] * 2 + 0.6, 1.0));
    add(iFrame, flat(flip(out), [flip(inner)], 0, FRAME.t, 0.2, 2), steel, at(SOCKET.x, 0, SOCKET.z));
    for (const sz of [-1, 1]) add(iFrame, rbox(40, 0.5, 1.2, 0.24, 2), steel, at(SOCKET.x, FRAME.t + 0.1, SOCKET.z + sz * (FRAME.out[1] - 1.5)));
    const [hx, hy] = PLATE.hinge;
    for (const [z0, z1] of [[-16.6, -14.5], [-4.3, 4.3], [14.5, 16.6]]) {
      const lug = slab(rounded([[hx - 1.4, 0, 0.2], [hx + 1.4, 0, 0.2], [hx + 1.4, hy + 0.6, 1.25], [hx - 1.4, hy + 0.6, 1.25]] as V[]), [circle(hx, hy, 0.62, 20)], z0, z1, 0.14, 2);
      add(iFrame, lug, steel, at(SOCKET.x, 0, SOCKET.z));
    }
    const pin = new THREE.CylinderGeometry(0.6, 0.6, 34.2, 20); pin.rotateX(Math.PI / 2);
    add(iFrame, pin, steel, at(...S([hx, 0], hy)));
    for (const sz of [-1, 1]) { const head = new THREE.CylinderGeometry(0.95, 0.95, 0.5, 24); head.rotateX(Math.PI / 2); add(iFrame, head, steel, at(...S([hx, sz * 17.35], hy))); }
    // The two bearings the lever's axle turns in, each a rolled sleeve on a foot.
    for (const bz of [LEVER.axle + 2.4, LEVER.z - 4.2]) {
      const sleeve = new THREE.CylinderGeometry(1.5, 1.5, 3.2, 28, 1, true); sleeve.rotateX(Math.PI / 2);
      add(iFrame, sleeve, steel, at(...S([LEVER.x1, bz], LEVER.y)));
      add(iFrame, rbox(2.8, LEVER.y, 3.2, 0.3), steel, at(...S([LEVER.x1 - 0.2, bz], LEVER.y / 2)));
    }
    // The hook the lever clips under: a tab of the frame's steel rising past the arm and curling back over it.
    const hz = FRAME.out[1] - 0.2, rz = LEVER.z, top = LEVER.y + LEVER.r + 0.55;
    const hook = strap([[hz - 0.6, FRAME.t * 0.5], [hz + 0.4, FRAME.t * 0.5], [rz + 1.9, 0.6], [rz + 2.2, top - 0.6], [rz + 1.2, top + 0.2], [rz - 0.4, top + 0.05], [rz - 1.1, top - 0.55]], 2.6, 0.5);
    add(iFrame, hook, steel, at(...S([LEVER.hook, 0], 0)));
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
    add(iBody, flat(flip(out), [flip(cav)], 0, BODY.top, 0.12, 2), body, at(SOCKET.x, 0, SOCKET.z));
    add(iBody, flat(flip(cav), [], 0, BODY.floor, 0), body, at(SOCKET.x, 0, SOCKET.z));
    for (const kx of [-12.2, 9.8]) add(iBody, rbox(1.3, 1.4, 0.8, 0.2), body, at(...S([kx, -(BODY.cav[1] - 0.4)], BODY.floor + 0.7)));
    const pad = box(0.34, 0.1, 0.5), arm = box(0.26, 0.08, 0.72);
    for (const sz of [-1, 1]) for (const [row, shift] of [[19.18, 0], [19.92, 0.45]] as const) for (let k = 0; k < 49; k++) {
      const x = -21.9 + k * 0.9 + shift, z = sz * row;
      add(iBody, pad.clone(), contacts, at(...S([x, z], BODY.floor + 0.05)));
      add(iBody, arm.clone(), contacts, xf({ p: S([x, z - sz * 0.18], BODY.floor + 0.32), r: [sz * 30 * DEG, 0, 0] }));
    }
  }
  await pause();

  // The processor: substrate, the capacitors on its rim, the lid with its wings.
  const iCpu = part({ kind: 'cpu', c: S([0, 0], 3.4), r: 28 });
  {
    add(iCpu, rbox(PKG.hw * 2, PKG.y1 - PKG.y0, PKG.hd * 2, 0.14, 2), substrate, at(...S([0, 0], (PKG.y0 + PKG.y1) / 2)));
    const cbody = box(0.55, 0.42, 0.5), end = box(0.2, 0.44, 0.52);
    for (const sz of [-1, 1]) for (let k = 0; k < 21; k++) {
      const x = -13 + k * 1.3, z = sz * 17.15 + (k % 2 ? 0.55 : -0.55) * sz;
      add(iCpu, cbody.clone(), ceramic, at(...S([x, z], PKG.y1 + 0.21)));
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

  // The load plate, closed: a window for the lid that reaches past its skirt, rails over the long sides, a tongue
  // under the shoulder screw, the knuckles of its hinge, flanges turned down and ribs pressed into its ends.
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
    for (const sx of [-1, 1]) for (const k of [-1, 1]) add(iPlate, rbox(1.3, 0.45, 12.5, 0.2, 2), steel, at(...S([sx * 23.1, k * 9.4], y1 + 0.04)));
    for (const [z0, z1] of [[-14.1, -4.9], [4.9, 14.1]]) {
      const knuckle = new THREE.CylinderGeometry(1.05, 1.05, z1 - z0, 28); knuckle.rotateX(Math.PI / 2);
      add(iPlate, knuckle, steel, at(...S([hx, (z0 + z1) / 2], hy)));
      add(iPlate, rbox(2.2, PLATE.t, z1 - z0, 0.3, 2), steel, at(...S([hx - 1.2, (z0 + z1) / 2], (y0 + y1) / 2)));
    }
    add(iPlate, rbox(9.0, PLATE.t, 2.4, 0.3, 2), steel, at(...S([0, PLATE.out[1] + 0.6], (y0 + y1) / 2)));
  }
  await pause();

  // The lever: an axle across the hinge end turning in its bearings, with a cam that bears on the plate, an elbow,
  // the arm along the front, and the handle bent out to a pressed finger tab.
  const iLever = part({ kind: 'lever', c: S([3, LEVER.z], LEVER.y), r: 26, hinge: { p: S([LEVER.x1, LEVER.z], LEVER.y), d: [0, 0, 1], open: -118 * DEG } });
  {
    const y = LEVER.y, z = LEVER.z, x1 = LEVER.x1, [c0, c1] = LEVER.cam;
    const path = bent([
      S([x1, LEVER.axle], y), S([x1, c0 - 0.8], y), S([x1 - 1.7, c0 + 0.3], y + 0.5), S([x1 - 1.7, c1 - 0.3], y + 0.5), S([x1, c1 + 0.8], y),
      S([x1, z], y), S([LEVER.x0, z], y), S([LEVER.x0, LEVER.handle - 1.6], y + 0.35),
    ], 1.6);
    add(iLever, new THREE.TubeGeometry(path, 320, LEVER.r, 16, false), leverSteel);
    const end = new THREE.SphereGeometry(LEVER.r, 16, 10); end.scale(1, 1, 0.5);
    add(iLever, end, leverSteel, at(...S([x1, LEVER.axle], y)));
    // The finger tab: a pressed blade, bent up a little, with a ridge pressed along it.
    const tab = flat(flip(rounded([[-1.9, -0.6, 0.4], [1.9, -0.6, 0.4], [1.6, 4.8, 1.5], [-1.6, 4.8, 1.5]] as V[])), [], -0.4, 0.4, 0.18, 2);
    add(iLever, tab, leverSteel, xf({ p: S([LEVER.x0, LEVER.handle - 1.6], y + 0.35), r: [8 * DEG, 0, 0] }));
    add(iLever, rbox(0.6, 0.3, 3.4, 0.14, 2), leverSteel, xf({ p: S([LEVER.x0, LEVER.handle + 0.9], y + 0.35 + 0.4 - 2.5 * Math.sin(8 * DEG)), r: [8 * DEG, 0, 0] }));
  }
  await pause();

  // The power header in the corner the stream strikes: eight keyed cavities with a pin in each, a latch ramp.
  const iEps = part({ kind: 'round', c: [EPS.x, EPS.h / 2, EPS.z], r: 10, row: 'eps' });
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

  // The power stages: each choke, its power stage and its capacitor a part of its own.
  for (const [n, ph] of PHASES.entries()) {
    const row = ph.turn ? 'left' : 'top';
    const turn = (x: number, y: number, z: number, cx: number, cz: number) => xf({ p: [cx + (ph.turn ? z : x), y, cz + (ph.turn ? -x : z)], r: [0, ph.turn, 0].map((v) => (v ? Math.PI / 2 : 0)) as Vec3 });
    const [cx, cz] = ph.choke;
    const iChoke = part({ kind: 'round', c: [cx, 2.5, cz], r: 5, row });
    add(iChoke, printed(rbox(CHOKE.w, CHOKE.h, CHOKE.w, 0.5, 2), n % 2 ? 'choke2' : 'choke', CHOKE.w - 0.6, CHOKE.w - 0.6), ferrite, turn(0, 0.22 + CHOKE.h / 2, 0, cx, cz));
    add(iChoke, rbox(CHOKE.w - 0.2, 0.25, CHOKE.w - 0.2, 0.1, 1), rubber, turn(0, 0.12, 0, cx, cz));
    for (const s of [-1, 1]) {
      add(iChoke, box(0.24, 1.7, 3.6), copper, turn(s * (CHOKE.w / 2 + 0.1), 0.85, 0, cx, cz));
      add(iChoke, box(1.2, 0.2, 3.6), copper, turn(s * (CHOKE.w / 2 + 0.45), 0.1, 0, cx, cz));
    }
    const [mx, mz] = ph.mos;
    const iMos = part({ kind: 'round', c: [mx, 0.5, mz], r: 3.5, row });
    add(iMos, printed(rbox(MOS.w, MOS.h, MOS.d, 0.1, 1), 'mos', MOS.w, MOS.d), epoxy, turn(0, 0.06 + MOS.h / 2, 0, mx, mz));
    for (let k = 0; k < 4; k++) add(iMos, box(0.42, 0.22, 0.55), copper, turn(-1.8 + k * 1.2, 0.11, MOS.d / 2 + 0.12, mx, mz));
    add(iMos, box(MOS.w - 0.8, 0.22, 0.5), copper, turn(0, 0.11, -MOS.d / 2 - 0.1, mx, mz));
    const [px, pz] = ph.cap;
    const iCap = part({ kind: 'round', c: [px, 3.5, pz], r: 3.5, row });
    const can0: [number, number][] = [[3.04, 0.62], [3.15, 0.75], [3.15, 1.2], [3.0, 1.38], [2.9, 1.56], [3.0, 1.74], [3.15, 1.92], [3.15, CAP.h - 0.6], [3.12, CAP.h - 0.3], [3.0, CAP.h - 0.1], [2.82, CAP.h - 0.02], [2.6, CAP.h], [0, CAP.h]];
    add(iCap, printed(lathe(can0, 44), 'cap', 5.7, 5.7), can, turn(0, 0, 0, px, pz));
    const base = new THREE.Shape(); const bw = 3.3, ch = 1.0;
    base.moveTo(-bw, -bw); base.lineTo(bw - ch, -bw); base.lineTo(bw, -bw + ch); base.lineTo(bw, bw - ch); base.lineTo(bw - ch, bw); base.lineTo(-bw, bw); base.closePath();
    add(iCap, flat(base.getPoints(1), [], 0, 0.62, 0.12, 1), rubber, turn(0, 0, 0, px, pz));
    for (const s of [-1, 1]) add(iCap, box(0.9, 0.18, 1.6), copper, turn(0, 0.09, s * (CAP.r + 0.45), px, pz));
  }
  await pause();

  // The fan header: a base, a friction wall behind the pins, four pins with pointed tips.
  const iFan = part({ kind: 'round', c: [FAN.x, 3, FAN.z], r: 6, row: 'right' });
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
  const iQfp = part({ kind: 'round', c: [QFP.x, 1, QFP.z], r: 6, row: 'top' });
  add(iQfp, printed(rbox(QFP.w, 1.3, QFP.w, 0.16, 1), 'qfp', QFP.w, QFP.w), epoxy, at(QFP.x, 0.3 + 0.65, QFP.z));
  for (let s = 0; s < 4; s++) gull(iQfp, QFP.x, QFP.z, 0, 0.92, QFP.w / 2, 0.42, 0.5, 12, s);
  const iQfn = part({ kind: 'round', c: [QFN.x, 0.5, QFN.z], r: 4, row: 'left' });
  add(iQfn, printed(rbox(QFN.w, 0.85, QFN.w, 0.08, 1), 'qfn', QFN.w, QFN.w), epoxy, at(QFN.x, 0.43, QFN.z));
  for (let s = 0; s < 4; s++) for (let k = 0; k < 10; k++) {
    const t = -2.25 + k * 0.5, o = QFN.w / 2 + 0.01;
    const [dx, dz] = s === 0 ? [t, -o] : s === 1 ? [o, t] : s === 2 ? [-t, o] : [-o, -t];
    add(iQfn, box(s % 2 ? 0.08 : 0.24, 0.2, s % 2 ? 0.24 : 0.08), copper, at(QFN.x + dx, 0.1, QFN.z + dz));
  }
  const iSoic = part({ kind: 'round', c: [SOIC.x, 0.8, SOIC.z], r: 4, row: 'front' });
  add(iSoic, printed(rbox(4.9, 1.45, 3.9, 0.14, 1), 'soic', 4.9, 3.9), epoxy, at(SOIC.x, 0.2 + 0.72, SOIC.z));
  for (const s of [1, 3]) gull(iSoic, SOIC.x, SOIC.z, Math.PI / 2, 0.85, 1.95, 0.55, 1.27, 4, s);
  const iLed = part({ kind: 'round', c: [LED.x, 0.4, LED.z], r: 2, row: 'eps' });
  add(iLed, box(1.0, 0.55, 0.8), ledM, at(LED.x, 0.3, LED.z));
  for (const s of [-1, 1]) add(iLed, box(0.32, 0.58, 0.82), copper, at(LED.x + s * 0.64, 0.3, LED.z));
  await pause();

  // The lower right: the second controller, its crystal, the debug header.
  const iU44 = part({ kind: 'round', c: [U44.x, 0.5, U44.z], r: 4, row: 'front' });
  add(iU44, printed(rbox(U44.w, 0.85, U44.w, 0.08, 1), 'u44', U44.w, U44.w), epoxy, at(U44.x, 0.43, U44.z));
  for (let s = 0; s < 4; s++) for (let k = 0; k < 12; k++) {
    const t = -2.75 + k * 0.5, o = U44.w / 2 + 0.01;
    const [dx, dz] = s === 0 ? [t, -o] : s === 1 ? [o, t] : s === 2 ? [-t, o] : [-o, -t];
    add(iU44, box(s % 2 ? 0.08 : 0.22, 0.2, s % 2 ? 0.22 : 0.08), copper, at(U44.x + dx, 0.1, U44.z + dz));
  }
  const iXtal = part({ kind: 'round', c: [XTAL.x, 0.6, XTAL.z], r: 3, row: 'right' });
  add(iXtal, rbox(XTAL.w, 0.35, XTAL.d, 0.1, 1), epoxy, at(XTAL.x, 0.18, XTAL.z));
  add(iXtal, rbox(XTAL.w - 0.5, 0.75, XTAL.d - 0.5, 0.18, 2), steel, at(XTAL.x, 0.7, XTAL.z));
  for (const sx of [-1, 1]) add(iXtal, box(0.9, 0.3, XTAL.d * 0.7), copper, at(XTAL.x + sx * (XTAL.w / 2 - 0.2), 0.15, XTAL.z));
  const iDbg = part({ kind: 'round', c: [DBG.x, 2, DBG.z], r: 6, row: 'right' });
  add(iDbg, rbox(DBG.n * DBG.pitch, 2.0, DBG.pitch * 2, 0.2, 2), plastic, at(DBG.x, 1.0, DBG.z));
  for (let i = 0; i < DBG.n; i++) for (const j of [-0.5, 0.5]) {
    const x = DBG.x + (i - (DBG.n - 1) / 2) * DBG.pitch, z = DBG.z + j * DBG.pitch;
    add(iDbg, box(0.5, 5.6, 0.5), copper, at(x, 2.8, z));
    const tip = new THREE.ConeGeometry(0.36, 0.45, 4); tip.rotateY(Math.PI / 4);
    add(iDbg, tip, copper, at(x, 5.82, z));
  }

  // The small parts, each a part of its own.
  for (const p of smallParts()) {
    const i = part({ kind: 'round', c: [p.x, 0.4, p.z], r: 1.2, row: SMALL_ROWS[p.group] });
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
  await pause();

  const meshes = b.build(root, 'cpu');
  const depth = depthMaterial(u);
  for (const m of meshes) { m.customDepthMaterial = depth; m.frustumCulled = false; }

  // The board's soft contact shadow.
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
  return { root, parts, u, meshes, shadow, led };
}

// Which row each run of small parts comes home with.
const SMALL_ROWS = ['top', 'left', 'right', 'right', 'right', 'front', 'front', 'left', 'top', 'front'];

// The board's tiles: a jittered grid of cells cut from the square, one at each mounting hole so no hole is split,
// their shared sides made jagged the same way from both sides so the seams close exactly. Each tile is its outline
// (x, z) going round, its middle and its reach.
export const TILES = { across: 6, jag: 0.9 } as const;
function boardTiles(): { outline: P2[]; c: P2; r: number }[] {
  const H = BOARD.half, n = TILES.across, step = (2 * H) / n, rnd = seeded(2611);
  const seeds: P2[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) seeds.push([-H + (i + 0.5 + (rnd() - 0.5) * 0.7) * step, -H + (j + 0.5 + (rnd() - 0.5) * 0.7) * step]);
  for (const h of HOLES) {
    let best = 0;
    seeds.forEach((s, k) => { if (Math.hypot(s[0] - h[0], s[1] - h[1]) < Math.hypot(seeds[best][0] - h[0], seeds[best][1] - h[1])) best = k; });
    seeds[best] = [h[0], h[1]];
  }
  const key = (p: P2) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const onEdge = (a: P2, b: P2) => [0, 1].some((k) => Math.abs(Math.abs(a[k]) - H) < 1e-3 && Math.abs(a[k] - b[k]) < 1e-3);
  // The points a shared side is broken at, worked out from the side alone, in one order for both its tiles.
  const jag = (a: P2, b: P2): P2[] => {
    const [p, q] = key(a) < key(b) ? [a, b] : [b, a];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l < 2.5) return [];
    let h = 0;
    for (const ch of key(p) + key(q)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = seeded(h);
    const nx = -(q[1] - p[1]) / l, nz = (q[0] - p[0]) / l, amp = Math.min(TILES.jag, l * 0.1), out: P2[] = [];
    const k = l > 12 ? 3 : 2;
    for (let i = 1; i <= k; i++) { const t = i / (k + 1) + (r() - 0.5) * 0.12, o = (r() - 0.5) * 2 * amp; out.push([p[0] + (q[0] - p[0]) * t + nx * o, p[1] + (q[1] - p[1]) * t + nz * o]); }
    return key(a) < key(b) ? out : out.reverse();
  };
  return seeds.map((s) => {
    let poly: P2[] = [[-H, -H], [H, -H], [H, H], [-H, H]];
    for (const o of seeds) {
      if (o === s) continue;
      const mx = (s[0] + o[0]) / 2, mz = (s[1] + o[1]) / 2, dx = o[0] - s[0], dz = o[1] - s[1];
      const side = (p: P2) => (p[0] - mx) * dx + (p[1] - mz) * dz;
      const next: P2[] = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
        if (sa <= 0) next.push(a);
        if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) { const t = sa / (sa - sb); next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      poly = next;
    }
    const outline: P2[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      outline.push(a);
      if (!onEdge(a, b)) outline.push(...jag(a, b));
    }
    const c: P2 = [poly.reduce((t, p) => t + p[0], 0) / poly.length, poly.reduce((t, p) => t + p[1], 0) / poly.length];
    const r = Math.max(...outline.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
    return { outline, c, r };
  });
}

function inside(p: P2, poly: P2[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

// The board: solder mask over copper. Traces and planes show through the mask as a lighter, raised tone; pads and
// rings are bare copper; the ink is a pale cream; the cut edge shows its layers; the plated holes are copper.
function boardMaterial(u: Shared, art: THREE.Texture): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: shade('text', 0.022), roughness: 0.42, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.3 });
  m.name = 'cpuBoard';
  m.envMapIntensity = 0.25;
  m.specularIntensity = 0.26;
  const holes = HOLES.map(([x, z]) => `vec2(${x.toFixed(1)}, ${z.toFixed(1)})`).join(', ');
  const own = {
    head: /* glsl */ `
uniform sampler2D uArt;
vec2 cpuBuv(vec2 o){ return (vObj.xz + o + 55.0) / 110.0; }
float cpuTop(){ return step(0.5, vObjN.y); }
float cpuHole(){ const vec2 H[4] = vec2[4](${holes}); float d = 1e3; for (int i = 0; i < 4; i++) d = min(d, length(vObj.xz - H[i])); return step(d, ${(HOLE.r + 0.25).toFixed(2)}) * (1.0 - cpuTop()); }
// The cut edge: mask, then the board's core of glass and resin with four copper layers through it, then mask.
float cpuLayer(){ float y = -vObj.y; float w = max(fwidth(y) * 0.8, 0.018);
  float k = 0.0; for (int i = 0; i < 4; i++){ float c = 0.12 + float(i) * 0.45; k = max(k, 1.0 - smoothstep(0.03, 0.03 + w, abs(y - c))); } return k; }
float cpuEdgeMask(){ float y = -vObj.y; return 1.0 - smoothstep(0.03, 0.06, y) * smoothstep(1.57, 1.54, y); }`,
    color: /* glsl */ `
  vec4 cpuA = texture2D(uArt, cpuBuv(vec2(0.0)));
  float cpuT = cpuTop();
  float cpuCu = cpuA.r * cpuT, cpuSilk = cpuA.g * cpuT, cpuPad = cpuA.b * cpuT;
  vec3 cpuCol = diffuseColor.rgb;
  cpuCol = mix(cpuCol, cpuCol * 1.4 + ${lin(hex('copper'))} * 0.07, cpuCu);
  cpuCol = mix(cpuCol, ${lin(shade('text-2', 0.86))}, cpuSilk);
  float cpuSide = step(abs(vObjN.y), 0.5);
  float cpuEdge = (1.0 - cpuT - cpuHole()) * cpuSide;
  float cpuLay = cpuLayer() * cpuEdge * (1.0 - cpuEdgeMask());
  vec3 core = ${lin(shade('text-3', 0.62))} * (0.82 + 0.18 * sin((vObj.x + vObj.z) * 9.0 + vObj.y * 31.0) * sin((vObj.x - vObj.z) * 23.0));
  cpuCol = mix(cpuCol, core, cpuEdge * (1.0 - cpuEdgeMask()));
  float cpuMet = max(max(cpuPad, cpuLay), cpuHole());
  cpuCol = mix(cpuCol, ${lin(shade('copper', 0.8))}, cpuMet);
  diffuseColor.rgb = cpuCol;`,
    rough: 'roughnessFactor = mix(roughnessFactor, 0.8, cpuSilk); roughnessFactor = mix(roughnessFactor, 0.62, cpuEdge); roughnessFactor = mix(roughnessFactor, 0.34, cpuMet);',
    metal: 'metalnessFactor = cpuMet;',
    normal: /* glsl */ `
  if (cpuT > 0.5) {
    float e = 0.07;
    vec4 ax0 = texture2D(uArt, cpuBuv(vec2(-e, 0.0))), ax1 = texture2D(uArt, cpuBuv(vec2(e, 0.0)));
    vec4 az0 = texture2D(uArt, cpuBuv(vec2(0.0, -e))), az1 = texture2D(uArt, cpuBuv(vec2(0.0, e)));
    float gx = dot(ax1.rgb - ax0.rgb, vec3(0.5, 0.35, 0.2)), gz = dot(az1.rgb - az0.rgb, vec3(0.5, 0.35, 0.2));
    vec3 axZ = normalize(cross(vAxX, vAxY));
    normal = normalize(normal - (gx * vAxX + gz * axZ) * 1.0);
  }`,
    emissive: /* glsl */ `
  if (uGlow > 0.001 && cpuT > 0.5) {
    // Each bundle its own beat: the bundle and the distance out are read from the one texel this point covers.
    vec2 cpuUv = cpuBuv(vec2(0.0));
    vec4 cpuT1 = texelFetch(uPulse, ivec2(cpuUv * ${PULSE_PX}.0), 0);
    if (cpuT1.r > 0.5) {
      float d = cpuT1.g / cpuT1.r, bun = floor(floor(cpuT1.b / cpuT1.r * 127.5 + 0.5) / 16.0);
      // Up close each trace carries its own light. Small, where a trace is finer than a pixel, the light covers
      // the bundle it runs in, so it can still be seen running.
      cpuFar = smoothstep(0.2, 0.46, length(fwidth(vObj.xz)));
      float mask = mix(cpuA.r, 1.0, cpuFar);
      float g = min(cpuWave(d, bun) * mask * (1.0 + 0.8 * cpuFar), mix(1.25, 0.72, cpuFar)) * uGlow;
      totalEmissiveRadiance += cpuRamp(g) * g * (2.6 - 1.3 * cpuFar);
    }
  }`,
  };
  const ch = partChunks(own, { bounce: false });
  const out = shadeBoard(m, ch);
  out.userData.uniforms = { ...u, uArt: { value: art } };
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

// A soft dark square under the board that fades out a little beyond its edge. Its shade comes and goes with the
// board, as the tiles land and as the band uncovers it.
function shadowMaterial(u: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uShadow: { value: 1 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
varying vec3 vCpuP;
void main(){
  vCpuP = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: /* glsl */ `
uniform float uBandOn, uShadow;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vCpuP;
vec2 cpuOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
void main(){
  if (uBandOn > 0.5 && length(cpuOnBoard(vCpuP) - uBand.xy) > uBand.z) discard;
  vec2 q = abs(vCpuP.xz) - vec2(${(BOARD.half - 4).toFixed(1)});
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 4.0;
  float a = (1.0 - smoothstep(-3.0, 10.0, sd)) * 0.72 * uShadow;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
}

export const STRIKE_AT: Vec3 = [STRIKE.x, STRIKE.y, STRIKE.z];
