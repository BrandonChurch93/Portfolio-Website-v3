import { seeded } from '../../../../world/build';
import { CORE } from '../../layout';

// The core is the stream's own light wound into a knot: strands of the stream's ribbon looping round a kernel too
// bright to look into, at many depths and rates, with the stream's shards circling it in shells, arcs leaping
// between strands, and sparks thrown off it. Below, strands of it gather into one and leave through the source,
// where the page's stream takes over. Everything here is in units, from the planet's middle.

export const KNOT = {
  // How far out the outer strands loop, and how far the knot is drawn down toward the source below it.
  reach: 128,
  draw: 0.3,
  // Loops round the kernel: how many in all, how many of them are wound tight round it, and how many are the wide
  // ribbons the knot is made of. The rest are fine filaments.
  strands: 11,
  tight: 7,
  ribbons: 0,
  // The stream's own line, coiled: strands that pour out of the kernel, wind round the knot and drain into the source.
  // The first few are the stream at full width; the rest are thinner.
  funnels: 7,
  heroes: 4,
  // How far under the source their joined line runs as it fades, so the page's stream, which fades in over about
  // this length from the source, takes it over with no gap.
  below: 44,
  // The kernel: the radius of its fierce middle, how far its sheet reaches, and how bright it is.
  kernel: { r: 5, half: 70, level: 24 },
  arcs: 28,
  sparks: 110,
  motes: 90,
  // The shards: how many ride the ribbons, as the stream's ride its core, how many circle loose in the outer shells,
  // how many ride the strands down into the source, the share that is clear, the nearest and farthest shell, and
  // their sizes, as the stream's are (STREAM.sizes times STREAM.scale).
  shards: { ride: 0, shells: 36, riders: 170, clear: 0.45, near: 150, far: 168, size: [4.5, 16.9] as [number, number] },
} as const;

export const SOURCE_Y = -CORE.r;

export const UNBALANCE = /* glsl */ `
// The stage balances its darks for a warm light (finish in src/world/tone.ts). The stream's light is not balanced,
// so it is undone here: balanced, dim ember and dark copper went olive and khaki.
vec3 unbalance(vec3 c){
  float k = 1.0 - smoothstep(0.3, 0.85, max(c.r, max(c.g, c.b)));
  return c / mix(vec3(1.0), vec3(0.96, 1.21, 1.59), k);
}
`;

// A loop: its radius, how much it bulges in lobes, how many lobes and where, how far it wanders out of its plane,
// in how many waves and where, half the width of its ribbon, the axis its plane is tilted about and by how much, how
// fast that plane turns about the knot's upright, and where it starts.
export interface Strands { s0: Float32Array; s1: Float32Array; s2: Float32Array; s3: Float32Array }
// A gathering strand: where on the knot's underside it starts, round and down, how far out, how many turns it takes
// on its way in, how fast its start turns with the knot, how wide it is, its own number, and how bright.
export interface Funnels { f0: Float32Array; f1: Float32Array }

export function strands(): Strands {
  const r = seeded(2207), n = KNOT.strands;
  const s0 = new Float32Array(n * 4), s1 = new Float32Array(n * 4), s2 = new Float32Array(n * 4), s3 = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    // Wound tight round the kernel, then the ribbons that make the knot, then fine filaments between them.
    const tight = i < KNOT.tight, fine = i >= KNOT.tight + KNOT.ribbons;
    const R = tight ? 11 + 30 * (i / KNOT.tight) + 5 * r() : 100 + (KNOT.reach + 14 - 100) * r();
    const tangle = r() < (tight ? 0.85 : fine ? 0.6 : 0.4) ? 100 * (1 + Math.floor(r() * 3)) + 10 * (1 + Math.floor(r() * 3)) + (1 + Math.floor(r() * 2)) : 0;
    const wide = tight ? 1.4 + 2.0 * r() : fine ? 1.2 + 1.2 * r() : 10 + 7 * r();
    s0.set([R, 0.08 + 0.22 * r(), 2 + Math.floor(r() * 3), r() * 6.283], i * 4);
    s1.set([0.1 + 0.28 * r(), 1 + Math.floor(r() * 3), r() * 6.283, wide], i * 4);
    // Inner loops turn fast, outer ones slowly, and not all the same way.
    const pace = (tight ? 1.3 : 0.3 + 0.5 * Math.pow(58 / R, 1.2)) * (r() < 0.3 ? -1 : 1);
    s2.set([r() * 6.283, Math.acos(1 - 2 * r()), pace, r() * 6.283], i * 4);
    // How fast light runs along it, its own number, how bright it is, and whether it loops round the kernel or
    // winds through the knot's inside as a tangle: the waves it takes across, up and through.
    // Two of the ribbons are the brightest things in the knot after the kernel, and the rest step down from them.
    const rank = i - KNOT.tight;
    const level = tight ? 0.95 + 0.35 * r() : fine ? 0.18 + 0.12 * r() : rank < 2 ? 1.25 : 0.45 + 0.35 * r();
    s3.set([(0.7 + 0.8 * r()) * (r() < 0.5 ? -1 : 1), r(), level, tangle], i * 4);
  }
  return { s0, s1, s2, s3 };
}

// How fast a shard riding each strand is carried along it, in turns of the strand a second, the way light runs on it.
export function strandPace(): number[] {
  const { s0, s3 } = strands();
  return Array.from({ length: KNOT.strands }, (_, i) => (Math.sign(s3[i * 4]) || 1) * Math.min(1.4, 40 / s0[i * 4]));
}

