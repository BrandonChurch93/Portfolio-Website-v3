import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { MOONWARD, SCALE, ground } from '../../layout';
import { STEP, TOWERS } from '../../placed';
import { METAL, WARM as KEPT, lit } from '../../light';
import { FRONT, PALE_STONE, PLACE, SLIVER, STONES, WARM, WINDOW } from './windows';
import { SUN, discAt, obeliskPoint } from './marks';

const FOOT = PLACE.foot;
// Where his stepped tower stands, so the bay's material keeps it in the light he approved (HIS in SKY_LIGHT).
const [HX, HZ, HW, HD] = TOWERS[STEP];
const HIS_AT = `( step( abs( vWPos.x / ${(SCALE).toFixed(5)} - ${HX.toFixed(3)} ), ${(HW * 0.75).toFixed(3)} ) * step( abs( vWPos.z / ${(SCALE).toFixed(5)} - ${HZ.toFixed(3)} ), ${(HD * 0.75).toFixed(3)} ) )`;

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
// Each building lays its own courses: from course[0] to course[1] tall as ashlar (the base's channels from
// channel[0] to channel[1]), its blocks block[0] to block[1] courses long.
// keep: how much of its warmth a stone (the first) and a bronze cladding (the second) keep against the stage's
// white balance: a stone none, so a pale stone reads pale and near neutral, the city's warmth being its light.
// How the city's stone is laid against its floors: a storey's height in units, the shares of buildings laid in ashlar
// of two courses a floor and in panels a floor tall (the rest smooth, jointed every `smooth` floors), and how dark a
// panel's joint and a smooth stone's are against ashlar's.
const LAID = { storey: 2.3, ways: [0.4, 0.75], smooth: 3, dark: [0.75, 0.55] };
const STONE = { course: [0.8, 1.9], channel: [1.2, 1.6], block: [1.7, 3.0], joint: [0.05, 0.16], differ: 0.14, dark: 0.5, rough: 0.82, streak: 0.22, keep: [0, 1], night: 1.2, hue: 0.06 };
// The moon's line on the city: the moon is behind it, so each face turned toward the moon and seen near edge on (a
// roof, a cornice's top, a face toward the moon) or cut toward it at a corner (an arris) carries a crisp pale line
// of its light, as the spire's chamfers do, and each silhouette stands off the one behind it. How bright, as a share
// of the moon's light on the face; how tight the line on a cut toward the moon is (a power of how near the face is to
// the half way between the moon and the eye), and on a face seen edge on (a power of how near edge on); and how much
// of the line is the stone's own color and how much the moon's.
// thin: from how many pixels a unit is drawn at the line on an upright face comes in, to where it is whole.
const RIM = { power: 0.9, cut: 7, edge: 5, own: 0.45, thin: [2.5, 5], top: [2.5, 7] };
// The sky about the moon on the city (skyward in scripts/world/parts/towers/make.mjs, stored where the moon's share
// would be): the moon is low and behind the city, so the tops stand in its light and are paler, the tall buildings
// lay long shadows of it across the lower ones before them, and the feet are shut out of it. power: how much of the
// moon's light it is on a face turned to the moon (wrap: how much a face turned from it still takes), how high the
// city is, in units, from its feet (low) to its tallest tops (high), and how much of it the feet keep (feet); the
// night's soft light from the visitor's side is taken by `fill` of the sky seen; the moon's line along a chamfer
// fades with height to `rim` at the feet.
// His stepped tower's limestone takes `pale` of it, so its lit piers stay the pale near neutral he approved.
// Every building but his: how much of its light the foot of a building keeps against its top, and the curve
// between; the sky about the moon on it, and how much of it a face turned from the moon still takes (little: the face
// turned to the moon is the lit one, the front a clear step darker); how much of the night's soft light it takes
// against his, and how much of the stored bounce, which lies on every face alike.
const SHADE = { foot: 0.35, curve: 1.1, power: 4, wrap: 0.05, night: 0.15, bounce: 0.45 };
const SKY = { power: 0.75, wrap: 0.4, low: -25, high: 150, feet: 0.1, fill: 0.6, rim: 0.12, pale: 0.15 };
// The street's light on the lowest storeys: shop fronts and lamps bleeding up the walls, in the palette's hot light,
// as radiance on the stone at the foot (power), falling to a share 1/e every `fall` units up, strongest in the
// canyons between buildings (canyon: how much more where the place is shut in), in clumps along a street (clump:
// how long a clump is, in units, and how deep the dark between).
const STREET = { power: 0.8, fall: 9, canyon: 1.6, clump: [9, 0.65] };
// The city's own light on its walls: the lit windows across every street, as radiance on the stone, more where the
// place is shut in, falling to a share 1/e every `fall` units up.
// Every building but his takes less of it, and only low down (city, cityFall): its walls are lit by the night and
// the moon from a shaded foot to a lit top (SHADE), and their glow is the street's and their own windows'.
const GLOW = { power: 0.16, shut: 1.5, fall: 90, city: 0.05, cityFall: 30 };
// The city's own light on its walls, as real light with a direction: the streets and the lit windows of the open
// ground before the city spill a warm light up its faces, from in front and the visitor's right (FRONT.toward in
// ./windows.ts, which the make bakes how much of it a place sees by). A face takes it by its cosine, wrapped by
// `wrap`, in the palette's hot light eased `pale` toward its pale; it is brightest low and falls to `floor` of that by
// `fall` units up (his tower takes it only on its lowest floors, falling by `his`); a place shut
// from the front by a nearer building (the bake's `frontward`) keeps `shut` of it, and a place shut in keeps `open`.
// It is laid on as radiance, as the street's is, so the foot to top shade of the moon's light does not dim it.
const CITY = { pale: 0.15, power: 1.0, wrap: 0.1, fall: 26, floor: 0.4, his: 8, shut: 0.3, open: 0.6 };
// The far rows fall back: the walls of the back of the city keep `far` of their light and its windows `lights`, by
// how far back a place is (tBack, eased by `curve`), and they go toward the dark warm air between, `haze` of the way,
// so the front row is lit and crisp and the last rows are near silhouettes against the glow behind the world. The air
// is a dark warm grey, less red than the walls, so the far rows cool as they fall back. His tower keeps the share of
// its walls' light and its windows' (his) that it had where it stands when he approved it.
const DEPTH = { far: 0.22, lights: 0.5, curve: 0.6, haze: 0.5, air: [0.032, 0.022, 0.015], his: [0.7097, 0.8259] };
// A lit face of every building but his: the light from without held under a soft shoulder from `knee` (the
// brightest channel, linear) over `soft`, and going toward the palette's pale only from pale[0] to pale[1].
const LIT_FACE = { knee: 0.5, soft: 0.3, pale: [0.75, 1.2] };
const HOT = new THREE.Color(hex('hot'));
// The city's light: the palette's hot light eased toward its pale (CITY.pale), as a lamp lit street seen from afar is.
const CITY_LIGHT = HOT.clone().lerp(new THREE.Color(hex('pale')), CITY.pale);
// The pale stone, which every stone of the towers is a tone of: the palette's text-2, a little lighter (PALE_STONE in
// ./windows.ts, which the baker lights it by too).
const PALE = new THREE.Color(hex('text-2')).lerp(new THREE.Color(hex('copper-light')), WARM).multiplyScalar(PALE_STONE);
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
// Sheet bronze and copper: how far apart its standing seams are, in units, how dark a seam is, and how much the
// weather streaks it.
const SHEET = { seam: 1.3, dark: 0.45, weather: 0.22 };
// A lit room seen far off is this warm (0 flame, 0.5 hot, 1 pale); close up its color runs from its own warmth less
// lamp[0] at its back toward pale by lamp[1] for each step of the lamp's glow. The rooms round a place, read over
// spill[1] windows each way, light the wall between them by spill[0] of their level, so a lit clump has a glow.
const ROOM = { far: 0.25, lamp: [-0.22, 0.32], spill: [0.9, 4] };
// A curtain wall of coated glass, on a few towers (the look `curtain` in scripts/world/parts/towers/designs.mjs):
// how wide its mullions are, in units; how much of a room's light its coating lets through; the coating's color, as
// a share of the world's bronze eased `gild` toward its gold, how metallic it is and how rough, so each face mirrors
// the night (night.ts) in its own shade, the faces toward the moon pale and the fronts the warm glow low behind the
// world. And the polished
// copper of the ringed drums' bands (POLISHED): how rough, and how much of the lit city round about it mirrors, so
// the bands read bright, as picture 9's do.
const CURTAIN = { mullion: 0.08, through: 0.32, tint: 0.6, gild: 0.5, metal: 0.9, rough: 0.09, polish: 0.16, city: 0.45 };
const CURTAIN_TINT = METAL.bronze.clone().lerp(METAL.gold, CURTAIN.gild).multiplyScalar(CURTAIN.tint);
const BAY = { bronze: 0.62, rough: 0.5, metal: 0.85, glass: 0.06, bevel: 0.07, copper: 0.4, stone: 0.9 };
// A field of windows seen from far off, where a window is a few pixels or less: it is drawn as its own wall, a warm
// stone of this tone, with only its brightest rooms lit, each a small crisp light, one at most in each block of
// windows about `dot` pixels across. Below `far[0]` pixels a window it is wholly so, above `far[1]` wholly the near
// field. A room is lit there from `lit[0]` of its level to fully at `lit[1]`, and a light smaller than a pixel is
// brightened by up to `boost` so that it gives the light of a whole one. Its dark glass shows as `grid` darker than
// the wall, filtered, so the field keeps its weave and comes to an even tone where it is finer than a pixel.
// Under the crisp lights the field also glows with its own average, the windows' light filtered over the pixel
// (glow, against what the windows give on average), so a floor lit end to end reads as a band of light and a dark
// building stays dark. The wall of a bronze bay seen far off is the stone `bay` of STONES, `wall` as bright.
// A field of windows where a window is a few pixels or less is filtered as a whole, so a room smaller than a pixel
// never flickers as the page moves: each window's level is read from the map's own smaller copies, and its glass is
// the share of the pixel it covers, worked out exactly. Between `far` pixels a window the wall between them turns to
// one even stone, `wall` as bright as a stone face and `grid` darker where its glass is; a room's own color is read
// from `tint` pixels a window up, under that its average. The room seen behind the glass, its sill and the bevel of
// its frame come in between `detail` pixels a window, where none of them can crawl.
// Where windows are filtered to their average, a clump of lit rooms gives `boost` times its average light, so it
// still reads as a lit clump and not as a warmer wall (a lit room's glass spills past its frame, seen from far off).
const FAR = { far: [2.4, 4.4], tint: [1.2, 2.2], detail: [5, 9], bay: 2, wall: 0.8, grid: 0.22, boost: 6, patch: 2.2, taps: 4, cap: 4 };
// The gold mirrors the night as the pyramid's does, so the world's gold is one gold: a deep gold where it mirrors
// little, the world's gold, METAL.gold, as it mirrors more, and pale gold only where it blazes (grade: the levels at
// which each begins). What it mirrors is where its reflection points: the moon is behind the city and to the right,
// so a face whose normal lies near the half way between the moon and the eye mirrors the moon's light and blazes,
// and a face turned to the left or up mirrors the dark. moon: the cosines between the reflection and the moon over
// which a face goes from `dark` (how much of the night it mirrors) to `lit`. The stage's white balance is undone on
// it, so every gold pixel stays gold.
// A sun disc's carving gives way, as a pixel grows from far[0] to far[1] units, to the far form of a coin: a field of
// deep gold that mirrors `field` as much, carved over by light and shade (FAR_DISC); the cursor's glint and the moon's own on that field are cut by `glint`, which on a flat coin far off was one round spot of light.
const DISC = { far: [0.25, 0.5], field: 12, glint: 0.85 };
const GOLD = { sheen: [0.6, 0.3], rough: 0.17, moon: [0.1, 0.8], lit: 9, dark: 0.14, city: 0.04, fillet: 0.18, valley: 0.2, grade: [0.1, 2.4, 5.5], wave: [0.05, 3], shoulder: [1.2, 2.5], shade: 0.4, rise: [100, 200] };
// sheen: a broad lobe of the cursor's glint (how strong, how rough), so polished gold shows a soft band that slides
// with the cursor. shade and rise: the sky about the moon is mirrored only `shade` as strongly below rise[0] units up
// as above rise[1], since the city's skyline cuts it off low down: a gold point blazes at its head.
// No polished panel is perfectly flat: each face's normal wanders by up to wave[0] over wave[1] units of the world, so
// the reflection changes across a face as on real gilding.
// The gold also mirrors what the bake found reaching it from round about (the city's windows, the street, the
// stone), which the night has none of, as an even light of that strength (city) over the half of the world it
// faces: so a face turned from the moon is a deep gold and not a hole.

