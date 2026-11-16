import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { LIGHT, MOONWARD, SPIRE } from '../../layout';
import { METAL, lit } from '../../light';
import { WINDOW } from './windows';

// The spire's three materials, after the towers' (./towers/materials.ts), whose ideas they share so the spire is
// plainly of the same city: stone (warm polished granite in courses, its fronts fluted, the podium's channelled
// granite, pale limestone trim, and the court's paving laid in rings), the bay (bronze, and the windows drawn in it,
// each a pane with a lit room behind it), and the world's gold, which here also draws the ring's engraving. Their
// light is stored with the meshes (scripts/world/parts/spire/make.mjs).

const f = (v: number): string => v.toFixed(5);
const lin = (name: PaletteName, k = 1): string => { const c = new THREE.Color(hex(name)).multiplyScalar(k); return `vec3( ${f(c.r)}, ${f(c.g)}, ${f(c.b)} )`; };
const lin3 = (c: THREE.Color): string => `vec3( ${f(c.r)}, ${f(c.g)}, ${f(c.b)} )`;
// Two palette colors mixed, as the make script mixes them for the bake: a, toward b by t, times k.
const mix = (a: PaletteName, b: PaletteName, t: number, k: number): string => { const c = new THREE.Color(hex(a)).lerp(new THREE.Color(hex(b)), t).multiplyScalar(k); return `vec3( ${f(c.r)}, ${f(c.g)}, ${f(c.b)} )`; };

// The stones, each as the make script bakes it: its palette color and how much of it; its roughness; how tall a
// course is and how long a block, in units; how wide a joint and how dark.
const STONE = {
  granite: { color: ['text-3', 'bronze', 0.42], k: 0.4, rough: 0.34, course: 1.3, block: 3.1, joint: 0.06, dark: 0.45 },
  rusticated: { rough: 0.62, course: 1.5, joint: 0.2, dark: 0.6 },
  trim: { color: ['text-2', 'copper-light', 0.3], k: 0.42, rough: 0.7, course: 0.9, block: 2.2, joint: 0.05, dark: 0.4 },
  court: { color: ['text-3', 'bronze', 0.4], k: 0.4, rough: 0.7, ring: 1.6, block: 2.5, joint: 0.07, dark: 0.5 },
  // How much one block differs from the next, the granite's speckle, and the weather's streaks down a face.
  differ: 0.16, speckle: 0.22, streak: 0.18,
} as const;
// The court's pattern: a border of granite round the podium, rays of pale stone, and a bronze ring let into it, as
// radii in units.
const COURT = { border: [27, 31], rays: 24, ray: 0.45, from: 31, inlay: 41.5, inlayWide: 0.32 };
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
const BAY = { bronze: 0.62, rough: 0.45, metal: 0.85, glass: 0.06, bevel: 0.07 };
// The gold as the towers' gold, one gold for the world: brighter about the moon, deep elsewhere.
// deep is how much richer the gold is where it mirrors little: a gold face turned from the light shows the gold's
// own color, deeper than where it is bright.
const GOLD = { rough: 0.16, sheen: [1.4, 9, 0.86], shade: 0.75, neutral: 1, deep: 1.4, city: 0.6, flank: 50, valley: 0.3 };
// The ring's engraving: two hairlines round its flat faces, how far each is out from the band's middle, how wide a
// line is, and how much an engraved line takes from what the gold mirrors.
const ENGRAVE = { lines: [0.95, -2.65], wide: 0.28, depth: 0.7, chain: { mid: -0.85, half: 1.2, every: 1.9 } };
// The ring is the most polished gold in the world: smoother than the rest, and its faces turned from the moon
// mirror the dark night, so it is a dark band with the moon's narrow hard line along its bead and lip, and not an
// even satin. How rough, and how much of the night it mirrors where it does not face the moon. The cursor's light
// lies on it as a wider sheen than on the rest, so it slides round the band as the cursor moves: how strong, and how
// tight (a power of how near the face is to turned between the cursor and the eye).
const RING = { rough: 0.1, shade: 0.5, glint: 3, lobe: 14 };
// The fluting on the stone's front faces, drawn and not built: how much of each flute is the groove (the rest is
// the fillet between), how far its walls turn, in radians, and how much its bottom is shut in. Every so many units
// up the flutes stop at a belt, so tall.
const FLUTES = { groove: 0.76, turn: 0.75, shut: 0.22, belt: 14.6, beltTall: 0.9 };

