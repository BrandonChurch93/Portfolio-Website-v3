import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex } from '../config/palette';
import type { Tier } from '../config/site';
import { slice } from '../world/build';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { finish, trueDarks } from '../world/tone';
import { surface } from './nets';
import { CORE, COURT, D2R, HOST, MOONWARD, PYRAMID, RIM, SPIRE, VIEW, WORLD, debris, desert, dome, edge, fractures, frontal, ground, inland, outward, park, rock, seeded, towers, trees, vents, type Building, type Piece } from './plan';

// Study 32: the stage the hero's new world stands on, in its fourth round: the high detail prototype, in stills,
// for the look. It is lit by one fixed light, the moon in the page's own sky, from behind the world and to the
// visitor's right, with real cast shadows, and by the core's own light inside the hollow, with shadows of its own.
// The cursor's light does not shape anything here: it is a glint on polished metal and nothing else. Nothing moves.

const M = 0.0015;
// The site's colors, and what is mixed from them. No blue, no green, no white, and gold at the palette's own hue.
const INK = {
  rockTop: '#7d5c3e', rockMid: '#674730', rockDeep: '#4a3122', rockSkin: '#8a6c50',
  sand: '#cba069', sandDark: '#9a7242',
  paving: '#4e3f33', street: '#221a15', plaza: '#77604b', court: '#8c7155', avenue: '#7c634a', road: '#5f4d3e',
  lawn: '#3e2b13', lawnPale: '#63461b',
  stone: ['#4a392d', '#574232', '#3e3027'], clad: ['#5a3a1e', '#6b4522'], glass: '#15100d', gold: '#e2a25c', bronze: '#b8763c', dark: '#2c2019', pier: '#7a624b',
  window: '#ffc98a',
  leaf: ['#c9742a', '#d98b33', '#b55f27', '#e19a3f', '#a8522a', '#cf7f2c'], trunk: '#2e1f15',
} as const;
const CELL = 7;
// The rock's faces are flat and its skin is smooth: an edge sharper than this, in degrees, is kept as an edge.
const CREASE = 28;
// The moon is the one light that shapes the world. The core lights the hollow, and the stream what is near its
// line. The rest is small: a little from the sky, and a dim light from in front that only what is built answers.
const LIGHT = { moon: 4.6, fill: 0.5, sky: 0.07, core: 2.4, line: 12, env: 0.09, mirror: 1, rock: 0.05, wall: 0.1, strip: 1.4, window: 1.6, crack: 3.2, glint: 1.4 };
const SHADOW: Record<Tier, number> = { high: 4096, mid: 2048, low: 1024, static: 4096 };
const GLOW: Record<Tier, number> = { high: 2048, mid: 1024, low: 512, static: 2048 };
const FADE = 0.07;
// What a part of something built is made of, as its shader knows it. The first three are walls with windows.
const KIND = { stone: 0, clad: 1, glass: 2, temple: 3, gold: 4, plain: 5, bronze: 6, dark: 7, pier: 8, lamp: 9 } as const;
// The close views: what each looks at, and how many times larger it draws it.
export const CLOSE = {
  whole: null,
  city: { at: [-40, 110, 100], by: 2.4 }, land: { at: [440, 20, 300], by: 3 }, rock: { at: [0, -290, 200], by: 1.9 },
  left: { at: [-520, -320, 300], by: 2.6 }, right: { at: [520, -300, 300], by: 2.6 }, debris: { at: [0, -780, 300], by: 1.7 },
} as const;
export type Close = keyof typeof CLOSE;

