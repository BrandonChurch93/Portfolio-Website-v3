import * as THREE from 'three';
import { slice } from '../../../../world/build';
import { CORE, D2R, HOST, SPIRE, VIEW, drawn } from '../../layout';

// What the rock as pictures of the one view (./pictured.ts, ./drawn.ts) is laid on: a sheet behind the world, which
// the view's own rays cross where the pictures say, and the reader of those pictures.
//
// A picture whose four numbers a pixel are four different things is read here and not by the browser's picture
// reader, which may multiply a picture's color by its alpha.

// The core's light drifting across the walls: two slow patterns laid over the directions out from the core, each
// with which way it lies, how many times it repeats across the hollow, how fast it runs, in radians a second, and
// its share of the light. Each is bent by the other's way, so no straight band ever crosses the rock.
const DRIFT = [
  { way: [0.62, 0.48, -0.62], bend: [-0.35, 0.8, 0.49], turns: [3.1, 2.3, 1.4], rate: [0.21, -0.13], share: 0.09 },
  { way: [-0.71, 0.25, 0.66], bend: [0.62, 0.48, -0.62], turns: [4.6, 2.9, 1.1], rate: [-0.34, 0.19], share: 0.06 },
] as const;
// The surge when the stream sets off: a front of light that leaves the core and crosses the hollow, how fast, in
// units a second, how thick, how strong, and how long it and the lift of the whole hollow behind it last.
const SURGE = { speed: 380, thick: 110, power: 0.7, lasts: 1.15, lift: 0.22 } as const;
const f = (n: number): string => n.toFixed(4);
const v3 = (a: readonly number[]): string => `vec3( ${a.map(f).join(', ')} )`;
// float coreSwing( vec3 dir, float dist ): what the core's light is times at a place, by the way to it from the core
// and how far that is. It reads the time (uTime) and the stream's setting off (uSurge: how far on, how long since).
export const SWING_GLSL = /* glsl */ `
float coreSwing( vec3 dir, float dist ) {
	float drift = 1.0${DRIFT.map((d) => `
		+ ${f(d.share)} * sin( ${f(d.turns[0])} * dot( dir, ${v3(d.way)} ) + uTime * ${f(d.rate[0])} + ${f(d.turns[2])} * sin( ${f(d.turns[1])} * dot( dir, ${v3(d.bend)} ) + uTime * ${f(d.rate[1])} ) )`).join('')};
	float front = ( dist - ${f(CORE.r)} - ${f(SURGE.speed)} * uSurge.y ) / ${f(SURGE.thick)};
	return drift + uSurge.x * exp( - uSurge.y / ${f(SURGE.lasts)} ) * ( ${f(SURGE.power)} * exp( - front * front ) + ${f(SURGE.lift)} );
}`;

// How far beyond the world the sheet stands, as a share of the way from the eye to the plane the view is aimed at.
const SHEET = 14 / 9;

// Nothing of a picture, or of what is drawn on one, is brighter than this as light, which is under what the world's
// glow starts at (GLOW in ../../index.ts): a picture's brightest places do not bloom at rest.
export const MOST = 1.4;

const E = VIEW.el * D2R;
export const SE = Math.sin(E), CE = Math.cos(E);
const Y0 = SPIRE.tall - (HOST.tall / 2 - HOST.over) / CE;
export const EYE = new THREE.Vector3(0, Y0 + VIEW.back * SE, VIEW.back * CE);
// Where a place in the host, in units right of its center line and down from its top, is on the plane the view is
// aimed at.
export const aimed = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, Y0 + (HOST.tall / 2 - y) * CE, -(HOST.tall / 2 - y) * SE);
// vec3 placed( vec2 at, float toward ): where a place in the host, in units from its top left, is in the world when
// it stands this many units nearer the eye than the plane the view is aimed at. It is seen at that place of the
// host whatever its distance, which only settles what stands in front of it.
export const PLACED_GLSL = /* glsl */ `
vec3 placed( vec2 at, float toward ) {
	float up = ${f(HOST.tall / 2)} - at.y;
	vec3 eye = ${v3(EYE.toArray())};
	vec3 ray = normalize( vec3( at.x - ${f(HOST.wide / 2)}, ${f(Y0)} + up * ${f(CE)}, - up * ${f(SE)} ) - eye );
	return eye + ray * ( ( toward - ${f(VIEW.back)} ) / ( ray.y * ${f(SE)} + ray.z * ${f(CE)} ) );
}`;

