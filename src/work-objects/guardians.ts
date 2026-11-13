import { HEAD, SHADE, mountObjects, type Objects } from './objects';

// A second derby for the things the stream meets in Work: statues in place of hardware. Three families, each as a
// mask that faces out where a post stands, and as a pair of heads in profile at the ends of the rail, looking outward.
// Their eyes and mouths are openings, and light when the stream is on. Rough reliefs, to choose a direction from.

type P = [number, number];
const poly = (name: string, pts: P[]) => `
float ${name}(vec2 p){
  vec2 v[${pts.length}] = vec2[${pts.length}](${pts.map(([x, y]) => `vec2(${x.toFixed(3)}, ${y.toFixed(3)})`).join(', ')});
  float d = dot(p - v[0], p - v[0]), s = 1.0;
  for (int i = 0, j = ${pts.length - 1}; i < ${pts.length}; j = i, i++){
    vec2 e = v[j] - v[i], w = p - v[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
  }
  return s * sqrt(d);
}`;

// Profiles, looking left. x is forward when negative, y is down.
const PHARAOH: P[] = [[-0.4, -0.58], [-0.5, -0.32], [-0.5, -0.22], [-0.7, -0.02], [-0.55, 0.05], [-0.6, 0.13], [-0.52, 0.19], [-0.58, 0.25], [-0.5, 0.32], [-0.54, 0.44], [-0.3, 0.52], [-0.24, 0.66], [-0.3, 0.95], [0.12, 0.95], [0.6, 0.38], [0.56, -0.42], [0.08, -0.86], [-0.34, -0.74]];
const GARGOYLE: P[] = [[-0.95, -0.02], [-0.93, -0.16], [-0.62, -0.26], [-0.42, -0.46], [-0.05, -0.52], [0.32, -0.36], [0.7, -0.14], [0.7, 0.3], [0.05, 0.38], [-0.18, 0.3], [-0.86, 0.36], [-0.84, 0.24]];
const GARGOYLE_MOUTH: P[] = [[-0.97, 0.0], [-0.3, 0.1], [-0.86, 0.25]];
const SERPENT: P[] = [[-0.95, -0.28], [-0.5, -0.42], [-0.12, -0.5], [0.3, -0.42], [0.58, -0.12], [0.6, 0.42], [0.15, 0.56], [-0.12, 0.34], [-0.9, 0.38], [-0.92, 0.2], [-0.97, -0.02]];
const SERPENT_MOUTH: P[] = [[-0.99, 0.0], [-0.26, 0.1], [-0.94, 0.21]];