const ink = (h: string | number): THREE.Color => new THREE.Color(h);
const glsl = (h: string | number): string => { const c = ink(h); return `vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} )`; };
const f1 = (v: number): string => v.toFixed(3);
const NOISE = `
float rid( vec3 q );
float hash31( vec3 p ) { p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) ); p += dot( p, p.yxz + 33.33 ); return fract( ( p.x + p.y ) * p.z ); }
float vnoise( vec3 x ) {
  vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( hash31( i ), hash31( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ), mix( hash31( i + vec3( 0.0, 1.0, 0.0 ) ), hash31( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),
    mix( mix( hash31( i + vec3( 0.0, 0.0, 1.0 ) ), hash31( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ), mix( hash31( i + vec3( 0.0, 1.0, 1.0 ) ), hash31( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ), f.z );
}
// Noise folded at its middle: ridges with a sharp crest.
float rid( vec3 q ) { return 1.0 - abs( 2.0 * vnoise( q ) - 1.0 ); }
// The nearest and the next nearest of a scatter of points, and a number of the nearest's own.
vec3 cells( vec3 x ) {
  vec3 i = floor( x ), f = fract( x );
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for ( int a = -1; a <= 1; a ++ ) for ( int b = -1; b <= 1; b ++ ) for ( int c = -1; c <= 1; c ++ ) {
    vec3 g = vec3( float( a ), float( b ), float( c ) ), q = i + g, r = g + vec3( hash31( q ), hash31( q + 17.3 ), hash31( q + 41.7 ) ) - f;
    float d = dot( r, r );
    if ( d < d1 ) { d2 = d1; d1 = d; id = hash31( q + 5.1 ); } else if ( d < d2 ) d2 = d;
  }
  return vec3( sqrt( d1 ), sqrt( d2 ), id );
}
// A surface's normal, moved by a height worked out at the place itself: heights in view units.
vec3 bumped( vec3 at, vec3 n, float h ) {
  vec3 dx = dFdx( at ), dy = dFdy( at ), r1 = cross( dy, n ), r2 = cross( n, dx );
  float det = dot( dx, r1 );
  return normalize( abs( det ) * n - sign( det ) * ( dFdx( h ) * r1 + dFdy( h ) * r2 ) );
}`;
const up = new THREE.Vector3(0, 1, 0);
// Stands something built upright at the origin on the land at a place on the map, straight out from the planet and
// turned by so much.
function seat(x: number, z: number, lift = 0, turn = 0): THREE.Matrix4 {
  const n = new THREE.Vector3(x, WORLD.top + dome(x, z), z).normalize(), q = new THREE.Quaternion().setFromUnitVectors(up, n);
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

// The rock. Warm, in beds of differing tone that are not level, darker the deeper it lies, and each great block a
// little its own tone. Its form is the mesh's: the shader only roughens it, in beds that stand out as ledges and
// in grain, each fading out before it is finer than a pixel. Its outer skin, where the planet's own surface
// survives, is paler and dusty, and at the visitor's right it is pitted with small craters between the large ones
// the mesh has. The stream lights whatever is near its line. A loose piece keeps its beds in its own frame.
const STREAM = { top: CORE.at[1] - CORE.r, foot: -2200 } as const;
function stony(room: THREE.Texture | null, skin: boolean, loose = false): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0, flatShading: loose });
  if (room) { m.envMap = room; m.envMapIntensity = LIGHT.rock; }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${loose ? 'attribute vec3 aOwn;\n' : ''}varying vec3 vAt;\nvarying vec3 vPat;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvAt = position;\nvPat = ${loose ? 'aOwn' : 'position'};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAt;\nvarying vec3 vPat;\nfloat gSkin = 0.0, gBed = 0.0;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 p = vPat;
  float n1 = vnoise( p * 0.006 ), n2 = vnoise( p * 0.021 + 7.0 ), n3 = vnoise( p * 0.11 ), deep = ${loose ? '0.3 + 0.5 * n1' : 'clamp( - p.y / 640.0, 0.0, 1.0 )'};
  gBed = p.y * 0.03 + 2.2 * n1 + 0.5 * n2;
  float wide = max( fwidth( gBed ), 1e-3 ), f = fract( gBed ), b = floor( gBed );
  float tone = mix( hash31( vec3( b, 3.0, 1.0 ) ), hash31( vec3( b + 1.0, 3.0, 1.0 ) ), smoothstep( 1.0 - 2.0 * wide - 0.08, 1.0, f ) );
  tone = mix( 0.5, tone, 1.0 - smoothstep( 0.25, 0.8, wide ) );
  vec3 c = mix( ${glsl(INK.rockTop)}, ${glsl(INK.rockMid)}, smoothstep( 0.02, 0.34, deep ) );
  c = mix( c, ${glsl(INK.rockDeep)}, smoothstep( 0.3, 0.95, deep ) );
  c *= ( 0.93 + 0.14 * tone ) * ( 0.9 + 0.2 * n3 ) * ( 0.84 + 0.3 * vnoise( p * 0.035 + 5.0 ) ) * ( 0.88 + 0.24 * cells( p * 0.0085 ).z );
  ${skin ? `float k = pow( pow( length( p.xz ) / ${f1(WORLD.half)}, ${f1(WORLD.full)} ) + pow( max( 0.0, - p.y - ${f1(RIM)} ) / ${f1(WORLD.deep)}, ${f1(WORLD.full)} ), ${f1(1 / WORLD.full)} );
  gSkin = smoothstep( 0.9, 0.945, k ) * ( 1.0 - smoothstep( -30.0, -4.0, p.y ) );
  c = mix( c, ${glsl(INK.rockSkin)} * ( 0.8 + 0.4 * n2 ) * ( 0.92 + 0.16 * n3 ), gSkin );` : ''}
  diffuseColor.rgb = c;
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 p = vPat;
  float px = length( fwidth( p ) ), s = gBed * 3.0, sf = fract( s ), sw = max( fwidth( s ), 1e-3 );
  float ledge = smoothstep( 0.0, 0.18 + sw, sf ) * ( 1.0 - smoothstep( 0.72 - sw, 1.0, sf ) ) * ( 1.0 - smoothstep( 0.2, 0.55, sw ) );
  float grain = 0.35 * vnoise( p * 0.17 ) * ( 1.0 - smoothstep( 1.0, 3.0, px ) ) + 0.14 * vnoise( p * 0.7 ) * ( 1.0 - smoothstep( 0.3, 1.0, px ) );
  // A broken face is rough in ridges of every size, finer across its beds than along them.
  vec3 q = p * vec3( 1.0, 2.2, 1.0 );
  float rough = 1.5 * rid( q * 0.035 ) * ( 1.0 - smoothstep( 4.0, 12.0, px ) ) + 0.8 * rid( q * 0.085 + 5.0 ) * ( 1.0 - smoothstep( 2.0, 6.0, px ) ) + 0.4 * rid( q * 0.21 + 9.0 ) * ( 1.0 - smoothstep( 0.8, 2.4, px ) ) + 0.2 * rid( q * 0.5 ) * ( 1.0 - smoothstep( 0.35, 1.0, px ) );
  float broken = ${loose ? '0.0' : '0.2'} * ledge + 1.3 * vnoise( p * 0.03 + 3.0 ) + 1.7 * rough + grain;
  float worn = 0.7 * vnoise( p * 0.05 ) + 0.6 * grain;
  if ( gSkin > 0.01 && p.x > 40.0 ) {
    // Small craters: a bowl and a raised rim each, two sizes of them.
    vec3 a = cells( p * 0.03 ), b = cells( p * 0.075 + 11.0 );
    float ra = 0.2 + 0.2 * a.z, da = a.x / ra, rb = 0.18 + 0.16 * b.z, db = b.x / rb;
    worn += step( 0.84, a.z ) * 9.0 * ra * ( 0.35 * exp( - pow( ( da - 1.05 ) / 0.16, 2.0 ) ) - ( 1.0 - smoothstep( 0.45, 1.0, da ) ) ) * ( 1.0 - smoothstep( 3.0, 9.0, px ) );
    worn += step( 0.9, b.z ) * 4.0 * rb * ( 0.35 * exp( - pow( ( db - 1.05 ) / 0.16, 2.0 ) ) - ( 1.0 - smoothstep( 0.45, 1.0, db ) ) ) * ( 1.0 - smoothstep( 1.2, 3.6, px ) );
  }
  normal = bumped( - vViewPosition, normal, mix( broken, worn, gSkin ) * ${M.toFixed(5)} );
}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{
  vec3 to = vec3( ${f1(CORE.at[0])}, clamp( vAt.y, ${f1(STREAM.foot)}, ${f1(STREAM.top)} ), ${f1(CORE.at[2])} ) - vAt;
  float d = length( to ), e = max( dot( normal, normalize( ( viewMatrix * vec4( to, 0.0 ) ).xyz ) ), 0.0 ) * ${LIGHT.line.toFixed(1)} * 60.0 / ( ( d + 60.0 ) * ( 1.0 + d * d / 90000.0 ) );
  reflectedLight.directDiffuse += e * ${glsl(hex('hot'))} * RECIPROCAL_PI * diffuseColor.rgb;
}`);
  };
  return m;
}

// The land: the top of the planet as one sheet, with the dunes in it. It carries how far inside the land's edge each
// point is, so the sheet is cut where the land ends and not along the squares it was measured on, and how much of
// each point is sand and park.
function landMesh(): THREE.BufferGeometry {
  const step = 3, half = 666, n = Math.round((2 * half) / step) + 1, pos: number[] = [], idx: number[] = [], keep: number[] = [], kind: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * step, z = -half + j * step;
    pos.push(x, ground(x, z), z);
    keep.push(edge(x, z));
    kind.push(desert(x, z), park(x, z), inland(x, z), frontal(x, z));
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
// The ground, drawn on the land where it is seen and not from the land's own points: the city's paving in blocks
// with streets between them, dry grass under the belt of trees, the two courts, rippled sand, and bare rock where
// the land's front has broken off.
function paved(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKeep;\nattribute vec4 aLand;\nvarying float vKeep;\nvarying vec4 vLand;\nvarying vec2 vMap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = aKeep;\nvLand = aLand;\nvMap = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vKeep;
varying vec4 vLand;
varying vec2 vMap;${NOISE}
float band( float d, float w, float aa ) { return 1.0 - smoothstep( w - aa, w + aa, d ); }`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif ( vKeep < 0.0 ) discard;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 m = vMap;
  float aa = clamp( 0.75 * ( fwidth( m.x ) + fwidth( m.y ) ), 0.35, 6.0 ), far = 1.0 - smoothstep( 1.2, 4.0, aa );
  float r = length( m ), sand = vLand.x, lawn = vLand.y * ( 1.0 - sand );
  vec2 g = vec2( m.x * 0.978 + m.y * 0.208, m.y * 0.978 - m.x * 0.208 ) / 58.0, f = abs( fract( g ) - 0.5 ) * 58.0;
  vec3 c = ${glsl(INK.paving)} * ( 0.88 + 0.24 * mix( 0.5, hash31( vec3( floor( g * 6.0 ), 2.0 ) ), far ) );
  c = mix( c, ${glsl(INK.street)}, band( 29.0 - max( f.x, f.y ), 4.0, aa ) );
  c = mix( c, mix( ${glsl(INK.lawn)}, ${glsl(INK.lawnPale)}, smoothstep( 0.3, 0.7, vnoise( vec3( m * 0.03, 9.0 ) ) ) ) * ( 0.84 + 0.32 * vnoise( vec3( m * 0.5, 8.0 ) ) ), lawn );
  vec2 pr = m - vec2( ${f1(PYRAMID.x)}, ${f1(PYRAMID.z)} ), pq = abs( vec2( pr.x * ${f1(Math.cos(PYRAMID.turn * D2R))} - pr.y * ${f1(Math.sin(PYRAMID.turn * D2R))}, pr.x * ${f1(Math.sin(PYRAMID.turn * D2R))} + pr.y * ${f1(Math.cos(PYRAMID.turn * D2R))} ) );
  float sq = max( pq.x, pq.y );
  c = mix( c, ${glsl(INK.court)} * ( 0.9 + 0.14 * far * step( 0.5, fract( r * 0.085 ) ) ), band( r, ${f1(COURT)}, aa ) );
  c = mix( c, ${glsl(INK.court)} * ( 0.88 + 0.16 * far * step( 0.5, fract( sq * 0.075 ) ) ), band( sq, ${f1(PYRAMID.court)}, aa ) );
  c = mix( c, ${glsl(INK.rockTop)} * ( 0.7 + 0.4 * vnoise( vec3( m * 0.2, 12.0 ) ) ), ( 1.0 - smoothstep( 4.0, 16.0, vLand.z ) ) * ( 1.0 - sand ) * vLand.w );
  c = mix( c, mix( ${glsl(INK.sandDark)}, ${glsl(INK.sand)}, 0.78 + 0.22 * vnoise( vec3( m * 0.012, 5.0 ) ) ) * ( 0.95 + 0.1 * vnoise( vec3( m * 0.3, 3.0 ) ) ), sand );
  diffuseColor.rgb = c;
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  // Sand lies in ripples across the wind, which only show close up.
  vec2 m = vMap;
  float px = fwidth( m.x ) + fwidth( m.y ), ripple = sin( dot( m, vec2( 0.86, -0.5 ) ) * 1.3 + 5.0 * vnoise( vec3( m * 0.025, 2.0 ) ) );
  normal = bumped( - vViewPosition, normal, ( 0.22 * ripple * ( 1.0 - smoothstep( 0.5, 1.8, px ) ) + 0.5 * vnoise( vec3( m * 0.06, 4.0 ) ) ) * vLand.x * ${M.toFixed(5)} );
}`);
  };
  return m;
}

// Everything built, as one mesh. Each point keeps where it is on its own building and which way its wall faces, so
// the windows can be drawn on the wall, what it is made of, and how its wall is divided: how wide a window's bay is
// along each way, and where the wall's corner is, so the bays line up with the piers that stand on the wall.
type Grid = readonly [number, number, number, number];
type Part = readonly [THREE.BufferGeometry, number, Grid?];
const NOGRID: Grid = [0, 0, 0, 0];
class Built {
  private pos: number[] = []; private nor: number[] = []; private loc: number[] = []; private face: number[] = []; private tint: number[] = []; private style: number[] = []; private grid: number[] = [];
  add(g: THREE.BufferGeometry, to: THREE.Matrix4, kind: number, tint: THREE.Color, seed: number, grid: Grid = NOGRID): void {
    const n = g.index ? g.toNonIndexed() : g, p = n.getAttribute('position'), q = n.getAttribute('normal'), turn = new THREE.Matrix3().getNormalMatrix(to), v = new THREE.Vector3();
    let top = -1e9;
    for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); this.loc.push(v.x, v.y, v.z);
      v.applyMatrix4(to); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(q, i); this.face.push(v.x, v.y, v.z);
      v.applyMatrix3(turn).normalize(); this.nor.push(v.x, v.y, v.z);
      this.tint.push(tint.r, tint.g, tint.b); this.style.push(kind, seed, top); this.grid.push(grid[0], grid[1], grid[2], grid[3]);
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
    g.setAttribute('aGrid', new THREE.Float32BufferAttribute(this.grid, 4));
    return g;
  }
}
// What the built things are made of. Walls of stone, of bronze cladding and of dark glass are dark, and carry
// tall narrow windows set back in the wall, about half of them lit, in neighbourhoods and not evenly: at night a
// tower is its windows. The rest carry none: plain stone, piers, dark metal, and polished bronze and gold, which
// mirror the night and the moon. The pyramid's gold is laid in courses. The cursor's light is a glint on polished
// metal and nothing else.
function walled(room: THREE.Texture | null, lamp: { value: THREE.Vector3 }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
  if (room) { m.envMap = room; m.envMapIntensity = LIGHT.mirror; }
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLamp = lamp;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aLocal;\nattribute vec3 aFace;\nattribute vec3 aTint;\nattribute vec3 aStyle;\nattribute vec4 aGrid;\nvarying vec3 vLocal;\nvarying vec3 vFace;\nvarying vec3 vTint;\nvarying vec3 vStyle;\nvarying vec4 vGrid;\nvarying float vBack;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = aLocal;\nvFace = aFace;\nvTint = aTint;\nvStyle = aStyle;\nvGrid = aGrid;\nvBack = ( 1.0 - smoothstep( -600.0, 160.0, position.z ) ) * step( -60.0, position.y );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal;\nvarying vec3 vFace;\nvarying vec3 vTint;\nvarying vec3 vStyle;\nvarying vec4 vGrid;\nvarying float vBack;\nuniform vec3 uLamp;\nfloat gGlow = 0.0, gMetal = 0.0, gRough = 0.86, gWarm = 0.5, gDent = 0.0;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 fn = normalize( vFace ), c = vTint;
  float kind = vStyle.x, seed = vStyle.y, wall = 1.0 - smoothstep( 0.45, 0.6, abs( fn.y ) );
  if ( kind < 2.5 ) {
    bool alongX = abs( fn.z ) > abs( fn.x );
    float gw = vGrid.x > 0.0 ? ( alongX ? vGrid.x : vGrid.y ) : 3.2;
    float u = vGrid.x > 0.0 ? ( alongX ? vLocal.x - vGrid.z : vLocal.z - vGrid.w ) : atan( fn.z, fn.x ) * 8.0, gh = kind < 0.5 ? 5.4 : kind < 1.5 ? 5.0 : 4.4;
    vec2 lo = kind < 0.5 ? vec2( 0.27, 0.16 ) : kind < 1.5 ? vec2( 0.2, 0.14 ) : vec2( 0.12, 0.12 ), hi = 1.0 - lo * vec2( 1.0, 0.8 );
    vec2 cell = vec2( u / gw, vLocal.y / gh ), id = floor( cell ), f = fract( cell );
    float aa = max( fwidth( cell.x ), fwidth( cell.y ) ), fine = 1.0 - smoothstep( 0.4, 1.0, aa ), e = max( aa, 0.02 );
    float win = smoothstep( lo.x, lo.x + e, f.x ) * ( 1.0 - smoothstep( hi.x - e, hi.x, f.x ) ) * smoothstep( lo.y, lo.y + e, f.y ) * ( 1.0 - smoothstep( hi.y - e, hi.y, f.y ) );
    win = mix( ( hi.x - lo.x ) * ( hi.y - lo.y ), win, fine ) * wall * step( 8.0, vLocal.y );
    float rnd = hash31( vec3( id, seed * 91.7 ) ), share = ( kind < 1.5 ? 0.5 : 0.56 ) * ( 0.2 + 1.6 * vnoise( vec3( id * vec2( 0.17, 0.1 ), seed * 37.0 ) ) );
    // Each floor is a little its own tone, and a course runs under each row of windows.
    c *= ( 0.92 + 0.16 * hash31( vec3( id.y, seed * 13.0, 2.0 ) ) ) * ( 1.0 - 0.16 * fine * ( 1.0 - smoothstep( 0.0, 0.07, f.y ) ) );
    if ( kind > 1.5 ) { c = mix( c, ${glsl(INK.bronze)} * 0.5, 0.5 * wall ); gMetal = 0.6; gRough = 0.3; } else if ( kind > 0.5 ) { gMetal = 0.85; gRough = 0.42; }
    // Now and then a whole floor is lit, and the top floors more often than not.
    share = mix( share, 0.92, step( 0.86, hash31( vec3( id.y, seed * 5.3, 9.0 ) ) ) );
    float lit = mix( share, step( rnd, share ), fine );
    // A window is set back in the wall: dark at its head, where the wall over it shades it.
    float head = 1.0 - 0.5 * fine * smoothstep( hi.y - 0.22, hi.y, f.y );
    c = mix( c, vec3( 0.014, 0.01, 0.008 ), win );
    gMetal = mix( gMetal, 0.0, win );
    gRough = mix( gRough, 0.16, win * ( 1.0 - lit ) );
    gGlow = win * lit * ( 0.25 + 1.3 * rnd * rnd ) * head * ( 1.0 - 0.4 * vBack );
    gWarm = hash31( vec3( seed * 7.0, id.y * 0.2, 5.0 ) );
    gDent = - 0.5 * win * fine;
    c = mix( c * 0.5, c, wall );
  } else if ( kind < 3.5 ) {
    // The pyramid: polished gold laid in courses of blocks, each a shade its own.
    float course = floor( vLocal.y / 6.0 ), along = abs( fn.z ) > abs( fn.x ) ? vLocal.x : vLocal.z, stone = floor( along / 13.0 + 0.5 * mod( course, 2.0 ) );
    float aa = fwidth( vLocal.y ) / 6.0 + fwidth( along ) / 13.0, fine = 1.0 - smoothstep( 0.25, 0.7, aa );
    gMetal = 1.0; gRough = 0.31 + 0.03 * hash31( vec3( course, stone, 3.0 ) ) * fine;
    c *= 0.52 * ( 0.97 + 0.05 * hash31( vec3( course, stone, 7.0 ) ) * fine ) * ( 0.86 + 0.24 * clamp( vLocal.y / ${f1(PYRAMID.tall)}, 0.0, 1.0 ) );
    float joint = max( 1.0 - smoothstep( 0.0, 0.05, min( fract( vLocal.y / 6.0 ), 1.0 - fract( vLocal.y / 6.0 ) ) ), 0.6 * ( 1.0 - smoothstep( 0.0, 0.03, min( fract( along / 13.0 + 0.5 * mod( course, 2.0 ) ), 1.0 - fract( along / 13.0 + 0.5 * mod( course, 2.0 ) ) ) ) ) );
    c *= 1.0 - 0.14 * joint * fine;
    gDent = - 0.08 * joint * fine;
  } else if ( kind < 4.5 ) { gMetal = 1.0; gRough = 0.2 + 0.06 * vnoise( vLocal * 0.35 + seed * 9.0 ); c *= 0.6 * ( 0.94 + 0.12 * vnoise( vLocal * 0.12 + seed * 3.0 ) ) * ( 0.8 + 0.3 * ( 1.0 - clamp( ( vStyle.z - vLocal.y ) / 26.0, 0.0, 1.0 ) ) ); }
  else if ( kind < 5.5 ) { c *= 0.86 + 0.28 * vnoise( vLocal * 0.3 + seed * 9.0 ); c *= 1.0 - 0.14 * step( 0.9, fract( vLocal.y / 3.1 ) ) * ( 1.0 - smoothstep( 0.2, 0.6, fwidth( vLocal.y ) / 3.1 ) ); }
  else if ( kind < 6.5 ) { gMetal = 1.0; gRough = 0.3 + 0.1 * vnoise( vLocal * 0.4 + seed * 5.0 ); c *= 0.86 + 0.28 * vnoise( vLocal * 0.2 + seed * 5.0 ); }
  else if ( kind < 7.5 ) { gMetal = 0.85; gRough = 0.45; }
  else if ( kind < 8.5 ) { c *= 0.9 + 0.2 * vnoise( vLocal * 0.25 + seed * 4.0 ); }
  else { c = vec3( 0.02, 0.012, 0.006 ); gGlow = 1.15; gWarm = 0.2; }
  diffuseColor.rgb = c;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = gMetal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\nnormal = bumped( - vViewPosition, normal, gDent * ${M.toFixed(5)} );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix( ${glsl(hex('flame'))}, ${glsl(hex('hot'))}, 0.35 + 0.65 * gWarm ) * gGlow * ${LIGHT.window.toFixed(2)};`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.indirectDiffuse *= mix( ${LIGHT.wall.toFixed(2)}, 1.0, gMetal );
