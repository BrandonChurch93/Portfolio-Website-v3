import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex } from '../config/palette';
import type { Tier } from '../config/site';
import { slice } from '../world/build';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { finish, trueDarks } from '../world/tone';
import { surface } from './nets';
import { AVENUE, BOULEVARD, CORE, COURT, D2R, DISTRICTS, HOST, MOONWARD, PYRAMID, RIM, SPIRE, STREET, VIEW, WORLD, boulevards, city, debris, desert, dome, edge, garden, ground, inland, park, ramp, rock, seeded, type Building, type Piece, type Plant } from './plan';

// Study 32: the stage the hero's new world stands on, in its third round: in color. He could not judge the grey
// model's depth, its shadows or what the top would be made of, and ruled that the look of the top is signed off
// before anything goes to Claude Code. So everything has a material here: the rock, the ground, the buildings with
// their lit windows, the trees by kind. It is lit as before: one low moon with real cast shadows, a little light
// from the sky, and the core's own light inside the torn hollow with shadows of its own. Nothing moves.

const M = 0.0015;
// The site's colors, and what is mixed from them. No blue, no green, no white.
const INK = {
  rockTop: '#9a7650', rockMid: '#805a40', rockDeep: '#5a3b2b', rockSkin: '#8c6c4e',
  sand: '#c89e68', sandDark: '#9c7444',
  paving: '#5c4a3b', street: '#2c231d', boulevard: '#7d654d', avenue: '#8d7050', court: '#977b5c',
  garden: '#6a4a20', gardenPale: '#8a6428', lawn: '#4c3517', lawnPale: '#75531f',
  stone: ['#8c6e53', '#775c46', '#9c7e59'], bronze: ['#7e5329', '#93602c'], glass: '#1b1511', copper: '#b56c35', gold: '#dfa448', dark: '#4a3526', trim: '#8a5e30',
  window: '#ffc98a',
} as const;
// What each kind of plant is colored, in autumn: from these, one to a tree.
const LEAF: Record<Plant, readonly string[]> = {
  broad: ['#b5652a', '#c98530', '#8e401d', '#a7572a'], poplar: ['#d39c38', '#c08a30'], conifer: ['#3b2b19', '#463220'], palm: ['#86642a', '#9a7430'], shrub: ['#7b4b23', '#96602f', '#a9762e'], bloom: ['#e8c48c', '#ddb070'],
};
const CELL = 7;
// The rock's faces are flat and its skin is smooth: an edge sharper than this, in degrees, is kept as an edge.
const CREASE = 26;
const LIGHT = { moon: 4.2, sky: 0.68, core: 1.3, lamp: 1, env: 0.05, mirror: 0.4, line: 1.5, window: 1.7 };
const SHADOW: Record<Tier, number> = { high: 4096, mid: 2048, low: 1024, static: 4096 };
const GLOW: Record<Tier, number> = { high: 2048, mid: 1024, low: 512, static: 2048 };
const FADE = 0.09;
// What a part of a building is made of, as the buildings' shader knows it.
const KIND = { stone: 0, bronze: 1, glass: 2, gold: 4, plain: 5, copper: 6, dark: 7, coursed: 9 } as const;
// The close views: what each looks at, and how many times larger it draws it.
export const CLOSE = { whole: null, city: { at: [10, 138, -40], by: 2.5 }, land: { at: [40, 6, 330], by: 2.3 }, rock: { at: [0, -372, 220], by: 1.9 } } as const;
export type Close = keyof typeof CLOSE;

const ink = (h: string | number): THREE.Color => new THREE.Color(h);
const glsl = (h: string | number): string => { const c = ink(h); return `vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} )`; };
const NOISE = `
float hash31( vec3 p ) { p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) ); p += dot( p, p.yxz + 33.33 ); return fract( ( p.x + p.y ) * p.z ); }
float vnoise( vec3 x ) {
  vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( hash31( i ), hash31( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ), mix( hash31( i + vec3( 0.0, 1.0, 0.0 ) ), hash31( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),
    mix( mix( hash31( i + vec3( 0.0, 0.0, 1.0 ) ), hash31( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ), mix( hash31( i + vec3( 0.0, 1.0, 1.0 ) ), hash31( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ), f.z );
}`;
const up = new THREE.Vector3(0, 1, 0);
// Stands something built upright at the origin on the land at a place on the map, straight out from the planet,
// turned to its district's streets, and leaning toward where the land ends by so much.
function seat(x: number, z: number, lift = 0, turn = 0, lean = 0): THREE.Matrix4 {
  const n = new THREE.Vector3(x, WORLD.top + dome(x, z), z).normalize(), q = new THREE.Quaternion().setFromUnitVectors(up, n);
  if (lean) {
    const gx = inland(x + 6, z) - inland(x - 6, z), gz = inland(x, z + 6) - inland(x, z - 6), l = Math.hypot(gx, gz) || 1;
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-gz / l, 0, gx / l), lean));
  }
  if (turn) q.multiply(new THREE.Quaternion().setFromAxisAngle(up, -turn));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z).addScaledVector(n, lift), q, new THREE.Vector3(1, 1, 1));
}
const merged = (list: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const flat = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') n.deleteAttribute(k); return n; });
  const out = mergeGeometries(flat, false);
  for (const g of list) g.dispose();
  for (const g of flat) g.dispose();
  return out;
};