// The sheet over a part of the host, told in units from where the core's middle is drawn (across, down, wide,
// tall): each corner with the place on the aimed plane it is seen through.
export function sheet(window: readonly [number, number, number, number]): THREE.BufferGeometry {
  const [cx, cy] = drawn(...CORE.at), [wx, wy, ww, wh] = window;
  const corners = [[wx, wy], [wx + ww, wy], [wx, wy + wh], [wx + ww, wy + wh]].map(([x, y]) => aimed(cx + x, cy + y));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap((a) => a.clone().sub(EYE).multiplyScalar(SHEET).add(EYE).toArray()), 3));
  g.setAttribute('aim', new THREE.Float32BufferAttribute(corners.flatMap((a) => a.toArray()), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return g;
}

export interface Picture { wide: number; tall: number; data: Uint8Array<ArrayBuffer> }

export async function picture(file: string, madeBy: string): Promise<Picture> {
  const res = await fetch(`/world/${file}?v=${process.env.NEXT_PUBLIC_BUILD ?? 'dev'}`);
  if (!res.ok) throw new Error(`The rock's picture ${file} is missing (${res.status}). Make it with: ${madeBy}`);
  const buf = new Uint8Array(await res.arrayBuffer()), head = new DataView(buf.buffer);
  let at = 8, wide = 0, tall = 0;
  const packed: Uint8Array<ArrayBuffer>[] = [];
  while (at + 12 <= buf.length) {
    const long = head.getUint32(at), kind = String.fromCharCode(buf[at + 4], buf[at + 5], buf[at + 6], buf[at + 7]);
    if (kind === 'IHDR') {
      wide = head.getUint32(at + 8);
      tall = head.getUint32(at + 12);
      if (buf[at + 16] !== 8 || buf[at + 17] !== 6 || buf[at + 20] !== 0) throw new Error(`${file} is not four bytes a pixel, row by row`);
    } else if (kind === 'IDAT') packed.push(buf.subarray(at + 8, at + 8 + long));
    else if (kind === 'IEND') break;
    at += 12 + long;
  }
  const raw = new Uint8Array(await new Response(new Blob(packed).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const row = wide * 4, data = new Uint8Array(row * tall);
  if (raw.length !== (row + 1) * tall) throw new Error(`${file} is not the size it says it is`);
  for (let y = 0; y < tall; y++) {
    const kind = raw[y * (row + 1)], s = y * (row + 1) + 1, d = y * row, u = d - row;
    if (kind === 0) data.set(raw.subarray(s, s + row), d);
    else if (kind === 1) {
      for (let i = 0; i < 4; i++) data[d + i] = raw[s + i];
      for (let i = 4; i < row; i++) data[d + i] = raw[s + i] + data[d + i - 4];
    } else if (kind === 2) {
      if (y === 0) data.set(raw.subarray(s, s + row), d);
      else for (let i = 0; i < row; i++) data[d + i] = raw[s + i] + data[u + i];
    } else if (kind === 3) {
      for (let i = 0; i < row; i++) data[d + i] = raw[s + i] + (((i >= 4 ? data[d + i - 4] : 0) + (y > 0 ? data[u + i] : 0)) >> 1);
    } else if (kind === 4) {
      for (let i = 0; i < row; i++) {
        const a = i >= 4 ? data[d + i - 4] : 0, b = y > 0 ? data[u + i] : 0, c = i >= 4 && y > 0 ? data[u + i - 4] : 0;
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        data[d + i] = raw[s + i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
    } else throw new Error(`${file} has a row this cannot read`);
    if ((y & 31) === 31) await slice();
  }
  return { wide, tall, data };
}

// The file's numbers are let go once the graphics card has the two lists of them the shadows need.
export function letGo(this: { array: unknown }): void { this.array = null; }

export function texture(p: Picture, smooth: boolean): THREE.DataTexture {
  const t = new THREE.DataTexture(p.data, p.wide, p.tall, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = smooth ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = smooth;
  t.needsUpdate = true;
  // Once it is with the graphics card the page's own copy is let go, as the world's meshes are (../../files.ts).
  t.onUpdate = () => { (t.image as { data: Uint8Array | null }).data = null; };
  return t;
}
