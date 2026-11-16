import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { MOONWARD } from '../../layout';
import { METAL, lit } from '../../light';
import { WINDOW } from './windows';

// The towers' three materials, which every design shares: pale stone laid in blocks, the bay (bronze, and the
// windows drawn in it, each a pane with a lit room behind it), and the world's gold. Their light is stored with
// the meshes (scripts/world/parts/towers/), so all three are lit by the baked bounce and openness as well.

const f = (v: number): string => v.toFixed(5);
const lin = (name: Parameters<typeof hex>[0]): string => { const c = new THREE.Color(hex(name)); return `vec3( ${f(c.r)}, ${f(c.g)}, ${f(c.b)} )`; };

// The stone: how tall a course is and how long a block, in units, and how wide a joint, for ashlar and for the
// base's channels; how much one block differs from the next, and how dark a joint is.
const STONE = { course: [1.15, 1.5], block: [2.6, 3.6], joint: [0.05, 0.16], differ: 0.14, dark: 0.5, rough: 0.82, streak: 0.22, tint: [1, 0.95, 0.87] };
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
const BAY = { bronze: 0.62, rough: 0.5, metal: 0.85, glass: 0.06, bevel: 0.07 };
// The gold mirrors the night as the pyramid's does, so the world's gold is one gold: brighter about the moon (as
// bright where that light is widest, at its heart, and how near the moon its heart begins, as a cosine), with the
// warm cast taken out there so its brightest faces go to pale gold, and a deep gold elsewhere.
const GOLD = { rough: 0.17, sheen: [1.4, 9, 0.86], shade: 0.75, neutral: 1, city: 0.6, flank: 50, valley: 0.3 };
// The gold also mirrors what the bake found reaching it from round about (the city's windows, the street, the
// stone), which the night has none of, as an even light of that strength over the half of the world it faces: so
// a face turned from the moon is a deep gold and not a hole.

const COMMON = `
float tHash( vec2 p ) {
	uvec2 q = uvec2( ivec2( floor( p ) ) + 65536 );
	uint h = q.x * 1597334677u ^ q.y * 3812015801u;
	h = ( h ^ ( h >> 16 ) ) * 2246822519u;
	h ^= h >> 13;
	return float( h ) / 4294967295.0;
}
float tNoise( vec2 p ) {
	vec2 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( tHash( i ), tHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( tHash( i + vec2( 0.0, 1.0 ) ), tHash( i + vec2( 1.0 ) ), u.x ), u.y );
}
// The share of a footprint w wide, centred on x, that falls inside [a, b] of each whole number: a box filtered
// pulse, exact at any size, so a pattern finer than a pixel comes to its average and never sparkles.
float tRun( float x, float a, float b ) { return floor( x ) * ( b - a ) + clamp( fract( x ), a, b ) - a; }
float tPulse( float x, float a, float b, float w ) {
	w = max( w, 1e-4 );
	return ( tRun( x + 0.5 * w, a, b ) - tRun( x - 0.5 * w, a, b ) ) / w;
}`;

