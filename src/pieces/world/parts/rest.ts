import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex } from '../../../config/palette';
import { COURT, D2R, HOST, LAND, SMALL, SOURCE, SPIRE, drawn, fromPicture, ground, within } from '../layout';
import { lit } from '../light';
import type { PartFactory } from '../part';
import { TOWERS, TREES } from '../placed';

// Everything of the world that is not built yet, as plain dark shapes in its place, so that what is built is seen
// where it belongs: the land with its dunes, every building but the one that is built, the spire, the trees, and
// lines of light where the stream and the small streams will be. None of it is a design. Each goes when its own
// part is built.

const DARK = 0x16110d, SPOKES = 720, RINGS = 72;
// The line that stands in for the stream: how wide it is, in units (picture 9's narrows to about 6 of its pixels),
// and its light, which in the picture is pale gold and not orange.
export const STREAM = 7;
export const STREAM_LIGHT = new THREE.Color(hex('pale')).multiplyScalar(1.25);

export const build: PartFactory = ({ built, stands, query }) => {
  const group = new THREE.Group(), plain = lit(new THREE.MeshStandardMaterial({ color: DARK, roughness: 1, metalness: 0 }), { key: 'rest', core: false });

  // The land: a sheet over the top, in rings out from the middle, each spoke ending exactly where the land ends.
  const pos: number[] = [], idx: number[] = [];
  for (let k = 0; k < SPOKES; k++) {
    const th = (k / SPOKES) * Math.PI * 2, sx = Math.sin(th), sz = Math.cos(th);
    let lo = 0, hi: number = LAND.rim;
    for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (within(sx * mid, sz * mid) > 0) lo = mid; else hi = mid; }
    for (let j = 0; j <= RINGS; j++) { const r = lo * Math.sqrt(j / RINGS), x = sx * r, z = sz * r; pos.push(x, ground(x, z) + 0.6, z); }
  }
  for (let k = 0; k < SPOKES; k++) for (let j = 0; j < RINGS; j++) {
    const a = k * (RINGS + 1) + j, b = ((k + 1) % SPOKES) * (RINGS + 1) + j;
    if (j > 0) idx.push(a, a + 1, b);
    idx.push(b, a + 1, b + 1);
  }
  const sheet = new THREE.BufferGeometry();
  sheet.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sheet.setIndex(idx);
  sheet.computeVertexNormals();

  // Every building but the built one, as a box of its own size, and the spire.
  const solids: THREE.BufferGeometry[] = [];
  TOWERS.forEach(([x, z, w, d, tall, turn], i) => {
    // Nothing stands where picture 9 has no land: the study's front rows stood on ground the tear took.
    if (stands.has(i) || within(x, z) < 0.6 * Math.max(w, d)) return;
    solids.push(new THREE.BoxGeometry(w, tall, d).rotateY(turn * D2R).translate(x, ground(x, z) + tall / 2, z));
  });
  if (!built.has('spire')) {
    solids.push(new THREE.CylinderGeometry(1.2, SPIRE.foot / 2, SPIRE.tall, 4, 1).rotateY(Math.PI / 4).translate(0, SPIRE.tall / 2, 0));
    solids.push(new THREE.TorusGeometry(SPIRE.ring.r, SPIRE.ring.thick, 6, 48).rotateX(Math.PI / 2 + SPIRE.ring.tilt[0] * D2R).rotateZ(SPIRE.ring.tilt[1] * D2R).translate(0, SPIRE.tall * SPIRE.ring.up, 0));
    solids.push(new THREE.CylinderGeometry(COURT, COURT, 1, 40).translate(0, 0.4, 0));
  }
  if (!built.has('trees')) for (const [x, z, size] of TREES) if (within(x, z) > size) solids.push(new THREE.IcosahedronGeometry(size, 1).scale(1, 0.85, 1).translate(x, ground(x, z) + size * 1.15, z));
  const shapesOf = [...(built.has('land') ? [] : [sheet.toNonIndexed()]), ...solids.map((g) => g.toNonIndexed())].map((g) => { g.deleteAttribute('uv'); return g; });
  const stand = shapesOf.length ? mergeGeometries(shapesOf, false) : new THREE.BufferGeometry();
  for (const g of [sheet, ...solids]) g.dispose();
  const shapes = new THREE.Mesh(stand, plain);
  shapes.castShadow = shapes.receiveShadow = true;
  shapes.matrixAutoUpdate = false;
  group.add(shapes);

  // Lines of light where the stream and the small streams are, for the world seen alone in the lab. On a page the
  // stream is the page's own, drawn over the world, and these are left out.
  const made: { dispose(): void }[] = [stand, plain];
  // ?lines=0 leaves them out there too, for a picture of the world as the page has it.
  if (location.pathname.startsWith('/lab/piece') && query.get('lines') !== '0') {
    const light = new THREE.MeshBasicMaterial({ color: STREAM_LIGHT, side: THREE.DoubleSide });
    const line = (x: number, y: number, z: number, long: number, wide: number): THREE.BufferGeometry => new THREE.PlaneGeometry(wide, long).translate(x, y - long / 2, z);
    const foot = HOST.tall - drawn(SOURCE[0], SOURCE[1], SOURCE[2])[1];
    const lines = mergeGeometries([line(SOURCE[0], SOURCE[1] + 6, SOURCE[2], foot + 40, STREAM), ...SMALL.map(([px, py, z, long]) => { const [x, y] = fromPicture(px, py, z); return line(x, y, z, long, 1.4); })], false);
    const streams = new THREE.Mesh(lines, light);
    streams.matrixAutoUpdate = false;
    group.add(streams);
    made.push(lines, light);
  }

  return { group, dispose() { for (const d of made) d.dispose(); } };
};
