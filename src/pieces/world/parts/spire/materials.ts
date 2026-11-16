import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { LIGHT, MOONWARD, SCALE, SPIRE } from '../../layout';
import { METAL, WARM, lit } from '../../light';
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
  granite: { color: ['text-3', 'bronze', 0.04], k: 0.65, rough: 0.6, course: 1.3, block: 3.1, joint: 0.06, dark: 0.45 },
  rusticated: { rough: 0.62, course: 1.5, joint: 0.2, dark: 0.6 },
  trim: { color: ['text-2', 'copper-light', 0.3], k: 0.42, rough: 0.7, course: 0.9, block: 2.2, joint: 0.05, dark: 0.4 },
  court: { color: ['text-3', 'bronze', 0.4], k: 0.4, rough: 0.7, ring: 1.6, block: 2.5, joint: 0.07, dark: 0.5 },
  // How much one block differs from the next, one course from the next, the granite's speckle, and the weather's
  // streaks down a face.
  differ: 0.22, course: 0.09, speckle: 0.22, streak: 0.18,
} as const;
// The weather: rain off every ledge, finial and cornice runs down the face under it and leaves it darker, in
// streaks of differing length (how dark at most, how long at least and at most, in units, and how many to a unit
// across), with a band of soot right under the ledge (how dark, how tall); and the foot of the podium is darker where
// the ground's damp has risen (how dark, how high).
const WEATHER = { dark: 0.7, long: [4, 24], across: 0.85, soot: 0.35, sootTall: 1.1, foot: 0.45, footTall: 4.5 } as const;
// The court's pattern: a border of granite round the podium, rays of pale stone, and a bronze ring let into it, as
// radii in units.
const COURT = { border: [27, 31], rays: 24, ray: 0.45, from: 31, inlay: 41.5, inlayWide: 0.32 };
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
const BAY = { bronze: 0.62, rough: 0.45, metal: 0.85, glass: 0.06, bevel: 0.07 };
// A room seen close: how much of its lamp's light falls everywhere, how much at the lamp, how fast it falls off,
// and the level of the whole, which keeps all but the lamp's own patch under the glass's brightest.
const ROOM = { ambient: 0.22, lamp: 1.5, fall: 3.2, level: 0.5 };
// What makes a pane a room and not a tile, seen close: the side wall the eye sees past the frame (how bright against
// the far wall), the shade the frame's head and sides throw just inside the glass (how dark, how far in, in units),
// a lamp hung from the ceiling in some rooms (which share, how bright, how big), and a curtain drawn at one side in
// some (which share, how wide as a share of the pane, how dark).
const INSIDE = { side: 0.42, head: 0.55, headIn: 0.32, jamb: 0.35, jambIn: 0.16, pendant: [0.45, 1.6, 0.13], curtain: [0.3, 0.22, 0.55] } as const;
// The gold as the towers' gold, one gold for the world: brighter about the moon, deep elsewhere.
// deep is how much richer the gold is where it mirrors little: a gold face turned from the light shows the gold's
// own color, deeper than where it is bright.
const GOLD = { rough: 0.16, sheen: [1.4, 9, 0.86], shade: 0.75, neutral: 1, deep: 1.4, city: 0.6, flank: 50, valley: 0.3 };
// The ring's engraving: grooves cut round its faces, as Saturn's rings are parted, each a V whose two walls turn
// so far (radians) one way and the other, so one wall takes the light and the other is in shade. Each is how far it
// is out from the band's middle and how wide it is; it is wholly there where it is `show` pixels wide or more and
// gone at `gone`, so it is never finer than a pixel. How much its floor is shut in.
const ENGRAVE = { grooves: [[-2.35, 0.42], [-5.7, 0.3], [-7.75, 0.24], [0.45, 0.2]], turn: 0.55, show: 3.0, gone: 1.4, shut: 0.25 };
// The ring is the most polished gold in the world: smoother than the rest, and its faces turned from the moon
// mirror the dark night, so it is a dark band with the moon's narrow hard line along its bead and lip, and not an
// even satin. How rough, and how much of the night it mirrors where it does not face the moon. The cursor's light
// lies on it as a wider sheen than on the rest, so it slides round the band as the cursor moves: how strong, and how
// tight (a power of how near the face is to turned between the cursor and the eye).
// Its highlight is filtered: the moon's sheen on it spreads over as much as a pixel covers and is lowered to keep
// its light, so a highlight finer than a pixel comes to its average and never beads (peak: how much of the gold's
// sheen it takes at its heart, and direct: how much of the moon's own highlight, so its brightest line rolls off
// along the bead and is not one clipped value for long runs). The half of the band beyond the tower is seen against the night, turned from the
// visitor: it keeps `far` of its light.
const RING = { rough: 0.1, shade: 1.5, peak: 0.3, direct: 0.5, far: 0.6 };
// What the ring mirrors besides the night: the haze of the city's light low over the horizon (how bright, how high
// its middle is and how tall, as the height of a direction), and the lit city under it, below the horizon (how bright,
// how far down it reaches, and its streets and lit floors as so many to a turn round and to a unit of height). Where
// the shaft stands between the ring and the moon (the baked share of the moon seen), the ring keeps `shadow` of the
// moon's sheen. Its plates: so many round the ring, each joint so wide in units, shown only where it is `show`
// pixels wide or more, and how much one plate's polish differs from the next. The cursor's glint is a small hard spot
// (lobe), which spreads to no wider than a pixel can hold (least) and keeps its light as it does. Seen from far, the
// face between the bead and the lip is lifted toward them (lift), so at the page's size the band reads as one band.
// And the tower itself, where the ring's mirror looks back at it: how far it looks, in units, in how many steps, the
// stone's brightness, how much brighter its moonlit side is, how tall a floor is and how bright a lit room.
const MIRROR = { haze: 2.6, hazeAt: 0.07, hazeTall: 0.075, city: 1.5, cityTo: -0.55, streets: 90, floors: 26, shadow: 0.2, reach: 140, steps: 28, stone: 0.3, moonlit: 3, floor: 2.1, rooms: 3 } as const;
const PLATES = { count: 40, joint: 0.14, show: 1.2, differ: 0.07 } as const;
const SPOT = { power: 20, lobe: 120, least: 120 } as const;
const FAR = { lift: 0.55, from: 0.3, to: 0.9 } as const;
// The fluting on the stone's front faces, drawn and not built: how much of each flute is the groove (the rest is
// the fillet between), how far its walls turn, in radians, and how much its bottom is shut in. Every so many units
// up the flutes stop at a belt, so tall.
const FLUTES = { groove: 0.76, turn: 0.75, shut: 0.22, belt: 14.6, beltTall: 1.3, beltTone: 0.84 };

