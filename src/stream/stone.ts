// The sun stone: a carved disc of the buttons' copper that stands where the stream is turned in. A face at its
// center inside a raised ring, then a ring of twenty glyphs, then a ring of sixteen plates, with four great rays
// across both rings at the quarters and four lesser ones between them, and a rim.
//
// It is cut as real stones of this kind are: in a few flat levels with upright walls between them, so every figure
// has a flat top and a cut edge, and the shadows gather in the channels. It is carved once, into two pictures (STONE
// below), and lit from those every frame (stoneFrag in shaders.ts). Carved at many times the size it is drawn at,
// it stays sharp at any size and never crawls as the page moves.
//
// What it borrows from: the Aztec sun stone in the Museo Nacional de Antropologia, Mexico City. Nothing on it is
// copied. The glyphs are abstract marks.

// How big the two pictures are, and how much of each is the stone: its radius is this share of half the picture.
export const STONE = { size: 1024, fill: 0.96 };
// The most the stone stands, for storing a height in eight bits.
export const STONE_TALL = 0.2;

// Heights are in radii of the stone.
const CARVE = `
const float TAU = 6.2831853;
// The floors and tops the stone is cut in, low to high, and how wide a wall between two of them is.
const float FLOOR = 0.012, GROUND = 0.034, RAISED = 0.06, HIGH = 0.086, WALL = 0.0045;
float sat(float x){ return clamp(x, 0.0, 1.0); }
float sq(float x){ return x * x; }
float bell(float x){ return exp(-x * x); }
// 1 inside an outline, where d is below nothing, across one wall.
float cut(float d){ return smoothstep(WALL, -WALL, d); }
float cut(float d, float wall){ return smoothstep(wall, -wall, d); }
float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float almond(vec2 p, float w, float h){ float rr = (w * w + h * h) / (2.0 * h), d = rr - h; return max(length(p - vec2(0.0, d)) - rr, length(p + vec2(0.0, d)) - rr); }
// A blade, the shape of the rail's finials: p.y runs along it from its root. Widest a part of the way along, then a
// long taper to its point.
float blade(vec2 p, float len, float wide, float at){
  float t = p.y / len;
  return abs(p.x) - (t <= 0.0 || t >= 1.0 ? -0.02 : wide * (t < at ? sqrt(t / at) : (1.0 - t) / (1.0 - at)));
}
// The nearest of n places round the stone: how far round from it this point is, as a length, and which place it is.
float around(float th, float n, float rho, out float id){ float a = th * n / TAU; id = floor(a + 0.5); return (a - id) * TAU / n * rho; }

// One of the glyphs, cut into its plate. a runs across the plate and b out from the center, each -1 to 1. There are
// ten, none of them a letter or a number, and they go round in an order that never sets two alike side by side.
float glyph(float a, float b, float id){
  // The second time round each is turned over.
  if (id > 9.5) b = -b;
  float k = mod(id * 7.0, 10.0), x = abs(a), d;
  if (k < 0.5) d = abs(length(vec2(a, b)) - 0.5) - 0.15;
  else if (k < 1.5) d = min(max(abs(b - 0.5) - 0.14, x - 0.64), max(abs(x - 0.46 * step(0.23, x)) - 0.12, abs(b + 0.1) - 0.5));
  else if (k < 2.5) d = min(max(abs(a + 0.4) - 0.15, abs(b) - 0.66), max(abs(b + 0.51) - 0.15, x - 0.56));
  else if (k < 3.5) d = min(abs(almond(vec2(a, b), 0.7, 0.38)) - 0.1, length(vec2(a, b)) - 0.17);
  else if (k < 4.5) d = min(length(vec2(a, b - 0.3)) - 0.27, max(abs(b + 0.46) - 0.14, x - 0.6));
  else if (k < 5.5) d = min(max(abs(b) - 0.13, x - 0.62), min(max(abs(a - 0.49) - 0.13, abs(b - 0.32) - 0.44), max(abs(a + 0.49) - 0.13, abs(b + 0.32) - 0.44)));
  else if (k < 6.5) d = max(length(vec2(a, b)) - 0.64, 0.5 - length(vec2(a, b - 0.3)));
  else if (k < 7.5) d = min(max(abs(b - 0.46) - 0.14, x - 0.62), max(x - 0.14, abs(b + 0.1) - 0.56));
  else if (k < 8.5) d = min(abs(max(x, abs(b)) - 0.52) - 0.12, length(vec2(a, b)) - 0.16);
  else d = max(min(abs(x * 0.9 - b - 0.28), abs(x * 0.9 - b + 0.34)) * 0.74 - 0.11, max(x, abs(b)) - 0.68);
  return d;
}

// The face, in units of its own radius. It is cut as the rest of the stone is, in flat planes with edges: a shelf of
// a brow, lids, a wedge of a nose, lips that frame a slot. open: the eyes and the mouth, which go right through.
float face(vec2 f, out float open){
  float x = abs(f.x), y = f.y;
  // Behind the head: hair, cut in upright strands.
  float h = GROUND + 0.007 * smoothstep(-0.35, 0.35, sin(f.x * 54.0)) * smoothstep(0.42, 0.56, x);
  // The head: a full oval, its skin swelling a little to the middle of the face.
  vec2 hc = vec2(f.x, y - 0.05) / vec2(0.7, 0.89);
  float head = (length(hc) - 1.0) * 0.7;
  float skin = 0.088 + 0.04 * sqrt(sat(1.0 - dot(hc, hc)));
  // The sockets, set back under the brow.
  vec2 e = vec2(x - 0.3, y + 0.2);
  skin -= 0.028 * bell(length(e / vec2(0.27, 0.15)));
  // The cheeks, each with a line cut round under it.
  skin += 0.024 * bell(length(vec2(x - 0.44, y - 0.1) / vec2(0.2, 0.17)));
  skin -= 0.013 * cut(abs(length(vec2(x - 0.37, y + 0.03)) - 0.3) - 0.012) * smoothstep(0.12, 0.2, y) * smoothstep(0.2, 0.3, x);
  // The chin.
  skin += 0.014 * bell(length(vec2(x, y - 0.72) / vec2(0.22, 0.1)));
  // The brow: one heavy shelf across, flat on top, lifting a little toward each temple.
  float brow = max(abs(y + 0.39 + 0.16 * sq(x - 0.22)) - 0.052, x - 0.6);
  skin = mix(skin, 0.137, cut(brow, 0.008));
  // The nose: a wedge of two flat faces that widens and stands higher as it comes down, and a wing to each side.
  float down = sat((y + 0.36) / 0.56), wide = mix(0.04, 0.105, down * down);
  float nose = max(x - wide, max(-0.36 - y, y - 0.19));
  skin = mix(skin, 0.118 + 0.066 * down * sat(1.0 - x / wide), cut(nose, 0.028));
  skin += 0.05 * bell(length(vec2(x - 0.125, y - 0.15) / vec2(0.075, 0.06))) + 0.02 * bell(length(vec2(x, y - 0.17) / vec2(0.1, 0.05)));
  skin -= 0.03 * cut(length(vec2(x - 0.075, y - 0.215) / vec2(1.25, 0.8)) - 0.02);
  // The lids: a heavy upper one that half shuts the eye, and a line under it.
  float eye = almond(e - vec2(0.0, 0.012), 0.165, 0.052);
  float lid = almond(e + vec2(0.0, 0.03), 0.215, 0.085);
  skin = mix(skin, 0.126, cut(lid, 0.007) * step(e.y, 0.0));
  skin += 0.014 * bell((eye - 0.024) / 0.012) * step(0.0, e.y);
  // The lips: a raised frame round a mouth that is a wide slot.
  vec2 m = vec2(f.x, y - 0.47);
  float mouth = almond(m, 0.26, 0.066);
  skin = mix(skin, 0.136, cut(almond(m, 0.325, 0.122), 0.016));
  float inside = cut(head, 0.01);
  h = mix(h, skin, inside);
  // The band across the forehead, with three jewels on it: each a ring with a boss at its middle.
  float band = cut(max(max(-0.83 - y, y + 0.55), head + 0.02));
  h = mix(h, 0.15, band);
  h -= 0.013 * band * (bell((y + 0.585) / 0.011) + bell((y + 0.797) / 0.011));
  float j0 = length(vec2(f.x, y + 0.69)), j1 = length(vec2(x - 0.3, y + 0.675));
  h = mix(h, 0.174, max(cut(j0 - 0.1), cut(j1 - 0.074)));
  h -= 0.022 * max(cut(abs(j0 - 0.055) - 0.014), cut(abs(j1 - 0.041) - 0.0105));
  // An ear spool to each side of the head: a disc with a groove round it and a boss, and a drop hanging from it.
  float ear = length(vec2(x - 0.835, y - 0.06));
  h = mix(h, 0.108, cut(ear - 0.125));
  h -= 0.022 * cut(abs(ear - 0.074) - 0.014);
  h += 0.02 * cut(ear - 0.036);
  h = mix(h, 0.092, cut(box(vec2(x - 0.835, y - 0.3), vec2(0.04, 0.085), 0.02)));
  // Beads under the jaw, two to each side.
  for (int i = 0; i < 2; i++){
    float a = 0.98 + 0.31 * float(i);
    float d = length(vec2(x, y) - 0.9 * vec2(cos(a), sin(a)));
    h = mix(h, 0.085 + 0.04 * sqrt(sat(1.0 - sq(d / 0.052))), cut(d - 0.05));
  }
  // The eyes and the mouth go through.
  open = max(cut(eye), cut(mouth)) * inside;
  // The tongue: a blade, out of the mouth and down over the chin, with a ridge down its middle.
  float lick = cut(blade(vec2(f.x, y - 0.425), 0.43, 0.1, 0.3));
  h = mix(h, 0.152 + 0.05 * sat(1.0 - abs(f.x) / 0.1), lick);
  open *= 1.0 - lick;
  return h;
}

// How high the stone stands at a point, r being 1 at its rim. open: the eyes and the mouth.
float relief(vec2 r, out float open){
  float rho = length(r), th = atan(r.y, r.x), id;
  float h = FLOOR;
  // The rim: a flat land with a line cut round it, a bevel down from it to a low lip, and the lip rounded over to
  // the page. The bevel is what shows the stone has thickness.
  float land = rho > 0.978 ? 0.03 * sqrt(sat(1.0 - sq(sat((rho - 0.988) / 0.012)))) : mix(HIGH, 0.03, smoothstep(0.953, 0.978, rho));
  h = mix(h, land, cut(0.925 - rho));
  h -= 0.012 * bell((rho - 0.941) / 0.0035);
  // The outer ring: sixteen plates, a five spot cut in one and three strokes in the next.
  h = mix(h, GROUND, cut(max(0.705 - rho, rho - 0.905)));
  float s = around(th - TAU / 32.0, 16.0, rho, id);
  float plate = max(abs(s) - (rho * TAU / 32.0 - 0.02), max(0.724 - rho, rho - 0.887));
  h = mix(h, RAISED, cut(plate));
  vec2 q = vec2(s, rho - 0.8055);
  // Four marks go round the outer ring: a ring with a boss, a ladder, and two of the glyphs' own. Spots and strokes
  // were tried, and read as dice and tally marks.
  float kind = mod(id, 4.0), mark;
  if (kind < 0.5) mark = glyph(s / 0.08, q.y / 0.066, 8.0) * 0.07;
  else if (kind < 1.5) mark = glyph(s / 0.08, q.y / 0.066, 15.0) * 0.07;
  else if (kind < 2.5) mark = min(abs(length(q) - 0.047) - 0.011, length(q) - 0.015);
  else mark = min(max(abs(abs(s) - 0.05) - 0.008, abs(q.y) - 0.058), max(abs(mod(q.y + 0.058, 0.0387) - 0.01935) - 0.0065, abs(s) - 0.05));
  h -= 0.024 * cut(mark) * cut(plate + 0.01);
  // A raised line round the stone outside the outer ring and another inside the ring of glyphs, and between the
  // two rings a row of beads.
  h = max(h, (RAISED + 0.012) * max(cut(abs(rho - 0.915) - 0.0065), cut(abs(rho - 0.5105) - 0.006)));
  s = around(th, 60.0, rho, id);
  float bead = length(vec2(s, rho - 0.6945));
  h = max(h, cut(bead - 0.0092, 0.003) * (GROUND + 0.034 * sqrt(sat(1.0 - sq(bead / 0.0095)))));
  // The ring of glyphs: twenty plates, each with its mark.
  h = mix(h, GROUND, cut(max(0.5215 - rho, rho - 0.684)));
  s = around(th, 20.0, rho, id);
  plate = max(abs(s) - (rho * TAU / 40.0 - 0.0125), max(0.5345 - rho, rho - 0.672));
  h = mix(h, RAISED, cut(plate));
  h -= 0.022 * cut(glyph(s / 0.066, (rho - 0.603) / 0.056, id) * 0.06) * cut(plate + 0.008);
  // The rays, over both rings: a great one at each quarter and a lesser one between. Each is two faces meeting in
  // a ridge, with a line cut inside its outline.
  // A great ray's point runs out through the rim's land onto its bevel.
  float a4 = mod(th + TAU / 8.0, TAU / 4.0) - TAU / 8.0, out4 = cos(a4) * rho, off4 = abs(sin(a4)) * rho;
  float w = 0.082 * (0.972 - out4) / 0.472, ray = max(off4 - w, 0.5 - out4);
  h = mix(h, HIGH + 0.008 + 0.034 * sat(1.0 - off4 / max(w, 1e-3)), cut(ray));
  h -= 0.014 * bell((off4 - w + 0.021) / 0.0045) * cut(ray + 0.012) * step(0.03, w);
  float a8 = mod(th, TAU / 4.0) - TAU / 8.0, out8 = cos(a8) * rho, off8 = abs(sin(a8)) * rho;
  w = 0.047 * (0.902 - out8) / 0.192;
  ray = max(off8 - w, 0.71 - out8);
  h = mix(h, HIGH - 0.006 + 0.024 * sat(1.0 - off8 / max(w, 1e-3)), cut(ray));
  // The ring the face sits in, rounded over.
  h = max(h, cut(max(0.456 - rho, rho - 0.4985)) * (HIGH + 0.022 * sqrt(sat(1.0 - sq((rho - 0.477) / 0.0215)))));
  // The face.
  float hf = face(r / 0.456, open), in_ = cut(rho - 0.456);
  open *= in_;
  return mix(h, hf, in_);
}
`;

