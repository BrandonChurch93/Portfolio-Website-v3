import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { Builder, at, rbox } from '../../../world/build';
import { metal } from '../../../world/surface';
import { DESK } from '../layout';
import type { PartFactory } from '../part';
import { SoundBuilder, loftBar, outline, peg, runX, screwHead, stoppedPost } from './bench/forms';
import { KNOB_RIM, knobBody, knobFace, rosetteMap } from './bench/knob';
import { grain, timber, type Wear } from './bench/timber';

// His bench, A · Bench as he picked it, made as a joiner would make it. A top of four boards, 58 thick, edge joined,
// its ends showing their end grain. Two trestles, each a shaped bearer under the top and a shaped foot on the floor
// with two legs framed between them, the tenons pegged, the legs' arrises chamfered and the chamfers stopped where
// they are framed. A stretcher between the trestles' back legs, its tenons through the legs and held by keys. A case
// of two drawers hung under the top toward the near end, the fronts set into a frame with a shadow gap, each with the
// knob from the sleeping card. A bronze angle over the front edge, screwed, the screws' slots each turned its own way.
// Millimetres, in the desk's frame: the top's surface is y = 0 and its front edge z = 390.

const { W, D, H } = DESK;
const T = 58, FRONT = D / 2, FLOOR = -H;
// The trestles stand just outside the bay for the PC, with nothing of them inside it.
// The legs stand far enough back that the stretcher between the back ones runs behind the bay for the PC.
const TX = 882, LEG = { w: 80, d: 70, z: 315 }, BEARER = { w: 80, h: 85 }, FOOT = { w: 90, h: 60 };
const STRETCH = { y: -540, z: -LEG.z, h: 100, d: 40 };
// The drawer case: from x l to r, its front frame set back from the top's front edge.
const CASE = { l: -720, r: -110, bottom: -200, face: FRONT - 22, stile: 24, mid: 20, top: 16, foot: 22, gap: 3.5, set: 6.5 };
const ANGLE = { top: 22, leg: 36, t: 3 };

// Where the top's four boards meet, across the depth.
const JOINTS = [-201, -4, 197];

function boards(b: Builder, M: THREE.Material): void {
  const edges = [-FRONT, ...JOINTS, FRONT];
  // Where each board's log had its pith, across the grain: far beside a quarter or rift sawn board, whose face shows
  // straight lines, and below the one flat sawn board, whose face rises in a cathedral here and there.
  const pith: [number, number][] = [[-720, 30], [640, -45], [10, -230], [-880, 60]];
  for (let i = 0; i < 4; i++) {
    const z0 = edges[i], z1 = edges[i + 1], zc = (z0 + z1) / 2;
    const back = i === 0 ? 4 : 0, front = i === 3 ? 1 : 0;
    const s = outline([[z0, -T], [z1, -T], [z1, 0], [z0, 0]], [2, 2, front, back], 5);
    b.add(grain(runX(s, -W / 2, W / 2, 2.5), [0.13, 0.52, 0.36, 0.81][i], 'x', zc + pith[i][0], -T / 2 + pith[i][1]), M);
  }
}

function trestle(b: Builder, M: THREE.Material, s: -1 | 1): void {
  const cx = s * TX, k = s > 0 ? 0.5 : 0;
  const bearer = outline([[-382, -T], [382, -T], [382, -T - 26], [362, -T - BEARER.h], [-362, -T - BEARER.h], [-382, -T - 26]], [0, 0, 3, 14, 14, 3], 6);
  b.add(grain(runX(bearer, cx - BEARER.w / 2, cx + BEARER.w / 2, 3), 0.31 + k, 'z', cx + 110, -T - 260), M);
  const top = FLOOR + FOOT.h;
  const foot = outline([[-388, FLOOR], [-292, FLOOR], [-282, FLOOR + 5], [282, FLOOR + 5], [292, FLOOR], [388, FLOOR], [388, FLOOR + 24], [358, top], [-358, top], [-388, FLOOR + 24]], [1.5, 0, 2, 2, 0, 1.5, 3, 5, 5, 3], 5);
  b.add(grain(runX(foot, cx - FOOT.w / 2, cx + FOOT.w / 2, 3), 0.47 + k, 'z', cx - 140, FLOOR - 160), M);
  for (const z of [-LEG.z, LEG.z]) {
    b.add(grain(stoppedPost(cx, z, top, -T - BEARER.h, LEG.w, LEG.d, 2.5, 9, 64, 18), 0.62 + k + z * 1e-4, 'y', cx + 520 * s, z + 160), M);
    // Two pegs through each joint, a little proud of both faces.
    for (const [y, w] of [[-T - 44, BEARER.w], [FLOOR + 30, FOOT.w]]) for (const dz of [-17, 17]) {
      const g = peg(5, w, 1.6, 0.9).translate(cx, y, z + dz);
      b.add(grain(g, 0.77 + dz * 0.003 + y * 1e-4, 'x', z + dz + 9, y + 6), M);
    }
  }
}