// The moon's rim. The moon is behind the world, so a face of polished stone or metal that turns toward it as it
// turns away from the view takes a thin line of its pale light, as the sheen of a polished edge does: how strong,
// and how tightly it keeps to the edge (a power of how far the face is turned from the view). The baked share of
// the moon seen is its shadow. On the stone it keeps to the grazing edge: spread across the moonlit bevels, it made
// them as pale as the limestone of the towers beside the spire.
const RIM = { stone: 0.6, gold: 2.4, tight: 1.0, stoneTight: 4.0 };
// On the ring it is off: laid on every face that looks up, it turned the ring's top into one even satin.
const rim = (k: number, ring = false, tight: number = RIM.tight): string => `
#ifdef WORLD_BAKED
{
	vec3 rMoon = normalize( ( viewMatrix * vec4( uMoonward, 0.0 ) ).xyz );
	float rTo = saturate( dot( geometryNormal, rMoon ) ), rAway = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
	reflectedLight.directSpecular += ${lin(LIGHT.moon.color, LIGHT.moon.power)} * ( ${f(k)} * wLight.y * rTo * pow( rAway, ${f(tight)} ) )${ring ? ' * ( 1.0 - gRing )' : ''};
}
#endif`;

// The stage's white balance (finish in src/world/tone.ts) turns warm mid tones neutral, which took the warmth out
// of the granite, the lit rooms and the gold. It is undone on them as the towers undo it (towers/materials.ts), with
// the same numbers and the same share of it the world keeps (WARM), so the spire is of the same city: KEEP is the
// balance, and how much of it the stone keeps undone.
const KEEP = { balance: [0.96, 1.21, 1.59], stone: 0, glass: 1 } as const;
// How much of the night's soft light from the visitor's side the stone takes, as the towers' stone does: the moon is
// behind the city, so its faces toward the visitor are a deep warm stone, drawn by the moon on their right edges.
const NIGHT = 1.25;
// The gold's grade, the towers' and the pyramid's: deep gold where it mirrors little, the world's gold, then pale
// gold, by how much it mirrors (the levels at which each begins), eased to a most so it never burns.
const GRADE = { deep: [1.0, 0.43, 0.095], at: [0.15, 1.5, 4.5], most: [0.9, 1.3] } as const;