// What stands further back is dimmer, and a little of the glow behind the world is in front of it.
reflectedLight.directDiffuse *= 1.0 - 0.3 * vBack;
totalEmissiveRadiance += vec3( 0.05, 0.022, 0.006 ) * vBack * ( 1.0 - gMetal );
reflectedLight.directDiffuse += max( dot( normal, normalize( ( viewMatrix * vec4( -0.45, 0.35, 0.82, 0.0 ) ).xyz ) ), 0.0 ) * ${LIGHT.fill.toFixed(2)} * ${glsl(hex('copper-light'))} * RECIPROCAL_PI * diffuseColor.rgb * ( 1.0 - gMetal );
if ( gMetal > 0.95 ) {
  vec3 toLamp = normalize( uLamp + vViewPosition ), half_ = normalize( toLamp + normalize( vViewPosition ) );
  float d = max( dot( normal, half_ ), 0.0 );
  reflectedLight.directSpecular += diffuseColor.rgb * ( pow( d, 160.0 ) + 0.12 * pow( d, 24.0 ) ) * ${LIGHT.glint.toFixed(2)};
}`);
  };
  return m;
}
const box = (bw: number, bh: number, bd: number, x = 0, y = 0, z = 0): THREE.BufferGeometry => new THREE.BoxGeometry(bw, bh, bd).translate(x, y + bh / 2, z);
// A square block that narrows to its top by so much, with flat faces.
const prism = (w: number, d: number, h: number, top: number, y = 0, x = 0, z = 0): THREE.BufferGeometry => {
  const g = new THREE.CylinderGeometry(0.5 * Math.SQRT2 * top, 0.5 * Math.SQRT2, 1, 4, 1).rotateY(Math.PI / 4).scale(w, h, d).translate(x, y + h / 2, z).toNonIndexed();
  g.computeVertexNormals();
  return g;
};
const BAY = 4.6, FOOT = 7;
// One storey block of a tower: a wall with windows, and piers standing on it at every second bay.
function block(out: Part[], w: number, d: number, y0: number, y1: number, wall: number, pier: number, cx = 0, cz = 0, deep = 0.9): void {
  const nx = Math.max(2, 2 * Math.round(w / BAY)), nz = Math.max(2, 2 * Math.round(d / BAY)), gx = w / nx, gz = d / nz, h = y1 - y0;
  out.push([box(w, h, d, cx, y0, cz), wall, [gx, gz, cx - w / 2, cz - d / 2]]);
  for (let i = 0; i <= nx; i += 2) for (const s of [-1, 1]) out.push([box(1.3, h, deep, cx - w / 2 + i * gx, y0, cz + s * (d / 2 + deep * 0.4)), pier]);
  for (let i = 2; i < nz; i += 2) for (const s of [-1, 1]) out.push([box(deep, h, 1.3, cx + s * (w / 2 + deep * 0.4), y0, cz - d / 2 + i * gz), pier]);
}
// A tower as its parts, each with what it is made of. Every one stands on a foot of plain stone and steps back as it
// rises. Its roof is polished gold, or it carries polished bronze, or it is plain.
function tower(b: Building): Part[] {
  const w = b.w, d = b.d, H = b.tall, out: Part[] = [], k = b.seed;
  const wall = k < 0.6 ? KIND.stone : k < 0.82 ? KIND.glass : KIND.clad, trim = b.roof === 'gold' ? KIND.gold : b.roof === 'bronze' ? KIND.bronze : KIND.dark;
  const pier = wall === KIND.stone ? KIND.pier : b.roof === 'plain' ? KIND.dark : KIND.bronze, band = b.roof === 'plain' ? KIND.plain : KIND.bronze;
  const step = (s0: number, s1: number, y0: number, y1: number) => block(out, w * s0, d * s1, FOOT + y0 * H, FOOT + y1 * H, wall, pier);
  const ledge = (s: number, y: number, kind: number = band, th = 1.3) => out.push([box(w * s + 2, th, d * s + 2, 0, FOOT + y * H - th * 0.3), kind]);
  // A tower with a roof of gold or bronze wears a line of light under its crown.
  const lamp = (s: number, y: number) => { if (b.roof !== 'plain') out.push([box(w * s + 2.6, 0.8, d * s + 2.6, 0, FOOT + y * H - 2.2), KIND.lamp]); };
  const mast = (y: number, tall: number, r = 0.55) => { out.push([new THREE.CylinderGeometry(r * 0.4, r, tall, 8).translate(0, FOOT + y * H + tall / 2, 0), KIND.dark]); out.push([new THREE.SphereGeometry(r * 1.5, 10, 8).translate(0, FOOT + y * H + tall, 0), KIND.gold]); };
  out.push([box(w * 1.2, FOOT - 1.5, d * 1.2), KIND.plain], [box(w * 1.26, 1.5, d * 1.26, 0, FOOT - 1.5), band]);
  switch (b.form) {
    case 'deco':
      step(1, 1, 0, 0.52); ledge(1, 0.52); step(0.78, 0.78, 0.52, 0.76); ledge(0.78, 0.76); lamp(0.78, 0.76); step(0.56, 0.56, 0.76, 0.91); ledge(0.56, 0.91); lamp(0.56, 0.91); step(0.34, 0.34, 0.91, 0.98);
      out.push([box(w * 0.38, 1.2, d * 0.38, 0, FOOT + 0.98 * H), trim], [prism(w * 0.24, d * 0.24, H * 0.03, 0.5, FOOT + 0.98 * H + 1.2), trim]);
      mast(1.01, H * 0.13);
      break;
    case 'slab':
      step(1, 1, 0, 0.85); ledge(1, 0.85); lamp(1, 0.85); step(0.84, 0.84, 0.85, 0.97);
      out.push([box(w * 0.88, 1.5, d * 0.88, 0, FOOT + 0.97 * H), band], [box(w * 0.4, H * 0.035, d * 0.34, w * 0.1, FOOT + 0.97 * H + 1.5), KIND.plain]);
      out.push([new THREE.CylinderGeometry(0.2, 0.3, H * 0.09, 6).translate(-w * 0.24, FOOT + 0.97 * H + H * 0.045, d * 0.12), KIND.dark]);
      break;
    case 'point':
      step(1, 1, 0, 0.62); ledge(1, 0.62); step(0.8, 0.8, 0.62, 0.79); ledge(0.8, 0.79); lamp(0.8, 0.79); step(0.6, 0.6, 0.79, 0.86);
      out.push([box(w * 0.64, 1.4, d * 0.64, 0, FOOT + 0.86 * H), trim], [prism(w * 0.6, d * 0.6, H * 0.15, 0.12, FOOT + 0.86 * H + 1.4), trim]);
      out.push([new THREE.ConeGeometry(w * 0.045, H * 0.13, 8).translate(0, FOOT + 1.01 * H + 1.4 + H * 0.065, 0), trim]);
      break;
    case 'step': {
      step(1, 1, 0, 0.7); ledge(1, 0.7); lamp(1, 0.7); step(0.82, 0.82, 0.7, 0.83); ledge(0.82, 0.83, trim, 1.6);
      let y = FOOT + 0.83 * H + 1.2;
      for (const s of [0.72, 0.58, 0.44, 0.3, 0.18]) { const th = H * 0.034; out.push([box(w * s, th, d * s, 0, y), trim]); y += th; }
      out.push([new THREE.CylinderGeometry(0.3, 0.6, H * 0.06, 8).translate(0, y + H * 0.03, 0), trim]);
      break;
    }
    case 'disc': {
      step(1, 1, 0, 0.72); ledge(1, 0.72); lamp(1, 0.72); step(0.8, 0.8, 0.72, 0.85); ledge(0.8, 0.85, trim, 1.6);
      // A gold disc standing on its rim, carved as the site's Sun stones are: rings round a boss, and rays.
      const R = w * 0.44, y = FOOT + 0.85 * H + 1.3 + R + 2;
      out.push([box(w * 0.5, 2.6, d * 0.3, 0, FOOT + 0.85 * H + 1.3), trim]);
      out.push([new THREE.CylinderGeometry(R, R, 3, 56).rotateX(Math.PI / 2).translate(0, y, 0), trim]);
      for (const s of [-1, 1]) {
        out.push([new THREE.TorusGeometry(R * 0.93, 0.9, 8, 56).translate(0, y, s * 1.5), trim], [new THREE.TorusGeometry(R * 0.6, 0.6, 8, 48).translate(0, y, s * 1.5), trim]);
        out.push([new THREE.SphereGeometry(R * 0.26, 20, 12).scale(1, 1, 0.42).translate(0, y, s * 1.5), trim]);
        for (let i = 0; i < 8; i++) out.push([prism(R * 0.16, 1.2, R * 0.3, 0.1, R * 0.62).rotateZ((i / 8) * Math.PI * 2).translate(0, y, s * 1.4), trim]);
      }
      break;
    }
    case 'twin':
      for (const [s, hh] of [[-1, 1], [1, 0.86]] as const) {
        block(out, w * 0.42, d * 0.8, FOOT, FOOT + 0.86 * hh * H, wall, pier, s * w * 0.29, 0);
        block(out, w * 0.32, d * 0.6, FOOT + 0.86 * hh * H, FOOT + hh * H, wall, pier, s * w * 0.29, 0);
        out.push([box(w * 0.46, 1.3, d * 0.84, s * w * 0.29, FOOT + 0.86 * hh * H - 0.4), band], [box(w * 0.34, 1.2, d * 0.62, s * w * 0.29, FOOT + hh * H), trim]);
      }
      out.push([box(w * 0.2, H * 0.05, d * 0.36, 0, FOOT + 0.52 * H), KIND.dark], [box(w * 0.2, 1, d * 0.4, 0, FOOT + 0.57 * H), band]);
      break;
    case 'obelisk':
      // A slender shaft that carries a tall point of gold, a third of its height.
      step(1, 1, 0, 0.36); ledge(1, 0.36); step(0.84, 0.84, 0.36, 0.56); ledge(0.84, 0.56); lamp(0.84, 0.56); step(0.7, 0.7, 0.56, 0.68);
      out.push([box(w * 0.76, 1.4, d * 0.76, 0, FOOT + 0.68 * H), trim], [prism(w * 0.66, d * 0.66, H * 0.26, 0.5, FOOT + 0.68 * H + 1.4), trim], [prism(w * 0.33, d * 0.33, H * 0.07, 0.02, FOOT + 0.94 * H + 1.4), trim]);
      break;
    case 'hall':
      step(1, 1, 0, 0.82); ledge(1, 0.82); step(0.86, 0.86, 0.82, 1);
      out.push([box(w * 0.9, 1.2, d * 0.9, 0, FOOT + H), band]);
      break;
    case 'dome': {
      step(1, 1, 0, 0.62); ledge(1, 0.62, trim);
      const R = Math.min(w, d) * 0.4;
      out.push([new THREE.CylinderGeometry(R, R, 0.18 * H, 28).translate(0, FOOT + 0.71 * H, 0), KIND.plain]);
      out.push([new THREE.SphereGeometry(R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1).translate(0, FOOT + 0.8 * H, 0), trim]);
      out.push([new THREE.SphereGeometry(R * 0.14, 10, 8).translate(0, FOOT + 0.8 * H + R * 0.95, 0), KIND.gold]);
      break;
    }
    default: {
      // Bold fins of bronze up its long sides, standing over the roof as a crest.
      step(1, 1, 0, 0.9);
      out.push([box(w + 2, 1.4, d + 2, 0, FOOT + 0.9 * H), band], [box(w * 0.5, H * 0.04, d * 0.5, 0, FOOT + 0.9 * H + 1.4), KIND.plain]);
      const n = Math.max(3, Math.round(w / 9));
      for (let i = 0; i <= n; i++) for (const s of [-1, 1]) out.push([box(1.5, H * 0.99, 2.2, -w / 2 + (i * w) / n, FOOT, s * (d / 2 + 1)), KIND.bronze]);
      break;
    }
  }
  return out;
}
// The spire: a dark shaft with lit windows, standing on eight buttresses, with gold collars, the one gold ring, and
// a light at its tip.
function spire(): Part[] {
  const H = SPIRE.tall, f = SPIRE.foot;
  const profile: [number, number][] = [[f * 0.6, 16], [f * 0.5, 23], [f * 0.4, 0.19 * H], [f * 0.31, 0.43 * H], [f * 0.225, 0.7 * H], [f * 0.14, 0.86 * H], [f * 0.085, 0.88 * H], [f * 0.04, 0.91 * H], [0.9, H], [0, H]];
  const foot: [number, number][] = [[f, 0], [f, 5], [f * 0.86, 5], [f * 0.86, 9], [f * 0.6, 9], [f * 0.6, 16]];
  const parts: Part[] = [[new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40), KIND.glass], [new THREE.LatheGeometry(foot.map(([r, y]) => new THREE.Vector2(r, y)), 40), KIND.plain]];
  const fin = new THREE.Shape([[f * 0.36, 9], [f * 0.84, 9], [f * 0.8, 14], [f * 0.44, 0.2 * H], [f * 0.33, 0.37 * H], [f * 0.3, 0.37 * H], [f * 0.38, 0.2 * H]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (let i = 0; i < 8; i++) parts.push([new THREE.ExtrudeGeometry(fin, { depth: 2.4, bevelEnabled: false }).translate(0, 0, -1.2).rotateY((i / 8) * Math.PI * 2 + Math.PI / 8), i % 2 ? KIND.plain : KIND.bronze]);
  for (const k of [0.3, 0.52, 0.71]) {
    const r = f * (k < 0.43 ? 0.4 + (0.31 - 0.4) * ((k - 0.19) / 0.24) : 0.31 + (0.225 - 0.31) * ((k - 0.43) / 0.27)) + 2.4;
    parts.push([new THREE.CylinderGeometry(r, r + 0.8, 3.2, 40).translate(0, k * H, 0), KIND.gold]);
  }
  const ring = new THREE.TorusGeometry(SPIRE.ring.r, SPIRE.ring.thick, 14, 140).rotateX(Math.PI / 2);
  ring.applyMatrix4(new THREE.Matrix4().makeTranslation(0, SPIRE.ring.up * H, 0).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(SPIRE.ring.tilt[0] * D2R, 0, SPIRE.ring.tilt[1] * D2R))));
  parts.push([ring, KIND.gold]);
  return parts;
}

// A tree: a full round crown of clumps on a short trunk, about one unit to the crown's half width. Its clumps are
// shaded from the crown's middle outward, so it is soft and not a set of balls, and darker low and inside than at
// its top, as leaves shade leaves. Three of them, so no two neighbours are the same.
function treeForm(seed: number): THREE.BufferGeometry {
  const r = seeded(seed), parts: THREE.BufferGeometry[] = [], mid = new THREE.Vector3(0, 1.55, 0);
  const tone = (g: THREE.BufferGeometry, at: (p: THREE.Vector3) => number): THREE.BufferGeometry => {
    const p = g.getAttribute('position'), c = new Float32Array(p.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { const k = at(v.fromBufferAttribute(p, i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };
  const trunk = new THREE.CylinderGeometry(0.09, 0.17, 1.1, 7).translate(0, 0.55, 0).toNonIndexed();
  trunk.computeVertexNormals();
  parts.push(tone(trunk, () => -1));
  const clumps = 11 + Math.floor(r() * 3);
  for (let i = 0; i < clumps; i++) {
    const a = r() * Math.PI * 2, u = i ? r() * 1.6 - 0.75 : 0.9, s = Math.sqrt(Math.max(0, 1 - Math.min(1, Math.abs(u)) ** 2)), far = i ? 0.5 + 0.22 * r() : 0, size = i ? 0.42 + 0.2 * r() : 0.6;
    const at = new THREE.Vector3(Math.cos(a) * s * far, 1.55 + u * 0.5, Math.sin(a) * s * far), g = new THREE.IcosahedronGeometry(size, 1), p = g.getAttribute('position'), n = g.getAttribute('normal'), v = new THREE.Vector3(), o = new THREE.Vector3(), own = new THREE.Vector3();
    // A corner is moved by where it is and not by chance: the faces that share it have each their own copy of it.
    const rough = (c: THREE.Vector3): number => { const h = Math.sin(c.x * 127.1 + c.y * 311.7 + c.z * 74.7 + seed + i * 13.7) * 43758.5453; return h - Math.floor(h); };
    for (let q = 0; q < p.count; q++) {
      v.fromBufferAttribute(p, q);
      v.multiplyScalar(0.84 + 0.34 * rough(v)).add(at);
      v.y *= 0.92;
      p.setXYZ(q, v.x, v.y, v.z);
      own.fromBufferAttribute(n, q).multiplyScalar(0.4);
      o.copy(v).sub(mid).normalize().multiplyScalar(0.6).add(own).normalize();
      n.setXYZ(q, o.x, o.y, o.z);
    }
    parts.push(tone(g, (q) => 0.5 + 0.34 * Math.min(1, Math.max(0, (q.y - 0.95) / 1.1)) + 0.2 * Math.min(1, q.distanceTo(mid) / 1.05)));
  }
  return merged(parts);
}
// Leaves: each tree its own autumn color, mottled, with its trunk dark.
function leafy(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAt;\nvarying float vShade;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAt = ( instanceMatrix * vec4( position, 1.0 ) ).xyz;\nvShade = color.r;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vAt;\nvarying float vShade;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float px = length( fwidth( vAt ) ), clump = vnoise( vAt * 0.42 ), leaf = vnoise( vAt * 1.7 ) * ( 1.0 - smoothstep( 0.3, 1.1, px ) );
  vec3 own = vColor.rgb / max( 1e-3, abs( vShade ) );
  diffuseColor.rgb = vShade < 0.0 ? ${glsl(INK.trunk)} : own * vShade * ( 0.74 + 0.4 * clump + 0.26 * leaf );
}`);
  };
  return m;
}

