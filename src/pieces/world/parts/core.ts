import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { STREAM as PAGE } from '../../../stream/config';
import { CORE, SOURCE, seeded } from '../layout';
import type { PartFactory } from '../part';
import { BALL_FRAG, BALL_VERT, GLASS_FRAG, SHARD_VERT, SOLID_FRAG } from './core/shaders';
import { ROOT_FRAG, ROOT_VERT, reachOnPage, rootScale, strandsFor } from './core/root';
import { shardGeometry, type Moon } from './core/shards';

// The core: the planet's core and the source of the site's stream at once. A ball of the stream's light hanging free
// in the hollow, as picture 9 has it: pale gold over its face with a fine, even, luminous grain, which close up is
// countless tiny facets, warming to deep orange in a band just inside its hard edge and a thin brighter line of
// orange gold at the edge itself. At its foot is the root of the beam it shoots out, which is the page's stream: the
// same braided ribbon of light, its fibres fanning up into the ball's band. A few pieces of the planet are drawn in
// round its lower half and carried down the beam. It gives light of its own, casts no shadow and takes none, and
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
// The body under the grain turns the other way about a nearer axis, more slowly.
const TURN = { axis: new THREE.Vector3(0.18, 1, 0.22).normalize(), rate: 0.012, deep: new THREE.Vector3(-0.3, 1, 0.1).normalize(), deepRate: -0.007 } as const;

// The root of the beam, in units of the world down from the ball's foot unless they say otherwise.
//   flare0, fall0, flare1, fall1: how far the ribbon is opened at the foot, as two flares gone over those depths, as
//     picture 9's neck flares into the ball
//   heart: how much more than the fibres the heart opens with it, which is the bright gathering at the foot, and
//     heartHug: how far it spreads along the band inside the ball, heartUp: how far over the foot it reaches, and
//     fan: how much brighter the fibres are where they fan up into the band
//   beam: half the ribbon's width, in stream units, and hug: how close to the ball's limb its fibres fan up inside it
//   in: over which shares of the radius the fan comes on inside the ball, and up: how far over the foot it reaches
//   above: how fast it is gone outside the ball close under it, and how much more slowly for each unit lower, and
//     floor: the faintest light it lets go
//   glow: the light that hugs the ribbon on the page, its amount and its width in stream units
//   foot: the band hot where the beam is rooted: how far in from the edge it reaches, how far round each side, in
//     radians, and how far out; and gather, how bright it is before the stream sets off and after
//   quiet: before the stream has set off, over how far below the foot its lip fades and how bright, against the beam
//   over: from which amount to which the root's light takes the place of the band's inside the ball
//   hand: where the page's stream takes over, in the board's units (STREAM.hero.hand), and give: over how much of
//     that the root is given up. The page's route has begun to sway by then and the two lines drew apart
//   surge: as it sets off, the light that runs down it: how much, how fast in units a second, how long
//   long: how far down the plane it is drawn on reaches
//   energy: how much the page's leading end brightens the ribbon near it, as the page does at a middling energy
const ROOT = {
  flare0: 0.45, fall0: 7, flare1: 0.4, fall1: 26, heart: 2.2, heartHug: 0.35, heartUp: 9, fan: 0.8, beam: 15, hug: 0.92, in: [0.8, 0.93], up: 30, above: [1.5, 1.4], floor: 0.008,
  glow: [0.16, 4.5], quiet: 3, foot: [7, 0.36, 1.5], gather: [1.0, 1.35], over: [0.12, 0.9], hush: 0.72, hand: PAGE.hero.hand, give: 0.65, surge: [0.7, 210, 18], long: 130, energy: 1,
} as const;

// The pieces of the planet the beam draws in: how many, how many of those are glass, how long a coming of each
// takes, in seconds, how long of that it is growing in out of the dark, how long the beam takes to carry it down and
// how far, how long it rests unseen. Where each comes from: how far round from straight down, in degrees, how far
// out from the ball's middle and how far toward the eye, as shares of the radius. Where it is taken by the beam: how
// far round, how far out and toward the eye. How long they are, in units, and how fast they turn over.
const MOONS = {
  count: 6, glass: 1, period: [44, 78], gather: 4, drop: 2.6, sink: 95, rest: 6,
  from: [26, 74], out: [1.3, 1.75], toward: [0.05, 0.6], foot: [7, 1.09, 0.2],
  long: [13, 21], turn: [0.08, 0.22],
  seed: 61,
} as const;

