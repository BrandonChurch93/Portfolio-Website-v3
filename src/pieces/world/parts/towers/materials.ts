import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { MOONWARD } from '../../layout';
import { METAL, lit } from '../../light';
import { NIGHT } from '../../night';
import { TONES, WARM, WINDOW } from './windows';

// The towers' three materials, which every design shares: pale stone laid in blocks, the bay (bronze, and the
// windows drawn in it, each a pane with a lit room behind it), and the world's gold. Their light is stored with
// the meshes (scripts/world/parts/towers/), so all three are lit by the baked bounce and openness as well.

const f = (v: number): string => v.toFixed(5);
const v3 = (c: readonly number[]): string => `vec3( ${f(c[0])}, ${f(c[1])}, ${f(c[2])} )`;
const lin3 = (c: THREE.Color): string => `vec3( ${f(c.r)}, ${f(c.g)}, ${f(c.b)} )`;
const lin = (name: Parameters<typeof hex>[0]): string => lin3(new THREE.Color(hex(name)));
// Deep gold, where gold mirrors little: the pyramid's own (its grade), so the world's gold is one gold.
const DEEP = 'vec3( 1.0, 0.43, 0.095 )';
// The stage's white balance (finish in src/world/tone.ts), which turns warm mid tones neutral: right for stone, and
// it took the color out of gold and of a lit room. Undone on those.
const BALANCE = 'vec3( 0.96, 1.21, 1.59 )';

