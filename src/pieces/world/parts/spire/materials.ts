import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { LIGHT, MOONWARD, SCALE, SPIRE } from '../../layout';
import { METAL, WARM, lit } from '../../light';
import { WINDOW } from './windows';
import { STONES } from './stones';

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

// The stones (their colors are STONES, which the make script bakes with): each one's roughness; how tall a
// course is and how long a block, in units; how wide a joint and how dark.
const STONE = {
  granite: { rough: 0.7, course: 1.3, block: 3.1, joint: 0.06, dark: 0.45 },
  rusticated: { rough: 0.62, course: 1.5, joint: 0.2, dark: 0.6 },
  trim: { rough: 0.7, course: 0.9, block: 2.2, joint: 0.05, dark: 0.4 },
  court: { rough: 0.7, ring: 1.6, block: 2.5, joint: 0.07, dark: 0.5 },
  // How much one block differs from the next, one course from the next, the granite's speckle, and the weather's
  // streaks down a face.
  differ: 0.22, course: 0.14, speckle: 0.1, streak: 0.1,
} as const;
// The weather: rain off every ledge, finial and cornice runs down the face under it and leaves it darker, in
// streaks of differing length (how dark at most, how long at least and at most, in units, and how many to a unit
// across), with a band of soot right under the ledge (how dark, how tall); the foot of the podium is darker where
// the ground's damp has risen (how dark, how high); and the rain leaves faint lanes the whole way down (how dark).
const WEATHER = { dark: 0.75, long: [6, 42], across: 0.85, soot: 0.4, sootTall: 1.4, foot: 0.6, footTall: 7, rain: 0.16 } as const;
// And the broad stain the rain leaves under every set back where it runs off at a few places along the ledge and
// not evenly: how dark at most, how far down it reaches, in units, and how many places to a unit along the ledge.
const STAIN = { dark: 0.42, tall: 9, across: 0.11 } as const;
// The night's light falls up each stage of the tower: the foot of a stage, low between the stages round it, takes
// `foot` of it and the head of the stage, out in the open under its ledge, `head` (the make script stores how far up
// its stage each place is).
const FALL = { foot: 0.45, head: 1.35, curve: 0.8 } as const;
// How the stone is laid: how far the courses' heights wander (in courses) and how slowly, how long a block is
// against the stone's own length, at least and at most, how deep a joint is pointed, at least and at most, how much
// of a joint goes where the moon lights the face, how much one bed of stone differs from the next, and how much of a
// bed joint's darkness a head joint has, finer, so the courses read and the face is not ruled in squares; and how
// much of its joints a fluted face keeps, whose flutes across the courses ruled it as graph paper.
const LAID = { warp: 0.9, slow: 0.21, block: [0.65, 1.45], pointed: [0.35, 1.25], lit: 0.35, beds: 0.34, head: 0.5, fluted: 0.45 } as const;
// The court's pattern: a border of granite round the podium, a sunburst of so many wedges of darker granite from
// the border out, and two bronze rings let into it, at its edges, as radii in units; how far the paving between the
// wedges is eased toward the pale trim, and how dark the wedges are against the granite.
const COURT = { border: [27, 31], rays: 24, from: 31, inlay: 41.5, inlayWide: 0.32, pale: 0.55, dark: 0.5 };
// The court's lit kerb: a slot of light let in under the nosing of its top step, all the way round, as its radius
// and its height (from and to, in units over the ground), how bright, and the least share of a pixel it is drawn on,
// so it reads as one warm line at the page's size.
const KERB = { r: [52.2, 54.4], y: [0.7, 0.85], power: 3.2, least: 0.7 } as const;
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
const BAY = { bronze: 0.62, rough: 0.45, metal: 0.85, glass: 0.06, bevel: 0.07 };
// The podium's doors, in units: how wide a leaf's stile is, where its glass begins (a share of its height), half the
// width of the bar down the glass, how tall its kick plate is, where its push bar is (a share of its height), how wide
// the seam round it is, how dark its sunk panel is, how wide the bevels round its panel are, and the lobby's light
// through its glass (how bright against a lit window, and how pale).
const DOOR = { stile: 0.32, glass: 0.56, bar: 0.05, kick: 0.85, push: 0.47, seam: 0.05, sunk: 0.62, bevel: 0.14, lobby: 0.8, warm: 0.3 } as const;
// The louvres: how much of each blade's pitch is the slot under it, and how dark that is; how much is the lip, how
// far the blade and its lip are turned up, and the grille's average where its blades are finer than a pixel.
const LOUVRE = { slot: 0.3, shade: 0.12, lip: 0.14, tilt: 0.55, lipTilt: 0.5, mean: 0.65 } as const;
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
// The ring is the most polished gold in the world: smoother than the rest (rough), and it mirrors the night, the
// city and the tower. Its highlight is filtered: the moon's sheen on it spreads over as much as a pixel covers and is
// lowered to keep its light, so a highlight finer than a pixel comes to its average and never beads (peak: how much of
// the gold's sheen it takes at its heart, and direct: how much of the moon's own highlight). Its roughness also grows
// with how far its normal turns across a pixel (aa). The half of the band beyond the tower is seen against the night,
// turned from the visitor: it keeps `far` of its light. Its edges keep `side` of the light of its top and its
// underside `under`. Its outline is drawn with its color weighed by its cover to the power `gamma` (see below). The
// band is found in its hull by stepping along each pixel's ray (`steps` at most, then `search` steps of a search for
// its nearest, or deepest, within `deep` units of where it goes in), and its bead is drawn where it is
// `bead` pixels tall or more and comes to its mean below that. Its body, all but its catch line, keeps `body` of its
// light: a deep mirror, so its line of light is what reads at the page's size.
const RING = { rough: 0.1, shade: 1.5, peak: 0.3, direct: 0.5, far: 0.6, aa: 0.5, side: 0.42, under: 0.32, gamma: 1.8, steps: 24, search: 14, deep: 12, bead: 2.5, body: 0.6 };
// The ring's catch light: one hard line along the edge of the band that is uppermost on the screen, where its top
// arris turns to the glow of the sky and the moon. It lies on whatever of the band is within `wide` units under that
// edge, and never on less than `px` pixels of it, so it reads as one continuous line however small the band is drawn.
// How bright it is: how far it lifts the gold in the gold's grade (where 1.5 is the world's gold and 4.5 its pale), and
// how much pale light it lays on after the grade, which adds as light does, so a line that falls across two pixels
// has as much light as one on one pixel and never breaks into dashes as it crosses the pixel rows. Which way on the screen is
// up for it (toward the moon, a little to the right), how much of it is left on the side away from the moon, and on
// the half beyond the tower.
const CATCH = { power: 1.2, light: 0.75, px: 1.3, wide: 0.55, dir: [0.4, 0.92], shade: 0.4, far: 0.75 } as const;
// What the ring mirrors besides the night: the haze of the city's light low over the horizon (how bright, how high
// its middle is and how tall, as the height of a direction), and the lit city under it, below the horizon (how bright,
// how far down it reaches, and its streets and lit floors as so many to a turn round and to a unit of height). Where
// the shaft stands between the ring and the moon (the baked share of the moon seen), the ring keeps `shadow` of the
// moon's sheen. And the tower itself, where the ring's mirror looks back at it: how far it looks, in units, the
// stone's brightness, how much brighter its moonlit side is, how tall a floor is and how bright a lit room.
const MIRROR = { haze: 0.45, hazeAt: 0.07, hazeTall: 0.075, city: 0.2, cityTo: -0.55, streets: 90, floors: 26, shadow: 0.2, reach: 140, stone: 0.3, moonlit: 3, floor: 2.1, rooms: 1.1 } as const;
// The glow of the page's sky over the world, which the band's top mirrors: how bright, and from what height of a
// direction to what height it fades out. Low, so the band's body is a deep mirror and its light is its catch line.
const SKY = { power: 0.16, from: 0.12, to: 0.75 } as const;
// The pointer's spark on the ring: how bright, how far round the pointer it reaches on the screen, in units, how narrow it is (as one less the cosine of its half width), the widest it is let spread to
// where it is finer than a pixel, losing some of its light as it does, and how bright its pale is at its heart.
const SPARK = { power: 2.2, reach: 3.5, wide: 0.16, most: 0.3, peak: 1.6 } as const;
// The fluting on the stone's front faces, drawn and not built: how much of each flute is the groove (the rest is
// the fillet between), how far its walls turn, in radians, and how much its bottom is shut in. Every so many units
// up the flutes stop at a belt, so tall.
const FLUTES = { groove: 0.76, turn: 0.75, shut: 0.22, belt: 14.6, beltTall: 1.3, beltTone: 0.84 };

