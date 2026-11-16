import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { SOURCE, seeded } from '../../layout';
import { color, lit, stone } from '../../light';

// A few pieces of the planet hanging near the core: slow, heavy shards of its stone round the ball and beside and
// behind the beam, so the page's own shards further down are not the first. Each is dark, with the side that faces
// the core or the beam burning hot. None is ever across the beam's front. Where each is comes from what is stored
// with it and the clock alone, worked out in its shader: nothing is written again once it is made, and nothing that
// moves casts a shadow.

// Each: where it hangs, in units; how long it is; how much of the core it sees (the rock's floor stands between the
// core and those under it); how far it sways and over how many seconds; how fast it turns, in radians a second.
interface Shard { at: readonly [number, number, number]; long: number; seen: number; sway: number; period: number; turn: number }
const SHARDS: readonly Shard[] = [
  { at: [-124, -268, 230], long: 23, seen: 1, sway: 2.5, period: 13, turn: 0.05 },
  { at: [118, -292, 225], long: 20, seen: 1, sway: 2, period: 11, turn: -0.07 },
  { at: [-36, -404, 120], long: 17, seen: 0.35, sway: 2, period: 9.5, turn: 0.09 },
  { at: [44, -446, 190], long: 14, seen: 0.25, sway: 1.5, period: 12, turn: -0.06 },
  { at: [-58, -500, 150], long: 21, seen: 0.2, sway: 3, period: 14.5, turn: 0.04 },
  { at: [80, -372, 140], long: 16, seen: 0.35, sway: 2, period: 10.5, turn: 0.08 },
  { at: [26, -548, 110], long: 13, seen: 0.15, sway: 2, period: 12.5, turn: -0.1 },
];

// The beam's light on them: its color, how bright where it is full, over how many units it falls to half, and how
// far it reaches at all. As the light the page's stream lays on what broke away.
const BEAM = { color: color('hot').lerp(color('flame'), 0.35), power: 9, half: 45, reach: 260 } as const;
// How open each is to the night's light, and how rough its broken faces are.
const OPEN = 0.5, ROUGH = 0.82;

type V3 = [number, number, number];
// A broken piece: points in a long, flattened body with a few pulled out to points, and its skin drawn tight round
// them, so every face is a flat break and every edge a hard one. Its longest reach is 1.
function piece(r: () => number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const squash: V3 = [1, 0.6 + 0.25 * r(), 0.45 + 0.25 * r()];
  for (let i = 0; i < 14; i++) {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), k = 0.55 + 0.45 * r();
    pts.push(new THREE.Vector3(s * Math.cos(a) * k * squash[0], s * Math.sin(a) * k * squash[1], z * k * squash[2]));
  }
  for (let i = 0; i < 2; i++) pts.push(new THREE.Vector3((i ? -1 : 1) * (0.95 + 0.25 * r()), (r() - 0.5) * 0.5, (r() - 0.5) * 0.3));
  const g = new ConvexGeometry(pts).toNonIndexed();
  g.computeBoundingSphere();
  g.scale(1 / g.boundingSphere!.radius, 1 / g.boundingSphere!.radius, 1 / g.boundingSphere!.radius);
  g.computeVertexNormals();
  return g;
}

export function shards(still: () => boolean): { mesh: THREE.Mesh; update(t: number): void; dispose(): void } {
  const r = seeded(9091), parts: THREE.BufferGeometry[] = [];
  for (const s of SHARDS) {
    const g = piece(r), n = g.attributes.position.count;
    g.scale(s.long / 2, s.long / 2, s.long / 2);
    const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), phase = r() * Math.PI * 2;
    const fill = (k: number, v: readonly number[]) => new THREE.Float32BufferAttribute(Array.from({ length: n }, () => v).flat(), k);
    g.setAttribute('aPivot', fill(3, s.at));
    g.setAttribute('aSpin', fill(4, [axis.x, axis.y, axis.z, s.turn]));
    g.setAttribute('aSway', fill(3, [s.sway, s.period, phase]));
    g.setAttribute('aLight', fill(4, [s.seen, 1, OPEN, 0]));
    g.setAttribute('aBounce', fill(4, [0, 0, 0, 0]));
    parts.push(g);
  }
  const geometry = mergeAll(parts);
  for (const g of parts) g.dispose();
  const uniforms = { uShardTime: { value: 0 }, uBeam: { value: BEAM.color.clone() }, uBeamI: { value: new THREE.Vector3(BEAM.power, BEAM.half, BEAM.reach) } };
  const material = new THREE.MeshStandardMaterial({ color: stone(), roughness: ROUGH, metalness: 0, flatShading: true });
  const turn = /* glsl */ `
	vec3 shardTurn( vec3 v ) {
		float a = aSpin.w * uShardTime + aSway.z;
		vec3 k = aSpin.xyz;
		return v * cos( a ) + cross( k, v ) * sin( a ) + k * dot( k, v ) * ( 1.0 - cos( a ) );
	}`;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
	attribute vec3 aPivot;
	attribute vec4 aSpin;
	attribute vec3 aSway;
	uniform float uShardTime;
	varying vec3 vShardP;${turn}`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n\tobjectNormal = shardTurn( objectNormal );')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
	transformed = shardTurn( transformed ) + aPivot + vec3( 0.3, 1.0, 0.0 ) * aSway.x * sin( 6.2832 * uShardTime / aSway.y + aSway.z );
	vShardP = transformed;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
	uniform vec3 uBeam;
	uniform vec3 uBeamI;
	uniform vec2 uStream;
	varying vec3 vShardP;`)
      .replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>
	{
		// The beam: from the core's foot straight down as far as it has run, as strong as it is there.
		float below = ${SOURCE[1].toFixed(2)} - vShardP.y;
		vec3 to = vec3( ${SOURCE[0].toFixed(2)}, ${SOURCE[1].toFixed(2)} - clamp( below, 0.0, uStream.y ), ${SOURCE[2].toFixed(2)} ) - vShardP;
		float dist = max( length( to ), 1e-3 );
		float e = uStream.x * uBeamI.x * uBeamI.y * uBeamI.y / ( uBeamI.y * uBeamI.y + dist * dist ) * ( 1.0 - smoothstep( 0.5 * uBeamI.z, uBeamI.z, dist ) ) * ( 1.0 - smoothstep( uStream.y - 12.0, uStream.y, below ) );
		vec3 L = normalize( ( viewMatrix * vec4( to / dist, 0.0 ) ).xyz );
		reflectedLight.directDiffuse += uBeam * e * saturate( dot( geometryNormal, L ) ) * BRDF_Lambert( material.diffuseContribution );
	}`);
  };
  lit(material, { key: 'core-shards', baked: true, core: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return {
    mesh,
    update(t) { uniforms.uShardTime.value = still() ? 0 : t; },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

function mergeAll(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(gs[0].attributes)) {
    const k = gs[0].attributes[name].itemSize, data: number[] = [];
    for (const g of gs) data.push(...(g.attributes[name].array as Float32Array));
    out.setAttribute(name, new THREE.Float32BufferAttribute(data, k));
  }
  return out;
}