function moons(): Moon[] {
  const r = seeded(MOONS.seed), span = (a: readonly number[]) => a[0] + (a[1] - a[0]) * r(), out: Moon[] = [];
  for (let i = 0; i < MOONS.count; i++) {
    const period = span(MOONS.period);
    out.push({ period, start: period * ((i + 0.37 * r()) / MOONS.count), size: span(MOONS.long) / 2, seed: r() * 100, axis: [r() - 0.5, r() - 0.5, r() - 0.5], rate: span(MOONS.turn) * (r() < 0.5 ? -1 : 1), glass: i >= MOONS.count - MOONS.glass });
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
  };
  const f = (n: number) => n.toFixed(4);
  const rootDefines = {
    ROOT_STRANDS: strands, ROOT_ENERGY: f(ROOT.energy), ROOT_BEAM: f(ROOT.beam), ROOT_HUG: f(ROOT.hug),
    ROOT_FLARE0: f(ROOT.flare0), ROOT_FALL0: f(ROOT.fall0), ROOT_FLARE1: f(ROOT.flare1), ROOT_FALL1: f(ROOT.fall1), ROOT_HEART_OPEN: f(ROOT.heart), ROOT_HEART_HUG: f(ROOT.heartHug), ROOT_HEART_UP: f(ROOT.heartUp), ROOT_FAN: f(ROOT.fan),
    ROOT_GLOW: f(ROOT.glow[0]), ROOT_GLOW_W: f(ROOT.glow[1]), ROOT_QUIET: f(ROOT.quiet), ROOT_HUSH: f(ROOT.hush),
    ROOT_HOST: f(host.host), ROOT_HAND0: f(ROOT.hand[0]), ROOT_HAND1: f(ROOT.hand[1]), ROOT_GIVE: f(ROOT.give),
    ROOT_SURGE: f(ROOT.surge[0]), ROOT_SURGE_V: f(ROOT.surge[1]), ROOT_SURGE_W: f(ROOT.surge[2]), ROOT_ABOVE: f(ROOT.above[0]), ROOT_ABOVE_OPEN: f(ROOT.above[1]), ROOT_FLOOR: f(ROOT.floor), ROOT_FOOT: `vec3( ${f(ROOT.foot[0])}, ${f(ROOT.foot[1])}, ${f(ROOT.foot[2])} )`, ROOT_GATHER: `vec2( ${f(ROOT.gather[0])}, ${f(ROOT.gather[1])} )`,
    ROOT_IN: `vec2( ${f(ROOT.in[0])}, ${f(ROOT.in[1])} )`, ROOT_UP: f(ROOT.up), ROOT_OVER: `vec2( ${f(ROOT.over[0])}, ${f(ROOT.over[1])} )`, ROOT_EDGE: f(ROOT.beam * 4),
  };

  const ballU = {
    ...rootU,
    uEye: { value: new THREE.Vector3() },
    uLevel: { value: 1 },
    uTurn: { value: new THREE.Matrix3() },
    uTurnIn: { value: new THREE.Matrix3() },
    uRimAt: { value: RIM.map(([r]) => r) },
    uRim: { value: RIM.map(([, c]) => vec(c)) },
    uBright: { value: vec(GRAIN.bright) },
    uDim: { value: vec(GRAIN.dim) },
    uWarm: { value: vec(GRAIN.warm) },
    uGrainPale: { value: vec(GRAIN.pale) },
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
      RIM_N: RIM.length,
      // The finest grain's wavelength in units, how much shorter each finer one is and how much weaker, and how far
      // the sizes kept may be turned up to stand in for those let go.
      GRAIN_WAVE: '2.4',
      GRAIN_STEP: '0.55',
      GRAIN_FALL: '0.6',
      GRAIN_BACK: '2.2',
      // A middle size under the fine grain and a broad drift under both, each turned down close up.
      GRAIN_MID: '0.3',
      GRAIN_MIDWAVE: '4.5',
      MOTTLE: '0.3',
      MOTTLE_WAVE: '34.0',
      // From noise to steps of the grain's light, for brightness and for warmth, and how much of both the band loses.
      GRAIN_GAIN: '5.2',
      GRAIN_WARM: '4.0',
      GRAIN_BAND: '0.8',
      // How fast the grain churns in place and the broad drift moves, in wavelengths a second.
      GRAIN_CHURN: '0.03',
      GRAIN_DRIFT: '0.012',
      // The grain close up: how much of it there is, its cell in units, each grain's size and how far it strays in
      // cells, how fast each twinkles in turns a second, its strength, and how much of the noise is kept under it.
      SALT: '1.0',
      SALT_CELL: '1.5',
      SALT_TWINKLE: '0.04',
      // How far each facet's point strays from the middle of its cell, as a share of a cell, and how many facets a
      // cell is cut into.
      FACET_JITTER: '0.9',
      FACET_CUTS: 3,
      // A facet's light: how far the few bright ones stand out and how few they are, how much each turns over in
      // time, how much the light runs across one facet, and how much a cell's warmth differs from the next.
      FACET_LIFT: '1.0',
      FACET_SKEW: '1.4',
      FACET_TURN: '0.12',
      FACET_TILT: '0.45',
      FACET_WARM: '0.3',
      SALT_GAIN: '0.85',
      SALT_UNDER: '0.15',
      // How much warmer a dimmer grain is close up, as the enlarged picture's are.
      SALT_WARMS: '0.4',
      // How far a facet leans off the ball, how much of its light that turns toward or from the eye, and its flash:
      // how bright, how tight, and from which way, off the eye's, it comes.
      FACET_LEAN: '0.6',
      FACET_VIEW: '2.4',
      FACET_GLINT: '7.0',
      FACET_SHINE: '70.0',
      GLINT_FROM: 'vec3( -0.45, 0.55, 0.3 )',
      // The body under the grain: how deep, as a share of the radius, the size of its veins in units, how sharp they
      // are and their mean, how much of them shows, and where the skin over them is thin: its size and how thin.
      DEEP: '0.16',
      DEEP_AT: '0.9',
      DEEP_WAVE: '16.0',
      DEEP_SHARP: '5.0',
      DEEP_MEAN: '0.2',
      DEEP_SKIN: '9.0',
      DEEP_THIN: 'vec2( -0.25, 0.45 )',
      // How much more of the body shows close up, where the facets would hide it.
      DEEP_NEAR: '2.5',
    },
  });
  const ballG = new THREE.SphereGeometry(R * 1.03, rings * 2, rings);
  const ball = new THREE.Mesh(ballG, ballM);
  ball.position.copy(at);
  ball.renderOrder = over ? 20 : 1;

  // The root under the ball, on the plane through its middle that faces the eye. Its top is well inside the ball,
  // which draws over it there.
  const rootG = new THREE.PlaneGeometry(2 * ROOT.beam * 4, ROOT.long + ROOT.up, 1, 1).translate(0, -R - (ROOT.long - ROOT.up) / 2, 0);
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
    alone: { at: [CORE.at[0], CORE.at[1] - ROOT.long / 3, CORE.at[2]], r: R + ROOT.long / 3 + 6 },
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
      // Held on in the lab, the beam is as it is on the page with the page's own stream left out below.
      const reach = held || lab ? 4 * ROOT.long : reachOnPage(ctx.renderer.domElement, SOURCE);
      state.set(on, Math.max(0, reach), 1, held ? 60 : s.stream.since);
      ballU.uTurn.value.setFromMatrix4(m4.makeRotationFromQuaternion(q.setFromAxisAngle(TURN.axis, (s.t * TURN.rate) % (2 * Math.PI))));
      ballU.uTurnIn.value.setFromMatrix4(m4.makeRotationFromQuaternion(q.setFromAxisAngle(TURN.deep, (s.t * TURN.deepRate) % (2 * Math.PI))));
      return true;
    },
    dispose() { for (const d of [ballG, ballM, rootG, rootM, solidG, solidM, glassG, takeM, giveM]) d.dispose(); },
  };
};
