import * as THREE from 'three';
import { CORE, RIM, SOURCE, WORLD, skinAt } from '../layout';
import { load, mesh, type Loaded } from '../files';
import { lit } from '../light';
import type { PartFactory } from '../part';
import { STREAM, stoneMaps, stoneMaterial } from './rock/stone';
import { LIGHTMAP } from './rock/light-map';

// The torn rock: whichever sculpt is asked for (?rock=a or s, default r), drawn in the planet's stone (./rock/stone.ts).
// Sculpt S wears a quiet stone (StoneOptions.quiet): its form and the core's light carry it.
// A world file for the rock holds two meshes: `break`, the torn rock, and `skin`, the planet's outer surface and its
// top, which is a plain dark shape until its own part is built. Without a file it is the planet's outline, whole.
// Sculpt S also takes picture 9's large pattern of light from a small map (./rock/light-map.ts; ?lightmap=0 leaves it
// off). Without the map's file it is drawn without it.
// ?stone=0 draws the break in the plain color the sculpts' light was worked out with, to judge form alone, and
// ?stonedebug=1 to 11 one thing the stone reads (StoneOptions.debug in ./rock/stone.ts).
//
// What the sculpt stores for the stone, read from the file's meta and, where the meta is silent, from the file
// itself: meta.edge, when it is there, names where each vertex's distance to the nearest crease is (light.w or
// bounce.w) and meta.edgeUnits the units a stored 1 is. light.w is a number of each block's own when meta.spare says
// 'slab', never when it holds the distance, and otherwise only if it plainly varies from block to block. When it says
// 'mass' (sculpt S), light.w and bounce.w hold a tone of each mass's own, which the quiet stone reads. When it says
// 'bed' (sculpt S, round 4), they hold each vertex's bedding, which the quiet stone lays its laminae along and works
// each mass's tone out from, and the light takes picture 9's hue (./rock/curve.ts; ?curve=0 leaves it as it is).
const DARK = 0x16110d, CLAY = 0x96897b;

function lightMap(): Promise<THREE.Texture | null> {
  return new THREE.TextureLoader().loadAsync(`/world/${LIGHTMAP.file}?v=${process.env.NEXT_PUBLIC_BUILD ?? 'dev'}`).then((t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.flipY = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, () => null);
}

// Whether light.w holds a number of each block's own: said so, or, when nothing is said, many different values.
function blocks(g: THREE.BufferGeometry, meta: { spare?: string; edge?: string }): boolean {
  if (meta.spare === 'slab') return true;
  if (meta.spare === 'mass' || meta.spare === 'bed') return false;
  if (meta.spare === 'edge' || meta.edge === 'light.w') return false;
  const a = g.getAttribute('aLight');
  if (!a) return false;
  const seen = new Set<number>(), step = Math.max(1, Math.floor(a.count / 4096));
  for (let i = 0; i < a.count && seen.size <= 8; i += step) seen.add(Math.round(a.getW(i) * 255));
  return seen.size > 8;
}

// The break's triangles the page's stream can light: any within STREAM.reach of the line from the core's foot
// straight down (./rock/stone.ts), however far the stream has run. Everything else of the rock changes with nothing
// but the core's level, and the world keeps it as pictures (../kept.ts): these are drawn over the pictures in every
// frame. A geometry of their own over the break's own buffers.
function nearStream(l: Loaded): THREE.BufferGeometry | null {
  const g = l.geometry, pos = g.getAttribute('position') as THREE.BufferAttribute, index = g.index;
  if (!index || !(pos.array instanceof Uint16Array) || !pos.normalized) return null;
  const q = pos.array, ix = index.array, keep: number[] = [], R = STREAM.reach + 2, s = l.size / 65535;
  const [sx, sy, sz] = SOURCE, [ax, ay, az] = [l.at.x, l.at.y, l.at.z];
  for (let t = 0; t < ix.length; t += 3) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const v = ix[t + k] * 3, x = ax + q[v] * s, y = ay + q[v + 1] * s, z = az + q[v + 2] * s;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    if (x0 - R <= sx && sx <= x1 + R && z0 - R <= sz && sz <= z1 + R && y0 - R <= sy) keep.push(ix[t], ix[t + 1], ix[t + 2]);
  }
  if (!keep.length) return null;
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(g.attributes)) out.setAttribute(name, a);
  out.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
  out.boundingBox = g.boundingBox;
  out.boundingSphere = g.boundingSphere;
  return out;
}