// The moon's rim. The moon is behind the world, so a face of polished stone or metal that turns toward it as it
// turns away from the view takes a thin line of its pale light, as the sheen of a polished edge does: how strong,
// and how tightly it keeps to the edge (a power of how far the face is turned from the view). The baked share of
// the moon seen is its shadow. On the stone it keeps to the grazing edge: spread across the moonlit bevels, it made
// them as pale as the limestone of the towers beside the spire.
const RIM = { stone: 0.35, gold: 2.4, tight: 1.0, stoneTight: 4.0 };
// On the ring it is off: laid on every face that looks up, it turned the ring's top into one even satin.
// thin: the rim is taken off a face seen so nearly edge on that it is a sliver finer than a pixel, which drew the
// moonlit outline of the shoulders as a dotted line.
const rim = (k: number, ring = false, tight: number = RIM.tight, thin = false): string => `
#ifdef WORLD_BAKED
{
	vec3 rMoon = normalize( ( viewMatrix * vec4( uMoonward, 0.0 ) ).xyz );
	float rTo = saturate( dot( geometryNormal, rMoon ) ), rAway = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
	reflectedLight.directSpecular += ${lin(LIGHT.moon.color, LIGHT.moon.power)} * ( ${f(k)} * wLight.y * rTo * pow( rAway, ${f(tight)} ) )${ring ? ' * ( 1.0 - gRing )' : ''}${thin ? ' * smoothstep( 0.04, 0.28, 1.0 - rAway )' : ''};
}
#endif`;