// The rock: warm, in beds of differing tone that are not level, darker the deeper it lies, with a paler dusty skin
// where the planet's own surface survives. No veins of light in it: drawn as thin lines they read as scribbles.
function stony(flat: boolean, skin: boolean): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, flatShading: flat });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAt;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAt = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAt;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 p = vAt;
  float n1 = vnoise( p * 0.006 ), n2 = vnoise( p * 0.021 + 7.0 ), n3 = vnoise( p * 0.11 ), deep = clamp( - p.y / 620.0, 0.0, 1.0 );
  float bed = p.y * 0.034 + 2.4 * n1 + 0.6 * n2, tone = hash31( vec3( floor( bed ), 3.0, 1.0 ) ), seam = 1.0 - smoothstep( 0.0, 0.07, min( fract( bed ), 1.0 - fract( bed ) ) );
  vec3 c = mix( ${glsl(INK.rockTop)}, ${glsl(INK.rockMid)}, smoothstep( 0.02, 0.34, deep ) );
  c = mix( c, ${glsl(INK.rockDeep)}, smoothstep( 0.3, 0.95, deep ) );
  c *= ( 0.74 + 0.5 * tone ) * ( 0.9 + 0.2 * n3 ) * ( 1.0 - 0.3 * seam );
  float k = length( vec3( p.x / ${WORLD.half.toFixed(1)}, ( p.y + ${RIM.toFixed(1)} ) / ${WORLD.deep.toFixed(1)}, p.z / ${WORLD.half.toFixed(1)} ) );
  float skin = ${skin ? 'smoothstep( 0.95, 0.985, k ) * smoothstep( -4.0, -30.0, p.y )' : '0.0'};
  c = mix( c, ${glsl(INK.rockSkin)} * ( 0.82 + 0.36 * n2 ) * ( 0.94 + 0.12 * n3 ), skin );
  diffuseColor.rgb = c;
}`);
  };
  return m;
}

// The land: the top of the planet as one sheet, with the dunes in it. It carries how far inside the land's edge each
// point is, so the sheet is cut where the land ends and not along the squares it was measured on, and how much of
// each point is sand, park and planted square.
function landMesh(): THREE.BufferGeometry {
  const step = 4, half = 668, n = Math.round((2 * half) / step) + 1, pos: number[] = [], idx: number[] = [], keep: number[] = [], kind: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * step, z = -half + j * step;
    pos.push(x, ground(x, z), z);
    keep.push(edge(x, z));
    kind.push(desert(x, z), ramp(-0.03, 0.05, park(x, z)), garden(x, z), inland(x, z));
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    if (Math.max(keep[a], keep[b], keep[c], keep[d]) > 0) idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aKeep', new THREE.Float32BufferAttribute(keep, 1));
  g.setAttribute('aLand', new THREE.Float32BufferAttribute(kind, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function edged<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aKeep;\nvarying float vKeep;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = aKeep;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vKeep;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif ( vKeep < 0.0 ) discard;');
  };
  return m;
}
// The ground, drawn on the land where it is seen and not from the land's own points, so a street is sharp however
// it lies: paving, each district's streets at its own angle, the boulevards where two districts meet with a line of
// the stream's light down each, the avenue, the two courts, planted squares, the parks' grass, rippled sand, and
// bare rock where the land breaks off.
function paved(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0 }), lines = boulevards(), f = (v: number) => v.toFixed(3);
  const uniforms = {
    uDistrict: { value: DISTRICTS.map((d) => new THREE.Vector4(d.x, d.z, Math.cos(d.turn * D2R), Math.sin(d.turn * D2R))) },
    uPitch: { value: DISTRICTS.map((d) => d.pitch) },
    uLine: { value: lines.map((l) => new THREE.Vector4(l[0], l[1], l[2], l[3])) },
    uHot: { value: ink(hex('hot')).multiplyScalar(LIGHT.line) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKeep;\nattribute vec4 aLand;\nvarying float vKeep;\nvarying vec4 vLand;\nvarying vec2 vMap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = aKeep;\nvLand = aLand;\nvMap = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vKeep;
varying vec4 vLand;
varying vec2 vMap;
uniform vec4 uDistrict[ ${DISTRICTS.length} ];
uniform float uPitch[ ${DISTRICTS.length} ];
uniform vec4 uLine[ ${lines.length} ];
uniform vec3 uHot;
float gLine = 0.0;${NOISE}
float band( float d, float w, float aa ) { return 1.0 - smoothstep( w - aa, w + aa, d ); }`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif ( vKeep < 0.0 ) discard;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 m = vMap;
  float aa = clamp( 0.75 * ( fwidth( m.x ) + fwidth( m.y ) ), 0.35, 6.0 ), far = 1.0 - smoothstep( 1.2, 4.0, aa );
  float best = 1e12, pitch = uPitch[ 0 ];
  vec4 mine = uDistrict[ 0 ];
  for ( int i = 0; i < ${DISTRICTS.length}; i ++ ) { vec2 q = m - uDistrict[ i ].xy; float d = dot( q, q ); if ( d < best ) { best = d; mine = uDistrict[ i ]; pitch = uPitch[ i ]; } }
  vec2 q = m - mine.xy, uv = vec2( q.x * mine.z + q.y * mine.w, - q.x * mine.w + q.y * mine.z ), g = abs( uv / pitch - floor( uv / pitch + 0.5 ) ) * pitch;
  float spire = band( length( m ), ${f(COURT)}, aa ), temple = band( length( m - vec2( ${f(PYRAMID.x)}, ${f(PYRAMID.z)} ) ), ${f(PYRAMID.court)}, aa ), court = max( spire, temple );
  float sand = vLand.x, open = ( 1.0 - sand ) * ( 1.0 - court ), lane = band( min( g.x, g.y ), ${f(STREET)}, aa ) * open * ( 1.0 - vLand.y ) * ( 1.0 - 0.6 * smoothstep( 1.5, 5.0, aa ) );
  // Paving, in slabs, and where nothing is built a planted square.
  vec2 slab = floor( uv / 5.5 );
  vec3 c = ${glsl(INK.paving)} * ( 0.9 + 0.2 * mix( 0.5, hash31( vec3( slab, 2.0 ) ), far ) );
  c = mix( c, mix( ${glsl(INK.garden)}, ${glsl(INK.gardenPale)}, vnoise( vec3( m * 0.06, 4.0 ) ) ) * ( 0.85 + 0.3 * vnoise( vec3( m * 0.4, 6.0 ) ) ), smoothstep( 0.35, 0.7, vLand.z ) );
  c = mix( c, mix( ${glsl(INK.lawn)}, ${glsl(INK.lawnPale)}, smoothstep( 0.3, 0.7, vnoise( vec3( m * 0.03, 9.0 ) ) ) ) * ( 0.88 + 0.24 * vnoise( vec3( m * 0.5, 8.0 ) ) ), vLand.y );
  // Bare rock where the land breaks off.
  c = mix( c, ${glsl(INK.rockTop)} * ( 0.7 + 0.4 * vnoise( vec3( m * 0.2, 12.0 ) ) ), ( 1.0 - smoothstep( 5.0, 18.0, vLand.w ) ) * ( 1.0 - sand ) );
  c = mix( c, ${glsl(INK.street)}, lane );
  float road = 1e9;
  for ( int i = 0; i < ${lines.length}; i ++ ) { vec2 a = uLine[ i ].xy, e = uLine[ i ].zw - a; road = min( road, length( m - a - e * clamp( dot( m - a, e ) / dot( e, e ), 0.0, 1.0 ) ) ); }
  c = mix( c, ${glsl(INK.boulevard)} * ( 0.94 + 0.12 * far * step( 0.5, fract( road * 0.34 ) ) ), band( road, ${f(BOULEVARD)}, aa ) * open );
  // The courts: paved in rings.
  float rings = mix( length( m ), length( m - vec2( ${f(PYRAMID.x)}, ${f(PYRAMID.z)} ) ), temple );
  c = mix( c, ${glsl(INK.court)} * ( 0.9 + 0.14 * far * step( 0.5, fract( rings * 0.085 ) ) ), court );
  float way = m.y > ${f(AVENUE.from)} ? abs( m.x ) : 1e9, on = band( way, ${f(AVENUE.half)}, aa ) * ( 1.0 - spire );
  c = mix( c, ${glsl(INK.avenue)} * ( 0.92 + 0.14 * far * step( 0.5, fract( m.y * 0.09 ) ) ) * ( 1.0 - 0.3 * band( abs( way - ${f(AVENUE.half - 3.5)} ), 0.9, aa ) ), on );
  // Sand, rippled across the wind, running up to the city's feet.
  float ripple = 0.5 + 0.5 * sin( dot( m, vec2( 0.83, -0.56 ) ) * 1.15 + 5.0 * vnoise( vec3( m * 0.025, 2.0 ) ) );
  c = mix( c, mix( ${glsl(INK.sandDark)}, ${glsl(INK.sand)}, 0.82 + 0.18 * mix( 0.5, ripple, far ) ) * ( 0.94 + 0.12 * vnoise( vec3( m * 0.012, 5.0 ) ) ), sand );
  diffuseColor.rgb = c;
  gLine = max( band( road, 1.1, min( aa, 1.4 ) ) * open, band( way, 1.7, min( aa, 1.4 ) ) * ( 1.0 - spire ) ) * min( 1.0, 1.2 / aa );
}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uHot * gLine;');
  };
  return m;
}

