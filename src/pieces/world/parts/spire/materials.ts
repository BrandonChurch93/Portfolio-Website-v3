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
  granite: { rough: 0.7, course: 1.3, block: 3.1, joint: 0.1, dark: 0.6 },
  rusticated: { rough: 0.62, course: 1.5, joint: 0.2, dark: 0.6 },
  trim: { rough: 0.7, course: 0.9, block: 2.2, joint: 0.05, dark: 0.4 },
  court: { rough: 0.7, ring: 1.6, block: 2.5, joint: 0.07, dark: 0.5 },
  // How much one block differs from the next, one course from the next, the granite's speckle, and the weather's
  // streaks down a face.
  differ: 0.14, course: 0.1, speckle: 0.1, streak: 0.03,
} as const;
// The weather: a band of soot right under every ledge (how dark, how tall), and the foot of the podium darker where
// the ground's damp has risen (how dark, how high).
// The granite seen close: its figure, slow clouds of lighter and darker stone a few blocks across (how strong, and at
// what scales, per unit); its crystals of pale feldspar and dark mica, drawn where they are a pixel or more (how
// strong, how many to a unit) and their mean where they are finer; the arrises of its blocks chipped along the bed
// joints (how long a stretch may be chipped, at least and at most, the share of stretches that are, how deep a chip
// bites into the face, in units, and how dark it is); and the grime in its reveals, where the stone is shut in (the
// openness at which it begins and at which it is whole, and how dark).
const GRAIN = { figure: 0.16, scales: [0.35, 0.9, 2.6], fleck: 0.09, crystals: 1.7, chip: { long: [0.5, 1.4], share: 0.4, deep: 0.3, dark: 0.5 }, grime: [0.95, 0.7, 0.5] } as const;
// Where the weather has worked: a face is chipped and stained most just under a ledge, where the water runs off it,
// and least out in the open; it falls off over `under` units down from the ledge, to `open` of it. A face turned to the
// moon and the weather, at the tower's right, is washed cleaner: its chips, stains and soot keep `washed` of what a
// face in shade has.
const WORN = { under: 9, open: 0.2, washed: 0.45 } as const;
const WEATHER = { soot: 0.4, sootTall: 1.4, foot: 0.6, footTall: 7 } as const;
// And the stains the rain leaves: it runs off a ledge at a few places along it (a drip, a joint in the coping, the
// foot of a finial) and each leaves one dark stripe under it, crisp at its sides under the ledge, wider, softer and
// fainter as it runs down. Not a noise of lanes: lanes over the courses read as plaid. A place may stain in each
// stretch so long along the ledge (every), with this chance (share); each stain's width at its source and its length
// (at least and at most, in units), how much wider it has grown where it has run its length, and how dark at most.
const STAIN = { every: 3.4, share: 0.55, wide: [0.35, 1.4], long: [5, 30], spread: 0.7, dark: 0.55 } as const;
// The night's light falls up each stage of the tower: the foot of a stage, low between the stages round it, takes
// `foot` of it and the head of the stage, out in the open under its ledge, `head` (the make script stores how far up
// its stage each place is).
const FALL = { foot: 0.5, head: 1.45, curve: 0.8 } as const;
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
const KERB = { r: [52.2, 54.4], y: [-0.2, -0.05], power: 3.2, least: 0.7 } as const;
// The lobby's light out through the doors onto the paving before them: how bright, how far out from the podium it
// has fallen to a third, how much wider it spreads for each unit out, and its color (how far from flame to hot). And
// the shade on the tread at the foot of each step's riser: how dark, and how far out (units).
const LOBBY = { power: 5, reach: 12, spread: 0.45, warm: 0.45 } as const;
const STEP = { dark: 0.5, out: 0.4 } as const;
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
// A pane seen close: from how many pixels across it shows its room, its reveal and its frame's shade (the room comes
// in fully by the second), and how far a pane may hang out of true, so the glass answers differently pane to pane.
const PANE = { detail: [1.3, 3.6], hang: 0.16 } as const;
// What makes a pane a room and not a tile, seen close: the side wall the eye sees past the frame (how bright against
// the far wall), the shade the frame's head and sides throw just inside the glass (how dark, how far in, in units),
// a lamp hung from the ceiling in some rooms (which share, how bright, how big), and a curtain drawn at one side in
// some (which share, how wide as a share of the pane, how dark).
const INSIDE = { side: 0.42, head: 0.55, headIn: 0.32, jamb: 0.35, jambIn: 0.16, pendant: [0.45, 1.6, 0.13], curtain: [0.3, 0.22, 0.55] } as const;
// The gold as the towers' gold, one gold for the world: brighter about the moon, deep elsewhere.
// deep is how much richer the gold is where it mirrors little: a gold face turned from the light shows the gold's
// own color, deeper than where it is bright. The frieze's reeds: how dark the groove between two is, and how much of
// a reed it takes, wide enough that it is a crisp regular line at three times and not a barcode of single pixels.
const GOLD = { rough: 0.16, sheen: [1.4, 9, 0.86], shade: 0.75, neutral: 1, deep: 1.4, city: 0.6, flank: 34, valley: 0.6, groove: 0.22 };
// The mast: thin and round, it is mostly the edges of a cylinder turned to the moon, and with all of the moon's rim and
// sheen it was a sliver of cream: it keeps this much of them.
const MAST = { rim: 0.35 } as const;
// The ring is the most polished gold in the world: smoother than the rest (rough), and it mirrors the night, the
// city and the tower. Its highlight is filtered: the moon's sheen on it spreads over as much as a pixel covers and is
// lowered to keep its light, so a highlight finer than a pixel comes to its average and never beads (peak: how much of
// the gold's sheen it takes at its heart, low, since a strong one broke into a row of bright dots along the lobes at the
// page's size; and direct: how much of the moon's own highlight). It mirrors the night no sharper than the roughness
// `night`: the night's small lights came back from its curved faces as rows of points. Its roughness also grows
// with how far its normal turns across a pixel (aa). The half of the band beyond the tower is seen against the night,
// turned from the visitor: it keeps `far` of its light. Its inner face, which looks at the dark tower, keeps `side` of
// the light of its top, its outer face, which mirrors the glow low over the horizon, `outer`, and its underside
// `under`. Its outline is drawn with its color weighed by its cover (see below). The band is found in its hull by stepping along each pixel's ray (`steps` at most, then `search` steps of a search for
// its nearest, or deepest, within `deep` units of where it goes in), and its bead is drawn where it is
// `bead` pixels tall or more and comes to its mean below that. Its body, all but its catch line, keeps `body` of its
// light. One material at every size: nothing here depends on how large the band is drawn, so the page, a wider
// screen and a close view see the same gold, each pixel the mean of what its footprint mirrors.
// pale: the level at which the ring's gold has gone the whole way to pale, which is higher than the rest of the
// gold's, so its body keeps the crown's gold and only its catch line and its spark are pale.
// Its cover: the share of a pixel the band covers, eased over `ramp` pixels as a tent filter is and not cut to one,
// which drew its long shallow edges in stairs. Where the band lies over the night, the page lays the canvas over its
// sky after the canvas is encoded, so its color is weighed by its cover as the screen encodes it (gToScreen); where it
// lies over the tower, which is blended in linear light, as it is. Weighed by a power of its cover, as it was, a pixel
// half covered over the sky was brighter or darker than half, and the band had a dark line round it on the page. The
// tower behind it is found exactly (gBehind). The trace takes `steps` at most: a ray that grazes the band's top face
// closes on it slowly, and with fewer its outline came out ragged. Its gold is never darker than `least`: it always
// mirrors some of the city's glow, and a darker pixel beside a lit one was drawn black by the page's edge smoothing.
// Seen edge on it keeps `rim` of the light of its top whichever face it is, and is never darker than `behind`: there it
// mirrors what is straight behind it, the glow of the page's sky, and its outline was otherwise a dark line round it.
const RING = { pale: 7.5, rough: 0.1, shade: 1.5, peak: 0.1, direct: 0.5, night: 0.45, far: 0.6, aa: 0.5, side: 0.25, outer: 0.7, under: 0.1, ramp: 2.0, least: 0.03, behind: 0.2, rim: 0.8, steps: 90, search: 14, deep: 12, bead: 4, body: 0.72 };
// The ring's catch light: one hard line along the edge of the band that is uppermost on the screen, where its top
// arris turns to the glow of the sky and the moon. It lies on whatever of the band is within `wide` units under that
// edge, and never on less than `px` pixels of it, so it reads as one continuous line however small the band is drawn.
// How bright it is: how far it lifts the gold in the gold's grade (where 1.5 is the world's gold and 4.5 its pale), and
// how much pale light it lays on after the grade, which adds as light does, so a line that falls across two pixels
// has as much light as one on one pixel and never breaks into dashes as it crosses the pixel rows. Which way on the screen is
// up for it (toward the moon, a little to the right), how much of it is left on the side away from the moon, and on
// the half beyond the tower.
const CATCH = { power: 0.6, light: 0.14, px: 1.3, wide: 0.55, dir: [0.4, 0.92], shade: 0.4, far: 0.75 } as const;
// What the ring mirrors besides the night: the haze of the city's light low over the horizon (how bright, how high
// its middle is and how tall, as the height of a direction), and the lit city under it, below the horizon (how bright,
// how far down it reaches, and its streets and lit floors as so many to a turn round and to a unit of height). Where
// the shaft stands between the ring and the moon (the baked share of the moon seen), the ring keeps `shadow` of the
// moon's sheen. And the tower itself, where the ring's mirror looks back at it: how far it looks, in units, the
// stone's brightness, how much brighter its moonlit side is, how tall a floor is and how bright a lit room.
const MIRROR = { haze: 0.8, hazeAt: 0.07, hazeTall: 0.045, city: 0.2, cityTo: -0.55, streets: 24, floors: 12, shadow: 0.2, reach: 140, stone: 0.55, moonlit: 3, floor: 2.1, rooms: 2.2 } as const;
// The glow of the page's sky over the world, which the band's top mirrors: how bright, and from what height of a
// direction to what height it fades out. Low, so the band's body is a deep mirror and its light is its catch line.
const SKY = { power: 0.16, from: 0.12, to: 0.75 } as const;
// The pointer's spark on the ring: how bright, how far round the pointer it reaches on the screen, in units, how narrow it is (as one less the cosine of its half width), the widest it is let spread to
// where it is finer than a pixel, losing some of its light as it does, and how bright its pale is at its heart.
const SPARK = { power: 3.0, reach: 9, wide: 0.16, most: 0.3, peak: 1.6 } as const;
// The ring's light on the tower: its gold mirrors the city's glow round the shaft and throws it, warm, back onto the
// stone it circles. The ring is all round the shaft at one distance, so what tells where it falls is how far a place
// is above or below the ring's own plane: it lies as a warm band across the shaft and fins, tilted as the ring is
// (how strong in the plane, and how far off it has fallen to half, in units), on faces turned to the band.
const RING_LIGHT = { power: 1.1, half: 7 } as const;
// The ring's shade on the tower: the night's soft light from the visitor's side comes from in front and a little
// above, so the front arc, which hangs 45 units in front of the shaft, stands in it and lays a soft shade on the
// stone just under where it crosses. Which way the light it takes away comes from, how much of it the shade takes, and
// how soft its edge is (in units, at least, and more for each unit the arc stands off the stone).
const RING_SHADE = { from: [-0.08, 0.17, 1], dark: 0.62, soft: [0.6, 0.07] } as const;
const RING_SHADE_AT = new THREE.Vector3(...RING_SHADE.from).normalize();
// The ring's axis, tilted about x and then about z, as the make script turns the ring into place, and the two ways
// across its plane that how far round a place is is measured by.
const TURN = new THREE.Matrix4().makeRotationZ(SPIRE.ring.tilt[1] * THREE.MathUtils.DEG2RAD).multiply(new THREE.Matrix4().makeRotationX(SPIRE.ring.tilt[0] * THREE.MathUtils.DEG2RAD));
const AXIS = new THREE.Vector3(0, 1, 0).applyMatrix4(TURN).normalize();
const ACROSS = [new THREE.Vector3(1, 0, 0).applyMatrix4(TURN).normalize(), new THREE.Vector3(0, 0, 1).applyMatrix4(TURN).normalize()];
// The ring as a jeweller would make it, its relief worked into its normals inside the band the material finds (the
// outline is the plain section's, so it stays on picture 9's lines). Its top face is two terraces: the inner one
// dished (dish: how far its normal turns at its edges), with a line of darker inlay let into it (from, to, as offsets
// across the section from its middle, and how dark), then a riser (from, to, how steep, as a slope) up to the outer
// terrace, which is reeded (each reed so wide, its normal turning so far each way). Round its length it is made of
// so many segments, each faced a little out of true (along it and across it, as slopes), with a joint between each
// two (how wide, how dark). The outer face's rounded arrises are cut into facets of so many degrees, as a stepped
// moulding is. The relief comes to its mean, and the band to a slightly rougher gold, where a pixel holds more than
// `fade` of a reed or a facet (from, to, as shares of it).
// The segments are cast in uneven lengths, as a founder casts what his moulds hold: how far round a place is, in
// segments, is its angle bent by two slow waves (how many to a turn, how far each bends it, and where it starts), so
// a segment is between about 0.6 and 2.5 of their mean and the joints along the front arc are no rhythm. At each
// joint the band is cut by a V groove all round its section (how wide either side of the joint, how deep), so a joint
// notches the outline as well as darkening the face.
const RELIEF = { dish: 0.3, inlay: [-2.85, -2.35, 0.42], riser: [0.25, 0.75, 1.0], reeds: [0.75, 3.8], reed: 0.68, reedTurn: 0.42, segs: 18, wave: [3, 0.11, 0.7, 7, 0.04, 2.1], facet: [0.09, 0.05], joint: [0.25, 0.55], notch: [0.55, 0.32], round: 0.6, step: 45, fade: [0.3, 0.6], rough: 0.08 } as const;
// The light the ring throws onto a face at vWorld turned to the world normal nW, as irradiance.
const ringLight = (b: Band): string => `
{
	vec3 rMid = vec3( 0.0, ${f(SPIRE.tall * SPIRE.ring.up)}, 0.0 ), rAx = vec3( ${f(AXIS.x)}, ${f(AXIS.y)}, ${f(AXIS.z)} );
	vec3 rRel = vWorld - rMid, rO = rRel - rAx * dot( rRel, rAx );
	vec3 rTo = rMid + rO / max( length( rO ), 1e-4 ) * ${f(SPIRE.ring.r + (b.out + b.in) / 2)} - vWorld;
	float rD = length( rTo ), rH = dot( rRel, rAx );
	vec3 rN = inverseTransformDirection( geometryNormal, viewMatrix );
	float rK = saturate( dot( rN, rTo / max( rD, 1e-4 ) ) ) / ( 1.0 + rH * rH / ${f(RING_LIGHT.half * RING_LIGHT.half)} );
	reflectedLight.indirectDiffuse += ${lin3(METAL.gold)} * ${f(RING_LIGHT.power)} * rK * BRDF_Lambert( material.diffuseColor );
}`;