// The stage's white balance (finish in src/world/tone.ts) turns warm mid tones neutral, which took the warmth out
// of the granite, the lit rooms and the gold. It is undone on them as the towers undo it (towers/materials.ts), with
// the same numbers and the same share of it the world keeps (WARM), so the spire is of the same city: KEEP is the
// balance, and how much of it the stone keeps undone.
const KEEP = { balance: [0.96, 1.21, 1.59], stone: 1, glass: 1 } as const;
// How much of the night's soft light from the visitor's side the stone takes, as the towers' stone does: the moon is
// behind the city, so its faces toward the visitor are a deep warm stone, drawn by the moon on their right edges.
const NIGHT = 0.8;
// Where the stone is shut in (the stored openness), the night's light is taken away again by this much: under every
// set back, ledge and finial the stone darkens to a contact shadow, so the tower is not lit as if by a softbox.
const OCCLUDE = 0.7;
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
// The share of a footprint w wide, centred on x, that falls inside [a, b].
float tBox( float x, float a, float b, float w ) { return clamp( ( min( x + 0.5 * w, b ) - max( x - 0.5 * w, a ) ) / max( w, 1e-5 ), 0.0, 1.0 ); }
// A line of width w at every whole number, filtered.
float tLine( float x, float w, float fw ) { return 1.0 - tPulse( x + 0.5, 0.5 * w, 1.0 - 0.5 * w, fw ); }`;

function stone(ledges: number[]): THREE.MeshStandardMaterial {
  const g = STONE.granite, r = STONE.rusticated, t = STONE.trim, c = STONE.court;
  const g3 = (k: number): [PaletteName, PaletteName, number, number] => [STONES.granite[0], STONES.granite[1], STONES.granite[2], STONES.granite[3] * k];
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: g.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: new THREE.Vector3(...MOONWARD).normalize() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 grain;\nvarying vec4 vGrain;\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGrain = grain;\nvWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz / ${f(SCALE)};`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uMoonward;\nvarying vec4 vGrain;\nvarying vec3 vWorld;\nvec3 sEmit;\nfloat sRough = ${f(g.rough)}, sTilt = 0.0, sLift = 0.0, sShut = 1.0;\nconst float sLedges[ ${ledges.length} ] = float[]( ${ledges.map(f).join(', ')} );${COMMON}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(NIGHT)};\n#ifdef WORLD_BAKED\niblIrradiance *= mix( 1.0, wLight.z * wLight.z, ${f(OCCLUDE)} ) * mix( ${f(FALL.foot)}, ${f(FALL.head)}, pow( wLight.w, ${f(FALL.curve)} ) );\n#endif\n#include <lights_fragment_end>${rim(RIM.stone, false, RIM.stoneTight, true)}`).replace('#include <opaque_fragment>', `outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), ${f(KEEP.stone)} );\n#include <opaque_fragment>`).replace('#include <color_fragment>', `#include <color_fragment>
{
	int lay = int( vGrain.z + 0.5 );
	vec3 sWorldN = inverseTransformDirection( normalize( vNormal ), viewMatrix );
	sEmit = vec3( 0.0 );
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
		albedo = ${mix(...STONES.court)};
		dark = ${f(c.dark)};
		// A sunburst laid in the paving: broad wedges of darker granite between the pale, filtered, out from the border.
		float sector = th / 6.28318 * ${f(COURT.rays * 0.5)}, fs = max( min( fwidth( sector ), fwidth( fract( sector + 0.5 ) ) ), 1e-4 );
		float ray = tPulse( sector, 0.0, 0.5, fs ) * smoothstep( ${f(COURT.from)} - fr, ${f(COURT.from)} + fr, rr ) * ( 1.0 - smoothstep( ${f(COURT.inlay)} - 2.0, ${f(COURT.inlay)}, rr ) );
		float border = smoothstep( ${f(COURT.border[0])} - fr, ${f(COURT.border[0])} + fr, rr ) * ( 1.0 - smoothstep( ${f(COURT.border[1])} - fr, ${f(COURT.border[1])} + fr, rr ) );
		albedo = mix( mix( albedo, ${mix(...STONES.trim)}, ${f(COURT.pale)} ), ${mix(...g3(COURT.dark))}, ray );
		albedo = mix( albedo, ${mix(...g3(0.8))}, border );
		float inlay = max( 1.0 - smoothstep( ${f(COURT.inlayWide * 0.5)} - fr, ${f(COURT.inlayWide * 0.5)} + fr, abs( rr - ${f(COURT.inlay)} ) ), 1.0 - smoothstep( ${f(COURT.inlayWide * 0.5)} - fr, ${f(COURT.inlayWide * 0.5)} + fr, abs( rr - ${f(COURT.from)} ) ) );
		albedo = mix( albedo, ${lin('bronze', 0.55)}, inlay );
		sRough = mix( ${f(c.rough)}, 0.3, inlay );
	} else {
		bool rust = lay == 1, pale = lay == 3;
		float course = rust ? ${f(r.course)} : ( pale ? ${f(t.course)} : ${f(g.course)} ), block = pale ? ${f(t.block)} : ${f(g.block)};
		float jw = rust ? ${f(r.joint)} : ( pale ? ${f(t.joint)} : ${f(g.joint)} );
		// Laid as a mason lays it, not ruled: the courses differ in height (a slow warp of the height, which never
		// turns back), each course has its own length of block and its own start, each joint is pointed more or less
		// deep, and a joint on a face the moon lights all but goes, where one in shade stays.
		float cy = vGrain.y / course, up = cy + ${f(LAID.warp)} * tNoise( vec2( cy * ${f(LAID.slow)}, 3.0 + float( lay ) ) ), row = floor( up );
		float rh = tHash( vec2( row, 5.0 + float( lay ) ) ), blen = block * mix( ${f(LAID.block[0])}, ${f(LAID.block[1])}, rh );
		float along = vGrain.x / blen + 3.7 * rh + 0.5 * mod( row, 2.0 );
		vec2 fw = vec2( fwidth( vGrain.x / block ) * block / blen, fwidth( up ) );
		float jh = tLine( up, jw / course, fw.y ), jv = rust ? 0.0 : tLine( along, jw / blen, fw.x );
		// A bed joint runs the length of its course, pointed as deep all along, so it is one continuous fine line; a
		// head joint is pointed as its own block is.
		float deepH = mix( ${f(LAID.pointed[0])}, ${f(LAID.pointed[1])}, tHash( vec2( row, 31.0 ) ) ), deepV = mix( ${f(LAID.pointed[0])}, ${f(LAID.pointed[1])}, tHash( vec2( floor( along ), row ) + 31.0 ) );
		joint = max( jh * deepH, ${f(LAID.head)} * jv * deepV ) * ( vGrain.w >= 0.0 ? ${f(LAID.fluted)} : 1.0 );
		#ifdef WORLD_BAKED
			joint *= 1.0 - ${f(LAID.lit)} * wLight.y * smoothstep( 0.0, 0.5, dot( inverseTransformDirection( normalize( vNormal ), viewMatrix ), uMoonward ) );
		#endif
		float far = smoothstep( 0.3, 1.0, max( fw.x, fw.y ) );
		tone = mix( 1.0 + ${f(STONE.differ)} * ( tHash( vec2( floor( along ), row ) + 17.0 ) - 0.5 ), 1.0, far );
		// Stone from one bed of the quarry and the next: a tone that runs over a few blocks.
		tone *= 1.0 + ${f(LAID.beds)} * ( tNoise( vGrain.xy * vec2( 0.11, 0.06 ) + 7.0 * float( lay ) ) - 0.5 );
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
			float spill = smoothstep( 0.35, 0.8, tNoise( vec2( vGrain.x * ${f(STAIN.across)} + 13.0, 2.0 ) ) );
			tone *= 1.0 - ${f(STAIN.dark)} * spill * exp( - d / ${f(STAIN.tall)} ) * step( d, 1e3 ) * ( 0.75 + 0.25 * tNoise( vec2( vGrain.x * 0.5, y * 0.2 ) ) );
			// And the faint lanes the rain has left the whole way down every face.
			float rain = mix( 0.3, smoothstep( 0.55, 0.85, tNoise( vec2( wx * 3.3 + 4.0, y * 0.045 ) ) ) * smoothstep( 0.3, 0.7, tNoise( vec2( wx * 0.7, y * 0.02 + 5.0 ) ) ), sharp );
			tone *= 1.0 - ${f(WEATHER.rain)} * rain;
			tone *= 1.0 - ${f(WEATHER.foot)} * ( 1.0 - smoothstep( 0.4, ${f(WEATHER.footTall)} * ( 0.7 + 0.6 * tNoise( vec2( vGrain.x * 0.4, 1.0 ) ) ), y ) );
		}
		albedo = pale ? ${mix(...STONES.trim)} : ${mix(...STONES.granite)};
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
	{
		// The court's lit kerb.
		float kr = length( vWorld.xz ), fy = max( fwidth( vWorld.y ), 1e-5 ), grow = max( ${f(KERB.y[1] - KERB.y[0])}, ${f(KERB.least)} * fy );
		float kerb = tBox( vWorld.y, ${f((KERB.y[0] + KERB.y[1]) / 2)} - 0.5 * grow, ${f((KERB.y[0] + KERB.y[1]) / 2)} + 0.5 * grow, fy );
		kerb *= step( ${f(KERB.r[0])}, kr ) * step( kr, ${f(KERB.r[1])} ) * ( 1.0 - smoothstep( 0.3, 0.6, abs( sWorldN.y ) ) );
		sEmit = ${lin('flame', 0.5)} + ${lin('hot', 0.5)};
		sEmit *= ${f(KERB.power)} * kerb;
		diffuseColor.rgb *= 1.0 - kerb;
	}
	sRough = mix( sRough, 0.9, joint );
}`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = sRough;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += sEmit;').replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
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
		// A pair of bronze doors, each leaf framed by a stile and rails: glazed over the lobby's light above its middle
		// rail, with a bronze bar down its glass; a sunk panel under it, its edges catching the light where they are a
		// few pixels wide; a push bar across it, and a polished kick plate at its foot; and a dark seam round each leaf.
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) );
		float lw = - cs.x, H = cs.y, x = fract( c.x ) * lw, y = c.y * H, fx = fw.x * lw, fy = fw.y * H;
		float d = smoothstep( 3.0, 6.0, 1.0 / max( fx, fy ) ), st = ${f(DOOR.stile)}, mid = H * ${f(DOOR.glass)};
		float across = tBox( x, st, lw - st, fx );
		float glass = across * tBox( y, mid, H - st, fy ) * ( 1.0 - tBox( x, 0.5 * lw - ${f(DOOR.bar)}, 0.5 * lw + ${f(DOOR.bar)}, fx ) );
		float panel = across * tBox( y, ${f(DOOR.kick)} + st, mid - st, fy );
		float kick = tBox( y, 0.0, ${f(DOOR.kick)}, fy ) * tBox( x, 0.08, lw - 0.08, fx );
		float push = tBox( y, H * ${f(DOOR.push)} - 0.09, H * ${f(DOOR.push)} + 0.09, fy ) * tBox( x, 0.5 * st, lw - 0.5 * st, fx );
		float seam = 1.0 - tBox( x, ${f(DOOR.seam)}, lw - ${f(DOOR.seam)}, fx ) * tBox( y, 0.0, H - ${f(DOOR.seam)}, fy );
		diffuseColor.rgb *= ( 1.0 - 0.85 * seam ) * mix( 1.0, ${f(DOOR.sunk)}, panel ) * ( 1.0 + 0.6 * kick + 0.9 * push );
		bGlass = glass;
		bEmit += glass * ${f(WINDOW.gain * WINDOW.mean)} * ${f(DOOR.lobby)} * tTint( ${f(DOOR.warm)} );
		float e = ${f(DOOR.bevel)};
		bTilt.x = d * 0.6 * ( tBox( x, st - e, st, fx ) - tBox( x, lw - st, lw - st + e, fx ) ) * tBox( y, ${f(DOOR.kick)}, H - st, fy );
		bTilt.y = d * 0.6 * ( tBox( y, ${f(DOOR.kick)} + st - e, ${f(DOOR.kick)} + st, fy ) - tBox( y, mid - st, mid - st + e, fy ) + tBox( y, mid - e, mid, fy ) ) * across;
	} else if ( cs.y < 0.0 ) {
		// Louvres: level blades, each tilted up and out to shed the rain, so its face takes the night's light from
		// above and the slot under it is in shade, with a rolled lip along its top edge. Filtered: where a blade is under
		// a few pixels the grille comes to its average, a dark bronze band.
		float v = vCell.y, fv = max( fwidth( v ), 1e-4 ), detail = 1.0 - smoothstep( 0.2, 0.45, fv );
		float blade = tPulse( v, ${f(LOUVRE.slot)}, 1.0, fv ), lip = tPulse( v, ${f(1 - LOUVRE.lip)}, 1.0, fv );
		diffuseColor.rgb *= mix( ${f(LOUVRE.mean)}, mix( ${f(LOUVRE.shade)}, 1.0, blade ), detail );
		bTilt.y = detail * ( ${f(LOUVRE.tilt)} * blade + ${f(LOUVRE.lipTilt)} * lip );
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
// so it never comes to stripes. The ring is drawn by the same material made apart (ring: true), after everything
// solid: it draws the engraving, mirrors the tower and the city, takes the pointer's spark, and gives its outline the
// share of each pixel it covers.
function gold(profile: number[][], band: Band, ring: boolean): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1, transparent: ring, ...(ring ? { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor } : {}) }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const sa2 = Math.sin(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), ca2 = Math.cos(GOLD.flank * 0.5 * THREE.MathUtils.DEG2RAD), b = band;
  const axis = new THREE.Vector3(0, 1, 0).applyMatrix4(new THREE.Matrix4().makeRotationZ(SPIRE.ring.tilt[1] * THREE.MathUtils.DEG2RAD).multiply(new THREE.Matrix4().makeRotationX(SPIRE.ring.tilt[0] * THREE.MathUtils.DEG2RAD))).normalize();
  if (ring) m.defines = { SPIRE_RING: '' };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 gild;\nvarying vec3 vGild;\nvarying vec3 vSpire;\n#ifdef SPIRE_RING\nvarying vec4 vClip;\n#endif')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGild = gild;\nvSpire = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz / ${f(SCALE)};`)
      .replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef SPIRE_RING\nvClip = gl_Position;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