// The carving. Two pictures: which way the surface faces (x, y), how high it stands, and how shut in it is. Then
// how rubbed it is, how much patina it holds, whether it is an eye or the mouth, and how near one of those it is.
export const STONE_BAKE = `
in vec2 vUv;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
${CARVE}
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec2 r = (vec2(vUv.x, 1.0 - vUv.y) * 2.0 - 1.0) / ${STONE.fill.toFixed(3)};
  float open, skip;
  float h = relief(r, open);
  float e = 0.75 / (${(STONE.size / 2).toFixed(1)} * ${STONE.fill.toFixed(3)});
  vec2 g = vec2(0.0);
  for (int i = 0; i < 4; i++){
    vec2 o = i == 0 ? vec2(e, 0.0) : i == 1 ? vec2(-e, 0.0) : i == 2 ? vec2(0.0, e) : vec2(0.0, -e);
    g += relief(r + o, skip) * o;
  }
  g /= 2.0 * e * e;
  // It was cast, not machined: its surface is faintly uneven, and pitted here and there.
  vec2 fine = vec2(noise(r * 90.0) - 0.5, noise(r * 90.0 + 31.7) - 0.5) * 0.09 + vec2(noise(r * 23.0 + 5.0) - 0.5, noise(r * 23.0 + 17.0) - 0.5) * 0.04;
  float pit = smoothstep(0.8, 0.95, noise(r * 61.0 + 9.0));
  // How shut in a point is: how much of what stands round it stands higher. How proud: how much stands lower. And
  // how near an eye or the mouth.
  float shut = 0.0, proud = 0.0, near = 0.0;
  for (int i = 0; i < 24; i++){
    float a = float(i) * 2.39996, d = i < 12 ? 0.018 : 0.05;
    vec2 o = vec2(cos(a), sin(a)) * d;
    float there, rise = (relief(r + o, there) - h) / d;
    shut += max(rise - 0.1, 0.0);
    proud += max(-rise - 0.1, 0.0);
    near = max(near, there * (i < 12 ? 1.0 : 0.4));
  }
  float ao = 1.0 / (1.0 + 0.55 * shut);
  float rho = length(r);
  // Raised edges and the high points of the face are rubbed bright.
  float wear = sat(proud * 0.16 + 0.3 * smoothstep(0.1, 0.17, h)) * (1.0 - open);
  // Where it is rubbed it is polished smooth.
  vec3 N = normalize(vec3(-g - fine * (1.0 - 0.85 * wear), 1.0));
  // Patina keeps to the channels and the foot of every wall, to the rim where it turns down to the page, and lies
  // in thin clouds over the rest.
  float cloud = noise(r * 5.0 + 3.0) * 0.6 + noise(r * 13.0) * 0.4;
  float grime = sat(1.7 * (1.0 - ao) + 0.55 * smoothstep(0.95, 1.0, rho) + 0.2 * cloud + 0.4 * pit - 0.3 * wear);
  o0 = vec4(N.xy * 0.5 + 0.5, sat(h / ${STONE_TALL.toFixed(2)}), ao);
  o1 = vec4(wear, grime, open, max(near, open));
}`;
