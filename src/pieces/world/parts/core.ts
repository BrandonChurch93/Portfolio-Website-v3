import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { STREAM as PAGE } from '../../../stream/config';
import { CORE, SOURCE } from '../layout';
import type { PartFactory } from '../part';
import { BALL_FRAG, BALL_VERT } from './core/shaders';
import { ROOT_FRAG, ROOT_VERT, rootScale, strandsFor } from './core/root';
import { RIDE, RIDER_FRAG, RIDER_VERT, riderGeometry } from './core/riders';

// The core: the planet's core and the source of the site's stream at once. A ball of the stream's light hanging free
// in the hollow, as picture 9 has it: pale gold over its face, a fine fizz of points of light over a soft mottle, with
// small crystal facets among them that flash when they turn to the light within, and clouds of broad light drifting
// slowly across it, warming through a soft gold fall to one narrow deep orange band at its hard edge
// (./core/grain.ts). Before the stream sets off, its grain runs hot and draws down to the foot in a narrowing seam.
// Once it runs, a broad pale column of the stream's light is shot down out of its foot, cutting through the band,
// drawing itself in to the page's own heart, with strands and surges inside it and an edge soft into the dark, and the
// page's stream takes it up at the cut (./core/root.ts). A few of the stream's own shards ride round the back of it
// (./core/riders.ts). The ball and the beam give light of their own and draw no haze outside.

type Ink = readonly [number, number, number];
type Stops = readonly (readonly [number, Ink])[];

// Linear light, before the stage's tone curve, each worked back through that curve from the color in brackets. Those
// are picture 9's, measured on its own pixels and averaged round the ball, aimed a little under it where the grain
// lifts the face and where a pixel's width fills in the band's dip, so that a still measures as the picture does.
// The face from its middle out, at shares of the radius. From 0.72 out they are set by measuring a still against the
// picture's own profile: a soft gold fall, then one deep orange band from 0.925 to the edge, a little lighter at the
// edge itself, as picture 9's is. A darker crease inside a lighter lip read as the rim of a plate.
const RIM: Stops = [
  [0, [0.932, 0.743, 0.392]], // (241, 218, 164)
  [0.3, [0.892, 0.717, 0.363]], // (239, 217, 160)
  [0.5, [0.892, 0.71, 0.358]], // (239, 216, 159)
  [0.62, [0.876, 0.689, 0.345]], // (238, 214, 157)
  [0.72, [0.9, 0.69, 0.342]],
  [0.8, [0.91, 0.67, 0.32]],
  [0.86, [0.92, 0.6, 0.25]],
  [0.9, [0.84, 0.46, 0.14]],
  [0.925, [0.72, 0.32, 0.05]],
  [0.97, [0.7, 0.3, 0.044]],
  [0.985, [0.86, 0.39, 0.06]],
  [1, [0.86, 0.39, 0.06]],
];
// The grain, as shares of the light where it is, for one step of each kind. Picture 9's grain is light on light: a
// brighter grain is as much brighter in red, green and blue, so it is a little paler, and a dimmer one a little more
// gold. Each grain also has its own warmth apart from its brightness. The curve squeezes the bright end, so a bright
// grain takes more light than a dim one gives up.
const GRAIN = {
  bright: [0.22, 0.225, 0.205],
  dim: [-0.05, -0.056, -0.066],
  warm: [0.0391, 0.0239, 0.0013],
  pale: [-0.0269, -0.0133, 0.0072],
} as const;

// How the face turns: about which axis, and how fast, in radians a second. Slow, as something enormous.
const TURN = { axis: new THREE.Vector3(0.18, 1, 0.22).normalize(), rate: 0.012 } as const;
// And the drift of broad light across it, the other way about another axis.
const DEEP = { axis: new THREE.Vector3(-0.35, 1, 0.1).normalize(), rate: -0.021 } as const;