// The named marks, each lit as its own. His crown (the stepped tower's) is lit as round 7 lit it, which he approved
// by name: the moon mirrored at `lit`, under a soft shoulder over `shoulder`, and no broad sheen, so each tier keeps
// its dark line and its gold. The obelisk is the brightest gold on the skyline, by contrast and not by bloom: each
// broad face is drawn a little convex (`bend`, how far its normal turns toward its edges), so the moon's own
// reflection lies down its lit face as a streak (`streak`, how bright, and `tight`, how narrow a lobe of the
// reflection's bearing), over a gold that rises from `foot` of itself at the plinth to its whole at the head, while
// the face turned away mirrors the night in front of the world at `dark` and is a deep gold, never brown. Its
// polish wanders `wave` as far as the rest of the gold's (on its broad faces the wander read as blotches), its
// shoulder is high, and it is drawn at `gain` of its light, so its lit face grades to pale gold below the cap and
// keeps its gradient and its streak, where at full light the whole face sat flat at the cap.
const MARK = {
  his: { lit: 2.9, shoulder: [1.2, 1.1] },
  obelisk: { lit: 3.4, streak: 9, tight: 160, bend: -0.3, foot: 0.45, dark: 1.1, wave: 0.3, shoulder: [1.4, 3.4], gain: 0.6 },
};
// The sun disc seen far off, where its carving gives way to a field: the field's light is held under `cap` by a soft
// shoulder, whatever the moon and the cursor's sheen give it, and the carving is drawn over it as light and shade
// (how much darker its grooves, how much brighter its rays, its plates and its boss), so it always reads.
const FAR_DISC = { cap: 2.0, groove: 0.5, ray: 0.75, plate: 0.25, boss: 0.5 };
const OBI = TOWERS.findIndex((t) => t[6] === 'obelisk'), SDI = TOWERS.findIndex((t) => t[6] === 'disc');
const near = (i: number, k: number): string => {
  const [x, z, w, d] = TOWERS[i];
  return `( step( abs( vWPos.x / ${(SCALE).toFixed(5)} - ${x.toFixed(3)} ), ${(w * k).toFixed(3)} ) * step( abs( vWPos.z / ${(SCALE).toFixed(5)} - ${z.toFixed(3)} ), ${(d * k).toFixed(3)} ) )`;
};

