import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { STREAM as PAGE } from '../../../stream/config';
import { CORE, HOST, SOURCE, drawn } from '../layout';
import type { PartFactory } from '../part';
import { BALL_FRAG, BALL_VERT } from './core/shaders';
import { ROOT_FRAG, ROOT_VERT, rootScale, strandsFor } from './core/root';

// The core: the planet's core and the source of the site's stream at once. A ball of the stream's light hanging free
// in the hollow, as picture 9 has it: pale gold over its face with a fine, even, luminous grain, which close up is
// granules of several sizes told apart by their brightness alone, warming to deep orange in a band just inside its
// hard edge and a thin brighter line of orange gold at the edge itself. Its light falls a little toward its limb and
// is hottest up and to the left, so it is a ball. At its foot is the neck of the beam it shoots out: the ball and the
// neck are one shape, its face pours down into it and its band turns down along its sides, and it draws itself thin,
// cream and then the stream's pale, and over its last stretch the stream's own braid comes up inside it and is let
// out to the page's own ribbon at the cut, where the page takes it up. It gives light of its own, casts no shadow and takes none, and draws no haze or glow outside itself.

type Ink = readonly [number, number, number];
type Stops = readonly (readonly [number, Ink])[];

// Linear light, before the stage's tone curve, each worked back through that curve from the color in brackets. Those
// are picture 9's, measured on its own pixels and averaged round the ball, aimed a little under it where the grain
// lifts the face and where a pixel's width fills in the band's dip, so that a still measures as the picture does.
// The face from its middle out, at shares of the radius. From 0.72 out they are set by measuring a still against the
// picture's own profile, with the band drawn in toward the edge and its dip a deep orange: picture 9's profile is the
// band softened by its small size, and drawn as measured the band read three times as wide, with a brown falloff.
const RIM: Stops = [
  [0, [0.932, 0.743, 0.392]], // (241, 218, 164)
  [0.3, [0.892, 0.717, 0.363]], // (239, 217, 160)
  [0.5, [0.892, 0.71, 0.358]], // (239, 216, 159)
  [0.62, [0.876, 0.689, 0.345]], // (238, 214, 157)
  [0.72, [0.94, 0.688, 0.329]],
  [0.8, [0.93, 0.646, 0.289]],
  [0.86, [0.915, 0.594, 0.242]],
  [0.9, [0.9, 0.52, 0.176]],
  [0.93, [0.86, 0.441, 0.12]],
  [0.95, [0.8, 0.345, 0.055]],
  [0.962, [0.76, 0.275, 0.026]],
  [0.972, [0.8, 0.3, 0.034]],
  [0.981, [0.957, 0.424, 0.075]], // (242, 169, 77)
  [0.989, [1.359, 0.622, 0.103]], // (249, 179, 88)
  [1, [1.359, 0.622, 0.103]],
];
// The grain, as shares of the light where it is, for one step of each kind. Picture 9's grain is light on light: a
// brighter grain is as much brighter in red, green and blue, so it is a little paler, and a dimmer one a little more
// gold. Each grain also has its own warmth apart from its brightness. The curve squeezes the bright end, so a bright
// grain takes more light than a dim one gives up.
const GRAIN = {
  bright: [0.1787, 0.1966, 0.2152],
  dim: [-0.06, -0.064, -0.074],
  warm: [0.0391, 0.0239, 0.0013],
  pale: [-0.0269, -0.0133, 0.0072],
} as const;

// How the face turns: about which axis, and how fast, in radians a second. Slow, as something enormous.
const TURN = { axis: new THREE.Vector3(0.18, 1, 0.22).normalize(), rate: 0.012 } as const;