// The moon's rim. The moon is behind the world, so a face of polished stone or metal that turns toward it as it
// turns away from the view takes a thin line of its pale light, as the sheen of a polished edge does: how strong,
// and how tightly it keeps to the edge (a power of how far the face is turned from the view). The baked share of
// the moon seen is its shadow.
const RIM = { stone: 0.6, gold: 2.4, tight: 1.0 };
// On the ring it is off: laid on every face that looks up, it turned the ring's top into one even satin.
const rim = (k: number, ring = false): string => `
#ifdef WORLD_BAKED
{
	vec3 rMoon = normalize( ( viewMatrix * vec4( uMoonward, 0.0 ) ).xyz );
	float rTo = saturate( dot( geometryNormal, rMoon ) ), rAway = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
	reflectedLight.directSpecular += ${lin(LIGHT.moon.color, LIGHT.moon.power)} * ( ${f(k)} * wLight.y * rTo * pow( rAway, ${f(RIM.tight)} ) )${ring ? ' * ( 1.0 - gRing )' : ''};
}
#endif`;

// The stage's white balance (finish in src/world/tone.ts) turns warm mid tones neutral, which took the warmth out
// of the granite, the lit rooms and the gold. It is undone on them as the towers undo it (towers/materials.ts), with
// the same numbers, so the spire is of the same city: KEEP is the balance, and how much of it the stone keeps undone.
const KEEP = { balance: [0.96, 1.21, 1.59], stone: 0.9, glass: 1 } as const;
// How much of the night's soft light from the visitor's side the stone takes, as the towers' stone does: the moon is
// behind the city, so its faces toward the visitor are a deep warm stone, drawn by the moon on their right edges.
const NIGHT = 0.55;
// The gold's grade, the towers' and the pyramid's: deep gold where it mirrors little, the world's gold, then pale
// gold, by how much it mirrors (the levels at which each begins), eased to a most so it never burns.
const GRADE = { deep: [1.0, 0.43, 0.095], at: [0.15, 1.5, 4.5], most: [0.9, 1.3] } as const;

const COMMON = `
vec3 tKeep( vec3 c ) {
	float k = 1.0 - smoothstep( 0.3, 0.85, max( c.r, max( c.g, c.b ) ) );
	return c / mix( vec3( 1.0 ), vec3( ${KEEP.balance.map(f).join(', ')} ), k );
}
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
}
// A line of width w at every whole number, filtered.
float tLine( float x, float w, float fw ) { return 1.0 - tPulse( x + 0.5, 0.5 * w, 1.0 - 0.5 * w, fw ); }`;