// A mirror turns a geometry inside out: put its faces back the right way round.
function flip(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i += 3) for (let k = 0; k < 3; k++) { const a = p.getComponent(i + 1, k); p.setComponent(i + 1, k, p.getComponent(i + 2, k)); p.setComponent(i + 2, k, a); }
  g.computeVertexNormals();
  return g;
}

function stretcher(b: Builder, M: THREE.Material): void {
  const inner = TX - LEG.w / 2, outer = TX + LEG.w / 2;
  const body = stoppedPost(0, 0, -inner, inner, STRETCH.h, STRETCH.d, 2.5, 8, 50, 16).rotateZ(-Math.PI / 2).translate(0, STRETCH.y, STRETCH.z);
  b.add(grain(body, 0.88, 'x', STRETCH.z - 230, STRETCH.y + 30), M);
  for (const s of [-1, 1]) {
    // The tenon comes through the leg and stands a little proud, its end chamfered, split by two wedges driven in
    // across it.
    const t0 = inner - 20, t1 = outer + 12;
    const tenon = loftBar([{ y: t0, w: 70, d: 22, c: 1.4 }, { y: t1 - 3, w: 70, d: 22, c: 1.4 }, { y: t1, w: 65, d: 17, c: 1.4 }])
      .rotateZ(-Math.PI / 2).translate(0, STRETCH.y, STRETCH.z);
    if (s < 0) tenon.scale(-1, 1, 1);
    b.add(grain(s < 0 ? flip(tenon) : tenon, 0.88, 'x', STRETCH.z - 230, STRETCH.y + 30), M);
    for (const dy of [-17, 17]) {
      const w = rbox(5, 4, 16, 0.6).translate(s * (t1 + 0.6), STRETCH.y + dy, STRETCH.z);
      b.add(grain(w, 0.05 + (dy > 0 ? 0.3 : 0), 'x', STRETCH.z + 40, STRETCH.y + dy + 30), M);
    }
  }
}

// The drawer case and its two drawers. Hands back where each knob goes.
function drawers(b: Builder, M: THREE.Material): [number, number, number][] {
  const { l, r, bottom, face, stile, mid, top, foot, gap, set } = CASE;
  const zc = face - 10, h = -T - bottom, ym = (-T + bottom) / 2, xm = (l + r) / 2;
  b.add(grain(rbox(stile, h, 20, 1.5).translate(l + stile / 2, ym, zc), 0.21, 'y', l + 90, zc - 160), M);
  b.add(grain(rbox(stile, h, 20, 1.5).translate(r - stile / 2, ym, zc), 0.69, 'y', r - 90, zc - 140), M);
  b.add(grain(rbox(mid, h - top - foot, 20, 1.5).translate(xm, (-T - top + bottom + foot) / 2, zc), 0.36, 'y', xm + 70, zc - 150), M);
  b.add(grain(rbox(r - l - 2 * stile + 2, top, 20, 2, 3).translate(xm, -T - top / 2, zc), 0.58, 'x', zc - 700, -T - 40), M);
  b.add(grain(rbox(r - l - 2 * stile + 2, foot, 20, 1.5).translate(xm, bottom + foot / 2, zc), 0.93, 'x', zc - 650, bottom + 60), M);
  // The case behind the frame: its sides, its bottom, and the drawers' boxes seen through the gaps.
  const back = -150, depth = face - 20 - back;
  for (const [x, sd] of [[l + 9, 0.17], [r - 9, 0.83]]) b.add(grain(rbox(18, h, depth, 1.5).translate(x, ym, back + depth / 2), sd, 'z', x + 140, ym - 200), M);
  b.add(grain(rbox(r - l - 36, 14, depth, 1).translate(xm, bottom + 7, back + depth / 2), 0.44, 'z', xm, bottom - 200), M);
  const ow = (r - l - 2 * stile - mid) / 2, oh = h - top - foot, oy = (-T - top + bottom + foot) / 2;
  const knobs: [number, number, number][] = [];
  for (const [i, x] of [[0, l + stile + ow / 2], [1, r - stile - ow / 2]] as [number, number][]) {
    b.add(grain(rbox(ow, oh, 6, 0.5).translate(x, oy, face - 34), 0.5 + i * 0.1, 'x', face - 200, oy), M);
    const fw = ow - 2 * gap, fh = oh - 2 * gap, fz = face - set;
    b.add(grain(rbox(fw, fh, 20, 3, 3).translate(x, oy, fz - 10), 0.27 + i * 0.38, 'x', fz - 760 - i * 140, oy + 40 - i * 70), M);
    knobs.push([x, oy, fz]);
  }
  return knobs;
}