// Everything built, as one mesh. Each point keeps where it is on its own building and which way its wall faces, so
// the windows can be drawn on the wall, and what it is made of.
class Built {
  private pos: number[] = []; private nor: number[] = []; private loc: number[] = []; private face: number[] = []; private tint: number[] = []; private style: number[] = [];
  add(g: THREE.BufferGeometry, to: THREE.Matrix4, kind: number, tint: THREE.Color, seed: number): void {
    const n = g.index ? g.toNonIndexed() : g, p = n.getAttribute('position'), q = n.getAttribute('normal'), turn = new THREE.Matrix3().getNormalMatrix(to), v = new THREE.Vector3();
    let top = -1e9;
    for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); this.loc.push(v.x, v.y, v.z);
      v.applyMatrix4(to); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(q, i); this.face.push(v.x, v.y, v.z);
      v.applyMatrix3(turn).normalize(); this.nor.push(v.x, v.y, v.z);
      this.tint.push(tint.r, tint.g, tint.b); this.style.push(kind, seed, top);
    }
    if (n !== g) n.dispose();
    g.dispose();
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aLocal', new THREE.Float32BufferAttribute(this.loc, 3));
    g.setAttribute('aFace', new THREE.Float32BufferAttribute(this.face, 3));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 3));
    g.setAttribute('aStyle', new THREE.Float32BufferAttribute(this.style, 3));
    return g;
  }
}
// What the built things are made of: stone, bronze and dark glass walls with windows, lit in neighbourhoods, each
// floor its own tone, and plain stone, gold, copper and dark bronze with none. The pyramid's stone is laid in
// courses.
function walled(room: THREE.Texture | null): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
  if (room) { m.envMap = room; m.envMapIntensity = LIGHT.mirror; }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aLocal;\nattribute vec3 aFace;\nattribute vec3 aTint;\nattribute vec3 aStyle;\nvarying vec3 vLocal;\nvarying vec3 vFace;\nvarying vec3 vTint;\nvarying vec3 vStyle;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = aLocal;\nvFace = aFace;\nvTint = aTint;\nvStyle = aStyle;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal;\nvarying vec3 vFace;\nvarying vec3 vTint;\nvarying vec3 vStyle;\nfloat gGlow = 0.0, gMetal = 0.0, gRough = 0.86, gWarm = 0.5;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 fn = normalize( vFace ), c = vTint;
  float kind = vStyle.x, seed = vStyle.y, wall = 1.0 - smoothstep( 0.45, 0.6, abs( fn.y ) );
  float square = step( 0.985, max( abs( fn.x ), abs( fn.z ) ) / max( 1e-4, length( fn.xz ) ) );
  float u = mix( atan( fn.z, fn.x ) * 8.0, abs( fn.x ) > abs( fn.z ) ? vLocal.z : vLocal.x, square ), v = vLocal.y;
  if ( kind < 2.5 ) {
    vec2 size = kind < 0.5 ? vec2( 3.6, 4.6 ) : kind < 1.5 ? vec2( 3.0, 4.2 ) : vec2( 2.4, 3.6 ), lo = kind < 0.5 ? vec2( 0.28, 0.26 ) : kind < 1.5 ? vec2( 0.16, 0.2 ) : vec2( 0.08, 0.12 ), hi = 1.0 - lo * vec2( 1.0, 0.8 );
    vec2 cell = vec2( u, v ) / size, id = floor( cell ), f = fract( cell );
    float aa = max( fwidth( cell.x ), fwidth( cell.y ) ), fine = 1.0 - smoothstep( 0.45, 1.1, aa ), e = max( aa, 0.02 );
    float win = smoothstep( lo.x, lo.x + e, f.x ) * ( 1.0 - smoothstep( hi.x - e, hi.x, f.x ) ) * smoothstep( lo.y, lo.y + e, f.y ) * ( 1.0 - smoothstep( hi.y - e, hi.y, f.y ) );
    win = mix( ( hi.x - lo.x ) * ( hi.y - lo.y ), win, fine ) * wall * step( 4.5, v );
    float rnd = hash31( vec3( id, seed * 91.7 ) ), share = ( kind < 0.5 ? 0.2 : kind < 1.5 ? 0.32 : 0.5 ) * ( 0.1 + 1.8 * vnoise( vec3( id * vec2( 0.21, 0.13 ), seed * 37.0 ) ) );
    c *= 0.9 + 0.2 * hash31( vec3( id.y, seed * 13.0, 2.0 ) );
    if ( kind > 1.5 ) { c = mix( c, ${glsl(INK.trim)}, 0.6 * wall ); gMetal = 0.5; gRough = 0.36; } else if ( kind > 0.5 ) { gMetal = 0.86; gRough = 0.42; }
    c = mix( c, vec3( 0.012, 0.009, 0.007 ), win );
    gMetal *= 1.0 - 0.7 * win;
    gGlow = win * mix( share, step( rnd, share ), fine ) * ( 0.5 + 0.9 * rnd );
    gWarm = hash31( vec3( seed * 7.0, id.y * 0.2, 5.0 ) );
    // A tall part of a tower ends in a band of light.
    float lip = step( 80.0, vStyle.z ) * step( 0.5, kind ) * smoothstep( vStyle.z - 3.4, vStyle.z - 3.0, v ) * wall;
    c = mix( c, vec3( 0.012, 0.009, 0.007 ), lip );
    gGlow = max( gGlow, 0.75 * lip );
    c = mix( c * 0.55, c, wall );
  } else if ( kind < 4.5 ) { gMetal = 0.94; gRough = 0.32; }
  else if ( kind < 5.5 ) { c *= 0.88 + 0.24 * vnoise( vLocal * 0.3 + seed * 9.0 ); }
  else if ( kind < 6.5 ) { gMetal = 0.86; gRough = 0.46; c *= 0.82 + 0.36 * vnoise( vLocal * 0.45 + seed * 5.0 ); }
  else if ( kind < 7.5 ) { gMetal = 0.8; gRough = 0.5; }
  else { c *= ( 0.8 + 0.2 * step( 0.14, fract( v / 2.7 ) ) ) * ( 0.9 + 0.2 * vnoise( vLocal * 0.16 ) ); }
  diffuseColor.rgb = c;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = gMetal;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix( ${glsl(hex('hot'))}, ${glsl(INK.window)}, gWarm ) * gGlow * ${LIGHT.window.toFixed(2)};`);
  };
  return m;
}
type Part = [THREE.BufferGeometry, number];
const box = (bw: number, bh: number, bd: number, x = 0, y = 0, z = 0): THREE.BufferGeometry => new THREE.BoxGeometry(bw, bh, bd).translate(x, y + bh / 2, z);
const prism = (w: number, d: number, h: number, top: number, y = 0): THREE.BufferGeometry => {
  const g = new THREE.CylinderGeometry(0.5 * Math.SQRT2 * top, 0.5 * Math.SQRT2, 1, 4, 1).rotateY(Math.PI / 4).scale(w, h, d).translate(0, y + h / 2, 0).toNonIndexed();
  g.computeVertexNormals();
  return g;
};
// A building as its parts, each with what it is made of.
function built(b: Building, r: () => number): Part[] {
  const w = b.w, d = b.d, h = b.tall, wall = b.skin === 'bronze' ? KIND.bronze : b.skin === 'glass' ? KIND.glass : KIND.stone, crown = r() < 0.5 ? KIND.gold : KIND.dark;
  const rod = (rad: number, bh: number, x: number, z: number) => new THREE.CylinderGeometry(rad * 0.82, rad, bh, 16).translate(x, bh / 2, z);
  const mast = (at: number, tall: number): Part[] => [[new THREE.CylinderGeometry(0.5, 1.1, tall, 6).translate(0, at + tall / 2, 0), KIND.dark], [new THREE.SphereGeometry(1, 8, 6).translate(0, at + tall, 0), KIND.gold]];
  switch (b.form) {
    case 'tier': return [[box(w, h * 0.62, d), wall], [box(w * 0.64, h * 0.38, d * 0.64, 0, h * 0.62), wall], [box(w * 0.7, 1.2, d * 0.7, 0, h), b.skin === 'copper' ? KIND.copper : KIND.plain]];
    case 'dome': return [[box(w, h * 0.7, d), KIND.stone], [new THREE.SphereGeometry(Math.min(w, d) * 0.46, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, h * 0.7, 0), r() < 0.3 ? KIND.gold : KIND.copper]];
    case 'hall': {
      // Its front is to the avenue: a row of columns under a beam.
      const side = b.x > 0 ? -1 : 1, front: Part[] = [[box(4.4, 1.5, d + 1.6, side * (w / 2 + 1.4), 3 + h * 0.6), KIND.plain], [box(4.4, 0.45, d + 1.6, side * (w / 2 + 1.4), 4.5 + h * 0.6), KIND.gold]];
      for (let i = 0; i < 7; i++) front.push([new THREE.CylinderGeometry(0.85, 1, h * 0.6, 10).translate(side * (w / 2 + 2.2), 3 + h * 0.3, -d / 2 + 1.6 + (i * (d - 3.2)) / 6), KIND.plain]);
      return [...front, [box(w + 3, 3, d + 7), KIND.plain], [box(w, h * 0.72, d, 0, 3), KIND.stone], [box(w + 1.6, 1.6, d + 1.6, 0, 3 + h * 0.72), KIND.plain], [box(w + 1.7, 0.5, d + 1.7, 0, 4.6 + h * 0.72), KIND.gold], [box(w * 0.74, h * 0.2, d * 0.74, 0, 5.1 + h * 0.72), KIND.plain]];
    }
    case 'obelisk': return [[box(w * 1.7, 2.4, d * 1.7), KIND.plain], [prism(w, d, h * 0.9, 0.62, 2.4), KIND.plain], [prism(w * 0.62, d * 0.62, h * 0.1, 0.02, 2.4 + h * 0.9), KIND.gold]];
    case 'pylon': return [[prism(w, d, h * 0.94, 0.72), KIND.plain], [box(w * 0.8, h * 0.06, d * 0.8, 0, h * 0.94), KIND.gold]];
    case 'step': return [[box(w * 1.12, 6, d * 1.12), KIND.plain], [box(w, h * 0.46, d, 0, 6), wall], [box(w * 0.74, h * 0.3, d * 0.74, 0, 6 + h * 0.46), wall], [box(w * 0.5, h * 0.18, d * 0.5, 0, 6 + h * 0.76), wall], [box(w * 0.54, 1.4, d * 0.54, 0, 6 + h * 0.94), crown], ...mast(7.4 + h * 0.94, h * 0.1)];
    case 'taper': return [[box(w * 1.1, 5, d * 1.1), KIND.plain], [prism(w, d, h * 0.92, 0.72, 5), wall], [box(w * 0.44, h * 0.06, d * 0.44, 0, 5 + h * 0.92), crown], ...mast(5 + h * 0.98, h * 0.07)];
    case 'drum': return [[new THREE.CylinderGeometry(w * 0.56, w * 0.58, 5, 28).translate(0, 2.5, 0), KIND.plain], [new THREE.CylinderGeometry(w * 0.46, w * 0.5, h * 0.8, 32).translate(0, 5 + h * 0.4, 0), wall], [new THREE.CylinderGeometry(w * 0.57, w * 0.55, h * 0.02, 32).translate(0, 5 + h * 0.83, 0), KIND.dark], [new THREE.CylinderGeometry(w * 0.28, w * 0.38, h * 0.15, 28).translate(0, 5 + h * 0.915, 0), wall], [new THREE.SphereGeometry(w * 0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 5 + h * 0.99, 0), KIND.gold]];
    case 'blade': {
      const g = new THREE.BoxGeometry(w, h, d * 0.46).translate(0, h / 2 + 5, 0), p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) > h * 0.5 + 5 && p.getX(i) > 0) p.setY(i, h * 0.82 + 5);
      g.computeVertexNormals();
      return [[box(w * 1.06, 5, d * 0.74), KIND.plain], [g, wall], [box(1.2, h * 0.16, d * 0.5, -w * 0.5 + 0.6, 5 + h), crown]];
    }
    case 'twin': return [[box(w, 6, d), KIND.plain], [box(w * 0.38, h, d * 0.72, -w * 0.31, 6), wall], [box(w * 0.38, h * 0.84, d * 0.72, w * 0.31, 6), wall], [box(w * 0.3, h * 0.04, d * 0.4, 0, 6 + h * 0.58), KIND.dark], [box(w * 0.4, 1.2, d * 0.74, -w * 0.31, 6 + h), crown], [box(w * 0.4, 1.2, d * 0.74, w * 0.31, 6 + h * 0.84), crown]];
    case 'needles': return [[box(w, h * 0.12, d), KIND.plain], [rod(w * 0.19, h, -w * 0.2, -d * 0.16), wall], [rod(w * 0.19, h * 0.8, w * 0.22, -d * 0.1), wall], [rod(w * 0.19, h * 0.62, 0, d * 0.24), wall], [new THREE.SphereGeometry(w * 0.15, 12, 8).translate(-w * 0.2, h, -d * 0.16), KIND.gold], [new THREE.SphereGeometry(w * 0.15, 12, 8).translate(w * 0.22, h * 0.8, -d * 0.1), KIND.gold], [new THREE.SphereGeometry(w * 0.15, 12, 8).translate(0, h * 0.62, d * 0.24), KIND.gold]];
    default: {
      const out: Part[] = [[box(w, h, d), wall]];
      // A roof of its own: a low copper one, or a parapet with a block on it.
      if (b.skin === 'copper') out.push([prism(w * 1.04, d * 1.04, Math.min(5, w * 0.3), 0.08, h), KIND.copper]);
      else if (h > 16 && r() < 0.4) out.push([box(w * 0.5, Math.max(1.5, h * 0.08), d * 0.5, 0, h), KIND.plain]);
      return out;
    }
  }
}
// The spire: a dark shaft with lit windows, gold collars, the one gold ring, and a light at its tip.
function spire(): Part[] {
  const H = SPIRE.tall, f = SPIRE.foot;
  const profile: [number, number][] = [[f * 0.74, 16], [f * 0.56, 23], [f * 0.42, 0.19 * H], [f * 0.32, 0.43 * H], [f * 0.23, 0.7 * H], [f * 0.14, 0.86 * H], [f * 0.085, 0.88 * H], [f * 0.04, 0.91 * H], [0.9, H], [0, H]];
  const foot: [number, number][] = [[f, 0], [f, 7], [f * 0.74, 7], [f * 0.74, 16]];
  const parts: Part[] = [[new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 36), KIND.glass], [new THREE.LatheGeometry(foot.map(([r, y]) => new THREE.Vector2(r, y)), 36), KIND.plain]];
  for (const k of [0.3, 0.52, 0.71]) {
    const r = f * (k < 0.43 ? 0.42 + (0.32 - 0.42) * ((k - 0.19) / 0.24) : 0.32 + (0.23 - 0.32) * ((k - 0.43) / 0.27)) + 2.6;
    parts.push([new THREE.CylinderGeometry(r, r + 0.8, 3.4, 32).translate(0, k * H, 0), KIND.gold]);
  }
  const ring = new THREE.TorusGeometry(SPIRE.ring.r, SPIRE.ring.thick, 12, 120).rotateX(Math.PI / 2);
  ring.applyMatrix4(new THREE.Matrix4().makeTranslation(0, SPIRE.ring.up * H, 0).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(SPIRE.ring.tilt[0] * D2R, 0, SPIRE.ring.tilt[1] * D2R))));
  parts.push([ring, KIND.gold]);
  return parts;
}

// A plant of each kind, standing on the origin, about one unit to its crown's half width. Its trunk is darker than
// its crown, and the crown takes the one color its tree is given.
function plantForm(kind: Plant): THREE.BufferGeometry {
  const tone = (g: THREE.BufferGeometry, v: number): THREE.BufferGeometry => { const n = g.index ? g.toNonIndexed() : g, c = new Float32Array(n.getAttribute('position').count * 3).fill(v); n.setAttribute('color', new THREE.BufferAttribute(c, 3)); return n; };
  const ball = (r: number, x: number, y: number, z: number, sy = 1) => tone(new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z), 1);
  const trunk = (r: number, h: number) => tone(new THREE.CylinderGeometry(r * 0.7, r, h, 6).translate(0, h / 2, 0), 0.3);
  switch (kind) {
    case 'broad': return merged([trunk(0.13, 1), ball(0.74, 0, 1.5, 0, 0.86), ball(0.56, 0.5, 1.28, 0.2, 0.84), ball(0.52, -0.44, 1.34, -0.28, 0.84), ball(0.46, 0.06, 1.98, -0.1, 0.8)]);
    case 'poplar': return merged([trunk(0.1, 0.8), ball(0.44, 0, 2.2, 0, 3.6)]);
    case 'conifer': return merged([trunk(0.12, 0.5), tone(new THREE.ConeGeometry(0.74, 1.3, 9).translate(0, 1.1, 0), 1), tone(new THREE.ConeGeometry(0.56, 1.1, 9).translate(0, 1.9, 0), 1), tone(new THREE.ConeGeometry(0.36, 1, 9).translate(0, 2.6, 0), 1)]);
    case 'palm': {
      const parts = [tone(new THREE.CylinderGeometry(0.07, 0.11, 2.5, 6).translate(0, 1.25, 0), 0.42)];
      for (let i = 0; i < 9; i++) parts.push(tone(new THREE.ConeGeometry(0.2, 1.25, 4).scale(1, 1, 0.3).rotateZ(-Math.PI / 2 - 0.42).translate(0.56, 2.36, 0).rotateY((i / 9) * Math.PI * 2), 1));
      return merged(parts);
    }
    case 'shrub': return merged([ball(0.9, 0, 0.5, 0, 0.62), ball(0.6, 0.6, 0.36, 0.3, 0.6)]);
    default: return merged([trunk(0.11, 0.9), ball(0.66, 0, 1.4, 0, 0.8), ball(0.5, 0.36, 1.7, 0.16, 0.78)]);
  }
}

// A broken piece: the smallest solid that holds a handful of points, so every face of it is flat. Long one way, and
// narrower at one end.
function shard(long: number, r: () => number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [], n = 9 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = 0.62 + 0.38 * r(), thin = 1 - 0.55 * (u * 0.5 + 0.5);
    pts.push(new THREE.Vector3(s * Math.cos(a) * k * thin, u * k * long, s * Math.sin(a) * k * thin));
  }
  return new ConvexGeometry(pts);
}

export interface Blockout {
  // Looks from so many degrees above.
  view(el: number): void;
  // Looks at the whole of it, or closely at one part.
  close(at: Close): void;
  // The cursor's light, as places across and down the host, 0 to 1.
  lamp(x: number, y: number): void;
  dispose(): void;
}

export async function mountBlockout(host: HTMLElement, tier: Tier, el: number, at: Close = 'whole'): Promise<Blockout> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  const stage = new Stage(host, canvas, { tier, fov: 8, near: 0.3, far: 40, bloom: { strength: 0.2, threshold: 1.3, radius: 0.45 }, ao: 0.03, aoIntensity: 1, aoSamples: 12, aoScale: 0.5, bloomScale: 0.5, envIntensity: LIGHT.env, env: 'studio', lampAngle: 0.9 });
  trueDarks(stage.renderer);
  finish(stage, FADE);
  const s = stage.scene, root = new THREE.Group(), r = seeded(9041);
  root.scale.setScalar(M);
  s.add(root);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, cast = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    return mesh;
  };

  // What is left of the planet's body, from the description of it.
  const span = WORLD.half + 34, low = RIM + WORLD.deep + 34;
  const body = await surface(rock, [-span, -low, -span], [Math.ceil((2 * span) / CELL), Math.ceil((low + 76) / CELL), Math.ceil((2 * span) / CELL)], CELL, CREASE * D2R);
  add(body, stony(false, true));
  await slice();
  const { buildings, trees } = city();
  add(landMesh(), paved()).customDepthMaterial = edged(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  await slice();

  // What stands on it.
  const pile = new Built(), tint = (kind: number, k: number): THREE.Color => ink(kind === KIND.stone || kind === KIND.plain || kind === KIND.coursed ? INK.stone[Math.floor(k * 3) % 3] : kind === KIND.bronze ? INK.bronze[Math.floor(k * 2) % 2] : kind === KIND.glass ? INK.glass : kind === KIND.gold ? INK.gold : kind === KIND.copper ? INK.copper : INK.dark);
  const crowns: Record<Plant, { m: THREE.Matrix4; c: THREE.Color }[]> = { broad: [], poplar: [], conifer: [], palm: [], shrub: [], bloom: [] };
  const grow = (kind: Plant, m: THREE.Matrix4, hue: number) => crowns[kind].push({ m, c: ink(LEAF[kind][Math.floor(hue * LEAF[kind].length) % LEAF[kind].length]).multiplyScalar(0.82 + 0.36 * ((hue * 7.3) % 1)) });
  for (const b of buildings) { const to = seat(b.x, b.z, 0, b.turn, b.lean); for (const [g, kind] of built(b, r)) pile.add(g, to, kind, tint(kind, b.seed), b.seed); }
  for (const t of trees) grow(t.kind, seat(t.x, t.z, 0, t.hue * 6).multiply(new THREE.Matrix4().makeScale(t.size, t.size * (0.9 + 0.3 * t.hue), t.size)), t.hue);
  const origin = seat(0, 0);
  for (const [g, kind] of spire()) pile.add(g, origin, kind, tint(kind, 0.4), 0.37);
  // The pyramid: stone laid in courses, under a gold cap, on a court of its own.
  const pyr = seat(PYRAMID.x, PYRAMID.z, 2), cap = 0.14;
  pile.add(prism(PYRAMID.base, PYRAMID.base, PYRAMID.tall * (1 - cap), cap), pyr, KIND.coursed, ink(INK.stone[2]), 0.5);
  pile.add(prism(PYRAMID.base * cap, PYRAMID.base * cap, PYRAMID.tall * cap, 0.01, PYRAMID.tall * (1 - cap)), pyr, KIND.gold, ink(INK.gold), 0.5);
  pile.add(box(PYRAMID.base + 26, 4, PYRAMID.base + 26, 0, -3), pyr, KIND.plain, ink(INK.stone[1]), 0.5);
  await slice();

  // What broke away.
  const chunks: THREE.BufferGeometry[] = [], tops: THREE.BufferGeometry[] = [], q = new THREE.Quaternion(), v = new THREE.Vector3();
  const landed = (p: Piece) => {
    // A great piece that still carries a piece of the land: flat on top, torn underneath.
    const rim: THREE.Vector3[] = [], pts: THREE.Vector3[] = [], m = 9, R = p.r;
    for (let i = 0; i < m; i++) { const a = ((i + 0.6 * r()) / m) * Math.PI * 2, k = 0.74 + 0.26 * r(); rim.push(new THREE.Vector3(Math.cos(a) * k * R, 0, Math.sin(a) * k * R)); }
    pts.push(...rim);
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, k = 0.46 + 0.34 * r(); pts.push(new THREE.Vector3(Math.cos(a) * k * R, -(0.3 + 0.25 * r()) * R, Math.sin(a) * k * R)); }
    for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2, k = 0.26 * r(); pts.push(new THREE.Vector3(Math.cos(a) * k * R, -(0.85 + 0.5 * r()) * R, Math.sin(a) * k * R)); }
    const to = new THREE.Matrix4().compose(new THREE.Vector3(...p.at), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5)), new THREE.Vector3(1, 1, 1));
    const fan: number[] = [], col: number[] = [], c = ink(p.land === 'sand' ? INK.sand : INK.paving);
    for (let i = 0; i < m; i++) { const a = rim[i], b = rim[(i + 1) % m]; fan.push(0, 0.6, 0, b.x * 0.97, 0.6, b.z * 0.97, a.x * 0.97, 0.6, a.z * 0.97); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
    const top = new THREE.BufferGeometry();
    top.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3));
    top.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    top.computeVertexNormals();
    chunks.push(new ConvexGeometry(pts).applyMatrix4(to));
    tops.push(top.applyMatrix4(to));
    if (p.land === 'sand') return;
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, k = 0.5 * Math.sqrt(r()) * R, bw = (0.1 + 0.08 * r()) * R, bh = (0.14 + 0.5 * r() * (1 - k / (0.5 * R))) * R, kind = r() < 0.5 ? KIND.stone : KIND.bronze, seed = r();
      pile.add(box(bw, bh, bw), to.clone().multiply(new THREE.Matrix4().makeTranslation(Math.cos(a) * k, 0.6, Math.sin(a) * k)), kind, tint(kind, seed), seed);
    }
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, k = (0.3 + 0.4 * r()) * R, size = 0.07 * R; grow(i % 2 ? 'broad' : 'bloom', to.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * k, 0.6, Math.sin(a) * k), new THREE.Quaternion(), new THREE.Vector3(size, size, size))), r()); }
  };
  for (const p of debris()) {
    if (p.kind === 'slab') { landed(p); continue; }
    // A locked piece keeps its narrow end to the core. One in orbit lies along its way round. A small one tumbles.
    if (p.kind === 'locked') q.setFromUnitVectors(up, v.set(CORE.at[0] - p.at[0], CORE.at[1] - p.at[1], CORE.at[2] - p.at[2]).normalize());
    else if (p.kind === 'orbit') q.setFromUnitVectors(up, v.set(p.at[2], 0.3 * (r() - 0.5) * Math.hypot(p.at[0], p.at[2]), -p.at[0]).normalize());
    else q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    chunks.push(shard(p.long, r).applyMatrix4(new THREE.Matrix4().compose(v.set(...p.at), q, new THREE.Vector3(p.r, p.r, p.r))));
  }
  add(pile.geometry(), walled(s.environment as THREE.Texture | null));
  add(merged(chunks), stony(true, false));
  add(merged(tops), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, flatShading: true }));
  const leafy = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
  for (const kind of Object.keys(crowns) as Plant[]) {
    const list = crowns[kind];
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(plantForm(kind), leafy, list.length);
    list.forEach((t, i) => { mesh.setMatrixAt(i, t.m); mesh.setColorAt(i, t.c); });
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  await slice();

  // The core and the stream. Its light is in the hollow, with shadows of its own.
  const hot = new THREE.Color(hex('hot')), fire = new THREE.MeshBasicMaterial({ color: hot.clone().multiplyScalar(2.6) });
  // A ball and not a disc: brightest where it faces the eye.
  const ball = new THREE.ShaderMaterial({
    uniforms: { uHot: { value: hot } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 p = modelViewMatrix * vec4( position, 1.0 ); vN = normalMatrix * normal; vV = - p.xyz; gl_Position = projectionMatrix * p; }',
    fragmentShader: 'uniform vec3 uHot; varying vec3 vN; varying vec3 vV; void main() { float k = max( 0.0, dot( normalize( vN ), normalize( vV ) ) ); gl_FragColor = vec4( uHot * ( 0.9 + 2.6 * k * k ), 1.0 ); }',
  });
  add(new THREE.SphereGeometry(CORE.r, 40, 24).translate(...CORE.at), ball, false).receiveShadow = false;
  const fall = 900;
  add(new THREE.CylinderGeometry(3.4, 2, fall, 10).translate(CORE.at[0], CORE.at[1] - CORE.r - fall / 2 + 8, CORE.at[2]), fire, false).receiveShadow = false;
  add(new THREE.SphereGeometry(1.7, 10, 8).translate(0, SPIRE.tall, 0), fire, false).receiveShadow = false;
  const glow = new THREE.PointLight(hot, LIGHT.core, 0, 2);
  glow.position.set(...CORE.at).multiplyScalar(M);
  glow.castShadow = true;
  glow.shadow.mapSize.setScalar(GLOW[tier]);
  glow.shadow.camera.near = 0.02;
  glow.shadow.camera.far = 3;
  glow.shadow.bias = -0.003;
  glow.shadow.radius = 2.5;
  glow.shadow.autoUpdate = false;
  s.add(glow);

  const moon = new THREE.DirectionalLight(hex('pale'), LIGHT.moon), reach = 980 * M;
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(SHADOW[tier]);
  Object.assign(moon.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: 9 });
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.0016;
  moon.shadow.autoUpdate = false;
  s.add(moon, moon.target, new THREE.HemisphereLight(0xa08c78, 0x1c1410, LIGHT.sky));
  stage.lamp.intensity = LIGHT.lamp;
  stage.lamp.castShadow = false;

  let lampUV = { x: 0.6, y: 0.3 }, alive = true, seen = true, stale = true, drawn = 0;
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(), back = new THREE.Vector3();
  const place = () => {
    const cam = stage.camera, e = el * D2R, d = VIEW.back * M, near = CLOSE[at], by = near ? near.by : 1;
    // The spire's tip keeps its place in the host whatever the view. A close view looks at its own place, drawn a
    // third of the way down the host, which is the middle of a screen scrolled to the host's top.
    if (near) aim.set(near.at[0] * M, near.at[1] * M, near.at[2] * M);
    else aim.set(0, (SPIRE.tall - (HOST.tall / 2 - HOST.over) / Math.cos(e)) * M, 0);
    cam.fov = (2 * Math.atan((HOST.tall * M) / (2 * d * by))) / D2R;
    cam.aspect = stage.width / Math.max(1, stage.height);
    cam.position.set(aim.x, aim.y + d * Math.sin(e), aim.z + d * Math.cos(e));
    cam.lookAt(aim);
    cam.updateMatrixWorld(true);
    cam.matrixWorld.extractBasis(right, upv, back);
    if (near) { cam.position.addScaledVector(upv, (-0.2 * HOST.tall * M) / by); cam.updateMatrixWorld(true); }
    cam.updateProjectionMatrix();
    const mid = new THREE.Vector3(0, -420 * M, 0);
    moon.target.position.copy(mid);
    moon.position.set(...MOONWARD).normalize().multiplyScalar(4.5).add(mid);
    stage.lamp.position.copy(aim).addScaledVector(right, (lampUV.x - 0.5) * 2.2).addScaledVector(upv, (0.5 - lampUV.y) * 2.2).addScaledVector(back, 2.6);
    stage.lamp.target.position.copy(aim);
  };
  const frame = () => {
    if (!alive || !seen || !stale) return;
    stale = false;
    place();
    if (drawn < 3 || clock.isFrozen()) { moon.shadow.needsUpdate = true; glow.shadow.needsUpdate = true; }
    drawn++;
    stage.render();
    if (drawn < 3) stale = true;
  };
  stage.resize();
  place();
  await stage.warm();
  const watch = new ResizeObserver(() => { stage.resize(); stale = true; frame(); });
  watch.observe(host);
  const seenBy = new IntersectionObserver((es) => { seen = es.some((x) => x.isIntersecting); if (seen) { stale = true; frame(); } });
  seenBy.observe(host);
  const off = clock.onFrame(frame);
  frame();

  return {
    view(to) { el = to; stale = true; frame(); },
    close(to) { at = to; stale = true; frame(); },
    lamp(x, y) { if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.004) return; lampUV = { x, y }; stale = true; },
    dispose() { alive = false; off(); watch.disconnect(); seenBy.disconnect(); stage.dispose(); canvas.remove(); },
  };
}