function stone(): THREE.MeshStandardMaterial {
  const g = STONE.granite, r = STONE.rusticated, t = STONE.trim, c = STONE.court;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: g.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: new THREE.Vector3(...MOONWARD).normalize() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 grain;\nvarying vec4 vGrain;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrain = grain;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uMoonward;\nvarying vec4 vGrain;\nfloat sRough = ${f(g.rough)}, sTilt = 0.0, sLift = 0.0, sShut = 1.0;${COMMON}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(NIGHT)};\n#include <lights_fragment_end>${rim(RIM.stone)}`).replace('#include <opaque_fragment>', `outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), ${f(KEEP.stone)} );\n#include <opaque_fragment>`).replace('#include <color_fragment>', `#include <color_fragment>
{
	int lay = int( vGrain.z + 0.5 );
	vec2 gw = fwidth( vGrain.xy );
	float fine = 1.0 - smoothstep( 0.08, 0.3, max( gw.x, gw.y ) );
	vec3 albedo;
	float tone = 1.0, joint = 0.0, dark = 0.0;
	if ( lay == 2 ) {
		// The court, laid in rings round the spire: each ring of blocks its own count, rays of pale stone, a border
		// of granite at the podium's foot, and a bronze ring let in.
		float rr = length( vGrain.xy ), th = atan( vGrain.y, vGrain.x ), fr = max( fwidth( rr ), 1e-4 );
		float ring = rr / ${f(c.ring)}, row = floor( ring ), n = max( 6.0, floor( 6.28318 * row * ${f(c.ring / c.block)} ) );
		float along = th / 6.28318 * n + 0.5 * mod( row, 2.0 ), fa = max( min( fwidth( along ), fwidth( fract( along / n + 0.5 ) * n ) ), 1e-4 );
		joint = max( tLine( ring, ${f(c.joint / c.ring)}, fr / ${f(c.ring)} ), tLine( along, ${f(c.joint / c.block)}, fa ) );
		tone = 1.0 + ${f(STONE.differ)} * ( tHash( vec2( floor( along ), row ) + 5.0 ) - 0.5 ) * ( 1.0 - smoothstep( 0.3, 1.0, fa ) );
		albedo = ${mix(...c.color, c.k)};
		dark = ${f(c.dark)};
		float rays = abs( fract( th / 6.28318 * ${f(COURT.rays)} + 0.5 ) - 0.5 ) * rr * 6.28318 / ${f(COURT.rays)};
		float ray = ( 1.0 - smoothstep( ${f(COURT.ray)} - fr, ${f(COURT.ray)} + fr, rays ) ) * step( ${f(COURT.from)}, rr );
		float border = smoothstep( ${f(COURT.border[0])} - fr, ${f(COURT.border[0])} + fr, rr ) * ( 1.0 - smoothstep( ${f(COURT.border[1])} - fr, ${f(COURT.border[1])} + fr, rr ) );
		albedo = mix( albedo, ${mix(...t.color, t.k)}, ray );
		albedo = mix( albedo, ${mix(...g.color, g.k * 0.8)}, border );
		float inlay = 1.0 - smoothstep( ${f(COURT.inlayWide * 0.5)} - fr, ${f(COURT.inlayWide * 0.5)} + fr, abs( rr - ${f(COURT.inlay)} ) );
		albedo = mix( albedo, ${lin('bronze', 0.55)}, inlay );
		sRough = mix( ${f(c.rough)}, 0.3, inlay );
	} else {
		bool rust = lay == 1, pale = lay == 3;
		float course = rust ? ${f(r.course)} : ( pale ? ${f(t.course)} : ${f(g.course)} ), block = pale ? ${f(t.block)} : ${f(g.block)};
		float jw = rust ? ${f(r.joint)} : ( pale ? ${f(t.joint)} : ${f(g.joint)} );
		float up = vGrain.y / course, row = floor( up ), along = vGrain.x / block + 0.5 * mod( row, 2.0 );
		vec2 fw = vec2( fwidth( vGrain.x / block ), fwidth( up ) );
		float jh = tLine( up, jw / course, fw.y ), jv = rust ? 0.0 : tLine( along, jw / block, fw.x );
		joint = max( jh, jv );
		float far = smoothstep( 0.3, 1.0, max( fw.x, fw.y ) );
		tone = mix( 1.0 + ${f(STONE.differ)} * ( tHash( vec2( floor( along ), row ) + 17.0 ) - 0.5 ), 1.0, far );
		float streak = tNoise( vec2( vGrain.x * 1.7, vGrain.y * 0.04 ) ) * 0.6 + tNoise( vec2( vGrain.x * 4.3 + 9.0, vGrain.y * 0.1 ) ) * 0.4;
		tone *= 1.0 + ${f(STONE.streak)} * ( streak - 0.5 );
		albedo = pale ? ${mix(...t.color, t.k)} : ${mix(...g.color, g.k)};
		dark = rust ? ${f(r.dark)} : ( pale ? ${f(t.dark)} : ${f(g.dark)} );
		sRough = rust ? ${f(r.rough)} : ( pale ? ${f(t.rough)} : ${f(g.rough)} );
		if ( !pale ) {
			// The granite's grain: pale feldspar and dark mica, only where it is larger than a pixel.
			float s1 = tNoise( vGrain.xy * 7.0 ), s2 = tNoise( vGrain.xy * 13.0 + 4.0 );
			tone *= 1.0 + fine * ${f(STONE.speckle)} * ( smoothstep( 0.62, 0.8, s1 ) - 0.8 * smoothstep( 0.66, 0.85, s2 ) );
			sRough += fine * 0.12 * ( s2 - 0.5 );
		}
	}
	tone *= 1.0 + fine * 0.08 * ( 0.6 * tNoise( vGrain.xy * 3.0 ) + 0.4 * tNoise( vGrain.xy * 8.0 + 3.0 ) - 0.5 );
	vec3 sWorldN = inverseTransformDirection( normalize( vNormal ), viewMatrix );
	if ( vGrain.w >= 0.0 && sWorldN.z > 0.97 ) {
		// The fluting: a concave groove between fillets, its walls turned across the face, gone where a flute is
		// under a few pixels so it never stipples; and every so often a plain belt the flutes stop at, its top edge
		// turned up to the night and its foot turned down.
		float fw = max( fwidth( vGrain.w ), 1e-4 ), fy = max( fwidth( vGrain.y ), 1e-4 );
		float amp = 1.0 - smoothstep( 0.22, 0.38, fw );
		float by = vGrain.y / ${f(FLUTES.belt)};
		float belt = tPulse( by, 0.0, ${f(FLUTES.beltTall / FLUTES.belt)}, fy / ${f(FLUTES.belt)} );
		float bAmp = 1.0 - smoothstep( 0.3, 0.55, fy ), edge = fract( by ) * ${f(FLUTES.belt)};
		sLift = bAmp * ( ( 1.0 - smoothstep( 0.0, 0.14, abs( edge - ${f(FLUTES.beltTall)} ) ) ) * 0.6 - ( 1.0 - smoothstep( 0.0, 0.14, edge ) ) * 0.5 );
		float t = ( fract( vGrain.w ) - ${f((1 - FLUTES.groove) / 2)} ) / ${f(FLUTES.groove)};
		float sl = clamp( 2.0 * t - 1.0, -1.0, 1.0 ), on = amp * step( 0.0, t ) * step( t, 1.0 ) * ( 1.0 - belt );
		sTilt = - sl * ${f(FLUTES.turn)} * on * sign( vGrain.x );
		sShut = 1.0 - ${f(FLUTES.shut)} * on * ( 1.0 - sl * sl );
		tone *= mix( 1.0, 0.93, belt * bAmp );
	}
	diffuseColor.rgb = albedo * tone * ( 1.0 - dark * joint ) * sShut;
	sRough = mix( sRough, 0.9, joint );
}`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = sRough;').replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( abs( sTilt ) + abs( sLift ) > 0.0 ) {
	vec3 sAcross = ( viewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz, sUp = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	vec3 sN = normal + sAcross * tan( sTilt ) + sUp * sLift;
	normal = sN / max( length( sN ), 1e-5 );
}`);
  };
  return lit(m, { key: 'spire-stone', baked: true, core: false });
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
		vec3 d = textureGrad( uWin, ( id + 0.5 ) / size, ${f(WINDOW.blur)} * dFdx( c ) / size, ${f(WINDOW.blur)} * dFdy( c ) / size ).rgb;
		float level = pow( d.r, ${f(WINDOW.curve)} ), blind = d.b;
		vec3 tint = tTint( d.g * smoothstep( ${f(WINDOW.dim[0])}, ${f(WINDOW.dim[1])}, level ) );
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
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += bEmit;')
      .replace('#include <opaque_fragment>', `outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), ${f(KEEP.glass)} * max( bGlass, step( 0.001, dot( bEmit, vec3( 1.0 ) ) ) ) );\n#include <opaque_fragment>`);
  };
  return lit(m, { key: 'spire-bay', baked: true, core: false });
}

