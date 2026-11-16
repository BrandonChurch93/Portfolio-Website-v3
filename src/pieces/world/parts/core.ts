import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { STREAM as PAGE } from '../../../stream/config';
import { CORE, SOURCE, seeded } from '../layout';
import type { PartFactory } from '../part';
import { BALL_FRAG, BALL_VERT, GLASS_FRAG, SHARD_VERT, SOLID_FRAG } from './core/shaders';
import { ROOT_FRAG, ROOT_VERT, rootScale, strandsFor } from './core/root';
import { shardGeometry, type Moon } from './core/shards';

// The core: the planet's core and the source of the site's stream at once. A ball of the stream's light hanging free
// in the hollow, as picture 9 has it: pale gold over its face with a fine, even, luminous grain, which close up is
// granules, as on a star, warming to deep orange in a band just inside its hard edge and a thin brighter line of
// orange gold at the edge itself. Its light falls toward its limb and is hottest up and to the left, so it is a ball.
// At its foot is the neck of the beam it shoots out, broad and cream, drawing itself thin to the page's stream. A few
// pieces of the planet are drawn in round its lower half, from both sides, and carried down the beam. It gives light of its own, casts no shadow and takes none, and
// draws no haze or glow outside itself.

type Ink = readonly [number, number, number];
type Stops = readonly (readonly [number, Ink])[];

// Linear light, before the stage's tone curve, each worked back through that curve from the color in brackets. Those
// are picture 9's, measured on its own pixels and averaged round the ball, aimed a little under it where the grain
// lifts the face and where a pixel's width fills in the band's dip, so that a still measures as the picture does.
// The face from its middle out, at shares of the radius.
const RIM: Stops = [
  [0, [0.932, 0.743, 0.392]], // (241, 218, 164)
  [0.3, [0.892, 0.717, 0.363]], // (239, 217, 160)
  [0.5, [0.892, 0.71, 0.358]], // (239, 216, 159)
  [0.62, [0.876, 0.689, 0.345]], // (238, 214, 157)
  [0.72, [0.892, 0.688, 0.329]], // (239, 213, 153)
  [0.78, [0.876, 0.646, 0.289]], // (238, 208, 145)
  [0.83, [0.861, 0.594, 0.242]], // (237, 201, 134)
  [0.87, [0.848, 0.52, 0.176]], // (236, 190, 116)
  [0.9, [0.825, 0.441, 0.12]], // (234, 177, 97)
  [0.925, [0.768, 0.356, 0.07]], // (227, 161, 75)
  [0.945, [0.687, 0.279, 0.033]], // (216, 144, 51)
  [0.957, [0.672, 0.266, 0.028]], // (214, 141, 47)
  [0.967, [0.745, 0.309, 0.04]], // (224, 151, 56)
  [0.977, [0.957, 0.424, 0.075]], // (242, 169, 77)
  [0.986, [1.359, 0.622, 0.103]], // (249, 179, 88)
  [1, [1.359, 0.622, 0.103]],
];
// The grain, as shares of the light where it is, for one step of each kind. Picture 9's grain is light on light: a
// brighter grain is as much brighter in red, green and blue, so it is a little paler, and a dimmer one a little more
// gold. Each grain also has its own warmth apart from its brightness. The curve squeezes the bright end, so a bright
// grain takes more light than a dim one gives up.
const GRAIN = {
  bright: [0.1787, 0.1966, 0.2152],
  dim: [-0.058, -0.069, -0.0861],
  warm: [0.0391, 0.0239, 0.0013],
  pale: [-0.0269, -0.0133, 0.0072],
} as const;

// How the face turns: about which axis, and how fast, in radians a second. Slow, as something enormous.
const TURN = { axis: new THREE.Vector3(0.18, 1, 0.22).normalize(), rate: 0.012 } as const;