// The neck of the beam, in units of the world down from the ball's foot unless they say otherwise: picture 9's broad
// pale column, shot down out of the ball. Its pale widths are picture 9's, measured: 29, 20, 16, 11, 9, 7 and 4.5
// across at 0, 11, 22, 45, 67, 112 and 160 down; then it draws in to the page's own heart by the cut, where the
// page's stream takes it up (STREAM.hero.hand).
//   rib: the half width it comes down to; flare: how much wider it is where it leaves, over about how many units;
//     body: and the slower part of that; fillet: how far the smooth union of the ball and the column reaches; quiet:
//     how wide it is as it sets off, against after; tip: how long its blunt end is, at most, and round: how blunt
//   into: over which units before the cut it draws in to the page's heart, that heart's pale half width in stream
//     units (under it, so the page's own heart is what shows), and how far past the cut it has narrowed to nothing, inside that heart (the page's heart is whole a
//     little past the cut: measured on the page, about 11 units)
//   light: the stream's light at the column's edge, at its middle where it leaves and further down, and over how many
//     units the middle comes down; streak: how much of the strands' light shows inside it, and how much brighter a
//     surge makes its body; edge: its outline is smoothed over at least this many pixels and this share of its width
//   skirt: outside its edge, a light that falls away fast and one that falls away slowly, each how strong and over
//     how many units; lit: over how far past the cut it gives way to the page's own glow
//   band: how narrow the band is where the column is the nearest edge, against the ball's; solid: over which
//     units the ball's own matter gives way to the column's light; speed: how fast that matter leaves the ball, in
//     units a second, and over about how many units it gathers speed
//   strands: the share of its width its strands lie across, and over which share of the page's gathering they spread
//     to the page's own ribbon; sheet: how much brighter the sheet between them is than the page's, which it comes
//     down to over the stretch before the cut
//   heart: how much of the page's heart it carries where it leaves, and over which depths that comes to the whole;
//     up: over how many units under the foot it comes on; hand: in stream units before the cut, over which it
//     narrows to the page's heart's pale width, to what share of its width, and how far past the cut it ends
//   surges: gap, how far apart their slots are, in stream units; pace, how fast they run, in stream units a second,
//     the page's own (83 by 2.1); drift, how far a slot strays; empty, the share of slots with none; strong, how
//     strong at the least and most; ahead and behind, how far each reaches, in stream units, least and most; one,
//     the share that ride one strand alone; lift, how much brighter a surge makes the whole beam and the strand it
//     rides, and how much it swells that strand; in, over how many units under the foot they come on
//   surge: the light that runs down it as it sets off: how much, how fast in units a second, how long
//   floor: the faintest light it lets go; energy: how much the page's leading end brightens it near it
//   plane: how far down the plane it is drawn on reaches, and wide: half its width; held: how far it runs held on
//   top: from how far over the foot the band is read across the joined shape; join: over which the ball gives way to
//     the neck's own matter over the foot, and over how far in from the ball's outline that is let go
const NECK = {
  rib: 2.0, flare: [8.5, 14], body: [7.5, 100], fillet: 7, quiet: 0.35, tip: 6, round: 0.5,
  into: [90, 6, 0.6, 16],
  light: [1.12, 1.9, 1.35, 110], streak: [0.4, 0.25], edge: [1.0, 0.07],
  skirt: [0.22, 1.2, 0.09, 7], lit: 120,
  band: 0.02,
  solid: [-1, 7], speed: [5, 28],
  strands: 0.85, spread: 0.6, sheet: 2.5,
  heart: [0.3, 30, 150], up: 6, hand: [70, 4, 0.85, 60],
  gap: 80, pace: 174, drift: 6, empty: 0.3, strong: [0.35, 1.3], ahead: [2, 10], behind: [8, 70], one: 0.45, lift: [0.9, 2.4, 0.6], in: 8,
  surge: [0.9, 210, 24], floor: 0.008, energy: 0.5, plane: 440, wide: 64, held: 260,
  top: 30, join: [12, 3, 2, 6],
} as const;
// Before the stream sets off, the grain over the foot runs hot and draws down to it in a seam: how much, half its
// width at the top and how tall it is, in units, the size of its grains, how fast
// they flow down, in units a second, and the two slow waves it swells by, in seconds.
const BEAD = { light: 1.0, size: [10, 40], cell: 1.6, flow: 3.5, beat: [5.3, 8.9] } as const;