const COMMON = `
vec3 tKeep( vec3 c ) {
	float k = 1.0 - smoothstep( 0.3, 0.85, max( c.r, max( c.g, c.b ) ) );
	return c / mix( vec3( 1.0 ), vec3( ${KEEP.balance.map(f).join(', ')} ), k * ${f(WARM)} );
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

function stone(ledges: number[]): THREE.MeshStandardMaterial {
  const g = STONE.granite, r = STONE.rusticated, t = STONE.trim, c = STONE.court;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: g.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: new THREE.Vector3(...MOONWARD).normalize() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 grain;\nvarying vec4 vGrain;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrain = grain;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uMoonward;\nvarying vec4 vGrain;\nfloat sRough = ${f(g.rough)}, sTilt = 0.0, sLift = 0.0, sShut = 1.0;\nconst float sLedges[ ${ledges.length} ] = float[]( ${ledges.map(f).join(', ')} );${COMMON}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(NIGHT)};\n#include <lights_fragment_end>${rim(RIM.stone, false, RIM.stoneTight)}`).replace('#include <opaque_fragment>', `outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), ${f(KEEP.stone)} );\n#include <opaque_fragment>`).replace('#include <color_fragment>', `#include <color_fragment>
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
		tone *= 1.0 + ${f(STONE.course)} * ( tHash( vec2( row, 41.0 + float( lay ) ) ) - 0.5 ) * ( 1.0 - far );
		tone *= 1.0 + vGrain.z - float( lay );
		{
			// The weather, under the nearest ledge over this place: streaks, filtered to their mean where they are
			// finer than a pixel, and soot right under it.
			float y = vGrain.y, d = 1e4;
			for ( int i = 0; i < ${ledges.length}; i ++ ) { float l = sLedges[ i ] - y; if ( l > -0.02 && l < d ) d = max( l, 0.0 ); }
			if ( vGrain.w >= 0.0 ) d = min( d, ${f(FLUTES.belt)} * ceil( y / ${f(FLUTES.belt)} ) - y );
			float wx = vGrain.x * ${f(WEATHER.across)}, fx = fwidth( wx ), sharp = 1.0 - smoothstep( 0.25, 0.7, fx );
			float n1 = tNoise( vec2( wx, 3.0 ) ), n2 = tNoise( vec2( wx * 3.1 + 7.0, 5.0 ) );
			float lane = mix( 0.5, smoothstep( 0.3, 0.72, 0.6 * n1 + 0.4 * n2 ), sharp );
			float wLong = mix( ${f(WEATHER.long[0])}, ${f(WEATHER.long[1])}, tNoise( vec2( wx * 1.7 + 2.0, 9.0 ) ) );
			float run = lane * exp( - d / wLong ) * ( 0.8 + 0.2 * tNoise( vec2( wx * 2.0, y * 0.35 ) ) );
			float soot = exp( - d / ${f(WEATHER.sootTall)} ) * step( d, 1e3 );
			tone *= ( 1.0 - ${f(WEATHER.dark)} * run ) * ( 1.0 - ${f(WEATHER.soot)} * soot );
			tone *= 1.0 - ${f(WEATHER.foot)} * ( 1.0 - smoothstep( 0.4, ${f(WEATHER.footTall)} * ( 0.7 + 0.6 * tNoise( vec2( vGrain.x * 0.4, 1.0 ) ) ), y ) );
		}
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
		tone *= mix( 1.0, ${f(FLUTES.beltTone)}, belt * ( 1.0 - smoothstep( 0.7, 1.4, fy ) ) );
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
		float level = max( pow( d.r, ${f(WINDOW.curve)} ), ${f(WINDOW.dark)} ), blind = d.b;
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
			// The room: its far wall, floor, ceiling and sides, lit by one lamp in it and falling off from it, kept under
			// the glass's top so a lit room shows its depth and not one even tone.
			float lr = length( h - lamp ), glow = ${f(ROOM.ambient)} + ${f(ROOM.lamp)} / ( 1.0 + ${f(ROOM.fall)} * lr * lr );
			float surf = t == tz ? 0.55 + 0.45 * s2 : ( t == ty ? ( rl.y < 0.0 ? 0.3 : 0.95 ) : ${f(INSIDE.side)} );
			vec3 near = vec3( ${f(ROOM.level)} * surf * glow * ( 0.3 + 0.85 * h.y / cs.y ) );
			float s4 = tHash( id + 11.7 ), s5 = tHash( id + 23.9 );
			if ( s4 < ${f(INSIDE.pendant[0])} ) {
				vec2 pc = vec2( lamp.x, cs.y - ${f(fr.head)} - 0.32 );
				vec3 hp = vec3( p, 0.0 ) + rl * ( lamp.z / rl.z );
				float pd = length( ( hp.xy - pc ) / vec2( 1.6, 1.0 ) ) / ${f(INSIDE.pendant[2])};
				near += vec3( ${f(INSIDE.pendant[1])} * ( 1.0 - smoothstep( 0.6, 1.0, pd ) ) );
			}
			if ( s5 < ${f(INSIDE.curtain[0])} ) {
				float cw = cs.x * ${f(INSIDE.curtain[1])}, cx = s5 < ${f(INSIDE.curtain[0] * 0.5)} ? p.x - ${f(fr.side)} : cs.x - ${f(fr.side)} - p.x;
				float fold = 0.75 + 0.25 * sin( cx * 38.0 );
				near = mix( near, vec3( ${f(INSIDE.curtain[2])} * glow * fold * ${f(ROOM.level)} ), step( cx, cw ) * step( 0.0, cx ) );
			}
			if ( s1 > 0.7 && p.x < cs.x * ( 0.18 + 0.15 * s3 ) ) near *= 0.45;
			float zf = deep * ( 0.3 + 0.35 * s2 ), tf = zf / rl.z;
			vec3 hf = vec3( p, 0.0 ) + rl * tf;
			float fx0 = cs.x * ( 0.05 + 0.5 * tHash( id + 5.7 ) ), fx1 = fx0 + cs.x * ( 0.25 + 0.4 * tHash( id + 9.9 ) ), fy1 = cs.y * ( 0.22 + 0.28 * tHash( id + 2.6 ) );
			if ( tf < t && tHash( id + 2.2 ) < 0.65 && hf.x > fx0 && hf.x < fx1 && hf.y < fy1 ) near = vec3( 0.1 + 0.5 * smoothstep( fy1 - 0.1, fy1, hf.y ) * glow );
			float top = cs.y - ${f(fr.head)}, low = top - blind * ( cs.y - ${f(fr.sill + fr.head)} );
			if ( blind > 0.02 && p.y > low ) near = vec3( 0.5 + 0.12 * smoothstep( low, low + 0.15, p.y ) );
			vec2 lo = vec2( ${f(fr.side)}, ${f(fr.sill)} ), hi = cs - vec2( ${f(fr.side)}, ${f(fr.head)} );
			near *= 1.0 - ${f(INSIDE.head)} * ( 1.0 - smoothstep( 0.0, ${f(INSIDE.headIn)}, hi.y - p.y ) );
			near *= 1.0 - ${f(INSIDE.jamb)} * ( 1.0 - smoothstep( 0.0, ${f(INSIDE.jambIn)}, min( p.x - lo.x, hi.x - p.x ) ) );
			room = mix( room, near, detail );
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
function gold(profile: number[][]): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1 }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const sa2 = Math.sin(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), ca2 = Math.cos(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), e = ENGRAVE;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 gild;\nvarying vec3 vGild;\nvarying vec3 vSpire;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGild = gild;\nvSpire = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz / ${f(SCALE)};`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
varying vec3 vGild;
varying vec3 vSpire;
const vec3 gProfile[ ${profile.length} ] = vec3[]( ${profile.map(([y, r, h]) => `vec3( ${f(y)}, ${f(r)}, ${f(h)} )`).join(', ')} );
${COMMON}
// The tower at a height, as the ring mirrors it: how far out its faces stand, and how wide its strip of windows is.
vec2 gTower( float y ) {
	if ( y < gProfile[ 0 ].x || y > gProfile[ ${profile.length - 1} ].x ) return vec2( -1.0 );
	for ( int i = 0; i < ${profile.length - 1}; i ++ ) {
		vec3 a = gProfile[ i ], b = gProfile[ i + 1 ];
		if ( y <= b.x ) return mix( a.yz, b.yz, clamp( ( y - a.x ) / max( b.x - a.x, 1e-4 ), 0.0, 1.0 ) );
	}
	return vec2( -1.0 );
}
// What the ring sees of the tower along a direction from where it is: nothing (w is 0), or the tower's light there.
vec4 gSeeTower( vec3 from, vec3 d ) {
	float t0 = 0.0, t1 = -1.0;
	for ( int i = 1; i <= ${MIRROR.steps}; i ++ ) {
		float t = float( i ) * ${f(MIRROR.reach / MIRROR.steps)};
		vec3 p = from + d * t;
		vec2 w = gTower( p.y );
		if ( w.x > 0.0 && abs( p.x ) < w.x && abs( p.z ) < w.x ) { t1 = t; break; }
		t0 = t;
	}
	if ( t1 < 0.0 ) return vec4( 0.0 );
	for ( int i = 0; i < 6; i ++ ) {
		float t = 0.5 * ( t0 + t1 );
		vec3 p = from + d * t;
		vec2 w = gTower( p.y );
		if ( w.x > 0.0 && abs( p.x ) < w.x && abs( p.z ) < w.x ) t1 = t; else t0 = t;
	}
	vec3 p = from + d * t1;
	vec2 w = gTower( p.y );
	bool front = abs( p.z ) >= abs( p.x );
	float across = front ? p.x : p.z, side = front ? sign( p.z ) : sign( p.x );
	vec3 c = ${lin('text-3')} * ${f(MIRROR.stone)} * ( !front && side > 0.0 ? ${f(MIRROR.moonlit)} : 1.0 );
	if ( front && side > 0.0 && abs( across ) < w.y ) {
		float floors = p.y / ${f(MIRROR.floor)}, on = step( 0.45, tHash( vec2( floor( floors ), floor( across * 0.8 ) + 7.0 ) ) );
		c = mix( c, ${lin('hot')} * ${f(MIRROR.rooms)} * ( 0.15 + 0.85 * on ), tPulse( floors, 0.25, 0.92, max( fwidth( floors ), 1e-4 ) ) );
	}
	return vec4( c, 1.0 );
}
vec3 gLeft = vec3( 0.0, 0.0, 1.0 ), gRight = vec3( 0.0, 0.0, 1.0 ), gNear = vec3( 0.0, 0.0, 1.0 );
float gOn = 0.0, gValley = 0.0, gDetail = 0.0, gCut = 0.0, gRing = 0.0, gTurn = 0.0, gMoonW = 0.0, gPlate = 1.0, gFace = 0.0, gFar = 0.0;
`).replace('#include <color_fragment>', `#include <color_fragment>
if ( vGild.y > 1.5 && vGild.y < 2.5 ) {
	// The ring's grooves: across each, where it is in its V (-1 to 1), filtered to nothing where it is finer than a few
	// pixels, so the ring never stipples at the page's size.
	gRing = 1.0;
	float d = vGild.x - ${f(SPIRE.ring.r)}, fd = max( fwidth( d ), 1e-4 );
	for ( int i = 0; i < ${e.grooves.length}; i ++ ) {
		vec2 g = ${'vec2[]( ' + e.grooves.map(([c, w]) => `vec2( ${f(c)}, ${f(w)} )`).join(', ') + ' )'}[ i ];
		float t = ( d - g.x ) / ( 0.5 * g.y ), amp = smoothstep( ${f(e.gone)}, ${f(e.show)}, g.y / fd ) * step( abs( t ), 1.0 );
		gTurn += amp * ${f(e.turn)} * clamp( - 3.0 * t, - 1.0, 1.0 );
		gCut = max( gCut, amp * ${f(e.shut)} * ( 1.0 - t * t ) );
	}
	// The plates the ring is made of, and the joints between them, filtered to nothing where finer than a pixel.
	float k = vGild.z * ${f(PLATES.count)}, fk = max( min( fwidth( k ), fwidth( fract( k + 0.5 ) ) ), 1e-5 );
	float jw = ${f(PLATES.joint)} * ${f(PLATES.count)} / ( 6.28318 * max( vGild.x, 1.0 ) ), jamp = smoothstep( ${f(PLATES.show * 0.5)}, ${f(PLATES.show)}, jw / fk );
	gCut = max( gCut, 0.8 * jamp * tLine( k, jw, fk ) );
	gPlate = 1.0 + ${f(PLATES.differ)} * ( tHash( vec2( floor( k ), 3.0 ) ) - 0.5 ) * jamp;
	gFace = smoothstep( -8.9, -8.4, d ) * ( 1.0 - smoothstep( 1.0, 1.5, d ) );
	gFar = smoothstep( ${f(FAR.from)}, ${f(FAR.to)}, fd );
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
}
{
	// Across the ring's band, outward, as the slope of its radius over the face; a groove's walls are turned along it.
	vec3 dpx = dFdx( - vViewPosition ), dpy = dFdy( - vViewPosition ), r1 = cross( dpy, normal ), r2 = cross( normal, dpx );
	float det = dot( dpx, r1 );
	vec3 grad = ( r1 * dFdx( vGild.x ) + r2 * dFdy( vGild.x ) ) / ( abs( det ) > 1e-12 ? det : 1e-12 );
	vec3 radial = grad / max( length( grad ), 1e-6 );
	if ( abs( gTurn ) > 0.0 ) {
		vec3 turned = normal + radial * tan( gTurn );
		normal = turned / max( length( turned ), 1e-5 );
	}
	// How far the moon's mirror changes across a pixel, which its sheen is filtered by.
	vec3 mr = normalize( inverseTransformDirection( reflect( - normalize( vViewPosition ), normal ), viewMatrix ) );
	gMoonW = fwidth( dot( mr, uMoonward ) );
}`).replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace('getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )', 'goldFluted( geometryViewDir, geometryNormal, material.roughness )')).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
`).replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.directSpecular *= ( 1.0 - gCut ) * mix( 1.0, ${f(RING.direct)}, gRing );${rim(RIM.gold, true)}
if ( gRing > 0.5 ) {
	vec3 gG = normalize( uGlintAt - geometryPosition ), gH = normalize( gG + geometryViewDir );
	reflectedLight.directSpecular += vec3( 5.0 ) * step( 0.0, gH.z ) * step( 0.0, - gG.z );
}`).replace('void main() {', `#ifdef USE_ENVMAP
vec3 goldIBL( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	vec3 r = normalize( mix( reflect( - viewDir, n ), n, pow4( rough ) ) );
	vec3 rw = normalize( inverseTransformDirection( r, viewMatrix ) );
	float m = dot( rw, uMoonward ), w = gMoonW, a = ${f(GOLD.sheen[2])};
	float peak = smoothstep( a - w, 0.995, m ) * ( 1.0 - a ) / ( 1.0 - a + w ), toward = smoothstep( 0.2, 0.7, m );
	#ifdef WORLD_BAKED
		toward *= mix( 1.0, mix( ${f(MIRROR.shadow)}, 1.0, smoothstep( 0.15, 0.75, wLight.y ) ), gRing );
	#endif
	float gain = mix( mix( ${f(GOLD.shade)}, ${f(RING.shade)}, gRing ), mix( ${f(GOLD.sheen[0])}, ${f(GOLD.sheen[1])} * mix( 1.0, ${f(RING.peak)}, gRing ), peak * peak ), toward );
	vec3 tint = pow( vec3( 1.0, 0.86, 0.7 ), vec3( - ${f(GOLD.neutral)} * toward + ${f(GOLD.deep)} * ( 1.0 - toward ) ) );
	vec3 night = textureLod( envMap, envMapRotation * rw, roughnessToMip( rough ) ).rgb * envMapIntensity * gain * tint;
	#ifdef WORLD_BAKED
		night += wBounce * ${f(GOLD.city)} * RECIPROCAL_PI;
	#endif
	if ( gRing > 0.5 ) {
		// The haze of the city's light low over the horizon, and the lit city below it: streets and floors of light,
		// filtered to their mean where the mirror's image of them is finer than a pixel.
		float el = rw.y, fe = max( fwidth( el ), 1e-4 );
		float haze = exp( - pow( ( el - ${f(MIRROR.hazeAt)} ) / sqrt( ${f(MIRROR.hazeTall * MIRROR.hazeTall)} + fe * fe ), 2.0 ) );
		float az = atan( rw.x, rw.z ) / 6.28318 * ${f(MIRROR.streets)}, fa = max( min( fwidth( az ), fwidth( fract( az + 0.5 ) ) ), 1e-4 );
		float rows = el * ${f(MIRROR.floors)}, lights = tPulse( az, 0.25, 0.7, fa ) * tPulse( rows, 0.15, 0.6, fe * ${f(MIRROR.floors)} );
		float under = smoothstep( 0.02, -0.04, el ) * smoothstep( ${f(MIRROR.cityTo)}, ${f(MIRROR.cityTo * 0.4)}, el );
		night += ${lin('hot')} * ( ${f(MIRROR.haze)} * haze + ${f(MIRROR.city)} * under * ( 0.55 + 0.9 * lights ) ) * envMapIntensity;
		vec4 tower = gSeeTower( vSpire, rw );
		night = mix( night, tower.rgb * envMapIntensity * ${f(RING.shade)}, tower.w );
	}
	return night * gPlate;
}
vec3 goldFluted( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	if ( gOn < 0.5 ) return goldIBL( viewDir, n, rough ) * ( 1.0 - gCut );
	vec3 far = 0.5 * ( goldIBL( viewDir, normalize( gLeft ), rough ) + goldIBL( viewDir, normalize( gRight ), rough ) );
	vec3 near = gDetail > 0.0 ? goldIBL( viewDir, n, rough ) : far;
	return mix( far, near, gDetail ) * ( 1.0 - ${f(GOLD.valley)} * gValley );
}
#endif
void main() {`).replace('#include <opaque_fragment>', `if ( vGild.y < 2.5 ) {
	outgoingLight *= mix( 1.0, ${f(RING.far)}, gRing * smoothstep( -0.2, 0.5, sin( 6.28318 * vGild.z ) ) );
	float lv = max( outgoingLight.r, 0.0 );
	lv = mix( lv, max( lv, ${f(FAR.lift)} ), gRing * mix( gFace, 1.0, gFar ) * gFar );
	vec3 c = mix( mix( vec3( ${GRADE.deep.map(f).join(', ')} ), ${lin3(METAL.gold)}, smoothstep( ${f(GRADE.at[0])}, ${f(GRADE.at[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GRADE.at[1])}, ${f(GRADE.at[2])}, lv ) );
	float top = ${f(GRADE.most[0])}, room = ${f(GRADE.most[1] - GRADE.most[0])};
	outgoingLight = tKeep( c * ( lv < top ? lv : top + room * ( 1.0 - exp( - ( lv - top ) / room ) ) ) );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'spire-gold', baked: true, core: false, glint: true });
}

export interface SpireMaterials { stone: THREE.MeshStandardMaterial; bay: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; dispose(): void }

export function materials(map: THREE.Texture, ledges: number[], profile: number[][]): SpireMaterials {
  const all = { stone: stone(ledges), bay: bay(map), gold: gold(profile) };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}