// A broken piece is what a few planes leave of a block: every face of it flat and large and every edge sharp, as
// rock parts.
type Face = THREE.Vector3[];
const CORNERS: readonly (readonly number[])[] = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
function blockOf(hx: number, y0: number, y1: number, hz: number): Face[] {
  const c: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) c.push(new THREE.Vector3(i & 1 ? hx : -hx, i & 2 ? y1 : y0, i & 4 ? hz : -hz));
  return CORNERS.map((f) => f.map((i) => c[i].clone()));
}
// What is left of a solid on the near side of a plane, with the new face the plane leaves.
function cutBy(faces: Face[], n: THREE.Vector3, d: number): Face[] {
  const out: Face[] = [], rim: THREE.Vector3[] = [];
  for (const f of faces) {
    const keep: THREE.Vector3[] = [];
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length], da = a.dot(n) - d, db = b.dot(n) - d;
      if (da <= 0) keep.push(a);
      if (da * db < 0) { const q = a.clone().lerp(b, da / (da - db)); keep.push(q); rim.push(q); }
    }
    if (keep.length > 2) out.push(keep);
  }
  if (rim.length > 2) {
    const mid = rim.reduce((t, q) => t.add(q), new THREE.Vector3()).divideScalar(rim.length), u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)).normalize(), v = new THREE.Vector3().crossVectors(n, u), w = new THREE.Vector3();
    const cap = rim.map((q) => ({ q, a: Math.atan2(w.subVectors(q, mid).dot(v), w.dot(u)) })).sort((x, y) => x.a - y.a).map((x) => x.q).filter((q, i, l) => !i || q.distanceTo(l[i - 1]) > 1e-5);
    if (cap.length > 2) out.push(cap);
  }
  return out;
}
// A loose piece: long one way, and flatter the more of a plate it is.
function shard(long: number, flat: number, r: () => number): Face[] {
  const hz = 1 - 0.66 * flat, n = new THREE.Vector3();
  let faces = blockOf(1, -long, long, hz);
  for (let i = 0, cuts = 11 + Math.floor(r() * 7); i < cuts; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, k = Math.sqrt(1 - u * u);
    n.set(k * Math.cos(a), u, k * Math.sin(a));
    faces = cutBy(faces, n, (Math.abs(n.x) + Math.abs(n.y) * long + Math.abs(n.z) * hz) * (0.32 + 0.4 * r()));
  }
  return faces;
}
// A great piece that still carries a piece of the land: flat on top, where the land is, with a ragged outline,
// and torn to a keel underneath.
function slab(r: () => number): Face[] {
  const n = new THREE.Vector3();
  let faces = blockOf(1, -0.85, 0, 1);
  for (let i = 0; i < 14; i++) {
    const side = i < 6, a = r() * Math.PI * 2, tip = side ? 0.16 * (r() - 0.5) : -(0.35 + 0.55 * r()), k = Math.sqrt(1 - tip * tip);
    n.set(k * Math.cos(a), tip, k * Math.sin(a));
    faces = cutBy(faces, n, side ? 0.62 + 0.3 * r() : 0.45 + 0.3 * r());
  }
  return faces;
}
// Everything that broke away, as one mesh. Each point keeps where it is on its own piece, so the rock's beds lie in
// the piece's frame and not the world's.
class Rubble {
  private pos: number[] = []; private own: number[] = [];
  add(faces: Face[], to: THREE.Matrix4, size: number, seed: number): void {
    const mid = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e = new THREE.Vector3(), g = new THREE.Vector3(), w = new THREE.Vector3();
    let count = 0;
    for (const f of faces) for (const q of f) { mid.add(q); count++; }
    mid.divideScalar(Math.max(1, count));
    for (const f of faces) for (let i = 1; i < f.length - 1; i++) {
      a.copy(f[0]); b.copy(f[i]); c.copy(f[i + 1]);
      if (e.subVectors(b, a).cross(g.subVectors(c, a)).dot(w.subVectors(a, mid)) < 0) { w.copy(b); b.copy(c); c.copy(w); }
      for (const q of [a, b, c]) { this.own.push(q.x * size + seed * 913, q.y * size + seed * 517, q.z * size + seed * 271); w.copy(q).applyMatrix4(to); this.pos.push(w.x, w.y, w.z); }
    }
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aOwn', new THREE.Float32BufferAttribute(this.own, 3));
    g.computeVertexNormals();
    return g;
  }
}