const COMMON = `
#ifndef HIS
#define HIS 0.0
#endif
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
	return c / mix( vec3( 1.0 ), ${BALANCE}, k * ${f(KEPT)} );
}
// A stone's light seen through k of the stage's white balance, and less of it as the light nears the brightest, so a
// face the moon lights full stays the moon's pale and never goes whiter.
vec3 tCooled( vec3 c, float k ) {
	return c * mix( vec3( 1.0 ), ${BALANCE}, k * ( 1.0 - smoothstep( 0.3, 0.8, max( c.r, max( c.g, c.b ) ) ) ) );
}
vec3 tStone( float tone ) {
	int i = int( clamp( floor( tone * ${f(STONES.length - 1)} + 0.5 ), 0.0, ${f(STONES.length - 1)} ) );
	${STONES.map((s, i) => `if ( i == ${i} ) return ${v3(s.tint)};`).join('\n\t')}
	return vec3( 1.0 );
}
float tCool( float tone ) {
	int i = int( clamp( floor( tone * ${f(STONES.length - 1)} + 0.5 ), 0.0, ${f(STONES.length - 1)} ) );
	${STONES.map((st, i) => `if ( i == ${i} ) return ${f(st.cool)};`).join('\n\t')}
	return 0.0;
}
vec2 tFinish( float tone ) {
	int i = int( clamp( floor( tone * ${f(STONES.length - 1)} + 0.5 ), 0.0, ${f(STONES.length - 1)} ) );
	${STONES.map((s, i) => `if ( i == ${i} ) return vec2( ${f(s.metal)}, ${f(s.rough)} );`).join('\n\t')}
	return vec2( 0.0, 0.8 );
}
// The street's light on a wall: h is how high over the building's foot, up is how far the face looks up, open how
// open the place is, along a place along the street.
// How much of the moon's light and of the sky about it a face keeps by how wide it is drawn: a stone face narrower
// than SLIVER.most units (tThin, in units, 0 when wider) drawn under SLIVER.px pixels across keeps none, so a lit
// jamb or arris finer than a pixel never breaks into dashes. tPpu is how many pixels a unit is drawn at.
float tSliver( vec3 n, vec3 v ) {
	return tThin > 0.0 ? smoothstep( ${f(SLIVER.px[0])}, ${f(SLIVER.px[1])}, tThin * abs( dot( n, v ) ) * tPpu ) : 1.0;
}
// The moon's line on a face (RIM): n, v and l the face's normal, the eye's and the moon's, in one space.
float tRim( vec3 n, vec3 v, vec3 l ) {
	float nl = clamp( dot( n, l ), 0.0, 1.0 ), nv = clamp( dot( n, v ), 0.0, 1.0 );
	vec3 h = l + v;
	h /= max( length( h ), 1e-5 );
	// A wall's moon line is cut along a narrow chamfer or a jamb, which drawn thinner than a pixel and a half broke into
	// dashes: on an upright face it fades as a unit grows past RIM.thin of a pixel. The line along a face seen edge on is
	// for what looks up (a roof, a cornice's top), never for an upright face.
	vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	float lies = smoothstep( 0.5, 0.85, abs( dot( n, upV ) ) ), upp = max( length( fwidth( vWPos ) ), 1e-5 ) / ${f(SCALE)};
	float thin = mix( smoothstep( ${f(RIM.thin[0])}, ${f(RIM.thin[1])}, 1.0 / upp ), 1.0, lies );
	// A ledge's top seen edge on (a cornice, a belt, a sill) is drawn a sliver of a pixel tall: its line comes in only
	// as a unit is drawn at RIM.top pixels and more, so far off it is no speckle of pale ticks. His tower keeps its own.
	return ${f(RIM.power)} * nl * thin * ( pow( clamp( dot( n, h ), 0.0, 1.0 ), ${f(RIM.cut)} ) + lies * mix( smoothstep( ${f(RIM.top[0])}, ${f(RIM.top[1])}, 1.0 / upp ), 1.0, HIS ) * pow( 1.0 - nv, ${f(RIM.edge)} ) );
}
// A bright stone goes to the palette's pale gold as it nears the brightest, never to white: the moon full on pale
// limestone, with its line, came out (243, 223, 201). His tower keeps the light he approved it in; every other
// building's light from without (h 0) is first held under a soft shoulder (LIT_FACE), so a lit face keeps its own
// stone's color and its texture and never sits flat at the cap, and only what passes the shoulder goes pale.
vec3 tKnee( vec3 c, float h ) {
	float m = max( c.r, max( c.g, c.b ) ), k = m < ${f(LIT_FACE.knee)} ? m : ${f(LIT_FACE.knee)} + ${f(LIT_FACE.soft)} * ( 1.0 - exp( - ( m - ${f(LIT_FACE.knee)} ) / ${f(LIT_FACE.soft)} ) );
	return mix( c * ( k / max( m, 1e-5 ) ), c, h );
}
vec3 tPale( vec3 c, float h ) {
	float m = max( c.r, max( c.g, c.b ) );
	return mix( c, ${lin('pale')} * m, smoothstep( mix( ${f(LIT_FACE.pale[0])}, 0.5, h ), mix( ${f(LIT_FACE.pale[1])}, 1.0, h ), m ) );
}
// How high a place stands in the city, 0 at its feet and 1 at its tallest tops.
float tUp( float y ) { return smoothstep( ${f(SKY.low)}, ${f(SKY.high)}, y / ${f(SCALE)} ); }
// Every building but his is lit from a shaded foot to a lit top (SHADE), by how far up itself a place is: the light
// that falls on it, and not its own windows or the street's.
float tRise( float rise, float his ) { return mix( mix( ${f(SHADE.foot)}, 1.0, pow( clamp( rise, 0.0, 1.0 ), ${f(SHADE.curve)} ) ), 1.0, his ); }
// How far back a place is in the city, 0 at its front rows and 1 at its back.
float tBack( float z ) { return pow( clamp( ( z / ${f(SCALE)} - ${f(PLACE.depth[0])} ) / ${f(PLACE.depth[1] - PLACE.depth[0])}, 0.0, 1.0 ), ${f(DEPTH.curve)} ); }
// His tower keeps the light he approved it in, and takes none of the air.
vec3 tAir( vec3 c, float z, float his ) { return mix( c, ${v3(DEPTH.air)}, ${f(DEPTH.haze)} * tBack( z ) * ( 1.0 - his ) ); }
// The moon's line is laid on the direct light from the moon only, after the stage's own.
const vec3 tMoonward = ${v3(new THREE.Vector3(...MOONWARD).normalize().toArray())};
const vec3 tCityward = ${v3(new THREE.Vector3(...FRONT.toward).normalize().toArray())};
float tCity( vec3 n, float h, float fore, float open, float his ) {
	vec3 l = ( viewMatrix * vec4( tCityward, 0.0 ) ).xyz;
	float c = clamp( ( dot( n, l ) + ${f(CITY.wrap)} ) / ${f(1 + CITY.wrap)}, 0.0, 1.0 );
	float fall = his > 0.5 ? exp( - max( h, 0.0 ) / ${f(CITY.his)} ) : mix( ${f(CITY.floor)}, 1.0, exp( - max( h, 0.0 ) / ${f(CITY.fall)} ) );
	return ${f(CITY.power)} * c * fall * mix( ${f(CITY.shut)}, 1.0, fore ) * mix( ${f(CITY.open)}, 1.0, open );
}
float tStreet( float h, float up, float open, float along ) {
	float side = 1.0 - smoothstep( 0.35, 0.85, abs( up ) );
	float clump = mix( 1.0 - ${f(STREET.clump[1])}, 1.0, smoothstep( 0.35, 0.65, tNoise( vec2( along / ${f(STREET.clump[0])}, 3.7 ) ) ) );
	float street = ${f(STREET.power)} * exp( - max( h, 0.0 ) / ${f(STREET.fall)} ) * clump * mix( 1.0, ${f(STREET.canyon)}, 1.0 - open );
	return side * ( street + mix( ${f(GLOW.city)}, ${f(GLOW.power)}, HIS ) * mix( 1.0, ${f(GLOW.shut)}, 1.0 - open ) * exp( - max( h, 0.0 ) / mix( ${f(GLOW.cityFall)}, ${f(GLOW.fall)}, HIS ) ) );
}`;

// The moon's line (tRim), laid on the stage's own light from the moon on a face of stone or of the bay, where the moon
// reaches it: so a face in another's shadow has none. It is kept apart (tRimLight) and added after a stone's own
// balance, so it stays the moon's pale and never goes whiter.
const RIM_DIRECT = `
void RE_Direct_Rim( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 tD = reflectedLight.directDiffuse, tS = reflectedLight.directSpecular;
	RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	// An upright face seen nearly edge on (a jamb, the side of a pier) is drawn thinner than a pixel, and the moon full
	// on it broke into pale dashes: its share of the moon fades as it turns edge on.
	{
		float upright = 1.0 - smoothstep( 0.5, 0.85, abs( dot( geometryNormal, ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) ) );
		float edge = mix( 1.0, smoothstep( 0.05, 0.3, dot( geometryNormal, geometryViewDir ) ), upright ) * tSliver( geometryNormal, geometryViewDir );
		reflectedLight.directDiffuse = tD + ( reflectedLight.directDiffuse - tD ) * edge;
		reflectedLight.directSpecular = tS + ( reflectedLight.directSpecular - tS ) * edge;
	}
	vec3 mw = ( viewMatrix * vec4( tMoonward, 0.0 ) ).xyz;
	if ( dot( directLight.direction, mw ) > 0.995 ) tRimLight += directLight.color * tRim( geometryNormal, geometryViewDir, directLight.direction ) * tRimOn * tRimFade * mix( ${lin('pale')} * 0.75, material.diffuseContribution, ${f(RIM.own)} );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Rim`;

