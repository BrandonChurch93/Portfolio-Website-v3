// The rooms the page of all his work is tried in (Study 33, BRIEF.md, Open 33): each is one shader over the whole
// screen, behind the cards, that knows where the cards are, where the cursor's light is and how far the page is
// scrolled. Places are CSS pixels of the screen, y down. Colors are the palette's, and nothing goes to white or grey.

export const MOST = 12;

export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr, uScroll, uTime, uLed;
uniform vec2 uLamp;
uniform vec4 uCards[${MOST}];
uniform float uOn[${MOST}];
uniform int uCount;
uniform float uRadius;
out vec4 frag;
const vec3 GROUND = vec3(0.027, 0.016, 0.012);
const vec3 EMBER = vec3(0.357, 0.184, 0.0);
const vec3 FLAME = vec3(0.969, 0.557, 0.118);
const vec3 HOT = vec3(1.0, 0.722, 0.4);
const vec3 PALE = vec3(1.0, 0.89, 0.76);
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, v = 0.0; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec2 place() { return vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr; }
float dither() { return (hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 7.3) - 1.0) / 255.0; }
`;

// A · The wall. The page is a plastered wall in a dim room. One large soft light rakes it from the upper left, so
// its grain shows, and every card stands off it and throws a soft shadow down and to the right. The cursor's light
// is a second, warm light close to the wall: the cards' shadows swing away from it as it moves.
// uFall is how far down the page the raking light has died away, in pixels, and 0 says it never does: on a page a
// person reads, the wall is lit where the thing to look at stands and is nearly dark behind the words. uLampK is
// how much of the cursor's light the wall takes.
export const WALL = `${HEAD}
uniform float uFall, uLampK;
const vec3 KEY = normalize(vec3(-0.72, -0.5, 0.48));
const float LIFT = 24.0;
const float OVER = 210.0;
float relief(vec2 w) { return fbm(w * 0.011) * 0.62 + fbm(w * 0.07 + 40.0) * 0.26 + noise(w * 0.55) * 0.07; }
void main() {
  vec2 p = place(), w = p + vec2(0.0, uScroll);
  float e = 1.5, h0 = relief(w);
  vec3 n = normalize(vec3((h0 - relief(w + vec2(e, 0.0))) * 5.2, (h0 - relief(w + vec2(0.0, e))) * 5.2, 1.0));
  float key = max(dot(n, KEY), 0.0);
  float reach = 1.0 - smoothstep(0.15, 1.25, length((p - vec2(-0.08, -0.12) * uRes) / uRes.x));
  if (uFall > 0.0) reach *= 1.0 - smoothstep(uFall * 0.3, uFall, w.y);
  vec2 lp = uLamp - p;
  vec3 L = normalize(vec3(lp, OVER));
  float lamp = uLampK * max(dot(n, L), 0.0) / (1.0 + dot(lp, lp) / (380.0 * 380.0));
  float shadeKey = 1.0, shadeLamp = 1.0, near = 1.0;
  vec2 off = -KEY.xy / KEY.z * LIFT;
  float grow = OVER / (OVER - LIFT);
  for (int i = 0; i < ${MOST}; i++) {
    if (i >= uCount) break;
    vec2 c = uCards[i].xy + uCards[i].zw * 0.5, b = uCards[i].zw * 0.5;
    float d = sdBox(p - c, b, uRadius);
    // Where it meets the wall it is darkest, in a narrow line. Its shadow from the raking light lies down and to
    // the right of it, sharper by the card and softer at its far edge. Its shadow from the cursor's light lies
    // away from the cursor and grows with how far off the cursor is.
    // A card that is still arriving throws as much of a shadow as there is of it (uOn).
    near = min(near, mix(1.0, smoothstep(-2.0, 14.0, d), uOn[i]));
    float thrown = sdBox(p - c - off, b, uRadius);
    shadeKey = min(shadeKey, mix(1.0, smoothstep(-14.0, 8.0 + 30.0 * smoothstep(0.0, 60.0, d), thrown), uOn[i]));
    vec2 cl = uLamp + (c - uLamp) * grow;
    shadeLamp = min(shadeLamp, mix(1.0, smoothstep(-8.0, 12.0 + 0.06 * length(c - uLamp), sdBox(p - cl, b * grow, uRadius * grow)), uOn[i]));
  }
  vec3 plaster = vec3(0.30, 0.185, 0.115) * (0.82 + 0.36 * h0);
  vec3 col = GROUND * 0.9;
  col += plaster * vec3(1.0, 0.84, 0.66) * key * reach * 1.05 * mix(0.16, 1.0, shadeKey);
  col += plaster * mix(HOT, PALE, 0.35) * lamp * 0.78 * mix(0.12, 1.0, shadeLamp);
  col *= mix(0.5, 1.0, near);
  // A little haze in the key light, and dust in it.
  float beam = reach * smoothstep(0.9, 0.0, abs(dot(p / uRes.x - vec2(0.1, 0.0), vec2(0.62, -0.78)) - 0.02) * 2.4);
  col += EMBER * beam * 0.11 * (0.55 + 0.45 * fbm(p * 0.004 + vec2(uTime * 0.012, 0.0)));
  vec2 g = p / 46.0 + vec2(uTime * 0.012, -uTime * 0.02), id = floor(g);
  vec2 at = fract(g) - 0.5 - (vec2(hash(id), hash(id + 3.1)) - 0.5) * 0.6;
  col += HOT * beam * 0.5 * smoothstep(0.028, 0.0, length(at)) * step(0.72, hash(id + 9.7)) * (0.5 + 0.5 * sin(uTime * 0.9 + hash(id) * 40.0));
  col *= 1.0 - 0.38 * smoothstep(0.35, 1.05, length((p - uRes * 0.5) / uRes));
  frag = vec4(max(col + dither(), 0.0), 1.0);
}`;

// B · The shaft. The room is dark and full of haze, and light comes down through it in shafts from a high window
// at the upper right. Every card stands in that light and throws a shadow down through the haze behind it, and
// dust turns in the shafts. The cursor's light is a small warm glow in the haze.
export const SHAFT = `${HEAD}
const vec2 DOWN = normalize(vec2(-0.46, 0.89));
void main() {
  vec2 p = place();
  vec2 across = vec2(-DOWN.y, DOWN.x);
  float u = dot(p, across), v = dot(p - vec2(uRes.x * 1.05, -uRes.y * 0.1), DOWN);
  // The window's bars: a few shafts of uneven width, which drift a little.
  float bars = 0.0;
  bars += smoothstep(0.52, 0.2, abs(fract(u / 430.0 + 0.13 + 0.02 * sin(uTime * 0.05)) - 0.5));
  bars += 0.6 * smoothstep(0.5, 0.1, abs(fract(u / 173.0 + 0.61) - 0.5));
  bars *= 0.42 + 0.58 * noise(vec2(u / 90.0, 3.7));
  float far = smoothstep(uRes.y * 2.3, 0.0, v) * smoothstep(-120.0, 260.0, v);
  float haze = 0.55 + 0.45 * fbm(vec2(u, v) * 0.0032 + vec2(uTime * 0.01, -uTime * 0.016) + uScroll * 0.0006);
  float shade = 1.0;
  for (int i = 0; i < ${MOST}; i++) {
    if (i >= uCount) break;
    vec2 c = uCards[i].xy + uCards[i].zw * 0.5, b = uCards[i].zw * 0.5, q = p - c;
    float along = dot(q, DOWN), side = abs(dot(q, across)), wide = abs(b.x * across.x) + abs(b.y * across.y);
    float behind = smoothstep(-b.y * 0.6, b.y * 0.9, along);
    float edge = smoothstep(wide + 6.0 + along * 0.05, wide - 14.0 - along * 0.03, side);
    float fade = 1.0 - smoothstep(180.0, 980.0, along);
    shade *= 1.0 - 0.86 * behind * edge * fade * uOn[i];
  }
  float light = bars * far * haze;
  vec3 col = GROUND * 0.8;
  col += vec3(0.56, 0.255, 0.07) * light * 0.36 * shade;
  col += HOT * pow(light, 3.0) * 0.14 * shade;
  // Dust in the shafts, two depths of it.
  for (int k = 0; k < 2; k++) {
    float cell = k == 0 ? 54.0 : 31.0;
    vec2 g = p / cell + vec2(uTime * (0.016 + 0.01 * float(k)), -uTime * 0.03) + float(k) * 19.0, id = floor(g);
    vec2 at = fract(g) - 0.5 - (vec2(hash(id), hash(id + 3.1)) - 0.5) * 0.62;
    float on = step(0.66, hash(id + 9.7)) * (0.45 + 0.55 * sin(uTime * (0.7 + hash(id)) + hash(id) * 40.0));
    col += PALE * light * shade * (k == 0 ? 0.7 : 0.4) * smoothstep(k == 0 ? 0.034 : 0.05, 0.0, length(at)) * on;
  }
  vec2 lp = uLamp - p;
  col += mix(EMBER, FLAME, 0.5) * 0.2 * haze / (1.0 + dot(lp, lp) / (190.0 * 190.0));
  col *= 1.0 - 0.3 * smoothstep(0.4, 1.1, length((p - uRes * 0.5) / uRes));
  frag = vec4(max(col + dither(), 0.0), 1.0);
}`;

// C · The night. The page hangs in the same night as the hero: stars at three depths that pass at three speeds as
// the page is scrolled and lean a little against the cursor, a band of dust across them, pieces of the broken
// world far behind the cards, out of focus and lit from below, and the world's own glow rising from under the
// foot of the screen.
export const NIGHT = `${HEAD}
float stars(vec2 p, float cell, float few) {
  vec2 g = p / cell, id = floor(g), at = fract(g) - 0.5 - (vec2(hash(id), hash(id + 5.3)) - 0.5) * 0.7;
  float big = hash(id + 11.0);
  float r = (0.9 + 1.5 * big * big * big) / cell;
  return step(few, hash(id + 2.9)) * smoothstep(r, r * 0.25, length(at)) * (0.3 + 0.7 * big) * (0.78 + 0.22 * sin(uTime * (0.6 + big) + big * 50.0));
}
float shard(vec2 q, float turn, float size) {
  float c = cos(turn), s = sin(turn);
  q = mat2(c, -s, s, c) * q / size;
  float d = max(max(dot(q, vec2(0.86, 0.5)), dot(q, vec2(-0.92, 0.38))), max(dot(q, vec2(0.12, -0.99)), dot(q, vec2(0.5, 0.86)) - 0.25)) - 0.5;
  return d * size;
}
void main() {
  vec2 p = place(), lean = (uLamp / uRes - 0.5) * uLed;
  vec3 col = GROUND * 0.75;
  vec2 far = p + vec2(0.0, uScroll * 0.12) - lean * 14.0, mid = p + vec2(0.0, uScroll * 0.26) - lean * 30.0, near = p + vec2(0.0, uScroll * 0.44) - lean * 56.0;
  float dust = fbm(far * 0.0016 + 3.0) * smoothstep(0.62, 0.0, abs(dot(far / uRes.x - vec2(0.5, 0.3), normalize(vec2(0.42, 0.9))) - 0.05 * sin(far.x * 0.002)) * 1.9);
  col += vec3(0.2, 0.125, 0.085) * dust * dust * 0.85;
  col += PALE * (stars(far, 19.0, 0.5) * 0.55 + stars(mid + 71.0, 37.0, 0.6) * 0.8 + stars(near + 13.0, 79.0, 0.66) * 1.15) * (0.6 + 0.6 * dust);
  // The world's glow, from under the foot of the screen.
  float glow = smoothstep(1.25, 0.0, length((p - vec2(0.5, 1.28) * uRes) / vec2(uRes.x * 0.9, uRes.y)));
  col += mix(EMBER, FLAME, 0.3) * glow * glow * 0.42;
  // What broke away, far behind the cards: two depths, each piece soft at its edge and lit from below.
  for (int k = 0; k < 2; k++) {
    float cell = k == 0 ? 520.0 : 880.0, speed = k == 0 ? 0.58 : 0.84, soft = k == 0 ? 9.0 : 22.0;
    vec2 w = p + vec2(0.0, uScroll * speed) - lean * (k == 0 ? 80.0 : 150.0) + float(k) * 300.0;
    vec2 id = floor(w / cell), c = (id + 0.5 + (vec2(hash(id + 1.7), hash(id + 8.3)) - 0.5) * 0.6) * cell;
    if (hash(id + 4.4) < 0.62) continue;
    float size = cell * (0.1 + 0.16 * hash(id + 6.1)), d = shard(w - c, hash(id) * 6.28 + uTime * 0.02 * (hash(id + 2.0) - 0.5), size);
    float body = smoothstep(soft, -soft, d);
    float rim = smoothstep(soft * 2.4, 0.0, abs(d)) * smoothstep(-0.2, 0.9, (w.y - c.y) / size);
    col = mix(col, GROUND * (k == 0 ? 0.55 : 0.4), body * (k == 0 ? 0.8 : 0.92));
    col += mix(EMBER, FLAME, 0.35) * rim * (0.16 + 0.5 * glow) * (k == 0 ? 0.55 : 0.8);
  }
  vec2 lp = uLamp - p;
  col += EMBER * 0.1 / (1.0 + dot(lp, lp) / (240.0 * 240.0));
  frag = vec4(max(col + dither(), 0.0), 1.0);
}`;