const ringShade = (b: Band): string => `
{
	vec3 rMid = vec3( 0.0, ${f(SPIRE.tall * SPIRE.ring.up)}, 0.0 ), rAx = vec3( ${f(AXIS.x)}, ${f(AXIS.y)}, ${f(AXIS.z)} ), rF = vec3( ${f(RING_SHADE_AT.x)}, ${f(RING_SHADE_AT.y)}, ${f(RING_SHADE_AT.z)} );
	float rDen = dot( rF, rAx ), rT = abs( rDen ) > 1e-4 ? dot( rMid - vWorld, rAx ) / rDen : -1.0;
	if ( rT > 0.0 ) {
		vec3 rH = vWorld + rF * rT - rMid;
		float rR = length( rH - rAx * dot( rH, rAx ) ), rE = max( ${f(SPIRE.ring.r + b.in)} - rR, rR - ${f(SPIRE.ring.r + b.out)} );
		float rP = ${f(RING_SHADE.soft[0])} + ${f(RING_SHADE.soft[1])} * rT;
		iblIrradiance *= 1.0 - ${f(RING_SHADE.dark)} * ( 1.0 - smoothstep( - rP, rP, rE ) ) * saturate( 4.0 * dot( inverseTransformDirection( geometryNormal, viewMatrix ), rF ) );
	}
}`;

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
const NIGHT = 1.35;
// And how much of it a face takes by which way it looks across the view: the moon is to the right, so the faces turned
// left are the tower's shaded side and those turned right its lit side (at the most left, and at the most right).
const SIDE = [0.5, 1.2] as const;
// The moon on the stone: how much more of it the granite takes than the stage's light gives a plain face, as polished
// granite under a low moon does, so the faces it reaches (the right bevels, the tops of the setbacks) are what model
// the tower, and the fronts, which it never reaches, are the night's.
const MOONLIT = 2.2;
// How much of the night the stone mirrors: polished, but stone. As much as a plain face mirrors, the night's soft
// light from the visitor's side lay on every front as one even sheen, and the tower read as resin.
const SHEEN = 0.3;
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