// The rings of the ball's shell at each level of cost.
const RINGS = { full: 48, lean: 40 } as const;

const vec = (c: readonly number[]): THREE.Vector3 => new THREE.Vector3(c[0], c[1], c[2]);
// A color of the palette as the page's stream holds it: each channel to the power 2.2 (src/stream/renderer.ts, lin).
const lin = (name: PaletteName): THREE.Vector3 => { const v = hex(name); return new THREE.Vector3(...[(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => (c / 255) ** 2.2)); };

export const build: PartFactory = (ctx) => {
  const group = new THREE.Group(), rings = ctx.handheld || ctx.tier === 'low' ? RINGS.lean : RINGS.full;
  const at = new THREE.Vector3(...CORE.at), R = CORE.r;
  // Drawn over everything, for laying the ball on picture 9 while the rock round it is still a stand in, and for
  // judging the root on the page while the rock's floor still stands in front of it.
  const over = ctx.query.get('core') === 'over';
  // Seen alone or close, the world is not laid out as the page lays it, and no page stream takes over below.
  const lab = ctx.query.has('only') || ctx.query.has('close') || !ctx.renderer.domElement.isConnected;
  // ?neck=stream holds the beam on as if the page's stream had set off, which in the lab it never does.
  const held = ctx.query.get('neck') === 'stream';
  const strands = strandsFor(ctx.tier);
  const host = rootScale(SOURCE, strands);

  const rootU = {
    uR: { value: R },
    uLevel: { value: 1 },
    uTime: { value: 0 },
    uRootScale: { value: new THREE.Vector3(host.across, host.along, host.heart) },
    uRootState: { value: new THREE.Vector4(0, 0, 1, 60) },
    uEmber: { value: lin('ember') },
    uFlame: { value: lin('flame') },
    uHot: { value: lin('hot') },
    uPale: { value: lin('pale') },
    uCream: { value: vec(RIM[0][1]) },
    uRimAt: { value: RIM.map(([r]) => r) },
    uRim: { value: RIM.map(([, c]) => vec(c)) },
    uTurn: { value: new THREE.Matrix3() },
    uBright: { value: vec(GRAIN.bright) },
    uDim: { value: vec(GRAIN.dim) },
    uWarm: { value: vec(GRAIN.warm) },
    uGrainPale: { value: vec(GRAIN.pale) },
  };
  const f = (n: number) => n.toFixed(4), v2 = (a: readonly number[]) => `vec2( ${f(a[0])}, ${f(a[1])} )`;
  const v3 = (a: readonly number[]) => `vec3( ${f(a[0])}, ${f(a[1])}, ${f(a[2])} )`, v4 = (a: readonly number[]) => `vec4( ${a.map(f).join(', ')} )`;
  const rootDefines = {
    ROOT_ENERGY: f(NECK.energy), ROOT_FLOOR: f(NECK.floor), ROOT_STRANDS: strands,
    ROOT_RISE: f(PAGE.hero.rise), ROOT_SURGE: f(NECK.surge[0]), ROOT_SURGE_V: f(NECK.surge[1]), ROOT_SURGE_W: f(NECK.surge[2]),
    NECK_RIB: f(NECK.rib), NECK_FLARE: v2(NECK.flare), NECK_BODY: v2(NECK.body), NECK_FILLET: f(NECK.fillet),
    NECK_QUIET: f(NECK.quiet), NECK_TIP: f(NECK.tip), NECK_ROUND: f(NECK.round), NECK_CUT: f(PAGE.hero.hand[0] / host.host),
    NECK_INTO: v4(NECK.into), NECK_LIGHT: v4(NECK.light), NECK_STREAK: v2(NECK.streak), NECK_EDGE: v2(NECK.edge),
    NECK_SKIRT: v4(NECK.skirt), NECK_LIT: f(NECK.lit / host.host),
    NECK_BAND: f(NECK.band),
    NECK_SOLID: v2(NECK.solid), NECK_SPEED: v2(NECK.speed),
    NECK_STRANDS: f(NECK.strands), NECK_SPREAD: f(NECK.spread), NECK_SHEET: f(NECK.sheet),
    NECK_HEART: v3(NECK.heart), NECK_UP: f(NECK.up), NECK_HAND: v4(NECK.hand),
    NECK_GAP: f(NECK.gap), NECK_PACE: f(NECK.pace), NECK_DRIFT: f(NECK.drift), NECK_EMPTY: f(NECK.empty), NECK_STRONG: v2(NECK.strong),
    NECK_AHEAD: v2(NECK.ahead), NECK_BEHIND: v2(NECK.behind), NECK_ONE: f(NECK.one), NECK_LIFT: v3(NECK.lift), NECK_PULSE_IN: f(NECK.in),
    NECK_TOP: f(NECK.top), NECK_JOIN: v4(NECK.join),
    // The brightest the ball and its neck may be, as light before the stage's curve, found by measuring stills: a
    // grain at it shows as (250, 226, 168), a level under pale gold's green, so the stage's dither never takes one
    // past pale.
    CAP: 'vec3( 1.7, 1.1, 0.75 )',
    RIM_N: RIM.length,
    // The facets (coreFacets): their cell in units, the share of cells that hold one, their size against the cell,
    // least and most, how far each is tilted and how far it rocks, how much the ball's own curve turns them, which
    // way a face has to look to flash and how near it has to come, how much its flash differs across its face, and
    // how much brighter than the face round it a flash makes it.
    FACET_CELL: '2.6', FACET_SHARE: '0.25', FACET_SIZE: 'vec2( 0.22, 0.36 )', FACET_TILT: '0.55', FACET_ROCK: '0.12',
    FACET_BALL: '0.35', FACET_TO: 'vec2( -0.1, 0.15 )', FACET_SHARP: '0.11',
    FACET_SIDE: '0.1', FACET_FLASH: 'vec3( 1.3, 1.3, 1.36 )',
    // The speckle: the largest grain's cell in units, how many sizes, each half the last, how much weaker each finer
    // one is, over how many of its own cells a pixel has to be for it to show, and how far the sizes kept may be
    // turned up to stand in for those let go. How far a grain strays in its cell, its radius against the cell, least
    // and most, how its brightness is spread (higher, fewer bright grains), how bright a grain is at the least, and
    // the mean of all that over the face, which is taken back off so the face keeps its light: so the ground between
    // the grains is a little under the face's mean and every grain stands above it. How fast it churns.
    GRAIN_CELL: '2.2',
    // Over which widths of a pixel, as shares of the coarsest grain's cell, that size comes on.
    GRAIN_COARSE: 'vec2( 0.3, 0.5 )',
    GRAIN_SIZES: 4,
    GRAIN_FALL: '0.95',
    GRAIN_SEEN: '1.3',
    GRAIN_BACK: '1.8',
    SPECK_JITTER: '0.9',
    SPECK_SIZE: 'vec2( 0.45, 0.7 )',
    SPECK_POW: '1.5',
    // How much hotter a grain is at its middle than on average, and dimmer at its edge, and over what share of its
    // radius its edge is soft.
    SPECK_GLOW: '0.6', SPECK_SOFT: '1.0',
    SPECK_GROUND: '0.0',
    SPECK_MEAN: '0.075',
    GRAIN_CHURN: '0.02',
    // How much the grain is read as on a disc facing the eye and not on the sphere.
    GRAIN_FLAT: '0.35',
    // Depth: how much of the body a ray straight in sees through the surface, as an optical depth, and the body's and
    // the surface's light against each other.
    DEPTH_TAU: '0.45',
    DEPTH_BODY: 'vec3( 1.0, 1.03, 1.07 )',
    DEPTH_SKIN: 'vec3( 0.99, 0.97, 0.94 )',
    // From grain to steps of the grain's light, for brightness and for warmth, and how much of both the band loses.
    GRAIN_GAIN: '5.0',
    GRAIN_FAR: '0.8',
    GRAIN_WARM: '0.8',
    GRAIN_BAND: '0.8',
    // A sphere: how much its light falls toward the limb, from which share of the radius, how that goes, and over
    // which shares it gives way to the band, and how much the whole face is lifted to keep its mean.
    LIMB: '0.0',
    LIMB_FROM: '0.4',
    LIMB_POW: '1.4',
    LIMB_TO: 'vec2( 0.88, 0.95 )',
    FACE_GAIN: '1.035',
    // The mottle under the fizz: its size in units, how much lighter or darker at most, as a share, how fast it churns.
    MOTTLE: 'vec3( 2.4, 0.11, 0.05 )',
    // The drift: how much brighter it makes the face at most, as a share, over which of its values it comes on and
    // its mean over the face, which the ground is lowered by, its two sizes in units, how fast each flows, in its own
    // sizes a second, and its tint: brighter, it is a little paler, as a grain is.
    DRIFT_LIGHT: '0.12', DRIFT_ON: 'vec3( -0.15, 0.65, 0.25 )', DRIFT_SIZE: 'vec2( 55.0, 30.0 )', DRIFT_FLOW: 'vec2( 0.06, 0.09 )',
    DRIFT_TINT: 'vec3( 1.0, 1.0, 1.08 )',
  };

  const ballU = { ...rootU, uEye: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Matrix3() } };
  const ballM = new THREE.ShaderMaterial({
    name: 'world-core',
    uniforms: ballU,
    vertexShader: BALL_VERT,
    fragmentShader: BALL_FRAG,
    transparent: true,
    depthTest: !over,
    defines: {
      ...rootDefines,
      // The band is read over at least this many units, a pixel's width at the page's size on a plain screen. A sharper
      // screen resolves its dip, which a plain one fills in with the line beside it: there it is lifted by this much,
      // over these shares of the radius, so it shows as the picture has it.
      BAND_PX: '1.0',
      BAND_LIFT: '0.07',
      BAND_AT: 'vec4( 0.9, 0.93, 0.975, 0.99 )',
      // The grain gathering over the foot before the stream sets off (BEAD), and the hot it runs to, as shares.
      BEAD_LIGHT: f(BEAD.light), BEAD_SIZE: v2(BEAD.size), BEAD_CELL: f(BEAD.cell), BEAD_FLOW: f(BEAD.flow), BEAD_BEAT: v2(BEAD.beat),
      BEAD_HOT: 'vec3( 1.45, 0.62, 0.07 )',
      // Its hottest part: how much hotter, where, as shares of the radius, and how wide.
      HOT: '0.04',
      HOT_AT: 'vec2( -0.28, 0.3 )',
      HOT_R: '0.6',
    },
  });
  const ballG = new THREE.SphereGeometry(R * 1.03, rings * 2, rings);
  const ball = new THREE.Mesh(ballG, ballM);
  ball.position.copy(at);
  ball.renderOrder = over ? 20 : 1;

  // The root under the ball, on the plane through its middle that faces the eye. Its top is well inside the ball,
  // which draws over it there.
  const rootG = new THREE.PlaneGeometry(2 * NECK.wide, NECK.plane + 2 * NECK.up, 1, 1).translate(0, -R - (NECK.plane - 2 * NECK.up) / 2, 0);
  const rootM = new THREE.ShaderMaterial({
    name: 'world-core-root',
    uniforms: rootU,
    defines: rootDefines,
    vertexShader: ROOT_VERT,
    fragmentShader: ROOT_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: !over,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const root = new THREE.Mesh(rootG, rootM);
  root.position.copy(at);
  root.renderOrder = over ? 19 : 0;

  // The stream's own shards riding the beam: one geometry and one program, drawn before the beam, which they ride
  // behind and beside.
  const riderG = riderGeometry(ctx.handheld || ctx.tier === 'low' ? RIDE.rides.lean : RIDE.rides.full, 11);
  const v2r = (a: readonly number[]) => `vec2( ${f(a[0])}, ${f(a[1])} )`;
  const riderM = new THREE.ShaderMaterial({
    name: 'world-core-riders',
    uniforms: { ...rootU, uCopper: { value: lin('copper') }, uCopperLight: { value: lin('copper-light') } },
    defines: {
      ...rootDefines,
      RIDE_FROM: `vec3( ${RIDE.from.map(f).join(', ')} )`, RIDE_RUN: v2r(RIDE.run), RIDE_TIME: v2r(RIDE.time), RIDE_SIZE: v2r(RIDE.size),
      RIDE_OUT: v2r(RIDE.out), RIDE_TURN: v2r(RIDE.turn), RIDE_SPIN: v2r(RIDE.spin), RIDE_PAST: f(RIDE.past),
      // How strongly the beam beside them and the ball over them light them, how much of the ball a solid face
      // mirrors (more, and they read as beige paper), and how bright their edges burn.
      RIDE_BEAM: '1.2', RIDE_BALL: '0.8', RIDE_SKY: '0.35', RIDE_EDGE: '1.3',
    },
    vertexShader: RIDER_VERT,
    fragmentShader: RIDER_FRAG,
    transparent: true,
    depthTest: !over,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const riders = new THREE.Mesh(riderG, riderM);
  riders.position.copy(at);
  riders.renderOrder = over ? 18 : -1;
  group.add(riders);

  for (const m of [ball, root, riders]) { m.castShadow = m.receiveShadow = false; m.frustumCulled = false; }
  const eye = new THREE.Vector3();
  ball.onBeforeRender = (_r, _s, camera) => { ballU.uEye.value.copy(ball.worldToLocal(eye.copy(camera.position))); };
  group.add(root, ball);

  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  let wide = -1;

  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - NECK.held / 2, CORE.at[2]], r: R + NECK.held / 2 + 20 },
    update(s) {
      rootU.uTime.value = s.t;
      rootU.uLevel.value = s.core;
      // The page's stream and its units follow the screen's width.
      if (innerWidth !== wide) {
        wide = innerWidth;
        const k = rootScale(SOURCE, strands);
        rootU.uRootScale.value.set(k.across, k.along, k.heart);
      }
      const state = rootU.uRootState.value, on = held ? 1 : s.stream.on;
      // Held on in the lab, the beam is as it is on the page with the page's own stream left out below. The page
      // tells how far its leading end has run in the board's units, which are the host's.
      const reach = held ? NECK.held : lab ? 0 : s.stream.long / host.host;
      state.set(on, Math.max(0, reach), held || lab ? 0 : 1, held ? 60 : s.stream.since);
      rootU.uTurn.value.setFromMatrix4(m4.makeRotationFromQuaternion(q.setFromAxisAngle(TURN.axis, (s.t * TURN.rate) % (2 * Math.PI))));
      ballU.uDeep.value.setFromMatrix4(m4.makeRotationFromQuaternion(q.setFromAxisAngle(DEEP.axis, (s.t * DEEP.rate) % (2 * Math.PI))));
    return true;
    },
    dispose() { for (const d of [ballG, ballM, rootG, rootM, riderG, riderM]) d.dispose(); },
  };
};