function stone(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex('text-2')).multiply(new THREE.Color(...STONE.tint)), roughness: STONE.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 grain;\nvarying vec3 vGrain;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrain = grain;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vGrain;${COMMON}`).replace('#include <color_fragment>', `#include <color_fragment>
{
	float lay = vGrain.z;
	float course = mix( ${f(STONE.course[0])}, ${f(STONE.course[1])}, lay ), block = mix( ${f(STONE.block[0])}, ${f(STONE.block[1])}, lay ), jw = mix( ${f(STONE.joint[0])}, ${f(STONE.joint[1])}, lay );
	float up = vGrain.y / course, row = floor( up ), along = vGrain.x / block + 0.5 * mod( row, 2.0 );
	vec2 fw = vec2( fwidth( vGrain.x / block ), fwidth( up ) );
	float jh = 1.0 - tPulse( up, 0.5 * jw / course, 1.0 - 0.5 * jw / course, fw.y );
	float jv = ( 1.0 - tPulse( along, 0.5 * jw / block, 1.0 - 0.5 * jw / block, fw.x ) ) * ( 1.0 - lay );
	float joint = max( jh, jv );
	float far = smoothstep( 0.3, 1.0, max( fw.x, fw.y ) );
	float tone = mix( 1.0 + ${f(STONE.differ)} * ( tHash( vec2( floor( along ), row ) + 17.0 ) - 0.5 ), 1.0, far );
	vec2 gw = fwidth( vGrain.xy );
	float fine = 1.0 - smoothstep( 0.08, 0.3, max( gw.x, gw.y ) );
	tone *= 1.0 + fine * 0.1 * ( 0.6 * tNoise( vGrain.xy * 3.0 ) + 0.4 * tNoise( vGrain.xy * 8.0 + 3.0 ) - 0.5 );
	float streak = tNoise( vec2( vGrain.x * 1.7, vGrain.y * 0.045 ) ) * 0.6 + tNoise( vec2( vGrain.x * 4.3 + 9.0, vGrain.y * 0.11 ) ) * 0.4;
	tone *= 1.0 + ${f(STONE.streak)} * ( streak - 0.5 );
	diffuseColor.rgb *= tone * ( 1.0 - ${f(STONE.dark)} * joint );
}`);
  };
  return lit(m, { key: 'towers-stone', baked: true, core: false });
}

function bay(map: THREE.Texture): THREE.MeshStandardMaterial {
  const fr = WINDOW.frame, [c0, c1, c2] = WINDOW.colors;
  const m = new THREE.MeshStandardMaterial({ color: METAL.bronze.clone().multiplyScalar(BAY.bronze), roughness: BAY.rough, metalness: BAY.metal });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWin = { value: map };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 cell;\nvarying vec4 vCell;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = cell;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWNorm = mat3( modelMatrix ) * objectNormal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vCell;
varying vec3 vWPos;
varying vec3 vWNorm;
uniform sampler2D uWin;
${COMMON}
vec3 tTint( float w ) {
	float t = 2.0 * w;
	return t < 1.0 ? mix( ${lin(c0)}, ${lin(c1)}, t ) : mix( ${lin(c1)}, ${lin(c2)}, t - 1.0 );
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float bGlass = 0.0;
vec3 bEmit = vec3( 0.0 );
vec2 bTilt = vec2( 0.0 );
vec3 bAcross = vec3( 1.0, 0.0, 0.0 );
{
	vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 );
	bAcross = vec3( wn.z, 0.0, - wn.x );
	bAcross /= max( length( bAcross ), 1e-4 );
	vec2 cs = vCell.zw;
	if ( cs.x > 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) ), id = floor( c ), p = ( c - id ) * cs;
		vec2 a = vec2( ${f(fr.side)}, ${f(fr.sill)} ) / cs, b = vec2( 1.0 ) - vec2( ${f(fr.side)}, ${f(fr.head)} ) / cs;
		bGlass = tPulse( c.x, a.x, b.x, fw.x ) * tPulse( c.y, a.y, b.y, fw.y );
		vec2 size = vec2( ${f(WINDOW.map)} );
		vec3 d = textureGrad( uWin, ( id + 0.5 ) / size, dFdx( c ) / size, dFdy( c ) / size ).rgb;
		float level = pow( d.r, ${f(WINDOW.curve)} ), blind = d.b;
		vec3 tint = tTint( d.g );
		float px = min( 1.0 / fw.x, 1.0 / fw.y ), detail = smoothstep( 2.5, 7.0, px );
		vec3 room = vec3( ${f(WINDOW.mean)} * ( 1.0 - ${f(WINDOW.blind)} * blind ) );
		if ( detail > 0.0 ) {
			vec3 r = vWPos - cameraPosition;
			r /= max( length( r ), 1e-6 );
			vec3 rl = vec3( dot( r, bAcross ), r.y, max( - dot( r, wn ), 0.05 ) );
			float deep = ${f(WINDOW.deep)};
			float tx = rl.x > 1e-4 ? ( cs.x - p.x ) / rl.x : ( rl.x < -1e-4 ? - p.x / rl.x : 1e4 );
			float ty = rl.y > 1e-4 ? ( cs.y - p.y ) / rl.y : ( rl.y < -1e-4 ? - p.y / rl.y : 1e4 );
			float tz = deep / rl.z, t = min( min( tx, ty ), tz );
			vec3 h = vec3( p, 0.0 ) + rl * t;
			float s1 = tHash( id + 7.3 ), s2 = tHash( id + 19.1 ), s3 = tHash( id + 3.1 );
			vec3 lamp = vec3( cs.x * ( 0.2 + 0.6 * s1 ), cs.y * 0.9, deep * ( 0.35 + 0.4 * s3 ) );
			float lr = length( h - lamp ), glow = 0.3 + 1.0 / ( 1.0 + 2.2 * lr * lr );
			float surf = t == tz ? 0.55 + 0.45 * s2 : ( t == ty ? ( rl.y < 0.0 ? 0.32 : 0.9 ) : 0.62 );
			vec3 near = vec3( surf * glow * ( 0.45 + 0.75 * h.y / cs.y ) );
			if ( s1 > 0.7 && p.x < cs.x * ( 0.18 + 0.15 * s3 ) ) near *= 0.45;
			float zf = deep * ( 0.3 + 0.35 * s2 ), tf = zf / rl.z;
			vec3 hf = vec3( p, 0.0 ) + rl * tf;
			float fx0 = cs.x * ( 0.05 + 0.5 * tHash( id + 5.7 ) ), fx1 = fx0 + cs.x * ( 0.25 + 0.4 * tHash( id + 9.9 ) ), fy1 = cs.y * ( 0.22 + 0.28 * tHash( id + 2.6 ) );
			if ( tf < t && tHash( id + 2.2 ) < 0.65 && hf.x > fx0 && hf.x < fx1 && hf.y < fy1 ) near = vec3( 0.1 + 0.5 * smoothstep( fy1 - 0.1, fy1, hf.y ) * glow );
			float top = cs.y - ${f(fr.head)}, low = top - blind * ( cs.y - ${f(fr.sill + fr.head)} );
			if ( blind > 0.02 && p.y > low ) near = vec3( 0.5 + 0.12 * smoothstep( low, low + 0.15, p.y ) );
			room = mix( room, near, detail );
			vec2 lo = vec2( ${f(fr.side)}, ${f(fr.sill)} ), hi = cs - vec2( ${f(fr.side)}, ${f(fr.head)} );
			float bev = ${f(BAY.bevel)};
			float inY = step( lo.y - bev, p.y ) * step( p.y, hi.y + bev ), inX = step( lo.x - bev, p.x ) * step( p.x, hi.x + bev );
			bTilt.x = detail * inY * 0.7 * ( step( lo.x - bev, p.x ) * step( p.x, lo.x ) - step( hi.x, p.x ) * step( p.x, hi.x + bev ) );
			bTilt.y = detail * inX * 0.7 * ( step( lo.y - bev, p.y ) * step( p.y, lo.y ) - step( hi.y, p.y ) * step( p.y, hi.y + bev ) );
			bEmit += ( 1.0 - bGlass ) * detail * inX * step( lo.y - 0.12, p.y ) * step( p.y, lo.y ) * 0.2 * tint * level * ${f(WINDOW.gain)};
		}
		bEmit += bGlass * ${f(WINDOW.gain)} * level * tint * room;
	} else if ( cs.x < 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) );
		float gap = 1.0 - tPulse( c.x, 0.02, 0.98, fw.x );
		float panel = tPulse( c.x, 0.14, 0.86, fw.x ) * tPulse( c.y * 3.0, 0.1, 0.9, fw.y * 3.0 );
		diffuseColor.rgb *= ( 1.0 - 0.85 * gap ) * ( 0.8 + 0.25 * panel );
	}
	diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.0 ), bGlass );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, ${f(BAY.glass)}, bGlass );`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix( metalnessFactor, 0.0, bGlass );')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( abs( bTilt.x ) + abs( bTilt.y ) > 0.0 ) {
	vec3 vt = ( viewMatrix * vec4( bAcross, 0.0 ) ).xyz, vu = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	vec3 tilted = normal + vt * bTilt.x + vu * bTilt.y;
	normal = tilted / max( length( tilted ), 1e-5 );
}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += bEmit;');
  };
  return lit(m, { key: 'towers-bay', baked: true, core: false });
}