export const build: PartFactory = async ({ query, renderer }) => {
  const group = new THREE.Group(), which = query.get('rock') ?? 'r', made: { dispose(): void }[] = [], near: THREE.Mesh[] = [];
  const plain = query.get('stone') === '0';
  const add = (g: THREE.BufferGeometry, m: THREE.Material): void => { made.push(g, m); };
  let release = (): void => {};
  try {
    const [file, maps, light] = await Promise.all([load(`rock-${which}.bin`), plain ? null : stoneMaps(renderer), which === 's' && !plain && query.get('lightmap') !== '0' ? lightMap() : null]);
    if (maps) release = () => maps.release();
    if (light) made.push(light);
    const meta = file.meta as { spare?: string; edge?: string; edgeUnits?: number; edgeSigned?: boolean; beds?: number[][]; tans?: number[] };
    const edgeAt = meta.edge === 'light.w' ? 'aLight.w' : meta.edge === 'bounce.w' ? 'aBounce.w' : '';
    const units = (meta.edgeUnits ?? 8).toFixed(3);
    // A signed distance is stored as half of it over a half: under 0 toward a concave crease.
    const edge = edgeAt ? (meta.edgeSigned ? `( ${edgeAt} * 2.0 - 1.0 ) * ${units}` : `${edgeAt} * ${units}`) : undefined;
    for (const [name, l] of file.meshes) {
      // The planet's outer surface and its top have parts of their own now (the skin and the land): the sculpt's
      // plain shell lay exactly where they are and fought them for every pixel. ?shell=1 draws it again.
      if (name === 'skin' && query.get('shell') !== '1') continue;
      const m = name === 'break' && maps
        ? stoneMaterial(maps, { key: which === 's' ? 'rock-s' : 'rock', baked: true, spare: blocks(l.geometry, meta) ? 'slab' : undefined, beds: meta.beds, tans: meta.tans, edge, quiet: which === 's', mass: meta.spare === 'mass', bed: meta.spare === 'bed', curve: meta.spare === 'bed' && query.get('curve') !== '0', light: light ?? undefined, debug: Number(query.get('stonedebug')) || undefined })
        : lit(new THREE.MeshStandardMaterial({ color: name === 'skin' ? DARK : CLAY, roughness: 0.92, metalness: 0 }), { key: `rock-plain-${name}`, baked: true });
      const touched = name === 'break' && maps ? nearStream(l) : null;
      const part = mesh(l, m);
      part.castShadow = part.receiveShadow = true;
      group.add(part);
      add(l.geometry, m);
      if (touched) {
        const own = new THREE.Mesh(touched, m);
        own.matrix.copy(part.matrix);
        own.matrixAutoUpdate = false;
        own.receiveShadow = true;
        own.visible = false;
        group.add(own);
        near.push(own);
        made.push(touched);
      }
    }
  } catch (e) {
    console.warn(String(e));
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) { const [x, y] = skinAt(Math.PI / 2, 1 - i / 40); pts.push(new THREE.Vector2(Math.max(0.01, x), y)); }
    pts.push(new THREE.Vector2(WORLD.half, -RIM));
    const g = new THREE.LatheGeometry(pts, 96), m = lit(new THREE.MeshStandardMaterial({ color: DARK, roughness: 1, side: THREE.DoubleSide }), { key: 'rock-holder' });
    const whole = new THREE.Mesh(g, m);
    whole.castShadow = whole.receiveShadow = true;
    group.add(whole);
    add(g, m);
  }
  if (near.length) group.userData.near = near;
  return { group, alone: { at: [CORE.at[0], CORE.at[1] - 30, CORE.at[2] - 60], r: 560 }, dispose() { for (const d of made) d.dispose(); release(); } };
};