function angle(b: Builder, M: THREE.Material): void {
  const { top, leg, t } = ANGLE, f = FRONT + t;
  const s = outline([[FRONT - top + 1, 0], [FRONT, 0], [FRONT, t - leg], [f, t - leg], [f, t], [FRONT - top + 1, t]], [0.8, 1.2, 0.8, 0.8, 2.2, 0.8], 4);
  b.add(runX(s, -W / 2 + 15, W / 2 - 15, 0.8, 2), M);
  const rnd = (i: number) => { const x = Math.sin(i * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 13; i++) b.add(screwHead(4.2, rnd(i) * Math.PI).translate(-930 + i * 155, t - leg / 2 - 1.5, f), M);
}

export const build: PartFactory = () => {
  const group = new THREE.Group();
  group.name = 'bench';
  const b = new SoundBuilder();
  const knobXs = [CASE.l + CASE.stile + (CASE.r - CASE.l - 2 * CASE.stile - CASE.mid) / 4, CASE.r - CASE.stile - (CASE.r - CASE.l - 2 * CASE.stile - CASE.mid) / 4];
  const oy = (-T - CASE.top + CASE.bottom + CASE.foot) / 2;
  const wear: Wear[] = [
    { at: [0, STRETCH.y + STRETCH.h / 2, STRETCH.z], r: [560, 8, 30], k: 0.55, up: true },
    { at: [-TX, FLOOR + FOOT.h, 360], r: [70, 40, 60], k: 0.45 },
    { at: [TX, FLOOR + FOOT.h, 360], r: [70, 40, 60], k: 0.45 },
    { at: [-940, 0, 290], r: [90, 6, 130], k: 0.3, up: true },
    { at: [940, 0, 290], r: [90, 6, 130], k: 0.3, up: true },
    ...knobXs.map((x): Wear => ({ at: [x, oy, CASE.face], r: [55, 40, 6], k: 0.12 })),
  ];
  const wood = timber(wear, { joints: JOINTS, below: -T - 1 }, { trestle: TX - 110, drawers: [CASE.l, CASE.r, CASE.face - 40] });
  boards(b, wood);
  trestle(b, wood, -1);
  trestle(b, wood, 1);
  stretcher(b, wood);
  const knobs = drawers(b, wood);

  // Satin bronze, darker and browner than the copper of the knobs. Its rolled outer arris is polished only where
  // hands have worn it, so the light it catches breaks along the edge and slides with the cursor, never a band.
  const bronze = metal({ name: 'bench-angle', color: new THREE.Color(hex('bronze')).lerp(new THREE.Color(0x3e322b), 0.55).getHex(), rough: 0.58, brush: 'x', tarnish: 0.7, patina: [0.5, 0.36, 0.26], extra: {
    head: 'float bRub;',
    color: `{ float d = length(vec2(${(FRONT + ANGLE.t).toFixed(1)} - vObj.z, vObj.y - ${ANGLE.t.toFixed(1)}));
      float worn = smoothstep(0.42, 0.72, wNoise(vec3(vObj.x * 0.006, 2.0, 5.0))) * (0.55 + 0.45 * wNoise(vec3(vObj.x * 0.05, 7.0, 1.0)));
      bRub = (1.0 - smoothstep(1.2, 3.2, d)) * worn;
      diffuseColor.rgb *= (1.0 + 0.15 * bRub) * (1.0 - 0.35 * smoothstep(-22.0, -33.0, vObj.y) * step(${(FRONT + 1).toFixed(1)}, vObj.z)); }`,
    rough: 'roughnessFactor = clamp(mix(roughnessFactor, 0.2, bRub), 0.08, 1.0);',
  } });
  angle(b, bronze);

  const face = rosetteMap();
  const knobFaceMat = new THREE.MeshPhysicalMaterial({ color: hex('copper'), metalness: 1, roughness: 0.4, normalMap: face, normalScale: new THREE.Vector2(1, 1) });
  knobFaceMat.name = 'bench-knob-face';
  knobFaceMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nfloat kRel;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nkRel = smoothstep(0.02, 0.55, texture2D(normalMap, vNormalMapUv).a);\ndiffuseColor.rgb *= mix(0.24, 1.0, kRel);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.66, 0.34, kRel);');
  };
  knobFaceMat.customProgramCacheKey = () => 'bench-knob-face';
  const z0 = CASE.face - CASE.set;
  const knobMat = metal({ name: 'bench-knob', color: hex('copper'), rough: 0.36, brush: 'none', tarnish: 0.6, patina: [0.5, 0.36, 0.26], cast: 0.6, extra: {
    head: 'float kRub;',
    color: `kRub = smoothstep(${(z0 + KNOB_RIM - 0.5).toFixed(1)}, ${(z0 + KNOB_RIM + 4.5).toFixed(1)}, vObj.z); diffuseColor.rgb *= mix(0.38, 1.0, kRub);`,
    rough: 'roughnessFactor = clamp(mix(roughnessFactor + 0.2, roughnessFactor, kRub), 0.08, 1.0);',
  } });
  const body = knobBody(), faceGeo = knobFace();
  for (const [x, y, z] of knobs) {
    b.add(body.turned, knobMat, at(x, y, z));
    for (const bead of body.beads) b.add(bead, knobMat, at(x, y, z));
    b.add(faceGeo, knobFaceMat, at(x, y, z));
  }
  b.build(group, 'bench');
  return { group, alone: { at: [-600, -150, 300], r: 330 } };
};
