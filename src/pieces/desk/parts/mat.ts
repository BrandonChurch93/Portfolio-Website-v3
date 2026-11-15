import * as THREE from 'three';
import { MAT } from '../layout';
import type { PartFactory } from '../part';
import { hairline, hide, type MatShape } from './mat/hide';

// His desk mat: a sheet of dark hide 4 thick over most of the top, its corners rounded, its top edge rolled and its
// side painted, a saddle stitched seam in copper thread just inside the edge, and no mark. It lies on the timber with a hairline of shadow round its edge.

const SHAPE: MatShape = { ...MAT, r: 16 };
// How far the top edge is rolled over, and how far out the hairline of shadow reaches onto the timber.
const ROLL = 1.7, SHADOW = 9;

function outline(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, 1.5 * Math.PI, false);
  return s;
}

// A band round the outline, from in under the edge to out on the timber, its uv.x 0 at the edge and 1 at its rim.
function band(w: number, d: number, r: number, from: number, to: number): THREE.BufferGeometry {
  const pts: [number, number, number, number][] = [];
  const corner = (cx: number, cz: number, a0: number) => { for (let i = 0; i <= 12; i++) { const a = a0 + (i / 12) * (Math.PI / 2); pts.push([cx, cz, Math.cos(a), Math.sin(a)]); } };
  corner(w / 2 - r, -d / 2 + r, -Math.PI / 2);
  corner(w / 2 - r, d / 2 - r, 0);
  corner(-w / 2 + r, d / 2 - r, Math.PI / 2);
  corner(-w / 2 + r, -d / 2 + r, Math.PI);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const [cx, cz, nx, nz] of pts) {
    pos.push(cx + nx * (r + from), 0, cz + nz * (r + from), cx + nx * (r + to), 0, cz + nz * (r + to));
    uv.push(0, 0, 1, 0);
  }
  const n = pts.length;
  for (let i = 0; i < n; i++) { const a = i * 2, b = ((i + 1) % n) * 2; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// The rolled edge shaded as the round it is. An extrusion's bevel comes with one normal per facet, five facets each
// narrower than a pixel at the page's size, and which facet a pixel's middle fell on changed its light from pixel to
// pixel along the edge: a checker that flickered as the light moved. The round's own normal, from its centre line,
// turns smoothly, and the renderer widens a highlight on a normal that turns within a pixel.
function roundEdge(g: THREE.BufferGeometry, m: MatShape): void {
  const side = g.groups.find((x) => x.materialIndex === 1);
  if (!side) return;
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const A = m.w / 2 - m.r, B = m.d / 2 - m.r, top = m.h - ROLL, v = new THREE.Vector3();
  for (let i = side.start; i < side.start + side.count; i++) {
    const qx = p.getX(i) - m.x, qz = p.getZ(i) - m.z, y = p.getY(i);
    const cx = THREE.MathUtils.clamp(qx, -A, A), cz = THREE.MathUtils.clamp(qz, -B, B);
    let ox = qx - cx, oz = qz - cz;
    const l = Math.hypot(ox, oz);
    if (l > 1e-6) { ox /= l; oz /= l; } else if (Math.abs(qx) - A > Math.abs(qz) - B) { ox = Math.sign(qx); oz = 0; } else { ox = 0; oz = Math.sign(qz); }
    const out = l - (m.r - ROLL), up = y > top ? y - top : y < ROLL ? y - ROLL : 0;
    v.set(ox * Math.max(out, 0), up, oz * Math.max(out, 0));
    if (v.lengthSq() < 1e-8) v.set(ox, 0, oz);
    v.normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
}

export const build: PartFactory = () => {
  const { w, d, x, z, h, r } = SHAPE;
  const group = new THREE.Group();
  group.name = 'mat';
  const geo = new THREE.ExtrudeGeometry(outline(w, d, r), { depth: h - 2 * ROLL, bevelEnabled: true, bevelThickness: ROLL, bevelSize: ROLL, bevelOffset: -ROLL, bevelSegments: 5, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, ROLL, z);
  roundEdge(geo, SHAPE);
  const sheet = new THREE.Mesh(geo, hide(SHAPE));
  sheet.name = 'mat:hide';
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  sheet.matrixAutoUpdate = false;
  const shadow = new THREE.Mesh(band(w, d, r, -1.5, SHADOW).translate(x, 0.12, z), hairline());
  shadow.name = 'mat:hairline';
  shadow.renderOrder = 1;
  shadow.matrixAutoUpdate = false;
  shadow.userData.noWire = true;
  group.add(sheet, shadow);
  return { group, alone: { at: [x + 750, h, z + 200], r: 150 } };
};