// The sky about the moon (SKY), laid on the light a face takes before the world's own (lit in ../../light.ts), so
// it is shut in as everything else is.
const SKY_LIGHT = `
#if NUM_DIR_LIGHTS > 0
{
	// His stepped tower keeps the light he approved it in (HIS); every other building is lit from a shaded foot to a
	// lit top (SHADE), by how far up itself a place is, and the night's light from the visitor's side is shut out
	// where a nearer building stands before it (FRONT).
	float up = tUp( vWPos.y ), his = HIS;
	float seen = wLight.y * mix( 1.0, mix( ${f(SKY.feet)}, 1.0, up ), his );
	vec3 mw = ( viewMatrix * vec4( tMoonward, 0.0 ) ).xyz;
	float turned = mix( mix( ${f(SHADE.wrap)}, ${f(SKY.wrap)}, his ), 1.0, clamp( 0.5 + 0.5 * dot( normal, mw ), 0.0, 1.0 ) );
	irradiance += directionalLights[ 0 ].color * ( mix( ${f(SHADE.power)}, ${f(SKY.power)}, his ) * seen * turned * SKY_KEEP * tSliver( normal, geometryViewDir ) );
	iblIrradiance *= mix( 1.0 - ${f(SKY.fill)}, 1.0, seen ) * mix( mix( ${f(FRONT.keep)}, 1.0, wLight.x ) * ${f(SHADE.night)}, 1.0, his );
	#ifdef WORLD_BAKED
		// The stored bounce lies on every face alike: every building but his keeps SHADE.bounce of it, so its faces are
		// told apart by the light that has a direction (the city's, the moon's and the sky about it).
		irradiance -= ( 1.0 - mix( ${f(SHADE.bounce)}, 1.0, his ) ) * wBounce / max( wLight.z, 1e-3 );
	#endif
}
#endif`;