// The crown's reeds are drawn here and not built: ridges a pixel or two apart, built, alias into wavering stripes.
// Each is rounded, its face turning from GOLD.flank degrees one way at its left to as far the other at its right,
// so the light runs across it with no hard edge. Where a reed is under a few pixels it is the average of its two
// sides, so it never comes to stripes.
function gold(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1 }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const sa2 = Math.sin(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), ca2 = Math.cos(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 flute;\nvarying vec2 vFlute;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlute = flute;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
varying vec2 vFlute;
${COMMON}
vec3 gLeft = vec3( 0.0, 0.0, 1.0 ), gRight = vec3( 0.0, 0.0, 1.0 ), gNear = vec3( 0.0, 0.0, 1.0 );
float gOn = 0.0, gValley = 0.0, gDetail = 0.0;`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( vFlute.y > 0.5 ) {
	vec3 up = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz, across = cross( up, normal );
	across /= max( length( across ), 1e-5 );
	float fw = max( fwidth( vFlute.x ), 1e-5 ), turn = ( fract( vFlute.x ) - 0.5 ) * ${f(2 * GOLD.flank * THREE.MathUtils.DEG2RAD)};
	gOn = 1.0;
	gDetail = 1.0 - smoothstep( 0.18, 0.32, fw );
	gValley = tPulse( vFlute.x + 0.05, 0.0, 0.1, fw );
	gLeft = normal * ${f(ca2)} - across * ${f(sa2)};
	gRight = normal * ${f(ca2)} + across * ${f(sa2)};
	gNear = normal * cos( turn ) + across * sin( turn );
	vec3 used = normalize( mix( normal, gNear, gDetail ) );
	normal = used;
}`).replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace('getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )', 'goldFluted( geometryViewDir, geometryNormal, material.roughness )')).replace('void main() {', `#ifdef USE_ENVMAP
vec3 goldIBL( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	vec3 r = normalize( mix( reflect( - viewDir, n ), n, pow4( rough ) ) );
	vec3 rw = normalize( inverseTransformDirection( r, viewMatrix ) );
	float m = dot( rw, uMoonward ), peak = smoothstep( ${f(GOLD.sheen[2])}, 0.995, m ), toward = smoothstep( 0.2, 0.7, m );
	float gain = mix( ${f(GOLD.shade)}, mix( ${f(GOLD.sheen[0])}, ${f(GOLD.sheen[1])}, peak * peak ), toward );
	vec3 tint = pow( vec3( 1.0, 0.86, 0.7 ), vec3( - ${f(GOLD.neutral)} * toward ) );
	vec3 night = textureLod( envMap, envMapRotation * rw, roughnessToMip( rough ) ).rgb * envMapIntensity * gain * tint;
	#ifdef WORLD_BAKED
		night += wBounce * ${f(GOLD.city)} * RECIPROCAL_PI;
	#endif
	return night;
}
vec3 goldFluted( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	if ( gOn < 0.5 ) return goldIBL( viewDir, n, rough );
	vec3 far = 0.5 * ( goldIBL( viewDir, normalize( gLeft ), rough ) + goldIBL( viewDir, normalize( gRight ), rough ) );
	vec3 near = gDetail > 0.0 ? goldIBL( viewDir, n, rough ) : far;
	return mix( far, near, gDetail ) * ( 1.0 - ${f(GOLD.valley)} * gValley );
}
#endif
void main() {`);
  };
  return lit(m, { key: 'towers-gold', baked: true, core: false, glint: true });
}

export interface TowerMaterials { stone: THREE.MeshStandardMaterial; bay: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; dispose(): void }

export function materials(map: THREE.Texture): TowerMaterials {
  const all = { stone: stone(), bay: bay(map), gold: gold() };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}