export const STATUES = `
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float ell(vec2 p, vec2 ab){ return (length(p / ab) - 1.0) * min(ab.x, ab.y); }
float box(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float almond(vec2 p, float w, float hh){ float rr = (w * w + hh * hh) / (2.0 * hh), d = rr - hh; return max(length(p - vec2(0.0, d)) - rr, length(p + vec2(0.0, d)) - rr); }
float cone(vec2 p, vec2 a, vec2 b, float ra, float rb, out float t){
  vec2 ab = b - a; t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * t) - mix(ra, rb, t);
}
${poly('pharaohPoly', PHARAOH)}${poly('gargoylePoly', GARGOYLE)}${poly('gargoyleMouth', GARGOYLE_MOUTH)}${poly('serpentPoly', SERPENT)}${poly('serpentMouth', SERPENT_MOUTH)}

// ---- the masks, facing out, in units of their size

float pharaoh(vec2 r, out float sd, out float ink, out float emit){
  float x = abs(r.x), y = r.y;
  float top = ell(r - vec2(0.0, -0.3), vec2(0.66, 0.55));
  float lap = max(x - (0.66 + 0.1 * (y + 0.3)), max(-0.3 - y, y - 0.62));
  lap = max(lap, -box(r - vec2(0.0, 0.8), vec2(0.37, 0.36)));
  float hood = min(top, lap);
  float face = ell(r - vec2(0.0, 0.02), vec2(0.4, 0.5));
  float bw = 0.05 + 0.035 * clamp((y - 0.5) / 0.42, 0.0, 1.0);
  float beard = max(x - bw, max(0.46 - y, y - 0.92));
  sd = min(min(hood, face), beard);
  float fm = smoothstep(0.0, -0.03, face);
  float h = 0.1 * smoothstep(0.0, 0.07, -hood);
  float stripe = y < -0.24 ? sin((y - 0.45 * x * x) * 50.0) : sin((y - 0.55 * (x - 0.52)) * 50.0);
  h += 0.017 * stripe * smoothstep(0.0, 0.05, -hood) * smoothstep(0.03, 0.07, face);
  h += 0.045 * smoothstep(0.07, 0.05, face) * smoothstep(0.0, 0.02, face) * smoothstep(-0.12, -0.22, y);
  h += 0.1 * bell(length((r - vec2(0.0, -0.57)) / vec2(0.05, 0.11)));
  float bulge = sqrt(max(1.0 - (r.x / 0.4) * (r.x / 0.4) - ((y - 0.02) / 0.5) * ((y - 0.02) / 0.5), 0.0));
  float hf = 0.13 + 0.2 * bulge;
  hf += 0.03 * bell((y + 0.175 - 0.25 * x * x) / 0.028) * smoothstep(0.04, 0.09, x) * smoothstep(0.36, 0.3, x);
  vec2 ep = vec2(x - 0.17, y + 0.075);
  float eye = almond(ep, 0.115, 0.04);
  hf -= 0.035 * bell(length(ep / vec2(0.16, 0.075)));
  hf += 0.022 * smoothstep(0.022, 0.006, abs(eye - 0.014));
  hf += 0.02 * smoothstep(0.014, 0.004, abs(y + 0.075)) * smoothstep(0.27, 0.29, x) * smoothstep(0.42, 0.38, x);
  hf += 0.085 * bell(x / 0.045) * smoothstep(-0.16, -0.06, y) * smoothstep(0.2, 0.15, y) * (0.45 + 0.55 * smoothstep(-0.1, 0.16, y));
  hf += 0.045 * bell(length(vec2(x - 0.05, y - 0.165) / vec2(0.04, 0.03)));
  hf += 0.03 * bell((y - 0.275) / 0.02) * bell(x / 0.1) + 0.035 * bell((y - 0.335) / 0.022) * bell(x / 0.085);
  hf += 0.03 * bell(length(vec2(x, y - 0.44) / vec2(0.1, 0.06)));
  float mouth = almond(vec2(r.x, y - 0.304), 0.1, 0.012);
  h = mix(h, hf, fm);
  h = mix(h, 0.11 + 0.05 * dome(x / bw) + 0.012 * sin(y * 95.0), smoothstep(0.0, -0.02, beard) * (1.0 - fm));
  emit = max(smoothstep(0.006, -0.006, eye), smoothstep(0.004, -0.004, mouth)) * fm;
  ink = emit;
  return h;
}

float gargoyle(vec2 r, out float sd, out float ink, out float emit){
  float x = abs(r.x), y = r.y;
  vec2 q = vec2(x, y);
  float head = smin(ell(q - vec2(0.0, -0.1), vec2(0.5, 0.45)), ell(q - vec2(0.0, 0.3), vec2(0.36, 0.42)), 0.12);
  float t1, t2, t3, f1, f2;
  float horn = min(cone(q, vec2(0.3, -0.38), vec2(0.6, -0.66), 0.13, 0.085, t1), cone(q, vec2(0.6, -0.66), vec2(0.66, -1.0), 0.085, 0.012, t2));
  float ear = cone(q, vec2(0.42, -0.06), vec2(0.95, -0.34), 0.13, 0.012, t3);
  sd = min(smin(head, horn, 0.05), ear);
  float hm = smoothstep(0.0, -0.04, head);
  float h = 0.09 * smoothstep(0.0, 0.08, -sd);
  h += 0.016 * sin((t1 + t2) * 17.0) * smoothstep(0.0, -0.03, horn) * (1.0 - hm);
  h -= 0.04 * bell(length((q - vec2(0.66, -0.2)) / vec2(0.16, 0.05))) * (1.0 - hm);
  float hh = 0.12 + 0.2 * sqrt(max(1.0 - pow(x / 0.5, 2.0) - pow((y - 0.08) / 0.62, 2.0), 0.0));
  float browLine = y + 0.08 + 0.32 * x;
  hh += 0.1 * bell(browLine / 0.045) * smoothstep(0.02, 0.07, x) * smoothstep(0.46, 0.36, x);
  hh += 0.012 * sin(y * 75.0) * smoothstep(-0.07, -0.13, browLine);
  vec2 ep = vec2(x - 0.2, y + 0.005);
  float ca = cos(0.32), sa = sin(0.32);
  float eye = almond(vec2(ca * ep.x - sa * ep.y, sa * ep.x + ca * ep.y), 0.12, 0.045);
  hh -= 0.07 * bell(length(ep / vec2(0.17, 0.09)));
  hh += 0.1 * bell(length(vec2(x, y - 0.13) / vec2(0.1, 0.1)));
  hh += 0.05 * bell(length(vec2(x - 0.3, y - 0.1) / vec2(0.11, 0.08)));
  float nostril = length(vec2(x - 0.05, y - 0.185)) - 0.022;
  float mouth = max(ell(vec2(x, y - 0.42), vec2(0.27, 0.1)), (0.37 - 0.25 * x) - y);
  hh += 0.045 * bell(mouth / 0.035) * step(0.0, mouth);
  float fang = min(cone(q, vec2(0.12, 0.36), vec2(0.115, 0.47), 0.032, 0.004, f1), cone(q, vec2(0.2, 0.5), vec2(0.185, 0.39), 0.028, 0.004, f2));
  float open = max(mouth, -fang);
  h = mix(h, hh, hm);
  h = mix(h, 0.3, smoothstep(0.004, -0.004, fang) * step(mouth, 0.0) * hm);
  emit = max(smoothstep(0.006, -0.006, eye), smoothstep(0.006, -0.006, open)) * hm;
  ink = max(emit, smoothstep(0.005, -0.005, nostril) * hm);
  return h;
}

float sun(vec2 r, out float sd, out float ink, out float emit){
  float rho = length(r), th = atan(r.y, r.x);
  sd = rho - 1.0; ink = 0.0; emit = 0.0;
  float h = 0.06 + 0.1 * dome((rho - 0.955) / 0.045) * step(0.91, rho);
  float k8 = mod(th + 0.3927, 0.7854) - 0.3927;
  float ray = max(abs(k8) * rho - 0.11 * (0.93 - rho) / 0.21, max(0.71 - rho, rho - 0.93));
  h = mix(h, 0.17, smoothstep(0.006, -0.006, ray));
  float g = fract(th * 16.0 / 6.28318);
  h += 0.04 * smoothstep(0.16, 0.22, g) * smoothstep(0.84, 0.78, g) * smoothstep(0.745, 0.76, rho) * smoothstep(0.885, 0.87, rho) * step(0.15, abs(k8) * rho);
  ink = max(smoothstep(0.014, 0.005, abs(rho - 0.7)), smoothstep(0.014, 0.005, abs(rho - 0.485)));
  float tb = fract(th * 20.0 / 6.28318);
  float tab = smoothstep(0.525, 0.54, rho) * smoothstep(0.675, 0.66, rho) * smoothstep(0.1, 0.16, tb) * smoothstep(0.9, 0.84, tb);
  h += 0.05 * tab + 0.045 * bell(length(vec2((tb - 0.5) * 0.19, rho - 0.6)) / 0.022);
  if (rho < 0.47){
    float x = abs(r.x), y = r.y;
    float hf = 0.1 + 0.16 * dome(rho / 0.47);
    vec2 ep = vec2(x - 0.17, y + 0.09);
    float eye = almond(ep, 0.1, 0.05);
    hf += 0.03 * smoothstep(0.03, 0.01, abs(eye - 0.02));
    hf += 0.035 * bell((y + 0.2 - 0.6 * (x - 0.17) * (x - 0.17)) / 0.025) * step(0.05, x) * step(x, 0.32);
    hf += 0.07 * bell(x / 0.05) * smoothstep(-0.12, -0.02, y) * smoothstep(0.1, 0.06, y) + 0.05 * bell(length(vec2(x - 0.045, y - 0.07) / vec2(0.045, 0.03)));
    float mouth = box(vec2(r.x, y - 0.21), vec2(0.14, 0.04)) - 0.02;
    hf += 0.04 * bell(mouth / 0.025) * step(0.0, mouth);
    float tongue = max(x - 0.05 * clamp((0.41 - y) / 0.2, 0.0, 1.0), max(0.2 - y, y - 0.41));
    hf += 0.03 * smoothstep(0.004, -0.004, abs(length(vec2(x - 0.33, y - 0.06)) - 0.045) - 0.012);
    h = mix(hf, 0.24, smoothstep(0.004, -0.004, tongue));
    emit = max(smoothstep(0.006, -0.006, eye), smoothstep(0.006, -0.006, max(mouth, -tongue)));
    ink = max(ink, emit);
  }
  return h + 0.004 * (noise(r * 40.0) - 0.5);
}

// ---- the same three in profile, for the ends of the rail

float pharaohSide(vec2 u, out float sd, out float ink, out float emit){
  float s = pharaohPoly(u) - 0.02;
  float beard = max(abs(u.x + 0.5 - 0.06 * (u.y - 0.44)) - 0.045, max(0.42 - u.y, u.y - 0.84));
  sd = min(s, beard);
  float fm = smoothstep(0.02, -0.02, ell(u - vec2(-0.42, -0.04), vec2(0.27, 0.54))) * step(s, 0.0);
  float h = 0.14 * smoothstep(0.0, 0.12, -s);
  vec2 d = u - vec2(-0.14, -0.08);
  h += 0.018 * sin((u.y - 0.3 * u.x * u.x - 0.12 * u.x) * 44.0) * (1.0 - fm) * smoothstep(0.0, 0.06, -s);
  h += 0.05 * fm;
  h += 0.035 * smoothstep(0.03, 0.01, abs(length(d) - 0.07)) * (1.0 - fm);
  float eye = almond(u - vec2(-0.42, -0.2), 0.085, 0.032);
  h += 0.03 * bell((u.y + 0.295) / 0.022) * smoothstep(-0.54, -0.49, u.x) * smoothstep(-0.28, -0.34, u.x) * fm;
  h += 0.02 * smoothstep(0.014, 0.004, abs(u.y + 0.2)) * smoothstep(-0.34, -0.31, u.x) * smoothstep(-0.16, -0.2, u.x);
  float mouth = almond(u - vec2(-0.5, 0.195), 0.06, 0.012);
  emit = max(smoothstep(0.006, -0.006, eye), smoothstep(0.005, -0.005, mouth)) * step(s, 0.0);
  ink = emit;
  return mix(h, 0.1 + 0.012 * sin(u.y * 80.0), smoothstep(0.0, -0.02, beard) * step(0.0, s));
}

float gargoyleSide(vec2 u, out float sd, out float ink, out float emit){
  float t1, t2, f1, f2;
  float s = gargoylePoly(u) - 0.03;
  float horn = cone(u, vec2(-0.2, -0.46), vec2(0.42, -0.94), 0.11, 0.012, t1);
  float ear = cone(u, vec2(0.12, -0.4), vec2(0.52, -0.6), 0.08, 0.01, t2);
  sd = min(s, min(horn, ear));
  float h = 0.15 * smoothstep(0.0, 0.13, -sd);
  h += 0.016 * sin(t1 * 17.0) * smoothstep(0.0, -0.03, horn) * step(0.0, s);
  h += 0.07 * bell((u.y + 0.33 + 0.35 * (u.x + 0.5)) / 0.04) * smoothstep(-0.74, -0.66, u.x) * smoothstep(-0.3, -0.38, u.x);
  vec2 ep = u - vec2(-0.52, -0.25);
  float ca = cos(-0.3), sa = sin(-0.3);
  float eye = almond(vec2(ca * ep.x - sa * ep.y, sa * ep.x + ca * ep.y), 0.085, 0.034);
  h -= 0.04 * bell(length(ep / vec2(0.13, 0.07)));
  h += 0.04 * bell(length((u - vec2(-0.2, 0.05)) / vec2(0.16, 0.12)));
  h += 0.012 * sin(u.x * 26.0 + u.y * 8.0) * smoothstep(0.1, 0.3, u.x);
  float mouth = gargoyleMouth(u);
  float fang = min(cone(u, vec2(-0.84, 0.02), vec2(-0.82, 0.14), 0.03, 0.004, f1), cone(u, vec2(-0.72, 0.225), vec2(-0.71, 0.12), 0.026, 0.004, f2));
  h = mix(h, 0.3, smoothstep(0.004, -0.004, fang) * step(mouth, 0.0));
  emit = max(smoothstep(0.006, -0.006, eye), smoothstep(0.006, -0.006, max(mouth, -fang))) * step(s, 0.0);
  ink = max(emit, smoothstep(0.005, -0.005, length(u - vec2(-0.88, -0.1)) - 0.02));
  return h;
}

float serpentSide(vec2 u, out float sd, out float ink, out float emit){
  float t, f1;
  float s = serpentPoly(u) - 0.03;
  float ruff = 1.0;
  for (int k = 0; k < 5; k++){
    float a = (float(k) - 2.0) * 0.62;
    ruff = min(ruff, cone(u, vec2(0.3, 0.04), vec2(0.3, 0.04) + vec2(cos(a), sin(a)) * 0.62, 0.1, 0.02, t));
  }
  sd = min(s, ruff);
  float h = 0.15 * smoothstep(0.0, 0.13, -sd);
  vec2 d = u - vec2(0.3, 0.04);
  h += 0.02 * sin(atan(d.y, d.x) * 30.0) * step(0.0, s) * smoothstep(0.0, -0.03, ruff);
  h += 0.014 * sin(u.x * 34.0) * sin(u.y * 34.0) * smoothstep(-0.3, -0.1, u.x) * step(s, 0.0);
  h += 0.06 * bell((u.y + 0.36 + 0.12 * u.x) / 0.035) * smoothstep(-0.8, -0.7, u.x) * smoothstep(-0.2, -0.3, u.x);
  float eye = length(u - vec2(-0.5, -0.22));
  h += 0.04 * smoothstep(0.02, 0.008, abs(eye - 0.075));
  h += 0.05 * bell(length((u - vec2(-0.9, -0.2)) / vec2(0.06, 0.05)));
  float mouth = serpentMouth(u);
  float fang = cone(u, vec2(-0.88, 0.0), vec2(-0.85, 0.15), 0.035, 0.004, f1);
  h = mix(h, 0.3, smoothstep(0.004, -0.004, fang) * step(mouth, 0.0));
  emit = max(smoothstep(0.052, 0.04, eye), smoothstep(0.006, -0.006, max(mouth, -fang))) * step(s, 0.0);
  ink = emit;
  return h;
}

// What is at this point of the page: its height and its outline in pixels. along is the bar's direction on the bar.
float scene(int id, vec4 t, vec2 p, out float sd, out float ink, out float emit, out vec2 along, out float unit){
  along = vec2(0.0);
  if (id < 3){
    unit = min(t.z, t.w) * 0.36;
    vec2 r = (p - (t.xy + vec2(t.z * 0.42, t.w * 0.52))) / unit;
    if (dot(r, r) > 1.5){ sd = unit; ink = 0.0; emit = 0.0; return 0.0; }
    float h = id == 0 ? pharaoh(r, sd, ink, emit) : id == 1 ? gargoyle(r, sd, ink, emit) : sun(r, sd, ink, emit);
    sd *= unit;
    return h * unit;
  }
  int k = id - 3;
  float W = t.w * 0.046, S = W * 8.0;
  vec2 A = t.xy + vec2(t.z * 0.2, t.w * 0.44), B = A + vec2(t.z * 0.6, t.z * 0.6 * 0.085);
  vec2 ev = normalize(B - A), nv = vec2(ev.y, -ev.x);
  float len = length(B - A) / W;
  vec2 q = vec2(dot(p - A, ev), dot(p - A, nv)) / W;
  float bsd = (length(vec2(q.x - clamp(q.x, 0.0, len), q.y)) - 1.0) * W;
  float c = q.y, bh = 0.12;
  if (c > 0.2) bh = 0.12 + 0.4 * dome((c - 0.6) / 0.4);
  if (c < -0.56) bh = 0.12 + 0.22 * dome((c + 0.78) / 0.22);
  bh -= 0.05 * smoothstep(0.09, 0.05, abs(c + 0.2));
  bool left = q.x < len * 0.5;
  vec2 o = left ? A : B;
  vec2 u = vec2((left ? 1.0 : -1.0) * dot(p - o, ev), -dot(p - o, nv)) / S + vec2(0.64, k == 0 ? 0.0 : k == 1 ? 0.08 : 0.14);
  float hsd = 1.0, hink = 0.0, hemit = 0.0, hh = 0.0;
  if (max(abs(u.x), abs(u.y)) < 1.2) hh = k == 0 ? pharaohSide(u, hsd, hink, hemit) : k == 1 ? gargoyleSide(u, hsd, hink, hemit) : serpentSide(u, hsd, hink, hemit);
  hsd *= S;
  if (hsd < bsd){ sd = hsd; ink = hink; emit = hemit; unit = S; return hh * S; }
  sd = bsd; emit = 0.0; along = ev; unit = W;
  ink = smoothstep(0.06, 0.04, abs(c + 0.2)) * step(-0.56, c) * step(c, 0.2);
  return bh * W;
}
`;

