import { HEAD, SHADE, mountObjects, type Objects } from './objects';

// A third derby: what finishes the ends of the rail, now that its knobs are going and it gets no heads. Brandon's
// picture is a fine curtain rod and the pieces on its ends. Three finials on the page's own bar, seen from the side.

export const FINIAL = `
// How high the surface stands here and how far outside the piece this point is, in units of half the bar's
// thickness. a runs outward from the bar's end, c runs across.
float finial(int k, float a, float c, out float sd, out float ink){
  ink = 0.0;
  float y = abs(c), r = 0.0, h = 0.0;
  // A collar where it meets the bar: a ring, a neck, a ring.
  float collar = a < 0.8 ? 1.5 : a < 1.5 ? 1.12 : a < 2.2 ? 1.75 : 0.0;
  if (a >= -0.2 && a < 2.2){
    sd = max(y - collar, -0.2 - a);
    h = 0.62 * sqrt(max(collar * collar - c * c, 0.0));
    ink = smoothstep(0.07, 0.03, abs(a - 0.8)) + smoothstep(0.07, 0.03, abs(a - 1.5));
    return h;
  }
  float t = a - 2.2;
  if (k == 0){
    // A blade: a leaf in outline, two flat faces meeting in a ridge, like a shard.
    float u = t / 8.0;
    float w = u < 0.0 || u > 1.0 ? -1.0 : 3.0 * (u < 0.26 ? sqrt(u / 0.26) : (1.0 - u) / 0.74);
    sd = y - w;
    h = 0.25 + 1.0 * clamp(1.0 - y / max(w, 0.01), 0.0, 1.0);
    ink = smoothstep(0.07, 0.03, abs(u - 0.26)) * step(y, w) * 0.0;
    return h;
  }
  if (k == 1){
    // An orb with a carved band round its middle, and a small point beyond it.
    float d = length(vec2(t - 2.7, c));
    float tip = t > 5.2 && t < 7.0 ? 0.75 * (1.0 - (t - 5.2) / 1.8) : -1.0;
    sd = min(d - 2.7, y - tip);
    if (d < 2.7){
      h = 0.62 * sqrt(max(2.7 * 2.7 - d * d, 0.0));
      float band = smoothstep(0.52, 0.44, abs(t - 2.7));
      h += 0.16 * band + 0.1 * band * step(0.5, fract(c * 1.3 + 0.25));
      ink = smoothstep(0.08, 0.04, abs(abs(t - 2.7) - 0.56));
    } else h = 0.62 * sqrt(max(tip * tip - c * c, 0.0));
    return h;
  }
  // Steps: four square tiers, each smaller than the last, and a cap.
  float tier = floor(t / 1.25);
  r = tier < 4.0 ? 2.9 - tier * 0.62 : (t < 5.7 ? 0.5 : -1.0);
  sd = max(y - r, t - 5.7);
  h = 0.3 + 0.7 * clamp((r - y) * 3.0, 0.0, 1.0);
  ink = smoothstep(0.06, 0.02, abs(fract(t / 1.25) - 0.0)) * step(t, 5.0) * step(0.3, t) + smoothstep(0.07, 0.03, abs(y - (r - 0.45))) * step(tier, 0.5) * step(0.2, fract(t / 1.25)) * step(fract(t / 1.25), 0.8);
  return h;
}
`;

