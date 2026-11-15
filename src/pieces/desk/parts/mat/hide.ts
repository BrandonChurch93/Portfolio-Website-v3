import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { shade } from '../../../../world/surface';

// The mat's hide, worked out per pixel from the desk's millimetres: a fine pebbled grain, a soft mottle, the wear of
// wrists and the mouse, a saddle stitched seam in copper thread just inside the edge, a creased line inside that,
// the painted edge, and a small mark blind stamped in one corner. Every fine thing is filtered over the pixel it
// falls in, so a stitch that is too small to see is a steady line of its own average, and nothing twinkles.

export interface MatShape { w: number; d: number; x: number; z: number; h: number; r: number }
// Where the seam runs in from the edge, how long a stitch is, the thread's width, and how far the crease is in.
export const SEAM = { inset: 7.5, pitch: 4, thread: 1.15, crease: 13 } as const;
// The mark: its middle in the mat's own millimetres from its middle, and its radius.
export const MARK = { x: 738, z: 196, r: 9 } as const;

const f = (v: number) => v.toFixed(3);
const lin = (h: number) => { const c = new THREE.Color(h); return `vec3(${f(c.r)}, ${f(c.g)}, ${f(c.b)})`; };

export function hide(m: MatShape): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.8, sheen: 0.05, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x2b2b2d), specularIntensity: 0.14 });
  mat.name = 'mat-hide';
  const hw = m.w / 2, hd = m.d / 2;
  // The seam is the outline inset, its corners concentric with the mat's.
  const a = hw - m.r, b = hd - m.r, rr = m.r - SEAM.inset;
  const L = 4 * a + 4 * b + 2 * Math.PI * rr, n = Math.round(L / SEAM.pitch), pitch = L / n;
  shade(mat, 'mat-hide', {
    head: /* glsl */ `
float hEdge, hRough, hThread;
vec3 hBump;
// Where a point is against a rounded outline inset by k: how far inside it (negative outside), how far round it
// from the back left, and which way is out, in the mat's x and z.
float seamAt(vec2 q, float k, out float s, out vec2 outw){
  const float A = ${f(a)}, B = ${f(b)};
  float R = ${f(m.r)} - k, qa = 1.5707963 * R, inside;
  vec2 d = q - clamp(q, vec2(-A, -B), vec2(A, B));
  if (abs(q.x) <= A && abs(q.y) <= B) {
    vec2 e = vec2(A, B) - abs(q);
    outw = e.x < e.y ? vec2(sign(q.x), 0.0) : vec2(0.0, sign(q.y));
    inside = R + min(e.x, e.y);
  } else { float dl = length(d); outw = d / dl; inside = R - dl; }
  if (abs(q.x) <= A) s = q.y < 0.0 ? q.x + A : 2.0 * A + 2.0 * qa + 2.0 * B + (A - q.x);
  else if (abs(q.y) <= B) s = q.x > 0.0 ? 2.0 * A + qa + (q.y + B) : 4.0 * A + 3.0 * qa + 2.0 * B + (B - q.y);
  else {
    float ang = atan(d.y, d.x);
    if (q.x > 0.0 && q.y < 0.0) s = 2.0 * A + R * (ang + 1.5707963);
    else if (q.x > 0.0) s = 2.0 * A + qa + 2.0 * B + R * ang;
    else if (q.y > 0.0) s = 4.0 * A + 2.0 * qa + 2.0 * B + R * (ang - 1.5707963);
    else { if (ang > 0.0) ang -= 6.2831853; s = 4.0 * A + 3.0 * qa + 4.0 * B + R * (ang + 3.1415927); }
  }
  return inside;
}
// How much of a pixel w wide, centred at v, falls inside a band from lo to hi.
float boxIn(float v, float w, float lo, float hi){ return clamp((min(v + 0.5 * w, hi) - max(v - 0.5 * w, lo)) / w, 0.0, 1.0); }
// The same for a train of pulses, each duty long in every period of 1.
float trainIn(float v, float w, float duty){
  float a = v - 0.5 * w, b = v + 0.5 * w;
  return ((floor(b) * duty + min(fract(b), duty)) - (floor(a) * duty + min(fract(a), duty))) / w;
}
// The mark: a ring round twelve short rays and a dot, pressed into the hide. 1 inside a stroke.
float markAt(vec2 p){
  float r = length(p);
  float ring = 1.0 - smoothstep(0.35, 0.6, abs(r - 7.6));
  float ang = atan(p.y, p.x), seg = 6.2831853 / 12.0;
  float a = mod(ang + 0.5 * seg, seg) - 0.5 * seg;
  float ray = (1.0 - smoothstep(0.3, 0.55, abs(r * sin(a)))) * step(2.8, r) * step(r, 5.6);
  float dot0 = 1.0 - smoothstep(1.2, 1.5, r);
  return max(ring, max(ray, dot0));
}
`,
    color: /* glsl */ `
  {
    vec2 q = vObj.xz - vec2(${f(m.x)}, ${f(m.z)});
    vec3 nO = normalize(vObjN);
    float px = max(fwidth(vObj.x), fwidth(vObj.z));
    hEdge = 1.0 - smoothstep(0.55, 0.9, nO.y);
    float top = 1.0 - hEdge;
    // The hide: a deep warm brown, mottled softly, the pebble of the grain only up close.
    float mott = wFbm(vec3(q * 0.012, 3.0));
    float fine = wNoise(vec3(vObj.xz * 0.55, 7.0));
    float near = 1.0 - smoothstep(0.24, 0.5, px * 0.55);
    // Leaning a touch cool in itself, so that under the room's warm lights it reads as a neutral dark hide.
    vec3 col = mix(vec3(0.006, 0.007, 0.0083), vec3(0.0095, 0.011, 0.013), mott);
    col *= 1.0 + 0.5 * (fine - 0.5) * near;
    // Wrists in front of the keys, and the mouse, have rubbed it darker and smoother.
    float wrist = exp(-pow((q.x + 110.0) / 230.0, 2.0) - pow((q.y - 200.0) / 70.0, 2.0));
    float mouse = exp(-pow((q.x - 176.0) / 120.0, 2.0) - pow((q.y - 66.0) / 110.0, 2.0));
    float worn = 0.7 * wrist + 0.5 * mouse;
    col *= 1.0 - 0.18 * worn;
    hRough = 0.74 - 0.12 * worn + 0.06 * (mott - 0.5) - 0.08 * (fine - 0.5) * near;
    hBump = vec3(0.0);
    hThread = 0.0;
    // The seam.
    float s; vec2 outw;
    float inside = seamAt(q, ${f(SEAM.inset)}, s, outw);
    vec2 along = vec2(-outw.y, outw.x);
    float sw = max(fwidth(s), 1e-4), vw = max(fwidth(inside), 1e-4);
    // Saddle stitches lean: each is set at a slant across the seam.
    float u = s / ${f(pitch)} + inside * 0.35 / ${f(pitch)};
    float duty = 0.74;
    float lane = boxIn(inside, vw, -${f(SEAM.thread / 2)}, ${f(SEAM.thread / 2)});
    float uw = sw / ${f(pitch)};
    float along1 = trainIn(u, uw, duty);
    float seen = 1.0 - smoothstep(0.25, 0.55, uw);
    float stitch = lane * mix(duty, along1, seen) * top;
    // Each stitch is a little round thread: raised in the middle of its run and across it.
    float k = fract(u) / duty, cross0 = inside / ${f(SEAM.thread / 2)};
    float hump = step(k, 1.0) * sqrt(max(0.0, 1.0 - cross0 * cross0)) * sin(3.1415927 * clamp(k, 0.0, 1.0));
    hThread = stitch;
    vec3 thread = ${lin(hex('copper'))} * 0.42 * (0.55 + 0.6 * hump * seen + 0.25 * (1.0 - seen));
    // The holes between stitches and the channel the seam is pressed into.
    float chan = boxIn(inside, vw, -1.6, 1.6) * top;
    col *= 1.0 - 0.28 * chan * (1.0 - stitch);
    float crease = boxIn(seamAt(q, ${f(SEAM.crease)}, s, outw), vw, -0.35, 0.35) * top;
    col *= 1.0 - 0.3 * crease;
    col = mix(col, thread, stitch);
    // The thread's roundness and the channel's walls, up close.
    float lean = (1.0 - smoothstep(0.12, 0.3, vw)) * top;
    float dh = -cross0 * hump * 0.9 * stitch;
    vec2 g = outw * (dh + 0.5 * (smoothstep(1.0, 1.6, abs(inside)) - smoothstep(1.6, 2.2, abs(inside))) * sign(inside) * (1.0 - stitch)) * lean;
    hBump += vec3(g.x, 0.0, g.y);
    hRough = mix(hRough, 0.42, stitch);
    // The painted edge: smooth, darker, a little glossy.
    col = mix(col, vec3(0.0032, 0.0034, 0.0036), hEdge);
    hRough = mix(hRough, 0.38, hEdge);
    // The mark, pressed in and burnished.
    vec2 mp = q - vec2(${f(MARK.x)}, ${f(MARK.z)});
    if (dot(mp, mp) < ${f((MARK.r + 2) ** 2)}) {
      float e = 0.12, mk = markAt(mp);
      float show = 1.0 - smoothstep(0.18, 0.45, px);
      vec2 mg = vec2(markAt(mp + vec2(e, 0.0)) - markAt(mp - vec2(e, 0.0)), markAt(mp + vec2(0.0, e)) - markAt(mp - vec2(0.0, e))) / (2.0 * e);
      hBump -= vec3(mg.x, 0.0, mg.y) * 0.35 * show * top;
      col *= 1.0 - 0.45 * mk * top;
      hRough = mix(hRough, 0.46, mk * top);
    }
    diffuseColor.rgb = col;
  }`,
    rough: 'roughnessFactor = clamp(hRough, 0.2, 0.95);',
    normal: /* glsl */ `
  {
    vec3 vAxZ = normalize(cross(vAxX, vAxY));
    vec3 b = vAxX * hBump.x + vAxZ * hBump.z;
    // The pebble of the grain in two sizes, as slopes worked out from the same noise, each only where it is
    // larger than a few pixels.
    vec2 q = vObj.xz;
    float px = max(fwidth(q.x), fwidth(q.y));
    float keep = (1.0 - hEdge) * (1.0 - hThread);
    vec2 gq = vec2(0.0);
    for (int i = 0; i < 2; i++) {
      float k = i == 0 ? 0.55 : 1.5, amp = i == 0 ? 0.7 : 0.45, e = 0.2 / k;
      float fade = 1.0 - smoothstep(0.24, 0.5, px * k);
      vec3 at = vec3(q * k, 7.0 + float(i) * 5.0);
      float n0 = wNoise(at);
      gq += vec2(wNoise(at + vec3(e * k, 0.0, 0.0)) - n0, wNoise(at + vec3(0.0, e * k, 0.0)) - n0) / e * amp * fade;
    }
    // A hide never lies dead flat: a slow swell, seen only in what it reflects.
    float w0 = wFbm(vec3(q * 0.07, 2.0));
    gq += vec2(wFbm(vec3((q + vec2(3.0, 0.0)) * 0.07, 2.0)) - w0, wFbm(vec3((q + vec2(0.0, 3.0)) * 0.07, 2.0)) - w0) / 3.0 * 0.35;
    b -= (vAxX * gq.x + vAxZ * gq.y) * keep;
    normal = normalize(normal - b);
  }`,
  });
  return mat;
}

// The hairline of shadow the mat lays on the timber round its edge: a band from just under the edge out to a few
// millimetres, darkest where it meets the mat.
export function hairline(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: 'varying float vT; void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vT; void main(){ float a = pow(1.0 - clamp(vT, 0.0, 1.0), 2.2) * 0.7; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }',
  });
  m.name = 'mat-hairline';
  return m;
}
