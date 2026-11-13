import { STREAM } from '../stream/config';
import { FINIAL } from './finials';
import { STATUES } from './guardians';
import { HEAD, SHADE, mountObjects, type Objects } from './objects';

// The sun stone Brandon picked for the posts, beside the rail with each of the two finials he is choosing between,
// in the proportions they have against each other on the Work page. Tiles 0 and 1 are large. Tiles 2 and 3 are the
// page's size: the stone as wide as the post there, the bar as thick as the rail there.

const PAIR = `
const float STONE = 0.25;   // the stone's radius, against the panel's height
const float BAR = 0.24;     // half the bar's thickness, against the stone's radius
void rail(int id, vec4 t, out vec2 A, out vec2 B, out float W){
  W = id > 1 ? ${STREAM.work.rail.half.toFixed(1)} : t.w * STONE * BAR;
  A = t.xy + vec2(t.z * 0.46, t.w * 0.42);
  B = A + vec2(t.z * 0.32, t.z * 0.32 * 0.085);
}
float pairAt(int id, vec4 t, vec2 p, out float sd, out float ink, out float emit, out vec2 along, out float unit){
  emit = 0.0; ink = 0.0; along = vec2(0.0);
  float R = t.w * STONE;
  vec2 r = (p - (t.xy + vec2(t.z * 0.14, t.w * 0.5))) / R;
  if (dot(r, r) < 1.2){ unit = R; float h = sun(r, sd, ink, emit); sd *= R; return h * R; }
  vec2 A, B; float W;
  rail(id, t, A, B, W);
  unit = W;
  vec2 ev = normalize(B - A), nv = vec2(ev.y, -ev.x);
  float len = length(B - A) / W;
  vec2 q = vec2(dot(p - A, ev), dot(p - A, nv)) / W;
  float c = q.y;
  along = ev;
  if (q.x >= 0.0 && q.x <= len){
    sd = (abs(c) - 1.0) * W;
    float bh = 0.12;
    if (c > 0.2) bh = 0.12 + 0.4 * dome((c - 0.6) / 0.4);
    if (c < -0.56) bh = 0.12 + 0.22 * dome((c + 0.78) / 0.22);
    bh -= 0.05 * smoothstep(0.09, 0.05, abs(c + 0.2));
    ink = smoothstep(0.06, 0.04, abs(c + 0.2)) * step(-0.56, c) * step(c, 0.2);
    return bh * W;
  }
  float h = finial(id % 2 == 0 ? 0 : 2, q.x < 0.0 ? -q.x : q.x - len, c, sd, ink);
  sd *= W;
  along = nv;
  return h * W;
}
`;

const MAIN = `
void main(){
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  int id = -1; vec4 t = vec4(0.0);
  for (int i = 0; i < 4; i++){
    vec4 q = uTiles[i];
    if (p.x >= q.x && p.y >= q.y && p.x < q.x + q.z && p.y < q.y + q.w){ id = i; t = q; }
  }
  vec3 col = uGround;
  if (id < 0){ frag = vec4(col, 1.0); return; }
  vec2 edge = min(p - t.xy, t.xy + t.zw - p);
  float inside = smoothstep(0.0, 4.0, min(edge.x, edge.y));
  float fade = smoothstep(0.0, min(t.z, t.w) * 0.3, min(edge.x, edge.y));
  float sd, ink, emit, unit;
  vec2 along;
  float h = pairAt(id, t, p, sd, ink, emit, along, unit);
  float cov = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  vec2 A, B, near; float W;
  rail(id, t, A, B, W);
  vec2 ev = normalize(B - A), nv = vec2(ev.y, -ev.x);
  float d = seg(p, A + nv * W * 1.55, B + nv * W * 1.55, near);
  float glow = glowOf(d, W * 0.42) * uStream;
  vec3 back = 1.0 - (1.0 - col) * (1.0 - heat(min(glow * fade, 1.0)));
  if (cov <= 0.0){ frag = vec4(back, 1.0); return; }
  float e = 0.75 / uDpr, s1, i1, e1, u1;
  vec2 a1;
  vec2 g = vec2(pairAt(id, t, p + vec2(e, 0.0), s1, i1, e1, a1, u1) - pairAt(id, t, p - vec2(e, 0.0), s1, i1, e1, a1, u1),
                pairAt(id, t, p + vec2(0.0, e), s1, i1, e1, a1, u1) - pairAt(id, t, p - vec2(0.0, e), s1, i1, e1, a1, u1)) / (2.0 * e);
  vec3 N = normalize(vec3(-g, 1.0));
  bool stone = dot(along, along) < 0.5;
  float hn = h / unit;
  float wear = stone ? smoothstep(0.12, 0.3, hn) : smoothstep(0.25, 0.9, hn);
  float grime = (1.0 - wear) * (0.38 + 0.4 * noise(p * 0.11 + float(id) * 13.0));
  vec3 F0 = mix(uCopperDeep, uCopper, 0.4 + 0.55 * wear) * (1.0 - grime * 0.5);
  float rough = clamp(0.26 + 0.22 * grime - 0.13 * wear, 0.08, 0.9);
  float lit = uStream * 2.4 / (1.0 + pow(length(near - p) / (W * 7.0), 2.0));
  vec3 T = stone ? vec3(1.0, 0.0, 0.0) : vec3(along, 0.0);
  vec3 metal = pow(max(shade(p, N, T, F0, rough, stone ? 0.15 : 0.7, vec3(near - p, W * 1.6), lit), 0.0), vec3(1.0 / 2.2));
  metal = mix(metal, INK + metal * 0.05, clamp(ink, 0.0, 1.0) * 0.92);
  metal = 1.0 - (1.0 - metal) * (1.0 - heat(min(emit * uStream, 1.0) * 0.82));
  frag = vec4(mix(back, min(metal, vec3(1.0)), cov * inside), 1.0);
}`;

export function mountPairing(canvas: HTMLCanvasElement, tiles: HTMLElement[]): Objects {
  return mountObjects(canvas, tiles, `${HEAD}${STATUES}${FINIAL}${PAIR}${SHADE}${MAIN}`);
}