function stone(ledges: number[], band: Band, court: Court, ringLit: boolean): THREE.MeshStandardMaterial {
  const g = STONE.granite, r = STONE.rusticated, t = STONE.trim, c = STONE.court;
  const g3 = (k: number): [PaletteName, PaletteName, number, number] => [STONES.granite[0], STONES.granite[1], STONES.granite[2], STONES.granite[3] * k];
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: g.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: new THREE.Vector3(...MOONWARD).normalize() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 grain;\nvarying vec4 vGrain;\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGrain = grain;\nvWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz / ${f(SCALE)};`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uMoonward;\nvarying vec4 vGrain;\nvarying vec3 vWorld;\nvec3 sEmit;\nfloat sRough = ${f(g.rough)}, sTilt = 0.0, sLift = 0.0, sShut = 1.0;\nconst float sLedges[ ${ledges.length} ] = float[]( ${ledges.map(f).join(', ')} );${COMMON}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(NIGHT)};\nradiance *= ${f(SHEEN)};\n${ringLit ? ringShade(band) : ''}\n#ifdef WORLD_BAKED\niblIrradiance *= mix( 1.0, wLight.z * wLight.z, ${f(OCCLUDE)} );\n#endif\nreflectedLight.directDiffuse *= ${f(MOONLIT)};\n#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= mix( ${f(SIDE[0])}, ${f(SIDE[1])}, smoothstep( -0.8, 0.8, inverseTransformDirection( geometryNormal, viewMatrix ).x ) );\n#ifdef WORLD_BAKED\nreflectedLight.indirectDiffuse *= mix( ${f(FALL.foot)}, ${f(FALL.head)}, pow( wLight.w, ${f(FALL.curve)} ) );\n#endif${rim(RIM.stone, false, RIM.stoneTight, true)}${ringLit ? ringLight(band) : ''}`).replace('#include <opaque_fragment>', `outgoingLight = mix( outgoingLight, tKeep( outgoingLight ), ${f(KEEP.stone)} );\n#include <opaque_fragment>`).replace('#include <color_fragment>', `#include <color_fragment>
{
	int lay = int( vGrain.z + 0.5 );
	vec3 sWorldN = inverseTransformDirection( normalize( vNormal ), viewMatrix );
	sEmit = vec3( 0.0 );
	float sLobby = 0.0;
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
		// The shade on the tread at the foot of each step's riser.
		${court.steps.map((r) => `tone *= 1.0 - ${f(STEP.dark)} * step( ${f(r)}, rr ) * exp( - ( rr - ${f(r)} ) / ${f(STEP.out)} );`).join('\n')}
		// The lobby's light, out through each portal's doors onto the paving before it.
		float ahead = vGrain.y - ${f(court.front)};
		if ( ahead > 0.0 ) {
			${court.doors.map(([c, h, k]) => `sLobby += ${f(k)} * exp( - pow( ( vGrain.x - ${f(c)} ) / ( ${f(h)} + ${f(LOBBY.spread)} * ahead ), 2.0 ) );`).join('\n')}
			sLobby *= ${f(LOBBY.power)} * exp( - ahead / ${f(LOBBY.reach)} );
		}
	} else {
		bool rust = lay == 1, pale = lay == 3;
		float sUnder = 1e4, sWashed = mix( 1.0, ${f(WORN.washed)}, smoothstep( 0.15, 0.75, sWorldN.x ) );
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
		// The court's nosing and plinth are one course of kerb stones each, a few pixels tall: a bed joint wandering
		// through one drew it as a dashed line.
		if ( pale && length( vWorld.xz ) > ${f(Math.min(...court.steps) - 0.3)} && vWorld.y < ${f(court.top + 0.05)} ) jh = 0.0;
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
			// The weather, under the nearest ledge over this place: soot right under it, and its stains, filtered to
			// their mean where they are finer than a pixel.
			float y = vGrain.y, d = 1e4;
			for ( int i = 0; i < ${ledges.length}; i ++ ) { float l = sLedges[ i ] - y; if ( l > -0.02 && l < d ) d = max( l, 0.0 ); }
			if ( vGrain.w >= 0.0 ) d = min( d, ${f(FLUTES.belt)} * ceil( y / ${f(FLUTES.belt)} ) - y );
			sUnder = d;
			float soot = exp( - d / ${f(WEATHER.sootTall)} ) * step( d, 1e3 );
			tone *= 1.0 - ${f(WEATHER.soot)} * soot * sWashed;
			if ( d < 1e3 ) {
				float fx = max( fwidth( vGrain.x ), 1e-4 ), lid = floor( ( y + d ) * 4.0 + 0.5 ), c0 = floor( vGrain.x / ${f(STAIN.every)} ), run = 0.0;
				for ( int k = -1; k <= 1; k ++ ) {
					float id = c0 + float( k ), h1 = tHash( vec2( id, lid ) ), h2 = tHash( vec2( id + 17.0, lid ) ), h3 = tHash( vec2( id, lid + 31.0 ) );
					if ( h1 > ${f(STAIN.share)} ) continue;
					float at = ( id + 0.15 + 0.7 * h2 ) * ${f(STAIN.every)}, sLen = mix( ${f(STAIN.long[0])}, ${f(STAIN.long[1])}, h3 ), age = min( d / sLen, 1.0 );
					float w = mix( ${f(STAIN.wide[0])}, ${f(STAIN.wide[1])}, fract( h2 * 7.13 ) ) * ( 1.0 + ${f(STAIN.spread)} * age );
					float st = tBox( vGrain.x, at - 0.5 * w, at + 0.5 * w, fx + 0.06 + 0.3 * age * w );
					run = max( run, st * exp( - 2.2 * d / sLen ) * ( 0.7 + 0.3 * h1 / ${f(STAIN.share)} ) );
				}
				tone *= 1.0 - ${f(STAIN.dark)} * run * sWashed * ( 0.85 + 0.15 * tNoise( vec2( vGrain.x * 2.3, y * 0.7 ) ) );
			}
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
			// Its figure, and its crystals where a pixel can hold them.
			float fx = max( fwidth( vGrain.x ), fwidth( vGrain.y ) ), seen = 1.0 - smoothstep( 0.2, 0.55, fx );
			float fig = 0.5 * tNoise( vGrain.xy * ${f(GRAIN.scales[0])} + 11.0 ) + 0.3 * tNoise( vGrain.xy * ${f(GRAIN.scales[1])} + 23.0 ) + 0.2 * tNoise( vGrain.xy * ${f(GRAIN.scales[2])} + 5.0 );
			tone *= 1.0 + ${f(2 * GRAIN.figure)} * ( fig - 0.5 );
			float c1 = tNoise( vGrain.xy * ${f(GRAIN.crystals)} + 41.0 ), c2 = tNoise( vGrain.xy * ${f(GRAIN.crystals * 1.37)} + 77.0 );
			tone *= 1.0 + seen * ${f(GRAIN.fleck)} * ( smoothstep( 0.64, 0.8, c1 ) - smoothstep( 0.66, 0.82, c2 ) );
			// Chips out of the arrises along the bed joints: a stretch of the joint here and there is bitten into, deepest
			// at its middle, and in shade.
			float dj = abs( fract( up + 0.5 ) - 0.5 ) * course, fy = max( fwidth( vGrain.y ), 1e-4 );
			float cl = mix( ${f(GRAIN.chip.long[0])}, ${f(GRAIN.chip.long[1])}, tHash( vec2( row, 61.0 ) ) ), cs = vGrain.x / cl + 7.3 * rh, ci = floor( cs );
			float ch = tHash( vec2( ci, row + 0.5 * step( 0.5, fract( up ) ) ) + 53.0 );
			float bite = ${f(GRAIN.chip.deep)} * ( 0.4 + 0.6 * ch / ${f(GRAIN.chip.share)} ) * sin( 3.14159 * fract( cs ) );
			float chip = step( ch, ${f(GRAIN.chip.share)} ) * ( 1.0 - smoothstep( bite - fy, bite + fy, dj ) ) * ( 1.0 - smoothstep( 0.25, 0.6, fx ) );
			tone *= 1.0 - ${f(GRAIN.chip.dark)} * chip * sWashed * mix( ${f(WORN.open)}, 1.0, exp( - sUnder / ${f(WORN.under)} ) );
			#ifdef WORLD_BAKED
				tone *= 1.0 - ${f(GRAIN.grime[2])} * sWashed * smoothstep( ${f(GRAIN.grime[0])}, ${f(GRAIN.grime[1])}, wLight.z );
			#endif
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
	sEmit += diffuseColor.rgb * ( ${mix('flame', 'hot', LOBBY.warm, 1)} ) * sLobby;
	{
		// The court's lit kerb.
		float kr = length( vWorld.xz ), fy = max( fwidth( vWorld.y ), 1e-5 ), grow = max( ${f(KERB.y[1] - KERB.y[0])}, ${f(KERB.least)} * fy );
		float kerb = tBox( vWorld.y, ${f(court.top + (KERB.y[0] + KERB.y[1]) / 2)} - 0.5 * grow, ${f(court.top + (KERB.y[0] + KERB.y[1]) / 2)} + 0.5 * grow, fy );
		kerb *= step( ${f(KERB.r[0])}, kr ) * step( kr, ${f(KERB.r[1])} ) * ( 1.0 - smoothstep( 0.3, 0.6, abs( sWorldN.y ) ) );
		sEmit += ( ${lin('flame', 0.5)} + ${lin('hot', 0.5)} ) * ${f(KERB.power)} * kerb;
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
		// Far, each pixel shows the windows its footprint covers, each by the share of it that is that window's glass:
		// a box filter over the cells and not a blurred map, so a lit floor is a crisp bar of light under a dark
		// spandrel and a lit bay a crisp block, never a smear of neighbouring windows or of another strip in the map.
		vec3 bFar = vec3( 0.0 );
		for ( int j = -1; j <= 1; j ++ ) for ( int i = -1; i <= 1; i ++ ) {
			vec2 k = id + vec2( float( i ), float( j ) );
			float w = tBox( c.x, k.x + a.x, k.x + b.x, fw.x ) * tBox( c.y, k.y + a.y, k.y + b.y, fw.y );
			if ( w <= 0.0 ) continue;
			vec3 e = texelFetch( uWin, ivec2( k ), 0 ).rgb;
			float lk = max( pow( e.r, ${f(WINDOW.curve)} ), ${f(WINDOW.dark)} );
			bFar += w * lk * tTint( e.g * smoothstep( ${f(WINDOW.dim[0])}, ${f(WINDOW.dim[1])}, lk ) ) * ${f(WINDOW.mean)} * ( 1.0 - ${f(WINDOW.blind)} * e.b );
		}
		vec3 d = texelFetch( uWin, ivec2( id ), 0 ).rgb;
		float level = max( pow( d.r, ${f(WINDOW.curve)} ), ${f(WINDOW.dark)} ), blind = d.b;
		vec3 tint = tTint( d.g * smoothstep( ${f(WINDOW.dim[0])}, ${f(WINDOW.dim[1])}, level ) );
		float px = min( 1.0 / fw.x, 1.0 / fw.y ), detail = smoothstep( ${f(PANE.detail[0])}, ${f(PANE.detail[1])}, px );
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
			// No two panes hang quite true, so each mirrors the night a little differently.
			bTilt += bGlass * detail * ${f(PANE.hang)} * ( vec2( tHash( id + 41.3 ), tHash( id + 57.9 ) ) - 0.5 );
		}
		bEmit += ${f(WINDOW.gain)} * mix( bFar, bGlass * level * tint * room, detail );
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
  const axis = AXIS;
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
float gOn, gValley, gDetail, gRing, gMoonW, gSpread, gCover, gTone, gSparkW, gSpark, gCatch, gOver;
vec3 gNormal;
#ifdef SPIRE_RING
uniform mat4 projectionMatrix;
vec3 gN4[ 4 ];
float gMean, gPix, gAngle, gInlay;
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
const vec3 gE1 = vec3( ${f(ACROSS[0].x)}, ${f(ACROSS[0].y)}, ${f(ACROSS[0].z)} ), gE2 = vec3( ${f(ACROSS[1].x)}, ${f(ACROSS[1].y)}, ${f(ACROSS[1].z)} );
// How far round the band a place is, in segments, from its angle: and how many segments to a unit along the band
// there. The two waves have whole numbers to a turn, so the count is seamless where the angle wraps.
float gU( float th ) { return ${f(RELIEF.segs / (2 * Math.PI))} * ( th + ${f(RELIEF.wave[1])} * sin( ${f(RELIEF.wave[0])} * th + ${f(RELIEF.wave[2])} ) + ${f(RELIEF.wave[4])} * sin( ${f(RELIEF.wave[3])} * th + ${f(RELIEF.wave[5])} ) ); }
float gDu( float th ) { return ${f(RELIEF.segs / (2 * Math.PI))} * ( 1.0 + ${f(RELIEF.wave[0] * RELIEF.wave[1])} * cos( ${f(RELIEF.wave[0])} * th + ${f(RELIEF.wave[2])} ) + ${f(RELIEF.wave[3] * RELIEF.wave[4])} * cos( ${f(RELIEF.wave[3])} * th + ${f(RELIEF.wave[5])} ) ) / gR; }
// How far a place is from the nearest joint, along the band, in units, and which side of it.
float gJoint( float th, out float side ) { float u = fract( gU( th ) + 0.5 ) - 0.5; side = u < 0.0 ? -1.0 : 1.0; return abs( u ) / max( gDu( th ), 1e-4 ); }
float gSdf( vec3 p ) {
	vec3 rad;
	vec2 q = gQ( p, rad );
	float d = gBand( q );
	if ( d > 1.5 ) return d;
	float side, dj = gJoint( atan( dot( rad, gE2 ), dot( rad, gE1 ) ), side );
	return d + ${f(RELIEF.notch[1])} * max( 0.0, 1.0 - dj / ${f(RELIEF.notch[0])} );
}
// How much of the relief across the section and of the outer face's facets is drawn (1 where a pixel holds a small
// share of one, 0 where it holds several), and how wide a pixel is across the section, in units.
float gRelX, gRelO, gFq, gRelJ, gAe, gNdv;
// The band's normal at q in its section and s along its length, as (out, up, along), and how dark it is there: a
// face, or the round of an arris, worked as RELIEF says; the underside crowned; the bead round the outer face where
// on says it is drawn (its mean, flat, where it is not).
vec4 gFace( vec2 q, float s, float on ) {
	float hw = gB.x - gAe, tone = 1.0, th = s / gR, id = floor( gU( th ) ), side, dj = gJoint( th, side );
	vec2 tilt = vec2( ${f(RELIEF.facet[1])}, ${f(RELIEF.facet[0])} ) * ( vec2( tHash( vec2( id, 3.0 ) ), tHash( vec2( id, 9.0 ) ) ) * 2.0 - 1.0 );
	// The walls of the groove at a joint, each turned along the band toward its own segment.
	tilt.y += side * ${f(RELIEF.notch[1] / RELIEF.notch[0])} * step( dj, ${f(RELIEF.notch[0])} ) * gRelJ;
	vec2 w = abs( q ) - gB + gAe, sq = vec2( q.x < 0.0 ? -1.0 : 1.0, q.y < 0.0 ? -1.0 : 1.0 );
	vec2 n;
	if ( w.y > w.x && !( w.x > 0.0 && w.y > 0.0 ) && q.y > 0.0 ) {
		float x = q.x, slope = ${f(2 * b.crown)} * x / ( hw * hw ) * 0.5;
		float mid = 0.5 * ( - hw + ${f(RELIEF.riser[0])} ), half_ = 0.5 * ( hw + ${f(RELIEF.riser[0])} );
		if ( x < ${f(RELIEF.riser[0])} ) {
			slope -= ${f(RELIEF.dish)} * ( x - mid ) / half_;
			tone = 1.0 - ${f(1 - RELIEF.inlay[2])} * tBox( x, ${f(RELIEF.inlay[0])}, ${f(RELIEF.inlay[1])}, gFq );
		} else if ( x < ${f(RELIEF.riser[1])} ) slope -= ${f(RELIEF.riser[2])} * gRelX;
		else if ( x < ${f(RELIEF.reeds[1])} ) {
			float r = ( x - ${f(RELIEF.reeds[0])} ) / ${f(RELIEF.reed)};
			slope += ${f(RELIEF.reedTurn)} * ( 2.0 * fract( r ) - 1.0 ) * gRelX;
		}
		n = normalize( vec2( slope, 1.0 ) );
		return vec4( normalize( vec3( n, 0.0 ) + vec3( tilt.x, 0.0, tilt.y ) ), tone );
	}
	if ( w.x > 0.0 && w.y > 0.0 ) n = normalize( w ) * sq;
	else if ( w.y > w.x ) n = normalize( vec2( ${f(b.crown)} * q.x / ( hw * hw ), sq.y ) );
	else {
		float t = clamp( q.y / ${f(b.bead[0])}, -1.0, 1.0 );
		n = normalize( mix( vec2( sq.x, 0.0 ), vec2( sqrt( 1.0 - t * t ), t ), on * step( 0.0, q.x ) * step( abs( q.y ), ${f(b.bead[0])} ) ) );
	}
	if ( q.x > 0.0 && !( w.y > w.x && !( w.x > 0.0 && w.y > 0.0 ) ) ) {
		float a = atan( n.y, n.x ), st = ${f(RELIEF.step * THREE.MathUtils.DEG2RAD)};
		a = mix( a, st * floor( a / st + 0.5 ), gRelO );
		n = vec2( cos( a ), sin( a ) );
		return vec4( normalize( vec3( n, 0.0 ) + vec3( 0.0, 0.0, tilt.y ) ), tone );
	}
	return vec4( n, 0.0, tone );
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
// The share of a pixel, whose ray goes on from the band at from along d, that the tower stands behind: worked out as
// gSeeTower finds the tower, from the nearest the ray comes to the shaft, against how wide a pixel is there.
float gBehind( vec3 from, vec3 d, float pix ) {
	float c[ 5 ];
	c[ 0 ] = 0.0;
	c[ 1 ] = abs( d.x ) > 1e-5 ? - from.x / d.x : 0.0;
	c[ 2 ] = abs( d.z ) > 1e-5 ? - from.z / d.z : 0.0;
	c[ 3 ] = abs( d.x - d.z ) > 1e-5 ? ( from.z - from.x ) / ( d.x - d.z ) : 0.0;
	c[ 4 ] = abs( d.x + d.z ) > 1e-5 ? - ( from.z + from.x ) / ( d.x + d.z ) : 0.0;
	float best = 1e5, tb = 0.0;
	for ( int i = 0; i < 5; i ++ ) {
		float t = clamp( c[ i ], 0.0, 400.0 );
		vec3 p = from + d * t;
		float g = max( abs( p.x ), abs( p.z ) );
		if ( g < best ) { best = g; tb = t; }
	}
	vec2 w = gTower( from.y + d.y * tb );
	return w.x > 0.0 ? clamp( 0.5 - ( best - w.x ) / max( pix, 1e-4 ), 0.0, 1.0 ) : 0.0;
}
// The screen's encoding and its inverse, channel by channel: a pixel of the band over the night is weighed by its
// cover as the page will see it, after it is encoded, and so is neither brighter nor darker at its edge than the mean
// of the band and the sky.
vec3 gToScreen( vec3 c ) { return mix( 1.055 * pow( max( c, vec3( 0.0031308 ) ), vec3( 1.0 / 2.4 ) ) - 0.055, 12.92 * c, vec3( lessThan( c, vec3( 0.0031308 ) ) ) ); }
vec3 gToLinear( vec3 c ) { return mix( pow( ( max( c, vec3( 0.04045 ) ) + 0.055 ) / 1.055, vec3( 2.4 ) ), c / 12.92, vec3( lessThan( c, vec3( 0.04045 ) ) ) ); }
// The share of a pixel a band covers whose nearest is m from the pixel's ray, where a pixel is pix wide.
float gRamp( float m, float pix ) { return smoothstep( 0.0, 1.0, 0.5 - m / ( max( pix, 1e-4 ) * ${f(RING.ramp)} ) ); }
#endif
`).replace('#include <color_fragment>', `#include <color_fragment>
gLeft = vec3( 0.0, 0.0, 1.0 ); gRight = gLeft; gNear = gLeft;
#ifdef SPIRE_RING
gN4[ 0 ] = vec3( 0.0, 0.0, 1.0 ); gN4[ 1 ] = gN4[ 0 ]; gN4[ 2 ] = gN4[ 0 ]; gN4[ 3 ] = gN4[ 0 ];
gMean = 1.0; gPix = 1.0; gAngle = 0.0; gInlay = 1.0; gNdv = 1.0;
#endif
gOn = 0.0; gValley = 0.0; gDetail = 0.0; gRing = 0.0; gMoonW = 0.0; gSpread = 0.0; gCover = 1.0; gTone = 1.0; gSparkW = 0.0; gSpark = 0.0; gCatch = 0.0; gOver = 1.0; gNormal = vec3( 0.0, 0.0, 1.0 );
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
	gCover = gRamp( m, pix );
	gOver = gBehind( at, rd, pix );
	// The catch line: lit where the band is covered here and not a little further toward the moon's side of up.
	vec2 n2 = ndc + vec2( ${f(CATCH.dir[0])}, ${f(CATCH.dir[1])} ) * max( ${f(CATCH.px)}, ${f(CATCH.wide)} / pix ) * pn;
	vec3 rd2 = inverseTransformDirection( vec3( ( n2.x + projectionMatrix[ 2 ][ 0 ] ) / projectionMatrix[ 0 ][ 0 ], ( n2.y + projectionMatrix[ 2 ][ 1 ] ) / projectionMatrix[ 1 ][ 1 ], -1.0 ), viewMatrix );
	float m2 = gTrace( cam, rd2, tf - 3.0, pix, at2 );
	vec2 q = gQ( at, rad );
	gCatch = ( 1.0 - gRamp( m2, pix ) ) * mix( ${f(CATCH.shade)}, 1.0, smoothstep( -0.6, 0.8, rad.x ) ) * mix( 1.0, ${f(CATCH.far)}, smoothstep( -0.2, 0.5, - rad.z ) );
	// Its normal, from the section (gFace), with the bead drawn where it is tall enough on the screen.
	// Taken as the mean of four places across the pixel's footprint in the section, so an arris or the bead finer
	// than a pixel comes to its mean and does not alias into ticks along the band.
	// Every measure of how much of the band a pixel holds is at least the pixel itself: one taken from how the place
	// found in the section changes from pixel to pixel alone fell to nothing here and there along an edge, where that
	// place jumps, and drew the bead and the relief there as a row of bright dots.
	float on = smoothstep( ${f(RING.bead)}, ${f(RING.bead * 1.5)}, ${f(2 * b.bead[0])} / max( fwidth( q.y ), pix ) );
	vec2 qx = dFdx( q ), qy = dFdy( q );
	qx *= min( 1.0, 3.0 / max( length( qx ), 1e-5 ) );
	qy *= min( 1.0, 3.0 / max( length( qy ), 1e-5 ) );
	// How far along the band, in units, and how far that changes across the pixel, with the turn where it wraps.
	float s = atan( dot( rad, gE2 ), dot( rad, gE1 ) ) * gR, sx = dFdx( s ), sy = dFdy( s );
	sx -= ${f(2 * Math.PI)} * gR * floor( sx / ( ${f(2 * Math.PI)} * gR ) + 0.5 );
	sy -= ${f(2 * Math.PI)} * gR * floor( sy / ( ${f(2 * Math.PI)} * gR ) + 0.5 );
	gFq = max( max( length( qx ), length( qy ) ), pix );
	// Where a pixel holds more of the section than its arrises, the band is shaded as its section is seen through the
	// pixel: rounder, its arrises as wide as the footprint. With its true arrises, a long shallow edge seen nearly edge
	// on turned from top face to side face from one row of pixels to the next and was drawn in stairs.
	gAe = clamp( ${f(RELIEF.round)} * gFq, gA, min( gB.x, gB.y ) - 0.01 );
	gRelX = 1.0 - smoothstep( ${f(RELIEF.fade[0])}, ${f(RELIEF.fade[1])}, gFq / ${f(RELIEF.reed)} );
	gRelJ = 1.0 - smoothstep( ${f(RELIEF.fade[0])}, ${f(RELIEF.fade[1])}, max( abs( sx ) + abs( sy ), pix ) / ${f(2 * RELIEF.notch[0])} );
	gRelO = 1.0 - smoothstep( ${f(RELIEF.fade[0])}, ${f(RELIEF.fade[1])}, gFq / ${f(b.arris * RELIEF.step * THREE.MathUtils.DEG2RAD)} );
	vec4 f0 = gFace( q + 0.375 * qx + 0.125 * qy, s + 0.375 * sx + 0.125 * sy, on ), f1 = gFace( q - 0.125 * qx + 0.375 * qy, s - 0.125 * sx + 0.375 * sy, on );
	vec4 f2 = gFace( q - 0.375 * qx - 0.125 * qy, s - 0.375 * sx - 0.125 * sy, on ), f3 = gFace( q + 0.125 * qx - 0.375 * qy, s + 0.125 * sx - 0.375 * sy, on );
	// The joints between its segments, as the share of the pixel a joint covers.
	float du = gDu( s / gR ), fs = max( abs( sx ) + abs( sy ), pix ) * du, jw = ${f(RELIEF.joint[0])} * du;
	gInlay = 0.25 * ( f0.w + f1.w + f2.w + f3.w ) * ( 1.0 - ${f(RELIEF.joint[1])} * tPulse( gU( s / gR ) + 0.5 * jw, 0.0, jw, fs ) * step( -0.3, q.y ) );
	vec3 tang = cross( rad, gAxis ), ns = f0.xyz + f1.xyz + f2.xyz + f3.xyz;
	gMean = length( ns ) * 0.25;
	ns = normalize( ns + vec3( 1e-5, 0.0, 0.0 ) );
	gNormal = normalize( ( viewMatrix * vec4( ns.x * rad + ns.y * gAxis + ns.z * tang, 0.0 ) ).xyz );
	// And each of the four, which what the band mirrors is averaged over, so a pixel shows the mean of what its
	// footprint mirrors and not what its mean normal mirrors: that drew the top face in steps and the arrises in dots.
	gN4[ 0 ] = normalize( ( viewMatrix * vec4( f0.x * rad + f0.y * gAxis + f0.z * tang, 0.0 ) ).xyz );
	gN4[ 1 ] = normalize( ( viewMatrix * vec4( f1.x * rad + f1.y * gAxis + f1.z * tang, 0.0 ) ).xyz );
	gN4[ 2 ] = normalize( ( viewMatrix * vec4( f2.x * rad + f2.y * gAxis + f2.z * tang, 0.0 ) ).xyz );
	gN4[ 3 ] = normalize( ( viewMatrix * vec4( f3.x * rad + f3.y * gAxis + f3.z * tang, 0.0 ) ).xyz );
	gPix = pix;
	gAngle = pix / max( tf, 1.0 );
	// A blade in three tones: its top, which takes the night's light, its edges, turned from it, and its underside,
	// turned down to the dark ground.
	gTone = mix( mix( ${f(RING.under)}, mix( ${f(RING.side)}, ${f(RING.outer)}, smoothstep( -0.3, 0.3, ns.x ) ), smoothstep( -0.6, 0.0, ns.y ) ), 1.0, smoothstep( 0.25, 0.65, ns.y ) );
	// Seen edge on, polished gold mirrors what is behind it, the glow of the night, whichever face it is: so its outline
	// is lit and never a dark line drawn round it on the page's sky.
	// How nearly edge on the band's faces are seen here: from how far round the band this is, which is smooth from pixel
	// to pixel where the place found in its section is not.
	gNdv = abs( dot( rad, rd ) );
	gTone = mix( gTone, 1.0, ${f(RING.rim)} * ( 1.0 - smoothstep( 0.05, 0.5, gNdv ) ) );
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
	gDetail = 1.0 - smoothstep( 0.12, 0.22, fw );
	gValley = tPulse( vGild.x + ${f(GOLD.groove / 2)}, 0.0, ${f(GOLD.groove)}, fw );
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
	#ifndef SPIRE_RING
	gMoonW = fwidth( dot( mr, uMoonward ) );
	gSpread = length( fwidth( mr ) );
	#else
		// On the ring both are worked out from the four normals of the pixel's own footprint and not by a derivative,
		// which is one value to every square of four pixels and drew its light in steps of two: how far apart the
		// four mirrored rays are, never less than the pixel's own angle; and the roughness grows by how far the four
		// normals differ (their mean is shorter than one), as a pixel holds the spread of a highlight finer than it.
		vec3 vv = - normalize( vViewPosition ), rm = vec3( 0.0 );
		vec3 r4[ 4 ];
		float lo = 2.0, hi = -2.0;
		for ( int i = 0; i < 4; i ++ ) {
			r4[ i ] = normalize( inverseTransformDirection( reflect( vv, gN4[ i ] ), viewMatrix ) );
			rm += 0.25 * r4[ i ];
			float d = dot( r4[ i ], uMoonward );
			lo = min( lo, d ); hi = max( hi, d );
		}
		float sp = 0.0;
		for ( int i = 0; i < 4; i ++ ) sp = max( sp, length( r4[ i ] - rm ) );
		gSpread = max( 2.0 * sp, 2.0 * gAngle );
		gMoonW = max( hi - lo, 2.0 * gAngle );
		roughnessFactor = sqrt( roughnessFactor * roughnessFactor + min( ${f(RING.aa)} * ( 1.0 - gMean ) / max( gMean, 0.2 ), 0.2 ) ) + ${f(RELIEF.rough)} * ( 1.0 - gRelX );
		vec3 sg = normalize( uGlintAt + vViewPosition ), sv = normalize( vViewPosition );
		gSparkW = fwidth( dot( normal, normalize( sg + sv ) ) );
	#endif
}`).replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace('getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )', 'goldFluted( geometryViewDir, geometryNormal, material.roughness )')).replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.directSpecular *= mix( 1.0, ${f(RING.direct)}, gRing );${ring ? '' : rim(RIM.gold, true)}
reflectedLight.directSpecular *= mix( 1.0, ${f(MAST.rim)}, step( 0.5, vGild.z ) * ( 1.0 - gRing ) );
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
	vec3 night = textureLod( envMap, envMapRotation * rw, roughnessToMip( max( rough, ${f(RING.night)} * gRing ) ) ).rgb * envMapIntensity * gain * tint;
	#ifdef WORLD_BAKED
		night += wBounce * ${f(GOLD.city)} * RECIPROCAL_PI;
	#endif
	#ifdef SPIRE_RING
		// The haze of the city's light low over the horizon, and the lit city below it: streets and floors of light.
		// All filtered by how wide a pixel's mirrored ray is (gSpread), so nothing the ring mirrors is finer than a
		// pixel and none of it is worked out by a derivative here.
		float el = rw.y, fe = max( gSpread, 1e-4 );
		float hw = sqrt( ${f(MIRROR.hazeTall * MIRROR.hazeTall)} + fe * fe ), haze = exp( - pow( ( el - ${f(MIRROR.hazeAt)} ) / hw, 2.0 ) ) * ${f(MIRROR.hazeTall)} / hw;
		float az = atan( rw.x, rw.z ) / 6.28318 * ${f(MIRROR.streets)}, fa = max( fe / max( length( rw.xz ), 0.1 ) / 6.28318 * ${f(MIRROR.streets)}, 1e-4 );
		float rows = el * ${f(MIRROR.floors)}, lights = tPulse( az, 0.25, 0.7, fa ) * tPulse( rows, 0.15, 0.6, fe * ${f(MIRROR.floors)} );
		float under = smoothstep( 0.02, -0.04, el ) * smoothstep( ${f(MIRROR.cityTo)}, ${f(MIRROR.cityTo * 0.4)}, el );
		float sky = smoothstep( 0.0, ${f(SKY.from)}, el ) * ( 1.0 - smoothstep( ${f(SKY.from)}, ${f(SKY.to)}, el ) );
		night += ${lin('hot')} * ( ${f(MIRROR.haze)} * haze + ${f(MIRROR.city)} * under * ( 0.7 + 0.5 * lights ) + ${f(SKY.power)} * sky ) * envMapIntensity;
		vec4 tower = gSeeTower( vSpire, rw, fe );
		// What it mirrors of the tower is not turned down by which way the face looks: it is what that face shows.
		night = mix( night * gTone, tower.rgb * envMapIntensity * ${f(RING.shade)}, tower.w );
	#endif
	return night;
}
vec3 goldFluted( const in vec3 viewDir, const in vec3 n, const in float rough ) {
	#ifdef SPIRE_RING
		return 0.25 * ( goldIBL( viewDir, gN4[ 0 ], rough ) + goldIBL( viewDir, gN4[ 1 ], rough ) + goldIBL( viewDir, gN4[ 2 ], rough ) + goldIBL( viewDir, gN4[ 3 ], rough ) );
	#endif
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
		lv *= gInlay * ${f(RING.body)} * mix( 1.0, ${f(RING.far)}, smoothstep( -0.2, 0.5, sin( 6.28318 * vGild.z ) ) );
		lv = max( lv, ${f(RING.least)} + ${f(RING.behind)} * ( 1.0 - smoothstep( 0.05, 0.5, gNdv ) ) ) + ${f(CATCH.power)} * gCatch;
		float caught = gCatch;
		diffuseColor.a = gCover;
	#endif
	vec3 c = mix( mix( vec3( ${GRADE.deep.map(f).join(', ')} ), ${lin3(METAL.gold)}, smoothstep( ${f(GRADE.at[0])}, ${f(GRADE.at[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GRADE.at[1])}, ${ring ? f(RING.pale) : f(GRADE.at[2])}, lv ) );
	float most = ${f(GRADE.most[0])}, room = ${f(GRADE.most[1] - GRADE.most[0])};
	if ( vGild.y < 2.5 ) outgoingLight = tKeep( c * ( lv < most ? lv : most + room * ( 1.0 - exp( - ( lv - most ) / room ) ) ) );
	#ifdef SPIRE_RING
		// The spark is laid on after the gold's grade, which eases every bright toward pale and would leave it no
		// brighter than the band's own sheen: it is the cursor's light itself, pale, on the gold.
		outgoingLight = mix( outgoingLight, ${lin('pale', SPARK.peak)}, clamp( gSpark, 0.0, 1.0 ) );
		// The catch line is the light of the covered part of a pixel on the band's upper edge, so it is laid on before
		// the pixel is weighed by its cover, as the rest is: laid on after, it lit a half covered pixel as a whole one.
		outgoingLight += ${lin('pale', CATCH.light)} * caught;
		// Weighed by its cover (as the screen encodes it over the night, and as it is over the tower), and never more
		// than its cover in any channel, nor under nothing: a pixel with more light than cover is not a color the page
		// can lay over its sky.
		outgoingLight = max( outgoingLight, vec3( 0.0 ) );
		outgoingLight /= max( 1.0, max( outgoingLight.r, max( outgoingLight.g, outgoingLight.b ) ) );
		outgoingLight = mix( gToLinear( gCover * gToScreen( outgoingLight ) ), gCover * outgoingLight, gOver );
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
// The court as the make script made it (COURT in scripts/world/parts/spire/make.mjs).
export interface Court { top: number; front: number; steps: number[]; doors: [number, number, number][] }
export interface Band { out: number; in: number; half: number; arris: number; crown: number; bead: [number, number] }

export function materials(map: THREE.Texture, ledges: number[], profile: number[][], band: Band, court: Court, ringLit = true): SpireMaterials {
  const all = { stone: stone(ledges, band, court, ringLit), bay: bay(map), gold: gold(profile, band, false), ring: gold(profile, band, true) };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}