// The gold. Its reeds are drawn here and not built, as the towers' are: each rounded, its face turning from
// GOLD.flank degrees one way to as far the other, and the average of its two sides where it is under a few pixels,
// so it never comes to stripes. On the ring it draws the engraving.
function gold(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1 }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const sa2 = Math.sin(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), ca2 = Math.cos(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), e = ENGRAVE;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 gild;\nvarying vec3 vGild;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGild = gild;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
varying vec3 vGild;
${COMMON}
vec3 gLeft = vec3( 0.0, 0.0, 1.0 ), gRight = vec3( 0.0, 0.0, 1.0 ), gNear = vec3( 0.0, 0.0, 1.0 );
float gOn = 0.0, gValley = 0.0, gDetail = 0.0, gCut = 0.0, gRing = 0.0;
// How much of a pixel w wide about x a strip from a to b covers.
float gStrip( float x, float a, float b, float w ) { return clamp( ( min( x + 0.5 * w, b ) - max( x - 0.5 * w, a ) ) / w, 0.0, 1.0 ); }`).replace('#include <color_fragment>', `#include <color_fragment>
if ( vGild.y > 1.5 && vGild.y < 2.5 ) {
	// The engraving on the ring's flat faces: two lines round it and a chain of lozenges between them, filtered, and
	// gone where a line would be under about a pixel, so the ring never stipples at the page's size.
	gRing = 1.0;
	float d = vGild.x - ${f(SPIRE.ring.r)}, fd = max( fwidth( d ), 1e-4 ), w = ${f(e.wide)};
	float lines = max( gStrip( d, ${f(e.lines[0] - e.wide / 2)}, ${f(e.lines[0] + e.wide / 2)}, fd ), gStrip( d, ${f(e.lines[1] - e.wide / 2)}, ${f(e.lines[1] + e.wide / 2)}, fd ) );
	float along = ( fract( vGild.z * ${f(Math.round((2 * Math.PI * SPIRE.ring.r) / e.chain.every))} ) - 0.5 ) * ${f(e.chain.every)};
	float g = abs( along ) / ${f(e.chain.every / 2)} + abs( d - ${f(e.chain.mid)} ) / ${f(e.chain.half)} - 1.0;
	float lw = ${f((e.wide / 2) * Math.hypot(2 / e.chain.every, 1 / e.chain.half))}, fg = max( fwidth( g ), 1e-4 );
	float chain = gStrip( g, - lw, lw, fg ) * step( abs( d - ${f(e.chain.mid)} ), ${f(e.chain.half)} );
	gCut = max( lines, chain ) * ( 1.0 - smoothstep( w * 0.45, w * 0.9, fd ) );
}`).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, ${f(RING.rough)}, gRing );`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( vGild.y > 0.5 && vGild.y < 1.5 ) {
	vec3 up = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz, across = cross( up, normal );
	across /= max( length( across ), 1e-5 );
	float fw = max( fwidth( vGild.x ), 1e-5 ), turn = ( fract( vGild.x ) - 0.5 ) * ${f(2 * GOLD.flank * THREE.MathUtils.DEG2RAD)};
	gOn = 1.0;
	gDetail = 1.0 - smoothstep( 0.18, 0.32, fw );
	gValley = tPulse( vGild.x + 0.05, 0.0, 0.1, fw );
	gLeft = normal * ${f(ca2)} - across * ${f(sa2)};
	gRight = normal * ${f(ca2)} + across * ${f(sa2)};
	gNear = normal * cos( turn ) + across * sin( turn );
	vec3 used = mix( normal, gNear, gDetail );
	normal = used / max( length( used ), 1e-5 );
}`).replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace('getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )', 'goldFluted( geometryViewDir, geometryNormal, material.roughness )')).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
`).replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.directSpecular *= 1.0 - ${f(e.depth)} * gCut;${rim(RIM.gold, true)}
if ( gRing > 0.5 ) {
	vec3 gG = normalize( uGlintAt - geometryPosition ), gH = normalize( gG + geometryViewDir );
	reflectedLight.directSpecular += uGlint * ( ${f(RING.glint)} * pow( saturate( dot( geometryNormal, gH ) ), ${f(RING.lobe)} ) * saturate( dot( geometryNormal, gG ) ) ) * ( 1.0 - ${f(e.depth)} * gCut );
}`).replace('void main() {', `#ifdef USE_ENVMAP
vec3 goldIBL( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	vec3 r = normalize( mix( reflect( - viewDir, n ), n, pow4( rough ) ) );
	vec3 rw = normalize( inverseTransformDirection( r, viewMatrix ) );
	float m = dot( rw, uMoonward ), peak = smoothstep( ${f(GOLD.sheen[2])}, 0.995, m ), toward = smoothstep( 0.2, 0.7, m );
	float gain = mix( mix( ${f(GOLD.shade)}, ${f(RING.shade)}, gRing ), mix( ${f(GOLD.sheen[0])}, ${f(GOLD.sheen[1])}, peak * peak ), toward );
	vec3 tint = pow( vec3( 1.0, 0.86, 0.7 ), vec3( - ${f(GOLD.neutral)} * toward + ${f(GOLD.deep)} * ( 1.0 - toward ) ) );
	vec3 night = textureLod( envMap, envMapRotation * rw, roughnessToMip( rough ) ).rgb * envMapIntensity * gain * tint;
	#ifdef WORLD_BAKED
		night += wBounce * ${f(GOLD.city)} * RECIPROCAL_PI;
	#endif
	return night;
}
vec3 goldFluted( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	if ( gOn < 0.5 ) return goldIBL( viewDir, n, rough ) * ( 1.0 - ${f(e.depth)} * gCut );
	vec3 far = 0.5 * ( goldIBL( viewDir, normalize( gLeft ), rough ) + goldIBL( viewDir, normalize( gRight ), rough ) );
	vec3 near = gDetail > 0.0 ? goldIBL( viewDir, n, rough ) : far;
	return mix( far, near, gDetail ) * ( 1.0 - ${f(GOLD.valley)} * gValley );
}
#endif
void main() {`).replace('#include <opaque_fragment>', `if ( vGild.y < 2.5 ) {
	float lv = max( outgoingLight.r, 0.0 );
	vec3 c = mix( mix( vec3( ${GRADE.deep.map(f).join(', ')} ), ${lin3(METAL.gold)}, smoothstep( ${f(GRADE.at[0])}, ${f(GRADE.at[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GRADE.at[1])}, ${f(GRADE.at[2])}, lv ) );
	float top = ${f(GRADE.most[0])}, room = ${f(GRADE.most[1] - GRADE.most[0])};
	outgoingLight = tKeep( c * ( lv < top ? lv : top + room * ( 1.0 - exp( - ( lv - top ) / room ) ) ) );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'spire-gold', baked: true, core: false, glint: true });
}

export interface SpireMaterials { stone: THREE.MeshStandardMaterial; bay: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; dispose(): void }

export function materials(map: THREE.Texture): SpireMaterials {
  const all = { stone: stone(), bay: bay(map), gold: gold() };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}