// The neck of the beam, in units of the world down from the ball's foot unless they say otherwise. Picture 9's
// neck, as the root of a beam shot down out of the ball with force, drawing itself thin to the page's ribbon by the
// cut, where the page's own stream takes it up (STREAM.hero.hand).
//   foot: half its width where it leaves, along a taper that goes as pow of what is left of the way to the cut;
//     fillet: how it flares where the band turns down into it, wider by the first over the depth and the second;
//     meet: how far over the foot the fillet has met the ball's outline; rib: the half width it comes down to, the
//     heart of the page's ribbon, round which the ribbon's own fibres spread as they will; cream: over which depths its
//     body turns from the ball's own cream to the stream's pale, paler: how much paler than the ball it is, and grain:
//     how much its cream is gathered along the fibres; band: how much narrower the band is along the neck's sides
//     than round the ball, and how round its turn is, in units; down: by which depth the band is that narrow, and by
//     which the neck's own color has taken over from the ball's face and band
//   quiet: how wide it is before the stream sets off, against after; drop: how far it hangs then; tip: how long its
//     end is, at most, and round: how sharp its point is once it runs
//   a: how bright its body is; rim: over how many units at its edge it goes from nothing to its body, and how that
//     goes; streak: how much of the body is gathered along its fibres; body: over which depths the body gives way to
//     the ribbon alone
//   spread: how wide, in half widths, the fibres lie when they are not spread, and heartOpen: how much the heart opens
//     with them; fibre: how much of them there is; run: the light that runs down it: how much, how long, how fast
//   up: how far over the foot it reaches inside the ball; give: over how many units past the cut it is given over
//   hush: how bright it is before it sets off, against after; surge: the light that runs down it as it sets off: how
//     much, how fast in units a second, how long
//   floor: the faintest light it lets go; energy: how much the page's leading end brightens the ribbon near it
//   over: from which amount to which the neck's light takes the place of the band's inside the ball
//   plane: how far down the plane it is drawn on reaches, and wide: half its width; held: how far it runs held on
const NECK = {
  foot: 19, rib: 4, pow: 1.3, fillet: [80, 12], meet: 6, cream: [60, 190], paler: 1.07, grain: 0.08, band: [10, 2.5], down: [6, 40],
  quiet: 0.55, drop: 8, tip: 40, round: 0.5,
  a: 1.9, rim: [1.6, 0.6], streak: 0.28, body: [150, 212],
  spread: 22, heartOpen: 0.5, fibre: 1, run: [0.06, 26, 2.4], up: 16, give: 6,
  hush: 0.85, surge: [0.5, 210, 18], floor: 0.008, energy: 1, over: [0.12, 0.9], plane: 300, wide: 64, held: 262,
} as const;

// The pieces of the planet the beam draws in: how many, how many of those are glass, how long a coming of each
// takes, in seconds, how long of that it is growing in out of the dark, how long the beam takes to carry it down and
// how far, how long it rests unseen. Where each comes from: how far round from straight down, in degrees, how far
// out from the ball's middle and how far toward the eye, as shares of the radius. Where it is taken by the beam: how
// far round, how far out and toward the eye. How long they are, in units, from the least to the greatest, which are
// handed out evenly so that no two are near one size, and how fast they turn over. Each comes from the other side
// of the ball from the time before, and the first of them come from both sides.
const MOONS = {
  count: 7, glass: 1, period: [24, 40], gather: 3, drop: 3.6, sink: 150, rest: 4,
  from: [24, 78], out: [1.3, 1.8], toward: [0.05, 0.6], foot: [9, 1.08, 0.25],
  long: [7, 22], turn: [0.08, 0.22],
  seed: 61,
} as const;

function moons(): Moon[] {
  const r = seeded(MOONS.seed), span = (a: readonly number[]) => a[0] + (a[1] - a[0]) * r(), out: Moon[] = [];
  const sizes = Array.from({ length: MOONS.count }, (_, i) => MOONS.long[0] + ((MOONS.long[1] - MOONS.long[0]) * ((i * 3) % MOONS.count)) / (MOONS.count - 1));
  for (let i = 0; i < MOONS.count; i++) {
    const period = span(MOONS.period);
    out.push({ period, start: period * ((i + 0.37 * r()) / MOONS.count), size: sizes[i] / 2, seed: i, axis: [r() - 0.5, r() - 0.5, r() - 0.5], rate: span(MOONS.turn) * (r() < 0.5 ? -1 : 1), glass: i >= MOONS.count - MOONS.glass });
  }
  return out;
}

// The rings of the ball's shell at each level of cost.
const RINGS = { full: 48, lean: 40 } as const;