uniform vec2 uPointer;
varying vec3 vGild;
varying vec3 vSpire;
${COMMON}
vec3 gLeft, gRight, gNear;
float gOn, gValley, gDetail, gRing, gMoonW, gSpread, gCover, gTone, gSparkW, gSpark, gCatch;
vec3 gNormal;
#ifdef SPIRE_RING
uniform mat4 projectionMatrix;
const vec3 gProfile[ ${profile.length} ] = vec3[]( ${profile.map(([y, r, h]) => `vec3( ${f(y)}, ${f(r)}, ${f(h)} )`).join(', ')} );
const vec3 gAxis = vec3( ${f(axis.x)}, ${f(axis.y)}, ${f(axis.z)} );
const vec3 gMiddle = vec3( 0.0, ${f(SPIRE.tall * SPIRE.ring.up)}, 0.0 );
varying vec4 vClip;
// The band's section, out from the ring's middle radius and up from it: the middle of its rounded box, its half
// sizes, the round of its arrises.
const float gR = ${f(SPIRE.ring.r + (b.out + b.in) / 2)}, gA = ${f(b.arris)};
const vec2 gB = vec2( ${f((b.out - b.in) / 2)}, ${f(b.half)} );
// A place in the section: how far out from the box's middle and up from it, and the way out from the axis there.
vec2 gQ( vec3 p, out vec3 rad ) {
	vec3 rel = p - gMiddle;
	float h = dot( rel, gAxis );
	vec3 o = rel - gAxis * h;
	float l = length( o );
	rad = o / max( l, 1e-5 );
	return vec2( l - gR, h );
}
// How far a place is from the band, exactly: the section's rounded box turned round the axis.
float gBand( vec2 q ) { vec2 w = abs( q ) - gB + gA; return length( max( w, 0.0 ) ) + min( max( w.x, w.y ), 0.0 ) - gA; }
float gSdf( vec3 p ) { vec3 rad; return gBand( gQ( p, rad ) ); }
// The band's normal in its section at q: a face, or the round of an arris; the top and underside crowned, and the
// bead round the outer face where on says it is drawn (its mean, flat, where it is not).
vec2 gFace( vec2 q, float on ) {
	float hw = gB.x - gA;
	vec2 w = abs( q ) - gB + gA, sq = vec2( q.x < 0.0 ? -1.0 : 1.0, q.y < 0.0 ? -1.0 : 1.0 );
	if ( w.x > 0.0 && w.y > 0.0 ) return normalize( w ) * sq;
	if ( w.y > w.x ) return normalize( vec2( ${f(2 * b.crown)} * ( q.y > 0.0 ? 1.0 : 0.5 ) * q.x / ( hw * hw ), sq.y ) );
	float t = clamp( q.y / ${f(b.bead[0])}, -1.0, 1.0 );
	return normalize( mix( vec2( sq.x, 0.0 ), vec2( sqrt( 1.0 - t * t ), t ), on * step( 0.0, q.x ) * step( abs( q.y ), ${f(b.bead[0])} ) ) );
}
// Along a ray from ro, from t on: the nearest it comes to the band (under 0 where it goes in), and how deep it goes
// where it does, and the place it is nearest at, or goes in at. The band's distance along a ray is convex where the
// ray is near it, so the steps toward it bracket that nearest place and a golden section search finds it to a small
// share of a pixel: a guess from the steps alone differed from one pixel to the next and drew the outline in ticks.
// pix is how wide a pixel is there, in units.
float gTrace( vec3 ro, vec3 rd, float t, float pix, out vec3 at ) {
	float m = 1e5, tm = t, ta = t, prev = t;
	bool hit = false;
	for ( int i = 0; i < ${RING.steps}; i ++ ) {
		float d = gSdf( ro + rd * t );
		if ( d < m ) { m = d; tm = t; ta = prev; }
		if ( d < 0.03 * pix ) { hit = true; break; }
		prev = t;
		t += d;
	}
	at = ro + rd * tm;
	// A ray seen nearly along a face closes on it only slowly and may not have gone in by its last step: one that has
	// come within a pixel is searched on into the band as one that has gone in.
	bool near = hit || m < pix;
	float a = hit ? tm : ( ta < tm ? ta : tm - m ), b = near ? tm + ${f(RING.deep)} : tm + m;
	float x1 = b - 0.618034 * ( b - a ), x2 = a + 0.618034 * ( b - a ), f1 = gSdf( ro + rd * x1 ), f2 = gSdf( ro + rd * x2 );
	for ( int i = 0; i < ${RING.search}; i ++ ) {
		if ( f1 < f2 ) { b = x2; x2 = x1; f2 = f1; x1 = b - 0.618034 * ( b - a ); f1 = gSdf( ro + rd * x1 ); }
		else { a = x1; x1 = x2; f1 = f2; x2 = a + 0.618034 * ( b - a ); f2 = gSdf( ro + rd * x2 ); }
	}
	float best = min( f1, f2 );
	if ( !hit && best < m && best > 0.0 ) at = ro + rd * ( f1 < f2 ? x1 : x2 );
	return min( m, best );
}
// The share of a footprint w wide centred on x that falls in [a, b].
float gBox( float x, float a, float b, float w ) { return clamp( ( min( x + 0.5 * w, b ) - max( x - 0.5 * w, a ) ) / max( w, 1e-5 ), 0.0, 1.0 ); }
// The tower at a height, as the ring mirrors it: how far out its faces stand, and how wide its strip of windows is.
vec2 gTower( float y ) {
	if ( y < gProfile[ 0 ].x || y > gProfile[ ${profile.length - 1} ].x ) return vec2( -1.0 );
	for ( int i = 0; i < ${profile.length - 1}; i ++ ) {
		vec3 a = gProfile[ i ], b = gProfile[ i + 1 ];
		if ( y <= b.x ) return mix( a.yz, b.yz, clamp( ( y - a.x ) / max( b.x - a.x, 1e-4 ), 0.0, 1.0 ) );
	}
	return vec2( -1.0 );
}
// Where a ray from p along d enters a square of half width w round the upright axis, or -1.
float gEnter( vec3 p, vec3 d, float w ) {
	vec2 inv = 1.0 / vec2( abs( d.x ) > 1e-5 ? d.x : 1e-5, abs( d.z ) > 1e-5 ? d.z : 1e-5 );
	vec2 t1 = ( vec2( -w ) - p.xz ) * inv, t2 = ( vec2( w ) - p.xz ) * inv, lo = min( t1, t2 ), hi = max( t1, t2 );
	float a = max( lo.x, lo.y ), b = min( hi.x, hi.y );
	return a <= b && b > 0.0 ? max( a, 0.0 ) : -1.0;
}
// What the ring sees of the tower along a direction from where it is: how much of what a pixel sees is the tower (w),
// and the tower's light there. Worked out exactly, not by steps: the nearest the ray comes to the shaft's middle, as
// the shaft's square measures it, is at one of five places along it. Where the ray only grazes the shaft its edge is
// given the share of the pixel it covers (foot is how wide a pixel's ray is there), so the tower's outline in the
// gold never breaks into dashes.
vec4 gSeeTower( vec3 from, vec3 d, float spread ) {
	float c[ 5 ];
	c[ 0 ] = 0.0;
	c[ 1 ] = abs( d.x ) > 1e-5 ? - from.x / d.x : 0.0;
	c[ 2 ] = abs( d.z ) > 1e-5 ? - from.z / d.z : 0.0;
	c[ 3 ] = abs( d.x - d.z ) > 1e-5 ? ( from.z - from.x ) / ( d.x - d.z ) : 0.0;
	c[ 4 ] = abs( d.x + d.z ) > 1e-5 ? - ( from.z + from.x ) / ( d.x + d.z ) : 0.0;
	float best = 1e5, tb = 0.0;
	for ( int i = 0; i < 5; i ++ ) {
		float t = clamp( c[ i ], 0.0, ${f(MIRROR.reach)} );
		vec3 p = from + d * t;
		float g = max( abs( p.x ), abs( p.z ) );
		if ( g < best ) { best = g; tb = t; }
	}
	vec2 w = gTower( from.y + d.y * tb );
	if ( w.x <= 0.0 ) return vec4( 0.0 );
	float foot = max( spread * tb, 0.06 ), cover = clamp( 0.5 - ( best - w.x ) / foot, 0.0, 1.0 );
	if ( cover <= 0.0 ) return vec4( 0.0 );
	float te = gEnter( from, d, w.x );
	if ( te > 0.0 ) {
		vec2 w2 = gTower( from.y + d.y * te );
		float t2 = w2.x > 0.0 ? gEnter( from, d, w2.x ) : -1.0;
		if ( t2 > 0.0 ) { te = t2; w = w2; }
	} else te = tb;
	vec3 p = from + d * te;
	bool front = abs( p.z ) >= abs( p.x );
	float across = front ? p.x : p.z, side = front ? sign( p.z ) : sign( p.x ), at = max( spread * te, 0.06 );
	vec3 col = ${mix(...STONES.granite)} * ${f(MIRROR.stone / STONES.granite[3])} * ( !front && side > 0.0 ? ${f(MIRROR.moonlit)} : 1.0 );
	if ( front && side > 0.0 ) {
		// The strip of windows as a mirror stretched along a curve shows it: a warm band, its floors as soft lines and
		// its floors lit or not, never its single rooms, which stretched into rows of dashes.
		float floors = p.y / ${f(MIRROR.floor)}, on = 0.35 + 0.65 * tHash( vec2( floor( floors ), 7.0 ) );
		float strip = gBox( across, - w.y, w.y, at );
		col = mix( col, ${lin('hot')} * ${f(MIRROR.rooms)} * on * ( 0.55 + 0.45 * tPulse( floors, 0.2, 0.9, at / ${f(MIRROR.floor)} ) ), strip );
	}
	return vec4( col, cover );
}
#endif
`).replace('#include <color_fragment>', `#include <color_fragment>
gLeft = vec3( 0.0, 0.0, 1.0 ); gRight = gLeft; gNear = gLeft;
gOn = 0.0; gValley = 0.0; gDetail = 0.0; gRing = 0.0; gMoonW = 0.0; gSpread = 0.0; gCover = 1.0; gTone = 1.0; gSparkW = 0.0; gSpark = 0.0; gCatch = 0.0; gNormal = vec3( 0.0, 0.0, 1.0 );
#ifdef SPIRE_RING
{
	// The band itself, found along this pixel's ray from the hull: the share of the pixel it covers, from how near
	// the ray comes to it against how wide a pixel is there, and the place it is seen at.
	vec3 cam = cameraPosition / ${f(SCALE)}, at, at2, rad;
	float tf = length( vSpire - cam );
	vec3 rd = ( vSpire - cam ) / max( tf, 1e-5 );
	vec2 ndc = vClip.xy / vClip.w, pn = max( vec2( abs( dFdx( ndc.x ) ), abs( dFdy( ndc.y ) ) ), vec2( 1e-7 ) );
	float pix = max( pn.x * vViewPosition.z / projectionMatrix[ 0 ][ 0 ] / ${f(SCALE)}, 1e-4 );
	float m = gTrace( cam, rd, tf - 0.1, pix, at );
	gCover = saturate( 0.5 - m / pix );
	// The catch line: lit where the band is covered here and not a little further toward the moon's side of up.
	vec2 n2 = ndc + vec2( ${f(CATCH.dir[0])}, ${f(CATCH.dir[1])} ) * max( ${f(CATCH.px)}, ${f(CATCH.wide)} / pix ) * pn;
	vec3 rd2 = inverseTransformDirection( vec3( ( n2.x + projectionMatrix[ 2 ][ 0 ] ) / projectionMatrix[ 0 ][ 0 ], ( n2.y + projectionMatrix[ 2 ][ 1 ] ) / projectionMatrix[ 1 ][ 1 ], -1.0 ), viewMatrix );
	float m2 = gTrace( cam, rd2, tf - 3.0, pix, at2 );
	vec2 q = gQ( at, rad );
	gCatch = gCover * ( 1.0 - saturate( 0.5 - m2 / pix ) ) * mix( ${f(CATCH.shade)}, 1.0, smoothstep( -0.6, 0.8, rad.x ) ) * mix( 1.0, ${f(CATCH.far)}, smoothstep( -0.2, 0.5, - rad.z ) );
	// Its normal, from the section (gFace), with the bead drawn where it is tall enough on the screen.
	// Taken as the mean of four places across the pixel's footprint in the section, so an arris or the bead finer
	// than a pixel comes to its mean and does not alias into ticks along the band.
	float on = smoothstep( ${f(RING.bead * 0.6)}, ${f(RING.bead)}, ${f(2 * b.bead[0])} / max( fwidth( q.y ), 1e-5 ) );
	vec2 qx = dFdx( q ), qy = dFdy( q );
	qx *= min( 1.0, 3.0 / max( length( qx ), 1e-5 ) );
	qy *= min( 1.0, 3.0 / max( length( qy ), 1e-5 ) );
	vec2 ns = normalize( gFace( q + 0.375 * qx + 0.125 * qy, on ) + gFace( q - 0.125 * qx + 0.375 * qy, on ) + gFace( q - 0.375 * qx - 0.125 * qy, on ) + gFace( q + 0.125 * qx - 0.375 * qy, on ) + vec2( 1e-5, 0.0 ) );
	gNormal = normalize( ( viewMatrix * vec4( ns.x * rad + ns.y * gAxis, 0.0 ) ).xyz );
	// A heavy flat band in two tones: its top, which takes the night's light, and its edges and underside, which are
	// turned from it and darker.
	gTone = mix( mix( ${f(RING.under)}, ${f(RING.side)}, smoothstep( -0.6, 0.0, ns.y ) ), 1.0, smoothstep( 0.25, 0.65, ns.y ) );
	gRing = 1.0;
}
#endif`).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, ${f(RING.rough)}, gRing );`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef SPIRE_RING
normal = gNormal;
#endif
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
	// How far the moon's mirror changes across a pixel, which its sheen is filtered by, and how wide a pixel's
	// mirrored ray is, which everything the ring mirrors is filtered by.
	vec3 mr = normalize( inverseTransformDirection( reflect( - normalize( vViewPosition ), normal ), viewMatrix ) );
	gMoonW = fwidth( dot( mr, uMoonward ) );
	gSpread = length( fwidth( mr ) );
	#ifdef SPIRE_RING
		// A highlight finer than a pixel is spread to what a pixel holds: the gold's roughness grows with how far its
		// normal turns across a pixel.
		vec3 dn = fwidth( normal );
		roughnessFactor = sqrt( roughnessFactor * roughnessFactor + min( ${f(RING.aa)} * dot( dn, dn ), 0.2 ) );
		vec3 sg = normalize( uGlintAt + vViewPosition ), sv = normalize( vViewPosition );
		gSparkW = fwidth( dot( normal, normalize( sg + sv ) ) );
	#endif
}`).replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace('getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )', 'goldFluted( geometryViewDir, geometryNormal, material.roughness )')).replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.directSpecular *= mix( 1.0, ${f(RING.direct)}, gRing );${ring ? '' : rim(RIM.gold, true)}
#ifdef SPIRE_RING
{
	// The pointer's spark: the line from the eye through the pointer, worked out from the projection, so it is right
	// in any host. Near where that line passes the ring, the face that is turned between the cursor's light and the
	// eye takes a small hard spark, filtered to what a pixel holds and keeping its light as it spreads.
	vec2 ndc = vec2( uPointer.x * 2.0 - 1.0, 1.0 - uPointer.y * 2.0 );
	vec3 q = geometryPosition;
	vec4 clip = projectionMatrix * vec4( q, 1.0 );
	vec2 off = ( ndc - clip.xy / max( clip.w, 1e-6 ) ) * max( - q.z, 1e-6 ) / vec2( projectionMatrix[ 0 ][ 0 ], projectionMatrix[ 1 ][ 1 ] ) / ${f(SCALE)};
	float near = exp( - dot( off, off ) / ${f(SPARK.reach * SPARK.reach)} );
	// Turned to the eye in the band's own section only, not round the ring: the cursor's light stands nearly in line
	// with the eye, so a true highlight would only ever sit on the front of the ring. Taken in its section, there is a
	// line of it all the way round, and the pointer says where along it the spark is.
	vec3 sh = inverseTransformDirection( geometryViewDir, viewMatrix ), sn = inverseTransformDirection( geometryNormal, viewMatrix );
	vec3 rad = vSpire - gMiddle;
	rad -= gAxis * dot( rad, gAxis );
	rad /= max( length( rad ), 1e-5 );
	vec2 hs = vec2( dot( sh, gAxis ), dot( sh, rad ) ), ns = vec2( dot( sn, gAxis ), dot( sn, rad ) );
	float face = dot( ns / max( length( ns ), 1e-5 ), hs / max( length( hs ), 1e-5 ) );
	float w = clamp( gSparkW, ${f(SPARK.wide)}, ${f(SPARK.most)} ), lobe = smoothstep( 1.0 - w, 1.0 - 0.15 * w, face ) * ( 0.5 + 0.5 * ${f(SPARK.wide)} / w );
	gSpark = ${f(SPARK.power)} * dot( uGlint, vec3( 0.2126, 0.7152, 0.0722 ) ) * near * lobe;
}
#endif`).replace('void main() {', `#ifdef USE_ENVMAP
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
	#ifdef SPIRE_RING
		// The haze of the city's light low over the horizon, and the lit city below it: streets and floors of light.
		// All filtered by how wide a pixel's mirrored ray is (gSpread), so nothing the ring mirrors is finer than a
		// pixel and none of it is worked out by a derivative here.
		float el = rw.y, fe = max( gSpread, 1e-4 );
		float haze = exp( - pow( ( el - ${f(MIRROR.hazeAt)} ) / sqrt( ${f(MIRROR.hazeTall * MIRROR.hazeTall)} + fe * fe ), 2.0 ) );
		float az = atan( rw.x, rw.z ) / 6.28318 * ${f(MIRROR.streets)}, fa = max( fe / max( length( rw.xz ), 0.1 ) / 6.28318 * ${f(MIRROR.streets)}, 1e-4 );
		float rows = el * ${f(MIRROR.floors)}, lights = tPulse( az, 0.25, 0.7, fa ) * tPulse( rows, 0.15, 0.6, fe * ${f(MIRROR.floors)} );
		float under = smoothstep( 0.02, -0.04, el ) * smoothstep( ${f(MIRROR.cityTo)}, ${f(MIRROR.cityTo * 0.4)}, el );
		float sky = smoothstep( 0.0, ${f(SKY.from)}, el ) * ( 1.0 - smoothstep( ${f(SKY.from)}, ${f(SKY.to)}, el ) );
		night += ${lin('hot')} * ( ${f(MIRROR.haze)} * haze + ${f(MIRROR.city)} * under * ( 0.55 + 0.9 * lights ) + ${f(SKY.power)} * sky ) * envMapIntensity;
		vec4 tower = gSeeTower( vSpire, rw, fe );
		night = mix( night, tower.rgb * envMapIntensity * ${f(RING.shade)}, tower.w ) * gTone;
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
void main() {`).replace('#include <opaque_fragment>', `{
	float lv = max( outgoingLight.r, 0.0 );
	#ifdef SPIRE_RING
		// The half beyond the tower, seen against the night, and the catch line.
		lv *= ${f(RING.body)} * mix( 1.0, ${f(RING.far)}, smoothstep( -0.2, 0.5, sin( 6.28318 * vGild.z ) ) );
		lv += ${f(CATCH.power)} * gCatch;
		float caught = gCatch;
		diffuseColor.a = gCover;
	#endif
	vec3 c = mix( mix( vec3( ${GRADE.deep.map(f).join(', ')} ), ${lin3(METAL.gold)}, smoothstep( ${f(GRADE.at[0])}, ${f(GRADE.at[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GRADE.at[1])}, ${f(GRADE.at[2])}, lv ) );
	float most = ${f(GRADE.most[0])}, room = ${f(GRADE.most[1] - GRADE.most[0])};
	if ( vGild.y < 2.5 ) outgoingLight = tKeep( c * ( lv < most ? lv : most + room * ( 1.0 - exp( - ( lv - most ) / room ) ) ) );
	#ifdef SPIRE_RING
		// The spark is laid on after the gold's grade, which eases every bright toward pale and would leave it no
		// brighter than the band's own sheen: it is the cursor's light itself, pale, on the gold.
		outgoingLight = mix( outgoingLight, ${lin('pale', SPARK.peak)}, clamp( gSpark, 0.0, 1.0 ) );
		// Drawn with its color already weighed by its cover, and more than its share: the page lays the canvas over
		// its sky after the canvas is encoded, so a pixel half covered weighed by half in linear light came out far
		// brighter than half, and the outline did not soften.
		outgoingLight *= pow( gCover, ${f(RING.gamma)} );
		// The catch line already carries its cover once, as light laid on a pixel does.
		outgoingLight += ${lin('pale', CATCH.light)} * caught;
		if ( gCover < 0.002 ) discard;
	#endif
}
#include <opaque_fragment>`);
  };
  if (ring) m.depthWrite = false;
  return lit(m, { key: ring ? 'spire-ring' : 'spire-gold', baked: true, core: false, glint: true });
}

export interface SpireMaterials { stone: THREE.MeshStandardMaterial; bay: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; ring: THREE.MeshStandardMaterial; dispose(): void }

// The ring's section, as the make script made its hull round it (S.ring in scripts/world/parts/spire/make.mjs).
export interface Band { out: number; in: number; half: number; arris: number; crown: number; bead: [number, number] }

export function materials(map: THREE.Texture, ledges: number[], profile: number[][], band: Band): SpireMaterials {
  const all = { stone: stone(ledges), bay: bay(map), gold: gold(profile, band, false), ring: gold(profile, band, true) };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}