function stone(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: PALE, roughness: STONE.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 kind;\nvarying vec3 vKind;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying vec2 vFoot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = kind;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWNorm = mat3( modelMatrix ) * objectNormal;\nvFoot = vec2( aLight.w, aBounce.w );');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vKind;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying vec2 vFoot;\nvec2 sFinish;\nfloat tRimOn;\nfloat tThin;\nfloat tPpu;\nfloat tRimFade;\nvec3 tRimLight;\n#define HIS ( vKind.y < ${f(0.5 / (STONES.length - 1))} ? 1.0 : 0.0 )${COMMON}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>${RIM_DIRECT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
tRimOn = 1.0;
tRimFade = tUp( vWPos.y );
tRimFade = mix( ${f(SKY.rim)}, 1.0, tRimFade * tRimFade ) * mix( 0.35, 1.0, wLight.y );
tThin = HIS > 0.5 ? 0.0 : vKind.z * ${f(SLIVER.most)};
tPpu = ${f(SCALE)} / max( length( fwidth( vWPos ) ), 1e-9 );
tRimLight = vec3( 0.0 );
{
	// Where a joint falls, from where the place is in the world: across a wall and up it, or across a roof.
	vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 ), wp = vWPos / ${f(SCALE)};
	vec2 tw = vec2( wn.z, - wn.x );
	tw /= max( length( tw ), 1e-4 );
	vec2 grain = abs( wn.y ) > 0.7 ? wp.xz : vec2( dot( wp.xz, tw ), wp.y );
	float lay = step( 0.5, vKind.x ), vary = clamp( ( vKind.x - 0.5 * lay ) / 0.49, 0.0, 1.0 );
	float course = lay > 0.5 ? mix( ${f(STONE.channel[0])}, ${f(STONE.channel[1])}, vary ) : mix( ${f(STONE.course[0])}, ${f(STONE.course[1])}, vary );
	float block = course * mix( ${f(STONE.block[0])}, ${f(STONE.block[1])}, fract( vary * 7.31 ) ), jw = mix( ${f(STONE.joint[0])}, ${f(STONE.joint[1])}, lay ), jk = 1.0, jo = 1.0;
	// Every building but his lays its stone to its floors (LAID), one of three ways: ashlar of two courses a floor,
	// panels a floor tall, or smooth stone jointed only every few floors.
	if ( HIS < 0.5 && lay < 0.5 ) {
		float way = fract( vary * 3.71 ), size = mix( 0.9, 1.12, fract( vary * 11.3 ) );
		course = way < ${f(LAID.ways[0])} ? ${f(LAID.storey * 0.5)} * size : ( way < ${f(LAID.ways[1])} ? ${f(LAID.storey)} * size : ${f(LAID.storey * LAID.smooth)} * size );
		block = course * ( way < ${f(LAID.ways[0])} ? mix( 1.6, 2.6, fract( vary * 7.31 ) ) : mix( 1.2, 2.0, fract( vary * 7.31 ) ) );
		jk = way < ${f(LAID.ways[0])} ? 1.0 : ( way < ${f(LAID.ways[1])} ? ${f(LAID.dark[0])} : ${f(LAID.dark[1])} );
		jo = way < ${f(LAID.ways[1])} ? 1.0 : 0.0;
	}
	float up = grain.y / course, row = floor( up ), along = grain.x / block + 0.5 * mod( row, 2.0 );
	vec2 fw = vec2( fwidth( grain.x / block ), fwidth( up ) );
	float jh = 1.0 - tPulse( up, 0.5 * jw / course, 1.0 - 0.5 * jw / course, fw.y );
	float jv = ( 1.0 - tPulse( along, 0.5 * jw / block, 1.0 - 0.5 * jw / block, fw.x ) ) * ( 1.0 - lay );
	float joint = max( jh, jv * jo ) * jk;
	float far = smoothstep( 0.3, 1.0, max( fw.x, fw.y ) );
	float tone = mix( 1.0 + ${f(STONE.differ)} * ( tHash( vec2( floor( along ), row ) + 17.0 ) - 0.5 ), 1.0, far );
	vec2 gw = fwidth( grain );
	float fine = 1.0 - smoothstep( 0.08, 0.3, max( gw.x, gw.y ) );
	tone *= 1.0 + fine * 0.1 * ( 0.6 * tNoise( grain * 3.0 ) + 0.4 * tNoise( grain * 8.0 + 3.0 ) - 0.5 );
	float streak = tNoise( vec2( grain.x * 1.7, grain.y * 0.045 ) ) * 0.6 + tNoise( vec2( grain.x * 4.3 + 9.0, grain.y * 0.11 ) ) * 0.4;
	tone *= 1.0 + ${f(STONE.streak)} * ( streak - 0.5 );
	// Each building's stone is its own, a little warmer or cooler than its kind.
	vec3 hue = vec3( 1.0 ) + ${f(STONE.hue)} * ( fract( vary * 13.7 ) - 0.5 ) * vec3( 0.6, 0.0, -1.0 );
	sFinish = tFinish( vKind.y );
	diffuseColor.rgb *= tStone( vKind.y ) * hue * tone * ( 1.0 - ${f(STONE.dark)} * joint * ( 1.0 - 0.6 * sFinish.x ) ) * mix( mix( 1.0, ${f(DEPTH.far)}, tBack( vWPos.z ) ), ${f(DEPTH.his[0])}, HIS );
}`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = sFinish.y;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = sFinish.x;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
	vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	totalEmissiveRadiance += diffuseColor.rgb * ( 1.0 - 0.7 * sFinish.x ) * ( ${lin3(HOT)} * tStreet( vFoot.x * ${f(FOOT)}, dot( normal, upV ), wLight.z, vWPos.x / ${f(SCALE)} ) + ${lin3(CITY_LIGHT)} * tCity( normal, vFoot.x * ${f(FOOT)}, wLight.x, wLight.z, HIS ) );
}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(STONE.night)};\n#define SKY_KEEP ( vKind.y < ${f(0.5 / (STONES.length - 1))} ? ${f(SKY.pale)} : 1.0 )${SKY_LIGHT}\n#include <lights_fragment_end>`).replace('#include <opaque_fragment>', `outgoingLight = tPale( tKnee( tCooled( ( outgoingLight - totalEmissiveRadiance ) * tRise( vFoot.y, HIS ), tCool( vKind.y ) ), HIS ) + totalEmissiveRadiance + tRimLight, HIS );
outgoingLight = max( mix( outgoingLight, tKeep( outgoingLight ), mix( ${f(STONE.keep[0])}, ${f(STONE.keep[1])}, sFinish.x ) ), 0.0 );
outgoingLight = tAir( outgoingLight, vWPos.z, HIS );
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-stone', baked: true, core: false });
}

function bay(map: THREE.Texture): THREE.MeshStandardMaterial {
  const fr = WINDOW.frame, [c0, c1, c2] = WINDOW.colors, img = map.image as { width: number; height: number };
  const blindMean = 1 - WINDOW.blind * WINDOW.blinds * 0.5;
  const m = new THREE.MeshStandardMaterial({ color: METAL.bronze.clone().multiplyScalar(BAY.bronze), roughness: BAY.rough, metalness: BAY.metal });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWin = { value: map };
    sh.uniforms.uWinSize = { value: new THREE.Vector2(img.width, img.height) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 cell;\nattribute vec2 cellSize;\nuniform vec2 uWinSize;\nvarying vec4 vCell;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying vec2 vFoot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = vec4( cell * uWinSize, cellSize );\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWNorm = mat3( modelMatrix ) * objectNormal;\nvFoot = vec2( aLight.w, aBounce.w );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vCell;
varying vec3 vWPos;
varying vec3 vWNorm;
varying vec2 vFoot;
uniform sampler2D uWin;
uniform vec2 uWinSize;
float tRimOn;
float tRimFade;
float tThin;
float tPpu;
vec3 tRimLight;
#define HIS ${HIS_AT}
${COMMON}
vec3 tTint( float w ) {
	float t = 2.0 * w;
	return t < 1.0 ? mix( ${lin(c0)}, ${lin(c1)}, t ) : mix( ${lin(c1)}, ${lin(c2)}, t - 1.0 );
}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>${RIM_DIRECT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
tRimOn = 1.0;
tRimFade = tUp( vWPos.y );
tRimFade = mix( ${f(SKY.rim)}, 1.0, tRimFade * tRimFade ) * mix( 0.35, 1.0, wLight.y );
tThin = 0.0;
tPpu = ${f(SCALE)} / max( length( fwidth( vWPos ) ), 1e-9 );
tRimLight = vec3( 0.0 );
float bGlass = 0.0, bLit = 0.0, bCopper = 0.0, bPolish = 0.0, bCurtain = 0.0, bSheet = 0.0, bStone = 0.0, bKeep = 0.0, bFar = 0.0, bSpill = 0.0, bCool = ${f(STONES[FAR.bay].cool)};
vec3 bEmit = vec3( 0.0 );
vec2 bTilt = vec2( 0.0 );
vec3 bAcross = vec3( 1.0, 0.0, 0.0 );
{
	vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 );
	bAcross = vec3( wn.z, 0.0, - wn.x );
	bAcross /= max( length( bAcross ), 1e-4 );
	vec2 cs = vCell.zw;
	float frame = 0.0;
	vec3 farWall = ${lin3(PALE)} * ${f(FAR.wall)} * ${v3(STONES[FAR.bay].tint)};
	if ( cs.x > ${f(WINDOW.style)} ) {
		// The building's stone (styleOf in ./windows.ts): windows let into it have it for their frame, matte, and a
		// bronze bay's wall seen from far off is it.
		frame = floor( cs.x / ${f(WINDOW.style)} );
		cs.x -= frame * ${f(WINDOW.style)};
		float into = step( frame, ${f(STONES.length + 0.5)} );
		bCurtain = step( ${f(2 * STONES.length + 0.5)}, frame );
		float tk = ( frame - 1.0 - ${f(STONES.length)} * ( 1.0 - into ) - ${f(STONES.length)} * bCurtain ) / ${f(STONES.length - 1)};
		farWall = mix( ${lin3(PALE)} * ${f(FAR.wall)} * tStone( tk ), ${lin3(CURTAIN_TINT)}, bCurtain );
		bCool = tCool( tk ) * ( 1.0 - bCurtain );
		if ( into > 0.5 ) {
			bStone = 1.0;
			bKeep = mix( ${f(STONE.keep[0])}, ${f(STONE.keep[1])}, tFinish( tk ).x );
			diffuseColor.rgb = ${lin3(PALE)} * ${f(BAY.stone)} * tStone( tk );
		}
	}
	if ( cs.x > 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) ), id = floor( c ), p = ( c - id ) * cs;
		// A curtain wall's panes meet at slender mullions (CURTAIN.mullion), the spandrel being glass too.
		float fSide = min( mix( ${f(fr.side)}, ${f(CURTAIN.mullion)}, bCurtain ), ${f(WINDOW.most.side)} * cs.x ), fSill = min( mix( ${f(fr.sill)}, ${f(CURTAIN.mullion * 1.5)}, bCurtain ), ${f(WINDOW.most.sill)} * cs.y ), fHead = min( mix( ${f(fr.head)}, ${f(CURTAIN.mullion)}, bCurtain ), ${f(WINDOW.most.head)} * cs.y );
		vec2 a = vec2( fSide, fSill ) / cs, b = vec2( 1.0 ) - vec2( fSide, fHead ) / cs;
		float px = min( 1.0 / fw.x, 1.0 / fw.y );
		bFar = 1.0 - smoothstep( ${f(FAR.far[0])}, ${f(FAR.far[1])}, px );
		// The glass's share of the pixel, exact at any size, and the room's level and color: the window's own where it
		// is large, the map's smaller copies (its average over the pixel) where it is small.
		bGlass = tPulse( c.x, a.x, b.x, fw.x ) * tPulse( c.y, a.y, b.y, fw.y );
		// Far off a room is read along its floor over a wider footprint of the map (FAR.patch windows across), and only
		// over the pixel's own height up it, so a lit run along a floor stays a bar of light a few pixels long and a
		// floor's height, and never spreads up and down into a blot, as the map's smaller copies made it.
		vec3 d = textureGrad( uWin, ( id + 0.5 ) / uWinSize, dFdx( c ) / uWinSize, dFdy( c ) / uWinSize ).rgb;
		if ( bFar > 0.0 ) {
			vec3 run = vec3( 0.0 );
			float across = ${f(FAR.patch)} * fw.x;
			for ( int i = 0; i < ${FAR.taps}; i ++ ) for ( int j = 0; j < 2; j ++ ) {
				vec2 q = c + vec2( ( ( float( i ) + 0.5 ) / ${f(FAR.taps)} - 0.5 ) * across, ( float( j ) - 0.5 ) * 0.5 * fw.y );
				run += texelFetch( uWin, ivec2( floor( q ) ), 0 ).rgb;
			}
			d = mix( d, run / ${f(2 * FAR.taps)}, bFar );
		}
		float own = smoothstep( ${f(FAR.tint[0])}, ${f(FAR.tint[1])}, px );
		float level = pow( d.r, ${f(WINDOW.curve)} );
		float blind = own * step( 0.003, d.r ) * ( tHash( id + vec2( 41.0, 23.0 ) ) < ${f(WINDOW.blinds)} ? 0.2 + 0.6 * tHash( id + vec2( 7.0, 91.0 ) ) : 0.0 );
		vec3 tint = tTint( mix( ${f(ROOM.far)}, d.g, own ) );
		// The rooms round about, a few windows each way: their light on the wall between them.
		float about = textureGrad( uWin, ( id + 0.5 ) / uWinSize, ${f(ROOM.spill[1])} * dFdx( c ) / uWinSize, ${f(ROOM.spill[1])} * dFdy( c ) / uWinSize ).r;
		bSpill = ${f(ROOM.spill[0])} * pow( about, ${f(WINDOW.curve)} );
		float detail = smoothstep( ${f(FAR.detail[0])}, ${f(FAR.detail[1])}, px );
		vec3 room = vec3( ${f(WINDOW.mean)} * mix( ${f(blindMean)}, 1.0 - ${f(WINDOW.blind)} * blind, own ) );
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
			// A room is deep amber at its back and pale only near its lamp.
			tint = mix( tint, tTint( clamp( d.g + ${f(ROOM.lamp[0])} + ${f(ROOM.lamp[1])} * ( glow - 1.0 ), 0.0, 1.0 ) ), detail );
			room = mix( room, near, detail );
			vec2 lo = vec2( fSide, fSill ), hi = cs - vec2( fSide, fHead );
			float bev = ${f(BAY.bevel)};
			float inY = step( lo.y - bev, p.y ) * step( p.y, hi.y + bev ), inX = step( lo.x - bev, p.x ) * step( p.x, hi.x + bev );
			// The frame's bevel and the lit sill are a sliver of a unit: drawn under a pixel and a half they flickered as
			// pale U and Y shapes round the dark panes, so they come in only once they are wider than that.
			float sliver = smoothstep( 1.5, 3.0, ${f(BAY.bevel)} / max( length( fwidth( vWPos ) ) / ${f(SCALE)}, 1e-5 ) );
			bTilt.x = sliver * detail * inY * 0.7 * ( step( lo.x - bev, p.x ) * step( p.x, lo.x ) - step( hi.x, p.x ) * step( p.x, hi.x + bev ) );
			bTilt.y = sliver * detail * inX * 0.7 * ( step( lo.y - bev, p.y ) * step( p.y, lo.y ) - step( hi.y, p.y ) * step( p.y, hi.y + bev ) );
			bLit = ( 1.0 - bGlass ) * detail * smoothstep( 1.5, 3.0, ${f(WINDOW.sill)} / max( length( fwidth( vWPos ) ) / ${f(SCALE)}, 1e-5 ) ) * inX * step( lo.y - ${f(WINDOW.sill)}, p.y ) * step( p.y, lo.y );
			bEmit += bLit * 0.4 * tint * level * ${f(WINDOW.gain)};
		}
		{
			// Far off, a patch's light is held under the hot light by a soft shoulder (FAR.cap), so it stays amber.
			float e = ${f(WINDOW.gain)} * level * room.r * mix( 1.0, ${f(FAR.boost)}, bFar ), cap = mix( 1e3, ${f(FAR.cap)}, bFar );
			bEmit += bGlass * tint * ( e / ( 1.0 + e / cap ) ) * ( room / max( room.r, 1e-4 ) );
		}
		// Behind a curtain wall's coated glass a room is seen dimmer (CURTAIN.through), and the glass is a sheet that
		// mirrors the night, near and far.
		bEmit *= mix( 1.0, ${f(CURTAIN.through)}, bCurtain );
		bSheet = bCurtain * mix( bGlass, 1.0, bFar );
		vec3 wall = bStone > 0.5 ? diffuseColor.rgb : farWall;
		diffuseColor.rgb = mix( diffuseColor.rgb, wall * ( 1.0 - ${f(FAR.grid)} * bGlass * ( 1.0 - bCurtain ) ), bFar );
		bGlass *= 1.0 - bFar;
		bLit *= 1.0 - bFar;
		bKeep = mix( bKeep, ${f(STONE.keep[0])}, bFar );
	} else if ( cs.x < 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) );
		float gap = 1.0 - tPulse( c.x, 0.02, 0.98, fw.x );
		float panel = tPulse( c.x, 0.14, 0.86, fw.x ) * tPulse( c.y * 3.0, 0.1, 0.9, fw.y * 3.0 );
		diffuseColor.rgb *= ( 1.0 - 0.85 * gap ) * ( 0.8 + 0.25 * panel );
	} else {
		// Copper, polished where the plain face carries 2 (POLISHED in scripts/world/parts/towers/layers.mjs).
		bPolish = step( 1.5, vCell.y );
		bCopper = min( vCell.y, 1.0 );
		diffuseColor.rgb = mix( diffuseColor.rgb, ${lin3(METAL.copper)}, bCopper );
		// Sheet metal: standing seams down every wall SHEET.seam units apart, and the weather in long streaks down it,
		// darker toward its foot, filtered so neither sparkles far off.
		vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 ), wp = vWPos / ${f(SCALE)};
		vec2 tw = vec2( wn.z, - wn.x );
		tw /= max( length( tw ), 1e-4 );
		float along = dot( wp.xz, tw ) / ${f(SHEET.seam)}, wall = 1.0 - smoothstep( 0.6, 0.85, abs( wn.y ) );
		wall *= 1.0 - bPolish;
		float seam = ( 1.0 - tPulse( along, 0.05, 0.95, max( fwidth( along ), 1e-4 ) ) ) * wall;
		float streak = 0.65 * tNoise( vec2( along * 1.7, wp.y * 0.09 ) ) + 0.35 * tNoise( vec2( along * 5.3 + 7.0, wp.y * 0.21 ) );
		diffuseColor.rgb *= ( 1.0 - ${f(SHEET.dark)} * seam ) * mix( 1.0, 1.0 - ${f(SHEET.weather)} + 2.0 * ${f(SHEET.weather)} * streak, wall );
	}
	tRimOn = 1.0 - max( bGlass, bSheet );
	diffuseColor.rgb = mix( mix( diffuseColor.rgb, vec3( 0.0 ), bGlass ), ${lin3(CURTAIN_TINT)}, bSheet ) * mix( mix( 1.0, ${f(DEPTH.far)}, tBack( vWPos.z ) ), ${f(DEPTH.his[0])}, HIS );
	bEmit = max( bEmit, vec3( 0.0 ) ) * mix( mix( 1.0, ${f(DEPTH.lights)}, tBack( vWPos.z ) ), ${f(DEPTH.his[1])}, HIS );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix( mix( mix( mix( roughnessFactor, ${f(STONE.rough)}, max( bStone, bFar ) ), mix( ${f(BAY.copper)}, ${f(CURTAIN.polish)}, bPolish ), bCopper ), ${f(BAY.glass)}, bGlass ), ${f(CURTAIN.rough)}, bSheet );`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\nmetalnessFactor = mix( mix( mix( mix( metalnessFactor, 0.0, max( bStone, bFar ) ), 1.0, bCopper ), 0.0, bGlass ), ${f(CURTAIN.metal)}, bSheet );`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( abs( bTilt.x ) + abs( bTilt.y ) > 0.0 ) {
	vec3 vt = ( viewMatrix * vec4( bAcross, 0.0 ) ).xyz, vu = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	vec3 tilted = normal + vt * bTilt.x + vu * bTilt.y;
	tilted /= max( length( tilted ), 1e-5 );
	// Never turned from the eye: a frame's bevel seen from above, turned away, left the lighting's multiple
	// scattering dividing by nothing in one channel, a single yellow speck at the head of a lit pane.
	vec3 eye = normalize( - vViewPosition );
	tilted += eye * max( 0.0, 0.08 - dot( tilted, eye ) );
	normal = tilted / max( length( tilted ), 1e-5 );
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
	vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	float matte = ( max( bStone, bFar ) + ( 1.0 - max( bStone, bFar ) ) * 0.25 * ( 1.0 - bGlass ) ) * ( 1.0 - 0.8 * bSheet );
	totalEmissiveRadiance += bEmit + diffuseColor.rgb * ${lin3(HOT)} * ( ( 1.0 - max( bGlass, bSheet ) ) * bSpill + ${f(CURTAIN.city)} * bPolish ) + diffuseColor.rgb * matte * ( ${lin3(HOT)} * tStreet( vFoot.x * ${f(FOOT)}, dot( normal, upV ), wLight.z, vWPos.x / ${f(SCALE)} ) + ${lin3(CITY_LIGHT)} * tCity( normal, vFoot.x * ${f(FOOT)}, wLight.x, wLight.z, HIS ) );
}`)
      .replace('#include <lights_fragment_end>', `iblIrradiance *= mix( 1.0, ${f(STONE.night)}, max( bStone, bFar ) * ( 1.0 - bSheet ) );\n#define SKY_KEEP 1.0${SKY_LIGHT}\n#include <lights_fragment_end>`)
      .replace('#include <opaque_fragment>', `{
	outgoingLight = tPale( tKnee( tCooled( ( outgoingLight - totalEmissiveRadiance ) * tRise( vFoot.y, HIS ), bCool * max( bStone, bFar ) ), HIS ) + totalEmissiveRadiance + tRimLight, HIS );
	float lamp = clamp( dot( bEmit, vec3( 1.0 ) ) / max( dot( outgoingLight, vec3( 1.0 ) ), 1e-5 ), 0.0, 1.0 );
	outgoingLight = max( mix( outgoingLight, tKeep( outgoingLight ), max( max( max( max( max( bGlass, bLit ), bCopper ), bKeep ), lamp ), bSheet ) ), 0.0 );
	outgoingLight = tAir( outgoingLight, vWPos.z, HIS );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-bay', baked: true, core: false });
}

// Where the marks stand in the world, for the gold's shader: the obelisk's point from its plinth to its head, the
// sun disc's middle, the way across its face and its radius, the bearing of the moon, and the rings of the far
// disc's carving (the two rounded rings, the outer band's foot, the beads, the rim).
const OB_Y = (() => { const [x, z, , , tall] = TOWERS[OBI], g = ground(x, z), p = obeliskPoint(tall); return [g + p.foot, g + p.top]; })();
const [DC, DT, DR] = (() => {
  const [x, z, w, , tall, turn] = TOWERS[SDI], { r, cy } = discAt(w, tall), t = (turn * Math.PI) / 180;
  return [[x, ground(x, z) + cy, z], [Math.cos(t), -Math.sin(t)], r] as const;
})();
const C = SUN.carve, INNER = 1 - SUN.rim / DR, BAND_OUT = INNER - 1.4 / DR;
const GROOVES = [C.rings[0], C.rings[1], BAND_OUT, INNER - 0.65 / DR, INNER];
const MOONXZ = (() => { const l = Math.hypot(MOONWARD[0], MOONWARD[2]); return [MOONWARD[0] / l, MOONWARD[2] / l]; })();

// The crown's reeds are drawn here and not built: ridges a pixel or two apart, built, alias into wavering stripes.
// Each is a hollow flute between two flat fillets, its two flanks flat, one turned FLUTE.flank degrees to the right
// and the other as far to the left, so every reed has the same lit flank and the same shaded one. A pixel is lit as
// the share of each of the three faces it covers, worked out exactly, so a reed never sparkles or wavers whatever
// its size, and where reeds are far under a pixel they come to their average.
// The gold is lit here in full, at the end of the shader, from what it mirrors and from the moon and the glint, each
// of the three faces by its share, with nothing kept between one part of the shader and the next: the stage's own
// sum of a reed's light, and globals carried from one part of the shader to the next, both came out wrong on this
// machine's driver (the flank that mirrors the moon drew nearly black).
function gold(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1 }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const a = GOLD.fillet * 0.5;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 flute;\nvarying vec3 vFlute;\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlute = flute;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
varying vec3 vFlute;
varying vec3 vWPos;
float tThin;
float tPpu;
${COMMON}
// A reed's three faces about a face's normal n (view space): its fillets (n), its two flanks, and the share of a
// pixel on each, from where the pixel is across the reed.
void goldReed( const in vec3 n, out vec3 nl, out vec3 nr, out vec3 share ) {
	vec3 up = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz, across = cross( up, n );
	across /= max( length( across ), 1e-5 );
	float flank = ( vFlute.y - 0.5 ) * 1.5707963, sa = sin( flank ), ca = cos( flank );
	nl = n * ca + across * sa;
	nr = n * ca - across * sa;
	float x = vFlute.x / max( vFlute.z, 1e-4 ), fw = max( fwidth( x ), 1e-5 );
	float l = tPulse( x, ${f(a)}, 0.5, fw ), r = tPulse( x, 0.5, ${f(1 - a)}, fw );
	// A face seen near edge on packs its reeds closer than the filter can follow along a slant, and they hatched: there
	// the reeds give way to their average.
	vec3 eye = - vViewPosition / max( length( vViewPosition ), 1e-5 );
	float clear = smoothstep( 0.12, 0.38, abs( dot( n, eye ) ) );
	share = mix( vec3( ${f(2 * a)}, ${f(0.5 - a)}, ${f(0.5 - a)} ), vec3( 1.0 - l - r, l, r ), clear );
}
// A highlight of a point light on a face: GGX, every division guarded.
float goldSpot( const in vec3 n, const in vec3 l, const in vec3 v, const in float rough ) {
	vec3 h = l + v;
	h /= max( length( h ), 1e-5 );
	float nl = clamp( dot( n, l ), 0.0, 1.0 ), nv = clamp( dot( n, v ), 1e-3, 1.0 ), nh = clamp( dot( n, h ), 0.0, 1.0 );
	float al = max( rough * rough, 2e-3 ), a2 = al * al, d = nh * nh * ( a2 - 1.0 ) + 1.0, k = 0.5 * al;
	float D = a2 / max( 3.14159265 * d * d, 1e-6 ), V = 0.25 / max( ( nl * ( 1.0 - k ) + k ) * ( nv * ( 1.0 - k ) + k ), 1e-4 );
	return min( D * V * nl, 60.0 );
}`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( vFlute.y > 0.5 && vFlute.y < 1.5 ) {
	vec3 nl, nr, share;
	goldReed( normal, nl, nr, share );
	vec3 nn = normal * share.x + nl * share.y + nr * share.z;
	normal = nn / max( length( nn ), 1e-5 );
}`).replace('#include <opaque_fragment>', `{
	vec3 v = geometryViewDir, base = nonPerturbedNormal;
	float ob = ${near(OBI, 0.75)}, his = ${HIS_AT};
	// A sun disc's carving, far off, gives way to the coin's plain field, with the carving drawn over it as light and
	// shade (FAR_DISC), so the disc reads as one deep gold coin, carved, and never glitters.
	vec3 fw3 = fwidth( vViewPosition );
	float disc = vFlute.y > 1.5 ? smoothstep( ${f(DISC.far[0])}, ${f(DISC.far[1])}, max( fw3.x, max( fw3.y, fw3.z ) ) / ${f(SCALE)} ) : 0.0;
	float carve = 1.0;
	if ( disc > 0.0 ) {
		vec3 p = vWPos / ${f(SCALE)} - ${v3(DC)};
		float ac = dot( p.xz, ${`vec2( ${f(DT[0])}, ${f(DT[1])} )`} ), r = length( vec2( ac, p.y ) ) / ${f(DR)}, a = atan( ac, p.y );
		float fr = max( fwidth( r ), 1e-4 ), wg = max( 0.028, 0.9 * fr ), fa = max( fwidth( a ), 1e-4 );
		float groove = 0.0;
		${GROOVES.map((c) => `groove = max( groove, exp( - pow( ( r - ${f(c)} ) / wg, 2.0 ) ) );`).join('\n\t\t')}
		float dg = abs( mod( a + 6.2831853, 1.5707963 ) - 0.7853982 ), dl = 0.7853982 - dg;
		float span = clamp( ( r - ${f(C.rays[0])} ) / ${f(C.rays[1] - C.rays[0])}, 0.0, 1.0 ), spanL = clamp( ( r - ${f(C.rays[0])} ) / ${f(C.rays[2] - C.rays[0])}, 0.0, 1.0 );
		float edge = max( 0.04, 1.5 * fa );
		float ray = step( ${f(C.rays[0])}, r ) * max( ( 1.0 - smoothstep( 0.36 * ( 1.0 - span ) * ( 1.0 - span ) - edge, 0.36 * ( 1.0 - span ) * ( 1.0 - span ) + edge, dg ) ) * step( span, 0.999 ), 0.6 * ( 1.0 - smoothstep( 0.15 * ( 1.0 - spanL ) - edge, 0.15 * ( 1.0 - spanL ) + edge, dl ) ) * step( spanL, 0.999 ) );
		float band = step( ${f(C.band)}, r ) * step( r, ${f(BAND_OUT)} ) * ( 0.5 + 0.5 * cos( ${f(SUN.outer)} * a ) * ( 1.0 - smoothstep( 0.15, 0.4, ${f(SUN.outer)} * fa ) ) );
		float glyph = step( ${f(C.glyphs[0])}, r ) * step( r, ${f(C.glyphs[1])} ) * ( 1.0 - ray ) * ( 0.6 + 0.4 * cos( ${f(SUN.glyphs)} * a ) * ( 1.0 - smoothstep( 0.15, 0.4, ${f(SUN.glyphs)} * fa ) ) );
		float square = step( ${f(C.squares[0])}, r ) * step( r, ${f(C.squares[1])} ) * ( 1.0 - smoothstep( 0.32 - edge, 0.32 + edge, dg ) );
		float boss = 1.0 - smoothstep( 0.0, ${f(C.boss)}, r );
		carve = mix( 1.0, ( 1.0 - ${f(FAR_DISC.groove)} * groove ) * ( 0.82 + ${f(FAR_DISC.ray)} * ray + ${f(FAR_DISC.plate)} * ( band + glyph + square ) + ${f(FAR_DISC.boss)} * boss ), disc );
	}
	vec3 axis = ( viewMatrix * vec4( 0.0, 0.0, 1.0, 0.0 ) ).xyz, nd = mix( base, axis, disc );
	base = nd / max( length( nd ), 1e-5 );
	{
		vec3 wp = vWPos / ${f(SCALE)} / ${f(GOLD.wave[1])};
		vec3 wob = vec3( tNoise( wp.xy + wp.zz * 0.7 ), tNoise( wp.yz + 17.0 ), tNoise( wp.zx + 41.0 ) ) - 0.5;
		vec3 nw = base + ( viewMatrix * vec4( wob, 0.0 ) ).xyz * ( 2.0 * ${f(GOLD.wave[0])} * ( 1.0 - disc ) * mix( 1.0, ${f(MARK.obelisk.wave)}, ob ) );
		base = nw / max( length( nw ), 1e-5 );
	}
	// The obelisk's broad faces, a little convex (MARK.obelisk.bend): where a place is across its face, from the
	// point's own axis, turns its normal toward that edge.
	if ( ob > 0.5 ) {
		vec3 nw = ( vec4( base, 0.0 ) * viewMatrix ).xyz;
		vec2 hz = nw.xz;
		float hl = length( hz );
		if ( hl > 0.35 ) {
			hz /= hl;
			vec2 T = vec2( hz.y, - hz.x ), p = vWPos.xz / ${f(SCALE)} - vec2( ${f(TOWERS[OBI][0])}, ${f(TOWERS[OBI][1])} );
			float u = clamp( dot( p, T ) / max( dot( p, hz ), 1.0 ), -1.0, 1.0 );
			nw.xz += T * ( u * ${f(MARK.obelisk.bend)} * hl );
			nw /= max( length( nw ), 1e-5 );
			base = ( viewMatrix * vec4( nw, 0.0 ) ).xyz;
		}
	}
	vec3 n0 = base, n1 = base, n2 = base, share = vec3( 1.0, 0.0, 0.0 );
	if ( vFlute.y > 0.5 && vFlute.y < 1.5 ) goldReed( base, n1, n2, share );
	float rough = ${f(GOLD.rough)}, open = 1.0;
	vec3 bounce = vec3( 0.0 );
	#ifdef WORLD_BAKED
		open = mix( 1.0, wLight.z, 0.6 );
		bounce = wBounce * ( ${f(GOLD.city)} * RECIPROCAL_PI );
	#endif
	float litBy = mix( mix( ${f(GOLD.lit)}, ${f(MARK.his.lit)}, his ), ${f(MARK.obelisk.lit)}, ob ), darkBy = mix( ${f(GOLD.dark)}, ${f(MARK.obelisk.dark)}, ob );
	float risen = mix( 1.0, mix( ${f(MARK.obelisk.foot)}, 1.0, smoothstep( ${f(OB_Y[0])}, ${f(OB_Y[1])}, vWPos.y / ${f(SCALE)} ) ), ob );
	vec3 F0 = ${lin3(METAL.gold)}, sum = vec3( 0.0 );
	for ( int k = 0; k < 3; k ++ ) {
		vec3 n = k == 0 ? n0 : ( k == 1 ? n1 : n2 );
		float w = k == 0 ? share.x : ( k == 1 ? share.y : share.z ) * ${f(1 - GOLD.valley)};
		if ( w <= 0.0 ) continue;
		vec3 r = reflect( - v, n );
		vec3 rw = normalize( ( vec4( r, 0.0 ) * viewMatrix ).xyz );
		float toMoon = smoothstep( ${f(GOLD.moon[0])}, ${f(GOLD.moon[1])}, dot( rw, uMoonward ) );
		// The sky about the moon is low and behind the city: seen in gold, it is cut off below by the city's own skyline,
		// so a tall gold point blazes at its head and is a deeper gold toward its foot (from rise[0] to rise[1] units up).
		toMoon *= mix( ${f(GOLD.shade)}, 1.0, smoothstep( ${f(GOLD.rise[0])}, ${f(GOLD.rise[1])}, vWPos.y / ${f(SCALE)} ) );
		float moonLight = litBy * toMoon * sqrt( toMoon );
		// The moon's own reflection down the obelisk's lit face: a narrow lobe of the reflection's bearing.
		vec2 rh = rw.xz / max( length( rw.xz ), 1e-5 );
		moonLight += ob * ${f(MARK.obelisk.streak)} * pow( max( dot( rh, ${`vec2( ${f(MOONXZ[0])}, ${f(MOONXZ[1])} )`} ), 0.0 ), ${f(MARK.obelisk.tight)} ) * smoothstep( -0.1, 0.25, dot( rw, uMoonward ) );
		vec3 seen = ${lin('pale')} * ( moonLight * risen );
		#ifdef USE_ENVMAP
			seen += textureLod( envMap, envMapRotation * rw, roughnessToMip( rough ) ).rgb * ( envMapIntensity * darkBy * mix( 1.0, risen, 0.5 ) );
		#endif
		seen = seen * ( 1.0 - ${f(1 - DISC.field)} * disc ) * open + bounce * ( 0.5 + 0.5 * clamp( 0.5 - rw.y, 0.0, 1.0 ) );
		#if NUM_DIR_LIGHTS > 0
			seen += directionalLights[ 0 ].color * goldSpot( n, directionalLights[ 0 ].direction, v, rough ) * ( 1.0 - ${f(DISC.glint)} * disc );
		#endif
		#ifdef WORLD_GLINT
			vec3 g = uGlintAt - geometryPosition;
			seen += uGlint * goldSpot( n, g / max( length( g ), 1e-5 ), v, rough ) * ( 1.0 - ${f(DISC.glint)} * disc );
			// A broad sheen of the same light, so polished gold shows a soft bright band that slides over it with the cursor.
			// His crown takes none: it washed his tiers to one pale cone.
			seen += uGlint * ( ${f(GOLD.sheen[0])} * ( 1.0 - his ) * goldSpot( n, g / max( length( g ), 1e-5 ), v, ${f(GOLD.sheen[1])} ) ) * ( 1.0 - ${f(DISC.glint)} * disc );
		#endif
		float nv = clamp( dot( n, v ), 0.0, 1.0 );
		sum += w * seen * ( F0 + ( 1.0 - F0 ) * pow( 1.0 - nv, 5.0 ) );
	}
	float lv = max( sum.r, 0.0 );
	// The far disc's field is held under FAR_DISC.cap, so neither the moon nor the cursor's sheen washes its carving.
	lv = mix( lv, ${f(FAR_DISC.cap)} * ( 1.0 - exp( - lv / ${f(FAR_DISC.cap)} ) ), disc ) * carve;
	// A soft shoulder over the mark's own (GOLD.shoulder elsewhere), so a blaze keeps a gradient and never sits flat
	// at the hot light's cap.
	float s0 = mix( mix( ${f(GOLD.shoulder[0])}, ${f(MARK.his.shoulder[0])}, his ), ${f(MARK.obelisk.shoulder[0])}, ob ), s1 = mix( mix( ${f(GOLD.shoulder[1])}, ${f(MARK.his.shoulder[1])}, his ), ${f(MARK.obelisk.shoulder[1])}, ob );
	lv = lv < s0 ? lv : s0 + s1 * ( 1.0 - exp( - ( lv - s0 ) / s1 ) );
	vec3 c = mix( mix( ${DEEP}, ${lin3(METAL.gold)}, smoothstep( ${f(GOLD.grade[0])}, ${f(GOLD.grade[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GOLD.grade[1])}, ${f(GOLD.grade[2])}, lv ) );
	outgoingLight = max( tKeep( c * lv * mix( 1.0, ${f(MARK.obelisk.gain)}, ob ) ), 0.0 );
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