// How a shard takes the core's light, as amounts of light: what a face shows that mirrors the night outside the
// hollow, the hollow's lit walls, or the ball sharp and soft, how rough its faces are, how much light a face turned
// to the ball takes, how near the ball it has to be for all of that, how bright its edges are and its points, and
// how much light the beam gives one on it and how far that reaches. And for glass: how much light it holds, how strongly it mirrors the ball and lights its edges, and how much it
// dims what is behind it.
const SHARD = { room: 0.02, wall: 0.06, flash: 4, sheen: 0.1, rough: 0.06, diffuse: 0.05, near: 2.5, edge: 3, tip: 0.3, beam: 1.6, beamW: 10, held: 0.12, glint: 0.5, glassEdge: 0.9, dim: 0.22 } as const;

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
    NECK_FOOT: f(NECK.foot), NECK_CUT: f(PAGE.hero.hand[0] / host.host), NECK_POW: f(NECK.pow), NECK_RIB: f(NECK.rib), NECK_CREAM: v2(NECK.cream), NECK_PALER: f(NECK.paler), NECK_GRAIN: f(NECK.grain),
    NECK_FILLET: v2(NECK.fillet), NECK_MEET: f(NECK.meet), NECK_QUIET: f(NECK.quiet), NECK_ROUND: f(NECK.round), NECK_DROP: f(NECK.drop), NECK_TIP: f(NECK.tip),
    NECK_BODY: v2(NECK.body), NECK_A: f(NECK.a), NECK_RIM: f(NECK.rim[0]), NECK_RIM_POW: f(NECK.rim[1]), NECK_STREAK: f(NECK.streak),
    NECK_SPREAD: f(NECK.spread), NECK_HEART_OPEN: f(NECK.heartOpen),
    RIM_N: RIM.length,
    // The grain: the largest granule in units, how many sizes, each half the last, how much weaker each finer one is,
    // over how many of its own sizes a pixel has to be for it to show, and how far the sizes kept may be turned up to
    // stand in for those let go. How far each granule's point strays and wanders, and how fast the grain churns in
    // place, the granules wander and the broad drift moves.
    GRAIN_CELL: '1.6',
    GRAIN_SIZES: 4,
    GRAIN_FALL: '0.8',
    GRAIN_SEEN: '1.2',
    GRAIN_BACK: '1.6',
    GRAIN_JITTER: '0.8',
    GRAIN_WANDER: '0.08',
    GRAIN_CHURN: '0.03',
    GRAIN_TURN: '0.05',
    GRAIN_DRIFT: '0.012',
    // A broad drift under the grain, and its size in units.
    MOTTLE: '0.14',
    MOTTLE_WAVE: '34.0',
    // From grain to steps of the grain's light, for brightness and for warmth, and how much of both the band loses.
    GRAIN_GAIN: '1.6',
    GRAIN_WARM: '1.2',
    GRAIN_BAND: '0.8',
    NECK_BAND: f(NECK.band[0]), NECK_TURN: f(NECK.band[1]), NECK_DOWN: v2(NECK.down),
    // A sphere: how much its light falls toward the limb, from which share of the radius, how that goes, and over
    // which shares it gives way to the band, and how much the whole face is lifted to keep its mean.
    LIMB: '0.16',
    LIMB_FROM: '0.4',
    LIMB_POW: '1.4',
    LIMB_TO: 'vec2( 0.84, 0.93 )',
    FACE_GAIN: '1.03',
    NECK_FIBRE: f(NECK.fibre), NECK_RUN: `vec3( ${f(NECK.run[0])}, ${f(NECK.run[1])}, ${f(NECK.run[2])} )`, NECK_UP: f(NECK.up), NECK_GIVE: f(NECK.give),
  };

  const ballU = {
    ...rootU,
    uEye: { value: new THREE.Vector3() },
    uLevel: { value: 1 },
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
      BAND_AT: 'vec4( 0.86, 0.9, 0.965, 0.985 )',
      // Over which shares of the radius the grain over the foot comes to be read on the neck's plane.
      NECK_FOOT_UP: 'vec2( 0.8, 0.97 )',
      // Its hottest part: how much hotter, where, as shares of the radius, and how wide.
      HOT: '0.07',
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

  // What glass dims what is behind it toward: the ball's own color, twice over, so it takes most from the blue.
  const tint = vec(RIM[0][1]).divideScalar(RIM[0][1][0]);
  const shardU = {
    uTime: ballU.uTime, uLevel: ballU.uLevel, uEye: ballU.uEye, uR: ballU.uR,
    uBall: { value: vec(RIM[0][1]) },
    uCopper: { value: new THREE.Color(hex('copper')) },
    uCopperLight: { value: new THREE.Color(hex('copper-light')) },
    uHot: { value: new THREE.Color(hex('hot')) },
    uTint: { value: tint.clone().multiply(tint) },
  };
  const shardDefines = {
    SHARD_GATHER: f(MOONS.gather), SHARD_DROP: f(MOONS.drop), SHARD_SINK: f(MOONS.sink), SHARD_REST: f(MOONS.rest),
    SHARD_FROM: `vec2( ${f(MOONS.from[0])}, ${f(MOONS.from[1])} )`, SHARD_OUT: `vec2( ${f(MOONS.out[0])}, ${f(MOONS.out[1])} )`, SHARD_TOWARD: `vec2( ${f(MOONS.toward[0])}, ${f(MOONS.toward[1])} )`,
    SHARD_FOOT: `vec3( ${f(MOONS.foot[0])}, ${f(MOONS.foot[1])}, ${f(MOONS.foot[2])} )`,
    SHARD_ROOM: f(SHARD.room), SHARD_WALL: f(SHARD.wall), SHARD_FLASH: f(SHARD.flash), SHARD_ROUGH: f(SHARD.rough), SHARD_DIFFUSE: f(SHARD.diffuse), SHARD_SHEEN: f(SHARD.sheen), SHARD_NEAR: f(SHARD.near), SHARD_EDGE: f(SHARD.edge), SHARD_TIP: f(SHARD.tip),
    SHARD_BEAM: f(SHARD.beam), SHARD_BEAM_W: f(SHARD.beamW),
    GLASS_HELD: f(SHARD.held), GLASS_GLINT: f(SHARD.glint), GLASS_EDGE: f(SHARD.glassEdge), GLASS_DIM: f(SHARD.dim),
  };
  const all = moons();
  const solidG = shardGeometry(all.filter((m) => !m.glass), MOONS.seed), glassG = shardGeometry(all.filter((m) => m.glass), MOONS.seed + 1);
  const solidM = new THREE.ShaderMaterial({ name: 'world-core-shard', uniforms: shardU, defines: shardDefines, vertexShader: SHARD_VERT, fragmentShader: SOLID_FRAG });
  // Glass is drawn twice from one program: first what it takes from behind it, then what it gives.
  const glassOf = (give: boolean) => new THREE.ShaderMaterial({
    name: 'world-core-glass', uniforms: { ...shardU, uGive: { value: give ? 1 : 0 } }, defines: shardDefines, vertexShader: SHARD_VERT, fragmentShader: GLASS_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending,
    blendSrc: give ? THREE.OneFactor : THREE.ZeroFactor, blendDst: give ? THREE.OneFactor : THREE.SrcColorFactor,
  });
  const takeM = glassOf(false), giveM = glassOf(true);
  const solid = new THREE.Mesh(solidG, solidM), take = new THREE.Mesh(glassG, takeM), give = new THREE.Mesh(glassG, giveM);
  for (const m of [solid, take, give]) m.position.copy(at);
  take.renderOrder = 2;
  give.renderOrder = 3;

  for (const m of [ball, root, solid, take, give]) { m.castShadow = m.receiveShadow = false; m.frustumCulled = false; }
  const eye = new THREE.Vector3();
  ball.onBeforeRender = (_r, _s, camera) => { ballU.uEye.value.copy(ball.worldToLocal(eye.copy(camera.position))); };
  group.add(root, ball, solid, take, give);

  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  let wide = -1;

  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - NECK.held / 2, CORE.at[2]], r: R + NECK.held / 2 + 20 },
    update(s) {
      rootU.uTime.value = s.t;
      ballU.uLevel.value = s.core;
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
    dispose() { for (const d of [ballG, ballM, rootG, rootM, solidG, solidM, glassG, takeM, giveM]) d.dispose(); },
  };
};
