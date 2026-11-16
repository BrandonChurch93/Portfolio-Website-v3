import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { CORE, seeded } from '../layout';
import type { PartFactory, PartState } from '../part';
import { STREAM } from './rest';
import { BALL_FRAG, BALL_VERT, GLASS_FRAG, NECK_FRAG, NECK_VERT, SHARD_VERT, SOLID_FRAG } from './core/shaders';
import { frameOf, shardGeometry, type Moon } from './core/shards';

// The core: a ball of the stream's light hanging free in the hollow, as picture 9 has it. Pale gold over its face
// with a fine, even, luminous grain, warming to deep orange in a band just inside its hard edge and a thin brighter
// line of orange gold at the edge itself, and a neck at its foot, a column of light brightest down its middle, that
// narrows into the stream. It gives light of its own, casts no shadow and takes none, and draws nothing outside itself.

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
// The neck across its width, 0 down its middle and 1 at its sides. Picture 9's spine is paler than the palette
// allows, so it is the palette's pale, the most there is. Its sides fall off from it as the picture's do, keeping
// their green and losing blue, so they go to gold and orange gold and not to peach.
const NECK_INK: Stops = [
  [0, [5.095, 3.911, 2.711]], // (254, 226, 193)
  [0.35, [5.095, 3.911, 2.458]], // (254, 226, 188)
  [0.55, [5.095, 3.786, 1.979]], // (254, 224, 178)
  [0.72, [5.095, 3.6, 1.406]], // (254, 221, 165)
  [0.86, [2.854, 1.888, 0.647]], // (253, 214, 147)
  [0.95, [1.509, 0.925, 0.282]], // (250, 203, 125)
  [1, [1.11, 0.629, 0.176]], // (246, 192, 110)
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
const TURN = { axis: new THREE.Vector3(0.28, 1, 0.34).normalize(), rate: 0.0075 };

// The neck, measured on picture 9 down from the ball's foot, in units: half as wide as the stream's line, plus a
// narrow flare gone in about `fall0` and a broad one gone in about `fall1`, both ending exactly at `flat`. It is
// joined to the ball by a smooth union of `fillet` and starts `into` inside the ball, and reaches `long` down.
// Alone it is a drop about to fall: over `thin` it narrows to a thread, `thread` of its width, and over `fade` it
// fades out, with nothing cut off. Once the page's stream has set off from it, it keeps its width and fades over
// HANDOVER, where the stream grows in: there the neck is the stream's beginning.
const NECK = { flare0: 2.8, fall0: 8, flare1: 9, fall1: 42, flat: 102, fillet: 9, into: 14, thin: [70, 150], thread: 0.13, fade: [92, 150], long: 150 } as const;
// Where the neck hands over to the page's stream, in units down from the ball's foot: the stream is not drawn above
// `from`, and is whole by `to`, over which the neck fades out. How long the neck takes, in seconds, to fill out from
// a thread to its full width when the stream sets off, and to draw back when it goes.
export const HANDOVER = { from: 40, to: 100, fills: 0.45 } as const;

// The shards that turn round the ball: how many, how many of those are glass, how far out from the ball's middle
// their paths are and how far their planes lean from level, as shares of the radius and in degrees, how long one
// takes to go round, in seconds, how fast they turn over, in radians a second, and how long they are, in units.
// Of those, how many are drawn into the neck now and then, after how many turns round, how long the fall takes, how
// long one takes to gather again, how far down the neck it goes, and how near the ball it comes at the foot.
const MOONS = {
  count: 11, glass: 3, out: [1.07, 1.17], lean: [18, 72], round: [70, 125], turns: [0.12, 0.42], long: [4, 9],
  fall: { count: 4, after: [2, 3], takes: 17, gather: 9, sink: 60, foot: 1.06 },
  seed: 61,
} as const;

function moons(): Moon[] {
  const r = seeded(MOONS.seed), span = (a: readonly number[]) => a[0] + (a[1] - a[0]) * r(), out: Moon[] = [];
  for (let i = 0; i < MOONS.count; i++) {
    // One that falls goes round on a plane that leans to the side, so its path comes round in front of the ball.
    const falls = i < MOONS.fall.count, lean = span(MOONS.lean) * (Math.PI / 180), pick = r(), turn = falls ? (pick < 0.5 ? 0 : Math.PI) + (pick * 4 - Math.floor(pick * 4) - 0.5) * 0.7 : pick * Math.PI * 2;
    const plane: [number, number, number] = [Math.sin(lean) * Math.cos(turn), Math.cos(lean), Math.sin(lean) * Math.sin(turn)];
    const T = span(MOONS.round), rate = ((r() < 0.5 ? -1 : 1) * 2 * Math.PI) / T, at = r() * Math.PI * 2;
    const spin: [number, number, number] = [r() - 0.5, r() - 0.5, r() - 0.5];
    const m: Moon = { plane, out: span(MOONS.out) * CORE.r, rate, at, spin, spun: r() * 6.28, turns: span(MOONS.turns) * (r() < 0.5 ? -1 : 1), size: span(MOONS.long) / 2, every: 0, from: 0, hidden: 0, glass: i >= MOONS.count - MOONS.glass };
    // One that falls leaves its path where it is in front of the ball and low, and gathers again behind it.
    if (falls) {
      const [u, v] = frameOf(plane), F = MOONS.fall, along = (w: number[]) => Math.atan2(v[0] * w[0] + v[1] * w[1] + v[2] * w[2], u[0] * w[0] + u[1] * w[1] + u[2] * w[2]);
      const front = along([0, -0.6, 1]), back = along([0, 0, -1]), gone = front + rate * F.takes, wrap = (x: number) => ((x % T) + T) % T;
      m.every = T * (F.after[0] + (i % (F.after[1] - F.after[0] + 1)));
      m.from = -(gone - at) / rate;
      m.hidden = wrap((back - gone) / rate);
    }
    out.push(m);
  }
  return out;
}

// The rings of the ball's shell at each level of cost.
const RINGS = { full: 48, lean: 40 } as const;

// How a shard takes the core's light, as amounts of light: what a face that mirrors the hollow shows and what one
// that mirrors the ball does, how rough its faces are, how much light a face takes from the ball and how much its
// edges and points do, and how bright one is once it is drawn into the neck. And for glass: how much light it holds, how strongly it mirrors the ball and lights its
// edges, and how much it dims what is behind it.
const SHARD = { room: 0.14, heat: 2.6, flash: 1.6, rough: 0.05, diffuse: 0.25, edge: 2.2, held: 0.05, glint: 0.35, glassEdge: 0.45, dim: 0.22 } as const;

const vec = (c: readonly number[]): THREE.Vector3 => new THREE.Vector3(c[0], c[1], c[2]);

export const build: PartFactory = (ctx) => {
  const group = new THREE.Group(), rings = ctx.handheld || ctx.tier === 'low' ? RINGS.lean : RINGS.full;
  const at = new THREE.Vector3(...CORE.at), R = CORE.r, half = STREAM / 2;
  const flat = NECK.flat, ends = [Math.exp(-flat / NECK.fall0), Math.exp(-flat / NECK.fall1)];
  // The neck's half width at a depth under the ball's foot.
  const neckAt = (dy: number): number => {
    const d = Math.min(Math.max(dy, 0), flat);
    return half + (NECK.flare0 * (Math.exp(-d / NECK.fall0) - ends[0])) / (1 - ends[0]) + (NECK.flare1 * (Math.exp(-d / NECK.fall1) - ends[1])) / (1 - ends[1]);
  };
  // Drawn over everything, for laying the ball on picture 9 while the rock round it is still a stand in.
  const over = ctx.query.get('core') === 'over';
  const neckStops = { uNeckAt: { value: NECK_INK.map(([s]) => s) }, uNeck: { value: NECK_INK.map(([, c]) => vec(c)) } };

  const ballU = {
    uEye: { value: new THREE.Vector3() },
    uR: { value: R },
    uTime: { value: 0 },
    uLevel: { value: 1 },
    uTurn: { value: new THREE.Matrix3() },
    uRimAt: { value: RIM.map(([r]) => r) },
    uRim: { value: RIM.map(([, c]) => vec(c)) },
    uBright: { value: vec(GRAIN.bright) },
    uDim: { value: vec(GRAIN.dim) },
    uWarm: { value: vec(GRAIN.warm) },
    uPale: { value: vec(GRAIN.pale) },
    ...neckStops,
    uNeckR: { value: neckAt(0) },
  };
  const ballM = new THREE.ShaderMaterial({
    name: 'world-core',
    uniforms: ballU,
    vertexShader: BALL_VERT,
    fragmentShader: BALL_FRAG,
    transparent: true,
    depthTest: !over,
    defines: {
      RIM_N: RIM.length,
      // How far the neck's light flares out along the rim as it rises into the ball, measured on picture 9.
      FOOT_FLARE: '1660.0',
      NECK_N: NECK_INK.length,
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
      SALT_CELL: '1.1',
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
      FACET_TILT: '0.9',
      FACET_WARM: '0.3',
      SALT_GAIN: '0.85',
      SALT_UNDER: '0.15',
      // How much warmer a dimmer grain is close up, as the enlarged picture's are.
      SALT_WARMS: '0.4',
    },
  });
  const ballG = new THREE.SphereGeometry(R * 1.03, rings * 2, rings);
  const ball = new THREE.Mesh(ballG, ballM);
  ball.position.copy(at);
  ball.renderOrder = over ? 20 : 1;

  // The neck, as a lathe in the ball's own frame. It starts inside the ball, so the two have no seam.
  const profile: THREE.Vector2[] = [], steps = 160, top = -R + NECK.into, bottom = -R - NECK.long;
  for (let i = 0; i <= steps; i++) {
    // Closer together near the ball, where the fillet turns. Under the ball there is nothing to join.
    const y = top + (bottom - top) * (i / steps) ** 1.8;
    const n = neckAt(-R - y), b = y > -R ? Math.sqrt(R * R - y * y) : -Infinity, k = NECK.fillet;
    const h = Math.max(k - Math.abs(n - b), 0) / k;
    profile.push(new THREE.Vector2(Math.max(n, b) + (h * h * k) / 4, y));
  }
  const neckG = new THREE.LatheGeometry(profile, 64);
  const neckU = {
    ...neckStops,
    uLevel: ballU.uLevel,
    uTime: ballU.uTime,
    uEye: ballU.uEye,
    uFoot: { value: -R },
    uRun: { value: 0 },
    uThin: { value: new THREE.Vector3(NECK.thin[0], NECK.thin[1], NECK.thread) },
    uFade: { value: new THREE.Vector4(NECK.fade[0], NECK.fade[1], HANDOVER.from, HANDOVER.to) },
    uEmber: { value: new THREE.Color(hex('ember')) },
    uFlame: { value: new THREE.Color(hex('flame')) },
    uHot: { value: new THREE.Color(hex('hot')) },
    uPale: { value: new THREE.Color(hex('pale')) },
  };
  const neckM = new THREE.ShaderMaterial({
    name: 'world-core-neck',
    uniforms: neckU,
    // How far down the stream's ramp the neck's fade runs from, how bright that light is, and how far into the fade
    // the neck keeps its own light.
    defines: { NECK_N: NECK_INK.length, NECK_RAMP: '1.7', NECK_GLOW: '1.6', NECK_KEEP: '0.55' },
    vertexShader: NECK_VERT,
    fragmentShader: NECK_FRAG,
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    depthTest: !over,
  });
  const neck = new THREE.Mesh(neckG, neckM);
  neck.position.copy(at);
  neck.renderOrder = over ? 19 : 0;

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
    SHARD_GATHER: MOONS.fall.gather.toFixed(2), SHARD_FALL: MOONS.fall.takes.toFixed(2), SHARD_SINK: MOONS.fall.sink.toFixed(2), SHARD_FOOT: MOONS.fall.foot.toFixed(3),
    SHARD_NECK: (STREAM / 2).toFixed(2), SHARD_FLARE: NECK.flare1.toFixed(2), SHARD_FALLS: NECK.fall1.toFixed(2),
    SHARD_ROOM: SHARD.room.toFixed(3), SHARD_HEAT: SHARD.heat.toFixed(3), SHARD_FLASH: SHARD.flash.toFixed(3), SHARD_ROUGH: SHARD.rough.toFixed(3), SHARD_DIFFUSE: SHARD.diffuse.toFixed(3), SHARD_EDGE: SHARD.edge.toFixed(3),
    GLASS_HELD: SHARD.held.toFixed(3), GLASS_GLINT: SHARD.glint.toFixed(3), GLASS_EDGE: SHARD.glassEdge.toFixed(3), GLASS_DIM: SHARD.dim.toFixed(3),
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

  for (const m of [ball, neck, solid, take, give]) { m.castShadow = m.receiveShadow = false; m.frustumCulled = false; }
  const eye = new THREE.Vector3();
  neck.onBeforeRender = ball.onBeforeRender = (_r, _s, camera) => { ballU.uEye.value.copy(ball.worldToLocal(eye.copy(camera.position))); };
  group.add(neck, ball, solid, take, give);

  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  // Whether the page's stream has set off from the neck: the seconds since it did, which the page hands the world
  // (src/hero/stage.ts), and which run back when the stream draws back up. ?neck=stream holds it set off.
  const held = ctx.query.get('neck') === 'stream';

  return {
    group,
    alone: { at: [CORE.at[0], CORE.at[1] - NECK.long / 2, CORE.at[2]], r: R + NECK.long / 2 + 6 },
    update(s) {
      ballU.uTime.value = s.t;
      ballU.uLevel.value = s.core;
      const since = (s as PartState & { stream?: number }).stream ?? -1, k = Math.min(Math.max(since / HANDOVER.fills, 0), 1);
      neckU.uRun.value = held ? 1 : k * k * (3 - 2 * k);
      ballU.uTurn.value.setFromMatrix4(m4.makeRotationFromQuaternion(q.setFromAxisAngle(TURN.axis, (s.t * TURN.rate) % (2 * Math.PI))));
      return true;
    },
    dispose() { for (const d of [ballG, ballM, neckG, neckM, solidG, solidM, glassG, takeM, giveM]) d.dispose(); },
  };
};