const MAIN = `
void main(){
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  int id = -1; vec4 t = vec4(0.0);
  for (int i = 0; i < 6; i++){
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
  float h = scene(id, t, p, sd, ink, emit, along, unit);
  float cov = clamp(0.5 - sd * uDpr, 0.0, 1.0);

  // The line that stands in for the stream: past the side of a mask, along the top of the rail.
  vec2 near;
  float d, glow, reach;
  if (id < 3){
    float R = min(t.z, t.w) * 0.36;
    vec2 c = t.xy + vec2(t.z * 0.42, t.w * 0.52);
    vec2 touch = id == 0 ? vec2(0.75, 0.12) : id == 1 ? vec2(0.6, 0.16) : vec2(1.05, 0.0);
    vec2 A = c + vec2(R * 1.75, -t.w * 0.62), B = c + touch * R, C = c + vec2(R * 2.2, t.w * 0.62);
    vec2 n1, n2;
    float d1 = seg(p, A, B, n1), d2 = seg(p, B, C, n2);
    d = min(d1, d2); near = d1 < d2 ? n1 : n2;
    glow = (glowOf(d, R * 0.04) + 0.8 * bell(length(p - B) / (R * 0.11))) * uStream;
    reach = R * 0.9;
  } else {
    float W = t.w * 0.046;
    vec2 A = t.xy + vec2(t.z * 0.2, t.w * 0.44), B = A + vec2(t.z * 0.6, t.z * 0.6 * 0.085);
    vec2 ev = normalize(B - A), nv = vec2(ev.y, -ev.x);
    d = seg(p, A + nv * W * 1.55, B + nv * W * 1.55, near);
    glow = glowOf(d, W * 0.42) * uStream;
    reach = W * 9.0;
  }
  vec3 back = 1.0 - (1.0 - col) * (1.0 - heat(min(glow * fade, 1.0)));
  if (cov <= 0.0){ frag = vec4(back, 1.0); return; }

  float e = 0.75 / uDpr, s1, i1, e1, u1;
  vec2 a1;
  vec2 g = vec2(scene(id, t, p + vec2(e, 0.0), s1, i1, e1, a1, u1) - scene(id, t, p - vec2(e, 0.0), s1, i1, e1, a1, u1),
                scene(id, t, p + vec2(0.0, e), s1, i1, e1, a1, u1) - scene(id, t, p - vec2(0.0, e), s1, i1, e1, a1, u1)) / (2.0 * e);
  vec3 N = normalize(vec3(-g, 1.0));
  bool bar = dot(along, along) > 0.5;
  float hn = h / unit;
  // Cast and chased, not turned: the high places are rubbed bright and the hollows hold the dark.
  float wear = bar ? smoothstep(0.2, 0.5, hn) : smoothstep(0.12, 0.3, hn);
  float grime = (1.0 - wear) * (0.4 + 0.4 * noise(p * 0.11 + float(id) * 17.0));
  vec3 F0 = mix(uCopperDeep, uCopper, 0.4 + 0.55 * wear) * (1.0 - grime * 0.5);
  float rough = clamp(0.28 + 0.22 * grime - 0.14 * wear, 0.08, 0.9);
  vec3 T = bar ? vec3(along, 0.0) : vec3(1.0, 0.0, 0.0);
  float lit = uStream * 2.4 / (1.0 + pow(length(near - p) / reach, 2.0));
  vec3 metal = pow(max(shade(p, N, T, F0, rough, bar ? 0.8 : 0.15, vec3(near - p, reach * 0.25), lit), 0.0), vec3(1.0 / 2.2));
  metal = mix(metal, INK + metal * 0.05, clamp(ink, 0.0, 1.0) * 0.95);
  metal = 1.0 - (1.0 - metal) * (1.0 - heat(min(emit * uStream, 1.0) * 0.82));
  frag = vec4(mix(back, min(metal, vec3(1.0)), cov * inside), 1.0);
}`;

const FRAG = `${HEAD}${STATUES}${SHADE}${MAIN}`;

export function mountGuardians(canvas: HTMLCanvasElement, tiles: HTMLElement[]): Objects {
  return mountObjects(canvas, tiles, FRAG);
}