const FINIALS = `${FINIAL}
float scene(int k, vec4 t, vec2 p, out float sd, out float ink, out vec2 along, out float W){
  W = t.w * 0.05;
  vec2 A = t.xy + vec2(t.z * 0.24, t.w * 0.44), B = A + vec2(t.z * 0.52, t.z * 0.52 * 0.085);
  vec2 ev = normalize(B - A), nv = vec2(ev.y, -ev.x);
  float len = length(B - A) / W;
  vec2 q = vec2(dot(p - A, ev), dot(p - A, nv)) / W;
  along = ev;
  float c = q.y;
  if (q.x >= 0.0 && q.x <= len){
    sd = (abs(c) - 1.0) * W;
    float bh = 0.12;
    if (c > 0.2) bh = 0.12 + 0.4 * dome((c - 0.6) / 0.4);
    if (c < -0.56) bh = 0.12 + 0.22 * dome((c + 0.78) / 0.22);
    bh -= 0.05 * smoothstep(0.09, 0.05, abs(c + 0.2));
    ink = smoothstep(0.06, 0.04, abs(c + 0.2)) * step(-0.56, c) * step(c, 0.2);
    return bh * W;
  }
  float a = q.x < 0.0 ? -q.x : q.x - len;
  float h = finial(k, a, c, sd, ink);
  sd *= W;
  along = nv;
  return h * W;
}
`;

const MAIN = `
void main(){
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  int id = -1; vec4 t = vec4(0.0);
  for (int i = 0; i < 3; i++){
    vec4 q = uTiles[i];
    if (p.x >= q.x && p.y >= q.y && p.x < q.x + q.z && p.y < q.y + q.w){ id = i; t = q; }
  }
  vec3 col = uGround;
  if (id < 0){ frag = vec4(col, 1.0); return; }
  vec2 edge = min(p - t.xy, t.xy + t.zw - p);
  float inside = smoothstep(0.0, 4.0, min(edge.x, edge.y));
  float fade = smoothstep(0.0, min(t.z, t.w) * 0.3, min(edge.x, edge.y));
  float sd, ink, W;
  vec2 along;
  float h = scene(id, t, p, sd, ink, along, W);
  float cov = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  vec2 A = t.xy + vec2(t.z * 0.24, t.w * 0.44), B = A + vec2(t.z * 0.52, t.z * 0.52 * 0.085);
  vec2 ev = normalize(B - A), nv = vec2(ev.y, -ev.x), near;
  float d = seg(p, A + nv * W * 1.55, B + nv * W * 1.55, near);
  float glow = glowOf(d, W * 0.42) * uStream;
  vec3 back = 1.0 - (1.0 - col) * (1.0 - heat(min(glow * fade, 1.0)));
  if (cov <= 0.0){ frag = vec4(back, 1.0); return; }
  float e = 0.75 / uDpr, s1, i1, w1;
  vec2 a1;
  vec2 g = vec2(scene(id, t, p + vec2(e, 0.0), s1, i1, a1, w1) - scene(id, t, p - vec2(e, 0.0), s1, i1, a1, w1),
                scene(id, t, p + vec2(0.0, e), s1, i1, a1, w1) - scene(id, t, p - vec2(0.0, e), s1, i1, a1, w1)) / (2.0 * e);
  vec3 N = normalize(vec3(-g, 1.0));
  float hn = h / W;
  float wear = smoothstep(0.25, 0.9, hn);
  float grime = (1.0 - wear) * (0.35 + 0.4 * noise(p * 0.12 + float(id) * 13.0));
  vec3 F0 = mix(uCopperDeep, uCopper, 0.4 + 0.55 * wear) * (1.0 - grime * 0.5);
  float rough = clamp(0.24 + 0.22 * grime - 0.12 * wear, 0.08, 0.9);
  float lit = uStream * 2.4 / (1.0 + pow(length(near - p) / (W * 7.0), 2.0));
  vec3 metal = pow(max(shade(p, N, vec3(along, 0.0), F0, rough, 0.7, vec3(near - p, W * 1.6), lit), 0.0), vec3(1.0 / 2.2));
  metal = mix(metal, INK + metal * 0.05, clamp(ink, 0.0, 1.0) * 0.9);
  frag = vec4(mix(back, min(metal, vec3(1.0)), cov * inside), 1.0);
}`;

export function mountFinials(canvas: HTMLCanvasElement, tiles: HTMLElement[]): Objects {
  return mountObjects(canvas, tiles, `${HEAD}${FINIALS}${SHADE}${MAIN}`);
}