// The neck of the beam, in units of the world down from the ball's foot unless they say otherwise. Picture 9's
// neck, as the root of a beam shot down out of the ball with force, drawing itself thin to the page's ribbon by the
// cut, where the page's own stream takes it up (STREAM.hero.hand).
//   foot: half its width where it leaves, under the fillet, which falls away over about fall units, as picture 9's
//     does; fillet: how much wider it is at the foot where the band turns down into it, falling away over about the
//     second; meet: how far over the foot the fillet goes on widening inside the ball; rib: the half width it comes down to, the
//     heart of the page's ribbon, round which the ribbon's own fibres spread as they will; cream: over which depths its
//     body turns from the ball's own cream to the stream's pale, paler: how much paler than the ball it is, and grain:
//     how much its cream is gathered along the fibres; band: how much narrower the band is along the neck's sides
//     than round the ball, and how round its turn is, in units; down: by which depth the band is that narrow, and by
//     which the neck's own color has taken over from the ball's face and band; into: how far over the foot
//     the beam's light begins inside the ball
//   quiet: how wide it is before the stream sets off, against after; drop: how far it hangs then at the most; tip: how
//     long its end is, at most, and round: how sharp its point is once it runs
//   bead: before it sets off, how much brighter its end gathers, over how many units, and the shortest it draws back
//     to, as a share of drop; beat: the two slow waves it swells by, in seconds; quietCream: how much of the ball's
//     cream it has then, against after; hush: how bright its body is then, against after
//   a: how bright its body is; rim: over how many units at its edge it goes from nothing to its body, and how that
//     goes; streak: how much of the body is gathered along its fibres
//   braid: over which depths the stream's own fibres come up inside it; body: over which depths its cream body gives
//     way to them; sink: how far the body is turned down under them, so they show in it; heart: how wide the
//     ribbon's heart is inside it against the page's, and over how many units before the cut it comes to the page's; hold: how much of the
//     neck's width the braid fills; fibres: how many it has; thin: how wide each is, in stream units; pitch: how long
//     a turn of it is, in stream units over 2 pi; pace: how fast its turns run down it, in stream units a second, as
//     the page's ribbon's do; loose: how far out the braid loosens toward the cut, in stream units, from how many units
//     before it to how many after
//   fibre: how much of the fibres there is; run: the light that runs down it: how much, how long, how fast
//   up: how far over the foot it reaches inside the ball; give: over which units past the cut its heart gives way to
//     the page's, which comes on over the first few of them
//   surge: the light that runs down it as it sets off: how much, how fast in units a second, how long
//   floor: the faintest light it lets go; energy: how much the page's leading end brightens the ribbon near it
//   over: from which amount to which the neck's light takes the place of the band's inside the ball
//   plane: how far down the plane it is drawn on reaches, and wide: half its width; held: how far it runs held on
const NECK = {
  foot: 13, rib: 2.1, fall: 60, fillet: [4.5, 4], meet: 4, cream: [20, 120], paler: 1.14, grain: 0.08, band: [10, 2.5], down: [2, 14], into: 14,
  quiet: 0.55, drop: 11, tip: 40, round: 0.5,
  bead: [2.2, 3.2, 0.5], beat: [5.3, 8.9], quietCream: 0.25, hush: 0.5,
  a: 1.9, rim: [1.6, 0.6], streak: 0.28,
  braid: [70, 140], body: [100, 175], sink: 0.2, hold: 0.95, heart: [0.45, 50], fibres: 6, thin: [0.22, 0.55], pitch: 8, pace: 21, loose: [7, 40, 34],
  fibre: 1.4, run: [0.06, 26, 2.4], up: 16, give: [7, 41],
  surge: [0.5, 210, 18], floor: 0.008, energy: 1, over: [0.12, 0.9], plane: 300, wide: 64, held: 260,
} as const;

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
  const rootDefines = {
    ROOT_STRANDS: strands, ROOT_ENERGY: f(NECK.energy), ROOT_HUSH: f(NECK.hush), ROOT_FLOOR: f(NECK.floor),
    ROOT_SURGE: f(NECK.surge[0]), ROOT_SURGE_V: f(NECK.surge[1]), ROOT_SURGE_W: f(NECK.surge[2]), ROOT_OVER: v2(NECK.over),
    NECK_FOOT: f(NECK.foot), NECK_CUT: f(PAGE.hero.hand[0] / host.host), NECK_FALL: f(NECK.fall), NECK_RIB: f(NECK.rib), NECK_CREAM: v2(NECK.cream), NECK_PALER: f(NECK.paler), NECK_GRAIN: f(NECK.grain),
    NECK_FILLET: v2(NECK.fillet), NECK_MEET: f(NECK.meet), NECK_QUIET: f(NECK.quiet), NECK_ROUND: f(NECK.round), NECK_DROP: f(NECK.drop), NECK_TIP: f(NECK.tip),
    NECK_BODY: v2(NECK.body), NECK_A: f(NECK.a), NECK_RIM: f(NECK.rim[0]), NECK_RIM_POW: f(NECK.rim[1]), NECK_STREAK: f(NECK.streak),
    NECK_BRAID: v2(NECK.braid), NECK_SINK: f(NECK.sink), NECK_HOLD: f(NECK.hold), NECK_HEART: v2(NECK.heart), NECK_FIBRES: NECK.fibres, NECK_THIN: v2(NECK.thin), NECK_PITCH: f(NECK.pitch), NECK_PACE: f(NECK.pace), NECK_LOOSE: `vec3( ${f(NECK.loose[0])}, ${f(NECK.loose[1])}, ${f(NECK.loose[2])} )`,
    NECK_BEAD: `vec3( ${f(NECK.bead[0])}, ${f(NECK.bead[1])}, ${f(NECK.bead[2])} )`, NECK_BEAT: v2(NECK.beat), NECK_QUIET_CREAM: f(NECK.quietCream),
    RIM_N: RIM.length,
    // The grain: the largest granule in units, how many sizes, each half the last, how much weaker each finer one is,
    // over how many of its own sizes a pixel has to be for it to show, and how far the sizes kept may be turned up to
    // stand in for those let go. How far each granule's point strays and wanders, and how fast the grain churns in
    // place, the granules wander and the broad drift moves.
    GRAIN_CELL: '1.6',
    GRAIN_SIZES: 4,
    GRAIN_FALL: '0.8',
    GRAIN_SEEN: '1.4',
    GRAIN_BACK: '1.6',
    // How much the coarsest size gives way once the finest can be seen, and the next half as much.
    GRAIN_COARSE: '0.5',
    // How much the grain is read as on a disc facing the eye and not on the sphere.
    GRAIN_FLAT: '0.8',
    GRAIN_JITTER: '0.8',
    GRAIN_WANDER: '0.08',
    GRAIN_CHURN: '0.03',
    GRAIN_TURN: '0.05',
    GRAIN_DRIFT: '0.012',
    // A broad drift under the grain, and its size in units.
    MOTTLE: '0.14',
    MOTTLE_WAVE: '34.0',
    // From grain to steps of the grain's light, for brightness and for warmth, and how much of both the band loses.
    GRAIN_GAIN: '1.95',
    GRAIN_WARM: '1.2',
    GRAIN_BAND: '0.8',
    NECK_BAND: f(NECK.band[0]), NECK_TURN: f(NECK.band[1]), NECK_DOWN: v2(NECK.down), NECK_INTO: f(NECK.into),
    // A sphere: how much its light falls toward the limb, from which share of the radius, how that goes, and over
    // which shares it gives way to the band, and how much the whole face is lifted to keep its mean.
    LIMB: '0.05',
    LIMB_FROM: '0.4',
    LIMB_POW: '1.4',
    LIMB_TO: 'vec2( 0.88, 0.95 )',
    FACE_GAIN: '0.985',
    NECK_FIBRE: f(NECK.fibre), NECK_RUN: `vec3( ${f(NECK.run[0])}, ${f(NECK.run[1])}, ${f(NECK.run[2])} )`, NECK_UP: f(NECK.up), NECK_GIVE: v2(NECK.give),
  };

  const ballU = {
    ...rootU,
    uEye: { value: new THREE.Vector3() },
    uLamp: { value: new THREE.Vector2(0.6, 0.6) },
  };
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
      // Over which shares of the radius the grain over the foot comes to be read on the neck's plane.
      NECK_FOOT_UP: 'vec2( 0.8, 0.97 )',
      // Over how many units over the foot the grain gives way where the neck takes over.
      NECK_FOOT_FADE: '8.0',
      // Its hottest part: how much hotter, where, as shares of the radius, and how wide.
      HOT: '0.05',
      HOT_AT: 'vec2( -0.28, 0.3 )',
      HOT_R: '0.6',
      // The grain's facets: how far each is tilted at most, from which size on (0 the largest) they are facets the
      // light picks out and how much of their brightness is that, from which size on they mirror it in points, how
      // squarely they have to face it for that (two cosines) and how bright a point is, and how far in front of the
      // ball the cursor's light is, in radii.
      FACET_TILT: '0.6',
      FACET_FROM: 1,
      FACET_SHARE: '0.85',
      FACET_GLINT_FROM: 2,
      FACET_GLINT: 'vec3( 0.995, 0.999, 2.9 )',
      FACET_LAMP: '3.0',
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

  for (const m of [ball, root]) { m.castShadow = m.receiveShadow = false; m.frustumCulled = false; }
  const eye = new THREE.Vector3();
  ball.onBeforeRender = (_r, _s, camera) => { ballU.uEye.value.copy(ball.worldToLocal(eye.copy(camera.position))); };
  group.add(root, ball);

  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  // Where the ball is drawn in the host, and its radius there, to find the cursor against it.
  const mid = drawn(CORE.at[0], CORE.at[1], CORE.at[2]), rim = drawn(CORE.at[0] + R, CORE.at[1], CORE.at[2])[0] - mid[0];
  let wide = -1;

  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - NECK.held / 2, CORE.at[2]], r: R + NECK.held / 2 + 20 },
    update(s) {
      rootU.uTime.value = s.t;
      rootU.uLevel.value = s.core;
      ballU.uLamp.value.set((s.pointer.x * HOST.wide - HOST.wide / 2 - mid[0]) / rim, -(s.pointer.y * HOST.tall - mid[1]) / rim);
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
    return true;
    },
    dispose() { for (const d of [ballG, ballM, rootG, rootM]) d.dispose(); },
  };
};