export function funnels(): Funnels {
  const r = seeded(3319), n = KNOT.funnels;
  const f0 = new Float32Array(n * 4), f1 = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const hero = i < KNOT.heroes, trunk = i === 0;
    // Which way it leaves the kernel, round and down from the top, how far out it winds, and how many turns it takes.
    // The first is the trunk: it falls from the kernel nearly straight into the source, one white heart from the
    // kernel to the stream.
    f0.set([(i / n) * 6.283 + r() * 0.6, trunk ? 2.6 : 0.35 + 2.2 * r(), trunk ? 34 : hero ? 100 + 28 * r() : 70 + 50 * r(), trunk ? 0.35 : (hero ? 1.3 : 0.9) + 0.9 * r()], i * 4);
    // How fast the whole of it turns, how wide its ribbon is, its own number, and how bright.
    f1.set([trunk ? 0.5 : 0.34 + 0.14 * r(), trunk ? 15 : hero ? 10 + 6 * r() : 3 + 3 * r(), trunk ? 0.05 : r(), trunk ? 1.25 : hero ? 0.85 + 0.2 * r() : 0.4 + 0.15 * r()], i * 4);
  }
  return { f0, f1 };
}

// The paths, in GLSL, read by everything that moves with the knot: the strands themselves, the arcs between them,
// the sparks thrown off them, and the shards that circle and ride them.
export const PATHS = /* glsl */ `
#define STRANDS ${KNOT.strands}
#define FUNNELS ${KNOT.funnels}
#define REACH ${KNOT.reach.toFixed(1)}
#define SOURCE_Y ${SOURCE_Y.toFixed(1)}
#define BELOW ${KNOT.below.toFixed(1)}
uniform vec4 uS0[STRANDS], uS1[STRANDS], uS2[STRANDS], uS3[STRANDS];
uniform vec4 uF0[FUNNELS], uF1[FUNNELS];
uniform float uT, uCore;
// An integer hash: sin() of a large number is coarse on a graphics card and gave many sparks the same place.
float h1(float n){ uint x = floatBitsToUint(n + 0.123); x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return float(x) * (1.0 / 4294967296.0); }
vec3 turnAbout(vec3 p, vec3 k, float a){ float c = cos(a), s = sin(a); return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c); }
// The knot is drawn down toward the source under it, so its underside narrows into the strands that leave.
vec3 shape(vec3 p){
  float h = clamp(-p.y / REACH, 0.0, 1.0);
  p.xz *= 1.0 - ${KNOT.draw.toFixed(2)} * h * h;
  p.y *= 1.0 + 0.1 * h;
  return p * (1.0 + 0.05 * (uCore - 1.0));
}
vec3 strandAt(int i, float th, float t){
  vec4 a = uS0[i], b = uS1[i], c = uS2[i];
  float w = uS3[i].w;
  vec3 p;
  if (w > 0.5) {
    vec3 n = vec3(floor(w / 100.0), mod(floor(w / 10.0), 10.0), mod(w, 10.0));
    p = a.x * vec3(sin(n.x * th + a.w + 0.11 * t), 0.85 * sin(n.y * th + b.z), sin(n.z * th + a.w * 1.7 - 0.13 * t));
  } else {
    float r = a.x * (1.0 + a.y * sin(a.z * th + a.w + 0.23 * t));
    p = vec3(r * cos(th), a.x * b.x * sin(b.y * th + b.z - 0.19 * t), r * sin(th));
  }
  p = turnAbout(p, vec3(cos(c.x), 0.0, sin(c.x)), c.y);
  p = turnAbout(p, normalize(vec3(0.3 * sin(c.x * 3.0), 1.0, 0.3 * cos(c.x * 2.0))), c.z * t + c.w);
  return shape(p);
}
// u runs from the kernel (0), out and round the knot and down to the source (NECK), and on under it to where its
// light is gone (1). It winds down a sphere that narrows to the source, so it spirals into it.
#define NECK 0.9
vec3 funnelAt(int i, float u, float t){
  vec4 f = uF0[i], g = uF1[i];
  if (u >= NECK) return vec3(0.0, SOURCE_Y - (u - NECK) / (1.0 - NECK) * BELOW, 0.0);
  float k = u / NECK;
  float down = mix(f.y, 3.14159, pow(k, 0.85));
  float R = mix(mix(8.0, f.z, smoothstep(0.0, 0.16, k)), -SOURCE_Y, smoothstep(0.5, 1.0, k));
  // Its turning eases off as it nears the source, so it comes down into it and does not ring round it.
  float a = f.x + f.w * 6.28318 * (1.0 - (1.0 - k) * (1.0 - k)) + g.x * t;
  vec3 p = vec3(R * sin(down) * cos(a), R * cos(down), R * sin(down) * sin(a));
  // High on the knot each is wound about an axis of its own, so the knot is a ball wound every way and not a coil;
  // toward the source they all come true and gather to the one point.
  float tilt = (0.45 + 0.75 * fract(g.z * 7.13)) * (1.0 - smoothstep(0.3, 0.88, k));
  p = turnAbout(p, vec3(cos(g.z * 6.28318 + g.x * t * 0.5), 0.0, sin(g.z * 6.28318 + g.x * t * 0.5)), tilt);
  return mix(shape(p), p, smoothstep(0.5, 1.0, k));
}
`;