// The stone: how tall a course is and how long a block, in units, and how wide a joint, for ashlar and for the
// base's channels; how much one block differs from the next, and how dark a joint is; how much of its warmth a
// pale stone, and a sandstone or a granite, keeps against the stage's white balance.
// How much of the night's soft light from the visitor's side a wall takes: the moon is behind the city, so its faces
// toward the visitor are a deep warm stone, drawn by the moon on their right edges and warmed by the windows.
const STONE = { course: [1.15, 1.5], block: [2.6, 3.6], joint: [0.05, 0.16], differ: 0.14, dark: 0.5, rough: 0.82, streak: 0.22, keep: [0.85, 1], night: 0.85 };
// The pale stone, which every stone of the towers is a tone of.
const PALE = new THREE.Color(hex('text-2')).lerp(new THREE.Color(hex('copper-light')), WARM);
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
const BAY = { bronze: 0.62, rough: 0.5, metal: 0.85, glass: 0.06, bevel: 0.07, copper: 0.3, stone: 0.9 };
// A field of windows seen from far off, where a window is a few pixels or less: it is drawn as its own wall, a warm
// stone of this tone, with only its brightest rooms lit, each a small crisp light, one at most in each block of
// windows about `dot` pixels across. Below `far[0]` pixels a window it is wholly so, above `far[1]` wholly the near
// field. A room is lit there from `lit[0]` of its level to fully at `lit[1]`, and a light smaller than a pixel is
// brightened by up to `boost` so that it gives the light of a whole one. Its dark glass shows as `grid` darker than
// the wall, filtered, so the field keeps its weave and comes to an even tone where it is finer than a pixel.
const FAR = { far: [2.4, 4.4], dot: 1.5, lit: [0.06, 0.22], boost: 4, tone: 0.32, wall: 1.05, grid: 0.22 };
// The gold mirrors the night as the pyramid's does, so the world's gold is one gold: a deep gold where it mirrors
// little, the world's gold, METAL.gold, as it mirrors more, and pale gold only in a narrow highlight (grade: the
// levels at which each begins). It mirrors the night more toward the moon (sheen: as bright where the moon's light
// is widest, as bright at its heart, and the cosine at which that heart begins) and less elsewhere (shade), and
// faces turned to the visitor's left, away from the moon, mirror the dark (left: how much darker at the most), so
// each face of a thing is its own shade. The stage's white balance is undone on it, so every gold pixel stays gold.
// The night's soft light from the visitor's side is mirrored only `front` as much (NIGHT.front in ../../night.ts):
// mirrored in full it lit every face toward the visitor one even tan, and gold read as satin, not polished.
const GOLD = { rough: 0.17, sheen: [1.1, 5, 0.9], shade: 0.6, left: 0.75, front: 0.75, city: 0.6, flank: 34, fillet: 0.18, valley: 0.3, grade: [0.12, 1.2, 5.5] };
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
float tBox( float x, float a, float b, float w ) {
	w = max( w, 1e-5 );
	return clamp( ( min( x + 0.5 * w, b ) - max( x - 0.5 * w, a ) ) / w, 0.0, 1.0 );
}
float tPulse( float x, float a, float b, float w ) {
	w = max( w, 1e-4 );
	return ( tRun( x + 0.5 * w, a, b ) - tRun( x - 0.5 * w, a, b ) ) / w;
}
vec3 tKeep( vec3 c ) {
	float k = 1.0 - smoothstep( 0.3, 0.85, max( c.r, max( c.g, c.b ) ) );
	return c / mix( vec3( 1.0 ), ${BALANCE}, k );
}`;

function stone(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: PALE, roughness: STONE.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 grain;\nattribute vec2 kind;\nvarying vec4 vGrain;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrain = vec4( grain, kind );');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec4 vGrain;${COMMON}`).replace('#include <color_fragment>', `#include <color_fragment>
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
	float tk = vGrain.w * 2.0;
	vec3 stoneIs = tk < 1.0 ? mix( ${v3(TONES[0])}, ${v3(TONES[1])}, tk ) : mix( ${v3(TONES[1])}, ${v3(TONES[2])}, tk - 1.0 );
	diffuseColor.rgb *= stoneIs * tone * ( 1.0 - ${f(STONE.dark)} * joint );
}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(STONE.night)};\n#include <lights_fragment_end>`).replace('#include <opaque_fragment>', `outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), mix( ${f(STONE.keep[0])}, ${f(STONE.keep[1])}, smoothstep( 0.0, 0.5, vGrain.w ) ) );
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-stone', baked: true, core: false });
}

function bay(map: THREE.Texture): THREE.MeshStandardMaterial {
  const fr = WINDOW.frame, [c0, c1, c2] = WINDOW.colors;
  const m = new THREE.MeshStandardMaterial({ color: METAL.bronze.clone().multiplyScalar(BAY.bronze), roughness: BAY.rough, metalness: BAY.metal });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWin = { value: map };
    sh.uniforms.uWinSize = { value: (map.image as { width: number }).width };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 cell;\nvarying vec4 vCell;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = cell;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWNorm = mat3( modelMatrix ) * objectNormal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vCell;
varying vec3 vWPos;
varying vec3 vWNorm;
uniform sampler2D uWin;
uniform float uWinSize;
${COMMON}
vec3 tTint( float w ) {
	float t = 2.0 * w;
	return t < 1.0 ? mix( ${lin(c0)}, ${lin(c1)}, t ) : mix( ${lin(c1)}, ${lin(c2)}, t - 1.0 );
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float bGlass = 0.0, bLit = 0.0, bCopper = 0.0, bStone = 0.0, bKeep = 0.0, bFar = 0.0;
vec3 bEmit = vec3( 0.0 );
vec2 bTilt = vec2( 0.0 );
vec3 bAcross = vec3( 1.0, 0.0, 0.0 );
{
	vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 );
	bAcross = vec3( wn.z, 0.0, - wn.x );
	bAcross /= max( length( bAcross ), 1e-4 );
	vec2 cs = vCell.zw;
	float frame = 0.0;
	if ( cs.x > ${f(WINDOW.style)} ) {
		// Windows let into stone: the frame is the wall's stone, of the tone the style holds, and matte.
		frame = floor( cs.x / ${f(WINDOW.style)} );
		cs.x -= frame * ${f(WINDOW.style)};
		float tk = ( frame - 1.0 ) * 0.5;
		bStone = 1.0;
		bKeep = mix( ${f(STONE.keep[0])}, ${f(STONE.keep[1])}, smoothstep( 0.0, 0.5, tk * 0.5 ) );
		diffuseColor.rgb = ${lin3(PALE)} * ${f(BAY.stone)} * ( tk < 1.0 ? mix( ${v3(TONES[0])}, ${v3(TONES[1])}, tk ) : mix( ${v3(TONES[1])}, ${v3(TONES[2])}, tk - 1.0 ) );
	}
	if ( cs.x > 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) ), id = floor( c ), p = ( c - id ) * cs;
		float fSide = min( ${f(fr.side)}, ${f(WINDOW.most.side)} * cs.x ), fSill = min( ${f(fr.sill)}, ${f(WINDOW.most.sill)} * cs.y ), fHead = min( ${f(fr.head)}, ${f(WINDOW.most.head)} * cs.y );
		vec2 a = vec2( fSide, fSill ) / cs, b = vec2( 1.0 ) - vec2( fSide, fHead ) / cs;
		float cellPx = min( 1.0 / fw.x, 1.0 / fw.y );
		bFar = 1.0 - smoothstep( ${f(FAR.far[0])}, ${f(FAR.far[1])}, cellPx );
		vec3 farEmit = vec3( 0.0 );
		if ( bFar > 0.0 ) {
			// One room at most in each block of k by k windows, chosen by the block, lit only if it is among the
			// brightest, and drawn as its glass is, filtered over the pixel so it never sparkles.
			float k = exp2( ceil( log2( max( 1.0, ${f(FAR.dot)} / cellPx ) ) ) );
			vec2 blk = floor( c / k ), pick = clamp( blk * k + floor( vec2( tHash( blk + 31.7 ), tHash( blk + 57.3 ) ) * k ), vec2( 0.0 ), vec2( uWinSize - 1.0 ) );
			vec3 dd = texelFetch( uWin, ivec2( pick ), 0 ).rgb;
			float lv = pow( dd.r, ${f(WINDOW.curve)} ) * ( 1.0 - ${f(WINDOW.blind)} * dd.b ), on = smoothstep( ${f(FAR.lit[0])}, ${f(FAR.lit[1])}, lv );
			if ( on > 0.0 ) {
				vec2 lo = pick + a, hi = pick + b;
				float cover = tBox( c.x, lo.x, hi.x, fw.x ) * tBox( c.y, lo.y, hi.y, fw.y );
				float area = ( hi.x - lo.x ) * ( hi.y - lo.y ) / max( fw.x * fw.y, 1e-8 );
				farEmit = tTint( dd.g ) * ( cover * on * lv * ${f(WINDOW.gain)} * clamp( 1.0 / max( area, 1e-3 ), 1.0, ${f(FAR.boost)} ) );
			}
		}
		bGlass = tPulse( c.x, a.x, b.x, fw.x ) * tPulse( c.y, a.y, b.y, fw.y );
		vec2 size = vec2( uWinSize );
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
			vec3 lamp = vec3( cs.x * ( 0.2 + 0.6 * s1 ), cs.y * 0.94, deep * ( 0.3 + 0.45 * s3 ) );
			float lr = length( h - lamp ), glow = 0.45 + 1.0 / ( 1.0 + 3.0 * lr * lr ), up = clamp( h.y / cs.y, 0.0, 1.0 );
			float surf = t == tz ? ( 0.6 + 0.4 * s2 ) * ( 0.5 + 0.9 * up ) : ( t == ty ? ( rl.y < 0.0 ? 0.35 : 1.4 ) : 0.6 * ( 0.45 + 0.8 * up ) );
			vec3 near = vec3( surf * glow );
			if ( s1 > 0.7 && p.x < cs.x * ( 0.18 + 0.15 * s3 ) ) near *= 0.4;
			float zf = deep * ( 0.3 + 0.35 * s2 ), tf = zf / rl.z;
			vec3 hf = vec3( p, 0.0 ) + rl * tf;
			float fx0 = cs.x * ( 0.05 + 0.5 * tHash( id + 5.7 ) ), fx1 = fx0 + cs.x * ( 0.25 + 0.4 * tHash( id + 9.9 ) ), fy1 = cs.y * ( 0.22 + 0.28 * tHash( id + 2.6 ) );
			if ( tf < t && tHash( id + 2.2 ) < 0.65 && hf.x > fx0 && hf.x < fx1 && hf.y < fy1 ) near = vec3( 0.06 + 0.45 * smoothstep( fy1 - 0.1, fy1, hf.y ) * glow );
			float top = cs.y - fHead, low = top - blind * ( cs.y - fSill - fHead );
			// The glass is set back in its frame, so the head's shadow lies across the top of the room seen.
			near *= 1.0 - 0.6 * smoothstep( top - ${f(WINDOW.reveal)}, top, p.y );
			if ( blind > 0.02 && p.y > low ) {
				float slat = tPulse( p.y / ${f(WINDOW.slat)}, 0.0, 0.72, max( fwidth( p.y ), 1e-5 ) / ${f(WINDOW.slat)} );
				near = vec3( ( 0.4 + 0.22 * slat ) * ( 0.75 + 0.35 * smoothstep( low, top, p.y ) ) * ( 1.0 - 0.5 * ( 1.0 - smoothstep( low, low + 0.07, p.y ) ) ) );
			}
			near *= ${f(WINDOW.near)};
			room = mix( room, near, detail );
			vec2 lo = vec2( fSide, fSill ), hi = cs - vec2( fSide, fHead );
			float bev = ${f(BAY.bevel)};
			float inY = step( lo.y - bev, p.y ) * step( p.y, hi.y + bev ), inX = step( lo.x - bev, p.x ) * step( p.x, hi.x + bev );
			bTilt.x = detail * inY * 0.7 * ( step( lo.x - bev, p.x ) * step( p.x, lo.x ) - step( hi.x, p.x ) * step( p.x, hi.x + bev ) );
			bTilt.y = detail * inX * 0.7 * ( step( lo.y - bev, p.y ) * step( p.y, lo.y ) - step( hi.y, p.y ) * step( p.y, hi.y + bev ) );
			bLit = ( 1.0 - bGlass ) * detail * inX * step( lo.y - ${f(WINDOW.sill)}, p.y ) * step( p.y, lo.y );
			bEmit += bLit * 0.4 * tint * level * ${f(WINDOW.gain)};
		}
		bEmit += bGlass * ${f(WINDOW.gain)} * level * tint * room;
		bEmit = mix( bEmit, farEmit, bFar );
		float glassAll = bGlass;
		bGlass *= 1.0 - bFar;
		bLit *= 1.0 - bFar;
		bTilt *= 1.0 - bFar;
		vec3 wall = bStone > 0.5 ? diffuseColor.rgb : ${lin3(PALE)} * ${f(FAR.wall)} * mix( ${v3(TONES[0])}, ${v3(TONES[1])}, ${f(FAR.tone * 2)} );
		diffuseColor.rgb = mix( diffuseColor.rgb, wall * ( 1.0 - ${f(FAR.grid)} * glassAll ), bFar );
		bKeep = mix( bKeep, ${f(STONE.keep[0])}, bFar );
	} else if ( cs.x < 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) );
		float gap = 1.0 - tPulse( c.x, 0.02, 0.98, fw.x );
		float panel = tPulse( c.x, 0.14, 0.86, fw.x ) * tPulse( c.y * 3.0, 0.1, 0.9, fw.y * 3.0 );
		diffuseColor.rgb *= ( 1.0 - 0.85 * gap ) * ( 0.8 + 0.25 * panel );
	} else {
		bCopper = vCell.y;
		diffuseColor.rgb = mix( diffuseColor.rgb, ${lin3(METAL.copper)}, bCopper );
	}
	diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.0 ), bGlass );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix( mix( mix( roughnessFactor, ${f(STONE.rough)}, max( bStone, bFar ) ), ${f(BAY.copper)}, bCopper ), ${f(BAY.glass)}, bGlass );`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix( mix( mix( metalnessFactor, 0.0, max( bStone, bFar ) ), 1.0, bCopper ), 0.0, bGlass );')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( abs( bTilt.x ) + abs( bTilt.y ) > 0.0 ) {
	vec3 vt = ( viewMatrix * vec4( bAcross, 0.0 ) ).xyz, vu = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	vec3 tilted = normal + vt * bTilt.x + vu * bTilt.y;
	normal = tilted / max( length( tilted ), 1e-5 );
}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += bEmit;')
      .replace('#include <lights_fragment_end>', `iblIrradiance *= mix( 1.0, ${f(STONE.night)}, max( bStone, bFar ) );\n#include <lights_fragment_end>`)
      .replace('#include <opaque_fragment>', `{
	float lamp = clamp( dot( bEmit, vec3( 1.0 ) ) / max( dot( outgoingLight, vec3( 1.0 ) ), 1e-5 ), 0.0, 1.0 );
	outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), max( max( max( max( bGlass, bLit ), bCopper ), bKeep ), lamp ) );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-bay', baked: true, core: false });
}

// The crown's reeds are drawn here and not built: ridges a pixel or two apart, built, alias into wavering stripes.
// Each is a hollow flute between two flat fillets, its two flanks flat, the left turned GOLD.flank degrees to the
// right and the right as far to the left, so every reed has the same lit flank and the same shaded one. A pixel is
// lit as the share of each of the three faces it covers, worked out exactly, so a reed never sparkles or wavers
// whatever its size, and where reeds are far under a pixel they come to their average.
function gold(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1 }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const sa = Math.sin(GOLD.flank * THREE.MathUtils.DEG2RAD), ca = Math.cos(GOLD.flank * THREE.MathUtils.DEG2RAD), a = GOLD.fillet * 0.5;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.uniforms.uFrontward = { value: new THREE.Vector3(...NIGHT.front.toward).normalize() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 flute;\nvarying vec3 vFlute;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlute = flute;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
uniform vec3 uFrontward;
varying vec3 vFlute;
${COMMON}
vec3 gLeft = vec3( 0.0, 0.0, 1.0 ), gRight = vec3( 0.0, 0.0, 1.0 ), gBase = vec3( 0.0, 0.0, 1.0 );
// The share of a pixel on a reed's fillets, its left flank and its right flank, and how deep the flanks lie.
vec3 gShare = vec3( 1.0, 0.0, 0.0 );
float gOn = 0.0;`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( vFlute.y > 0.5 ) {
	vec3 up = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz, across = cross( up, normal );
	across /= max( length( across ), 1e-5 );
	gBase = normal;
	gLeft = normal * ${f(ca)} + across * ${f(sa)};
	gRight = normal * ${f(ca)} - across * ${f(sa)};
	float x = vFlute.x / max( vFlute.z, 1e-4 ), fw = max( fwidth( x ), 1e-5 );
	float l = tPulse( x, ${f(a)}, 0.5, fw ), r = tPulse( x, 0.5, ${f(1 - a)}, fw );
	gShare = vec3( 1.0 - l - r, l, r );
	gOn = 1.0;
	normal = normalize( gBase * gShare.x + gLeft * gShare.y + gRight * gShare.z );
}`).replace('#include <lights_fragment_maps>', 'reflectedLight.directSpecular = goldMoon( geometryViewDir, material, reflectedLight.directSpecular, directLight.color, geometryPosition );\n' + THREE.ShaderChunk.lights_fragment_maps.replace('getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )', 'goldFluted( geometryViewDir, geometryNormal, material.roughness )')).replace('void main() {', `#ifdef USE_ENVMAP
vec3 goldIBL( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	vec3 r = normalize( mix( reflect( - viewDir, n ), n, pow4( rough ) ) );
	vec3 rw = normalize( inverseTransformDirection( r, viewMatrix ) );
	float m = dot( rw, uMoonward ), peak = smoothstep( ${f(GOLD.sheen[2])}, 0.998, m ), toward = smoothstep( 0.15, 0.75, m );
	float gain = mix( ${f(GOLD.shade)}, mix( ${f(GOLD.sheen[0])}, ${f(GOLD.sheen[1])}, peak ), toward ) * ( 1.0 - ${f(GOLD.left)} * smoothstep( 0.0, 0.8, - rw.x ) );
	gain *= mix( 1.0, ${f(GOLD.front)}, smoothstep( 0.2, 0.85, dot( rw, uFrontward ) ) );
	vec3 night = textureLod( envMap, envMapRotation * rw, roughnessToMip( rough ) ).rgb * envMapIntensity * gain;
	#ifdef WORLD_BAKED
		night += wBounce * ${f(GOLD.city)} * RECIPROCAL_PI * ( 0.5 + 0.5 * saturate( - rw.y + 0.5 ) );
	#endif
	return night;
}
vec3 goldFluted( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	if ( gOn < 0.5 ) return goldIBL( viewDir, n, rough );
	float deep = 1.0 - ${f(GOLD.valley)};
	return gShare.x * goldIBL( viewDir, gBase, rough ) + deep * ( gShare.y * goldIBL( viewDir, gLeft, rough ) + gShare.z * goldIBL( viewDir, gRight, rough ) );
}
#endif
// The moon and the cursor's glint on the reeds, on each of the three faces by its share. The gold takes no shadow,
// so the moon's light is as the stage's loop left it.
vec3 goldMoon( const in vec3 viewDir, const in PhysicalMaterial mat, const in vec3 lit, const in vec3 moon, const in vec3 at ) {
	#if NUM_DIR_LIGHTS > 0
		if ( gOn < 0.5 ) return lit;
		vec3 L = directionalLights[ 0 ].direction, sum = vec3( 0.0 );
		#ifdef WORLD_GLINT
			vec3 G = normalize( uGlintAt - at );
		#endif
		for ( int k = 0; k < 3; k ++ ) {
			vec3 n = k == 0 ? gBase : ( k == 1 ? gLeft : gRight );
			float w = k == 0 ? gShare.x : ( k == 1 ? gShare.y : gShare.z );
			sum += w * moon * saturate( dot( n, L ) ) * BRDF_GGX( L, viewDir, n, mat );
			#ifdef WORLD_GLINT
				sum += w * uGlint * saturate( dot( n, G ) ) * BRDF_GGX( G, viewDir, n, mat );
			#endif
		}
		return sum;
	#else
		return lit;
	#endif
}
void main() {`).replace('#include <opaque_fragment>', `{
	float lv = max( outgoingLight.r, 0.0 );
	vec3 c = mix( mix( ${DEEP}, ${lin3(METAL.gold)}, smoothstep( ${f(GOLD.grade[0])}, ${f(GOLD.grade[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GOLD.grade[1])}, ${f(GOLD.grade[2])}, lv ) );
	outgoingLight = tKeep( c * lv );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-gold', baked: true, core: false, glint: true });
}

export interface TowerMaterials { stone: THREE.MeshStandardMaterial; bay: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; dispose(): void }

export function materials(map: THREE.Texture): TowerMaterials {
  const all = { stone: stone(), bay: bay(map), gold: gold() };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}