// The core: a ball of the stream's light with a grained face, pale gold where it faces the eye and deep orange at
// its edge, which is hard, with a thin bright rim. Clear, with no haze round it, and never white.
function coreBall(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uPale: { value: ink(hex('pale')) }, uHot: { value: ink(hex('hot')) }, uFlame: { value: ink(hex('flame')) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main() { vec4 p = modelViewMatrix * vec4( position, 1.0 ); vN = normalMatrix * normal; vV = - p.xyz; vP = normal; gl_Position = projectionMatrix * p; }',
    fragmentShader: `uniform vec3 uPale; uniform vec3 uHot; uniform vec3 uFlame; varying vec3 vN; varying vec3 vV; varying vec3 vP;${NOISE}
void main() {
  float k = max( 0.0, dot( normalize( vN ), normalize( vV ) ) );
  // Its face is grained as a sun's is: small bright cells with darker lanes between, soft, and mottled.
  vec3 p = normalize( vP ), g = cells( p * 30.0 );
  float grain = ( 1.0 - smoothstep( 0.1, 0.7, g.x ) ) * ( 0.85 + 0.2 * g.z ) * ( 0.75 + 0.5 * vnoise( p * 6.0 + 2.0 ) );
  vec3 c = mix( uFlame * 0.95, mix( uHot, uPale, smoothstep( 0.3, 1.0, k ) ) * 1.2, smoothstep( 0.0, 0.55, k ) ) * ( 0.78 + 0.26 * grain );
  gl_FragColor = vec4( c + uHot * 0.7 * pow( 1.0 - k, 9.0 ), 1.0 );
}`,
  });
}
// A stream of the core's light: brightest down its middle, so many times as bright as the palette's color, and
// fading out toward its far end by so much.
function streamLight(fade: number, gain: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uHot: { value: ink(hex('hot')) }, uPale: { value: ink(hex('pale')) }, uFlame: { value: ink(hex('flame')) } },
    vertexShader: 'attribute vec2 aRun; varying vec2 vRun; varying vec3 vN; varying vec3 vV; void main() { vec4 p = modelViewMatrix * vec4( position, 1.0 ); vRun = aRun; vN = normalMatrix * normal; vV = - p.xyz; gl_Position = projectionMatrix * p; }',
    fragmentShader: `uniform vec3 uHot; uniform vec3 uPale; uniform vec3 uFlame; varying vec2 vRun; varying vec3 vN; varying vec3 vV;
void main() {
  float k = max( 0.0, dot( normalize( vN ), normalize( vV ) ) ), on = vRun.y * ( 1.0 - ${fade.toFixed(2)} * smoothstep( 0.25, 1.0, vRun.x ) );
  gl_FragColor = vec4( mix( uFlame, mix( uHot, uPale, 0.7 * k * k ), smoothstep( 0.0, 0.6, k ) ) * ${gain.toFixed(2)} * ( 0.45 + 0.55 * k ) * on, on );
}`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}
// A length of stream from a place straight down: how wide at its head and its foot, how long, and how bright.
function streamRun(at: readonly [number, number, number], r0: number, r1: number, long: number, heat: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r0, r1, long, 12, 8, true).translate(at[0], at[1] - long / 2, at[2]), p = g.getAttribute('position'), run = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { run[i * 2] = (at[1] - p.getY(i)) / long; run[i * 2 + 1] = heat; }
  g.setAttribute('aRun', new THREE.BufferAttribute(run, 2));
  return g;
}
// The cracks lit from inside: each a ribbon lying on the rock. Its middle is the crack, dark at its ragged walls
// and hot down its heart, and the rest of its width is the light it throws on the rock beside it.
const REACH = 4;
function crackRibbons(): THREE.BufferGeometry {
  const pos: number[] = [], data: number[] = [], idx: number[] = [], t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3();
  fractures().forEach((c, ci) => {
    const count = c.wide.length, base = pos.length / 3;
    let along = 0;
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - 1) * 3, e = Math.min(count - 1, i + 1) * 3;
      t.set(c.pts[e] - c.pts[a], c.pts[e + 1] - c.pts[a + 1], c.pts[e + 2] - c.pts[a + 2]).normalize();
      p.set(c.pts[i * 3], c.pts[i * 3 + 1], c.pts[i * 3 + 2]);
      n.set(...outward(p.x, p.y, p.z));
      b.crossVectors(n, t).normalize();
      if (i) along += Math.hypot(c.pts[i * 3] - c.pts[i * 3 - 3], c.pts[i * 3 + 1] - c.pts[i * 3 - 2], c.pts[i * 3 + 2] - c.pts[i * 3 - 1]);
      const w = c.wide[i] * 0.5 * REACH;
      for (const s of [-1, 1]) { pos.push(p.x + b.x * w * s, p.y + b.y * w * s, p.z + b.z * w * s); data.push(s, along / Math.max(0.6, c.wide[i]) + ci * 37.1, c.heat[i], i === count - 1 ? 0 : 1); }
      if (i) idx.push(base + i * 2 - 2, base + i * 2 - 1, base + i * 2, base + i * 2 - 1, base + i * 2 + 1, base + i * 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCrack', new THREE.Float32BufferAttribute(data, 4));
  g.setIndex(idx);
  return g;
}
function crackLight(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uHot: { value: ink(hex('hot')) }, uFlame: { value: ink(hex('flame')) }, uPale: { value: ink(hex('pale')) } },
    vertexShader: 'attribute vec4 aCrack; varying vec4 vCrack; void main() { vCrack = aCrack; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `uniform vec3 uHot; uniform vec3 uFlame; uniform vec3 uPale; varying vec4 vCrack;${NOISE}
void main() {
  float q = abs( vCrack.x ) * ${REACH.toFixed(2)}, s = vCrack.y, side = sign( vCrack.x ), aa = fwidth( q ) + 1e-4;
  float wall = 0.6 + 0.5 * vnoise( vec3( s * 0.9, side * 3.0, 1.0 ) ) + 0.2 * vnoise( vec3( s * 3.1, side * 5.0, 2.0 ) );
  float open = ( 1.0 - smoothstep( wall - aa, wall + aa, q ) ) * vCrack.w, heart = 1.0 - smoothstep( 0.0, 0.55 * wall, q );
  float heat = vCrack.z * ( 0.6 + 0.7 * vnoise( vec3( s * 0.22, 4.0, 7.0 ) ) );
  // Looking into it: one wall takes the light from inside and the other is in its own shadow.
  vec3 inside = mix( uFlame * ( side > 0.0 ? 0.55 : 0.06 ) * heat, mix( uHot, uPale, heart ) * ${LIGHT.crack.toFixed(2)} * heat, heart * heart );
  float spill = heat * 0.5 * pow( 1.0 - smoothstep( wall, ${REACH.toFixed(2)}, q ), 2.5 ) * vCrack.w;
  gl_FragColor = vec4( inside * open + uFlame * spill * ( 1.0 - open ), open );
}`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
}

// What polished metal mirrors: a night with light in it all round. Brightest overhead and falling to the horizon,
// so a face of gold is brighter the more it is turned up, and every face of a thing is its own shade. The glow
// that stands behind the world lies low all round and is brightest at the back. The moon is where the moon is.
// Under the horizon is the dim warm ground.
function night(): THREE.Scene {
  const s = new THREE.Scene(), moon = new THREE.Vector3(...MOONWARD).normalize();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `varying vec3 vD;
void main() {
  vec3 d = normalize( vD );
  float sky = smoothstep( -0.05, 0.9, d.y );
  vec3 c = vec3( 1.0, 0.87, 0.72 ) * ( 0.18 + 0.95 * sky * sky ) * smoothstep( -0.1, 0.03, d.y );
  c += vec3( 1.0, 0.64, 0.32 ) * 1.1 * exp( - pow( ( d.y - 0.04 ) / 0.16, 2.0 ) ) * ( 0.35 + 0.65 * ( 1.0 - smoothstep( -1.0, 0.3, d.z ) ) );
  c += vec3( 0.5, 0.3, 0.14 ) * 0.5 * smoothstep( -0.8, 0.0, d.y ) * ( 1.0 - smoothstep( -0.1, 0.03, d.y ) );
  gl_FragColor = vec4( c + vec3( 0.016, 0.01, 0.007 ), 1.0 );
}`,
  })));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.89, 0.76).multiplyScalar(22), side: THREE.DoubleSide }));
  disc.position.copy(moon).multiplyScalar(30);
  disc.lookAt(0, 0, 0);
  s.add(disc);
  return s;
}

export interface Blockout {
  // Looks from so many degrees above.
  view(el: number): void;
  // Looks at the whole of it, or closely at one part.
  close(at: Close): void;
  // The cursor, as places across and down the host, 0 to 1: a glint on polished metal.
  lamp(x: number, y: number): void;
  dispose(): void;
}

export async function mountBlockout(host: HTMLElement, tier: Tier, el: number, at: Close = 'whole'): Promise<Blockout> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  const stage = new Stage(host, canvas, { tier, fov: 8, near: 0.3, far: 40, bloom: { strength: 0.24, threshold: 1.25, radius: 0.4 }, ao: 0.03, aoIntensity: 1.2, aoSamples: 12, aoScale: 0.5, bloomScale: 0.5, envIntensity: LIGHT.env, env: night, lampAngle: 0.9 });
  trueDarks(stage.renderer);
  finish(stage, FADE);
  const s = stage.scene, root = new THREE.Group(), r = seeded(9041), lampAt = { value: new THREE.Vector3(0, 0, 4) }, room = s.environment as THREE.Texture | null;
  root.scale.setScalar(M);
  s.add(root);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, cast = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = cast;
    mesh.receiveShadow = cast;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    return mesh;
  };

  // What is left of the planet's body, from the description of it.
  const span = WORLD.half + 34, low = RIM + WORLD.deep + 34;
  const body = await surface(rock, [-span, -low, -span], [Math.ceil((2 * span) / CELL), Math.ceil((low + 76) / CELL), Math.ceil((2 * span) / CELL)], CELL, CREASE * D2R);
  add(body, stony(room, true));
  await slice();
  add(landMesh(), paved()).customDepthMaterial = edged(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  await slice();

  // What stands on it.
  const pile = new Built();
  const tint = (kind: number, k: number): THREE.Color => ink(kind === KIND.stone || kind === KIND.plain ? INK.stone[Math.floor(k * 3) % 3] : kind === KIND.clad ? INK.clad[Math.floor(k * 2) % 2] : kind === KIND.glass ? INK.glass : kind === KIND.gold || kind === KIND.temple ? INK.gold : kind === KIND.bronze ? INK.bronze : kind === KIND.pier ? INK.pier : INK.dark);
  const stand = (parts: Part[], to: THREE.Matrix4, seed: number) => { for (const [g, kind, grid] of parts) pile.add(g, to, kind, tint(kind, seed), seed, grid); };
  for (const b of towers()) stand(tower(b), seat(b.x, b.z, 0, b.turn), b.seed);
  stand(spire(), seat(0, 0), 0.37);
  // The pyramid: polished gold laid in courses, under a cap of one piece, a corner of it toward the visitor, on a
  // court with two steps to it.
  const pyr = seat(PYRAMID.x, PYRAMID.z, 3, -PYRAMID.turn * D2R), cap = 0.1;
  stand([[prism(PYRAMID.base, PYRAMID.base, PYRAMID.tall * (1 - cap), cap), KIND.temple], [prism(PYRAMID.base * cap, PYRAMID.base * cap, PYRAMID.tall * cap, 0.01, PYRAMID.tall * (1 - cap) + 0.5), KIND.gold]], pyr, 0.5);
  stand([[box(PYRAMID.base + 18, 3, PYRAMID.base + 18, 0, -3), KIND.plain], [box(PYRAMID.base + 34, 2, PYRAMID.base + 34, 0, -5), KIND.plain]], pyr, 0.5);
  await slice();

  // The trees.
  const forms = [treeForm(11), treeForm(23), treeForm(37)], foliage = leafy(), groves: { m: THREE.Matrix4; c: THREE.Color }[][] = [[], [], []];
  const grow = (m: THREE.Matrix4, tone: number, which: number) => groves[which % 3].push({ m, c: ink(INK.leaf[Math.floor(tone * INK.leaf.length) % INK.leaf.length]).multiplyScalar(0.84 + 0.32 * ((tone * 7.3) % 1)) });
  trees().forEach((t, i) => grow(seat(t.x, t.z, -0.4, t.turn).multiply(new THREE.Matrix4().makeScale(t.size, t.size * (0.94 + 0.2 * t.tone), t.size)), t.tone, i));
  await slice();

  // What broke away.
  const rubble = new Rubble(), tops: THREE.BufferGeometry[] = [], q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const landed = (p: Piece) => {
    // It lies tipped a little toward the visitor, so the land it carries is seen.
    const faces = slab(r), at = new THREE.Vector3(...p.at), lie = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.26 + 0.2 * (r() - 0.5), r() * 6, 0.24 * (r() - 0.5)));
    const to = new THREE.Matrix4().compose(at, lie, new THREE.Vector3(p.r, p.r, p.r)), pose = new THREE.Matrix4().compose(at, lie, one);
    rubble.add(faces, to, p.r, r());
    const top = faces.find((f) => f.every((c) => Math.abs(c.y) < 1e-6));
    if (!top) return;
    const mid = top.reduce((t, c) => t.add(c), new THREE.Vector3()).divideScalar(top.length), fan: number[] = [], col: number[] = [], c = ink(p.land === 'sand' ? INK.sand : INK.paving);
    for (let i = 0; i < top.length; i++) {
      const a = top[i], b = top[(i + 1) % top.length], flip = (a.z - mid.z) * (b.x - mid.x) - (a.x - mid.x) * (b.z - mid.z) < 0;
      for (const k of flip ? [mid, b, a] : [mid, a, b]) { v.set(k.x, 0.006, k.z).applyMatrix4(to); fan.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
    }
    const sheet = new THREE.BufferGeometry();
    sheet.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3));
    sheet.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    sheet.computeVertexNormals();
    tops.push(sheet);
    if (p.land !== 'city') return;
    // What stood on it still stands on it: two towers, and trees.
    const reach = Math.min(...top.map((k) => Math.hypot(k.x - mid.x, k.z - mid.z))) * p.r;
    for (let i = 0; i < 2; i++) {
      const a = r() * Math.PI * 2, k = (0.1 + 0.26 * r()) * reach, w = (0.26 + 0.1 * r()) * reach, seed = r();
      stand(tower({ x: 0, z: 0, w, d: w * (0.8 + 0.3 * r()), tall: (0.9 + 0.9 * r()) * reach, turn: 0, form: i ? 'slab' : 'deco', roof: i ? 'plain' : 'bronze', seed }), pose.clone().multiply(new THREE.Matrix4().makeTranslation(mid.x * p.r + Math.cos(a) * k, 0, mid.z * p.r + Math.sin(a) * k)).multiply(new THREE.Matrix4().makeRotationY(r() * 6)), seed);
    }
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, k = (0.5 + 0.34 * r()) * reach, size = 4.5 + 2.5 * r(); grow(pose.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(mid.x * p.r + Math.cos(a) * k, -0.3, mid.z * p.r + Math.sin(a) * k), new THREE.Quaternion(), new THREE.Vector3(size, size, size))), r(), i); }
  };
  for (const p of debris()) {
    if (p.land) { landed(p); continue; }
    // A great piece keeps one face to the core, a piece of an arm lies along its way round, and the rest have
    // turned over as they please.
    if (p.kind === 'plate') q.setFromUnitVectors(up, v.set(CORE.at[0] - p.at[0], CORE.at[1] - p.at[1], CORE.at[2] - p.at[2]).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(up, r() * 6));
    else if (p.kind === 'whirl') q.setFromUnitVectors(up, v.set(p.at[2] - CORE.at[2], -0.3 * Math.hypot(p.at[0], p.at[2] - CORE.at[2]) * (0.2 + r()), -p.at[0]).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(up, r() * 6));
    else q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    const own = r();
    rubble.add(shard(p.long, p.flat, r), new THREE.Matrix4().compose(v.set(...p.at), q, new THREE.Vector3(p.r, p.r, p.r).multiplyScalar(1.25)), p.r, own);
    // A large piece is not one clean solid: it is two or three that broke away together.
    for (let k = p.r > 22 ? 2 : p.r > 12 ? 1 : 0; k > 0; k--) {
      const size = p.r * (0.5 + 0.3 * r()), off = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 1.6 * p.long, (r() - 0.5) * (1 - 0.6 * p.flat)).multiplyScalar(1.5 * p.r).applyQuaternion(q);
      rubble.add(shard(0.8 + r(), p.flat * r(), r), new THREE.Matrix4().compose(v.set(...p.at).add(off), q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(r() - 0.5, r() - 0.5, r() - 0.5))), new THREE.Vector3(size, size, size).multiplyScalar(1.25)), size, own);
    }
  }
  add(pile.geometry(), walled(s.environment as THREE.Texture | null, lampAt));
  add(rubble.geometry(), stony(room, false, true));
  if (tops.length) add(merged(tops), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, flatShading: true }));
  groves.forEach((list, k) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(forms[k], foliage, list.length);
    list.forEach((t, i) => { mesh.setMatrixAt(i, t.m); mesh.setColorAt(i, t.c); });
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  });
  await slice();

  // The core, the stream from it, the smaller streams, and the cracks lit from inside.
  add(new THREE.SphereGeometry(CORE.r, 96, 64).translate(...CORE.at), coreBall(), false);
  const runs = [streamRun([CORE.at[0], STREAM.top + 14, CORE.at[2]], 16, 6.5, 70, 1), streamRun([CORE.at[0], STREAM.top - 56, CORE.at[2]], 6.5, 5, HOST.tall, 1)];
  add(mergeGeometries(runs, false), streamLight(0, 1.5), false);
  const leaks = vents().map((w) => streamRun(w.at, w.wide * 1.3, w.wide * 0.25, w.long, w.heat));
  if (leaks.length) add(mergeGeometries(leaks, false), streamLight(1, 1.15), false);
  const hot = new THREE.Color(hex('hot')), fire = new THREE.MeshBasicMaterial({ color: hot.clone().multiplyScalar(1.6) });
  for (const w of vents()) add(new THREE.SphereGeometry(w.wide * 1.1, 10, 8).translate(...w.at), fire, false);
  add(new THREE.SphereGeometry(1.7, 10, 8).translate(0, SPIRE.tall, 0), fire, false);
  add(crackRibbons(), crackLight(), false).renderOrder = 2;

  // The core's light in the hollow, with shadows of its own.
  const glow = new THREE.PointLight(hot, LIGHT.core, 0, 2);
  glow.position.set(...CORE.at).multiplyScalar(M);
  glow.castShadow = true;
  glow.shadow.mapSize.setScalar(GLOW[tier]);
  glow.shadow.camera.near = 0.02;
  glow.shadow.camera.far = 3;
  glow.shadow.bias = -0.003;
  glow.shadow.radius = 2;
  glow.shadow.autoUpdate = false;
  s.add(glow);

  // The moon, fixed.
  const moon = new THREE.DirectionalLight(hex('pale'), LIGHT.moon), reach = 980 * M;
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(SHADOW[tier]);
  Object.assign(moon.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: 9 });
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.0016;
  moon.shadow.autoUpdate = false;
  s.add(moon, moon.target, new THREE.HemisphereLight(0x8a7460, 0x120c08, LIGHT.sky));
  stage.lamp.intensity = 0;
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
    const mid = new THREE.Vector3(0, -330 * M, 0);
    moon.target.position.copy(mid);
    moon.position.set(...MOONWARD).normalize().multiplyScalar(4.5).add(mid);
    // The cursor: a small light in front of the world, which only polished metal answers.
    lampAt.value.copy(aim).addScaledVector(right, (lampUV.x - 0.5) * 2.6).addScaledVector(upv, (0.5 - lampUV.y) * 2.6).addScaledVector(back, 2.2).applyMatrix4(cam.matrixWorldInverse);
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
