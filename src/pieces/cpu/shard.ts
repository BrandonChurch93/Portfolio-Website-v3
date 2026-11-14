import * as THREE from 'three';
import { seeded, type Vec3 } from '../../world/build';
import { hex } from '../../config/palette';
import { lin } from '../../world/surface';

// The shard a part flies home as: the stream's kind, a dark faceted splinter with needle points. It is long along its
// own x, so it can be laid along what it carries; each instance is stretched to the part's length, depth and breadth.

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// The tightest skin round a handful of points.
function hull(pts: Vec3[]): number[] {
  const out: number[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const nrm = cross(sub(pts[j], pts[i]), sub(pts[k], pts[i])), l = Math.hypot(...nrm);
    if (l < 1e-9) continue;
    let over = 0, under = 0;
    for (let m = 0; m < n && !(over && under); m++) {
      if (m === i || m === j || m === k) continue;
      const d = dot(nrm, sub(pts[m], pts[i])) / l;
      if (d > 1e-7) over++;
      if (d < -1e-7) under++;
    }
    if (over && under) continue;
    for (const v of over ? [i, k, j] : [i, j, k]) out.push(...pts[v]);
  }
  return out;
}

export function shardGeometry(): THREE.BufferGeometry {
  const r = seeded(808);
  // A body, a needle forward and a shorter one back along x, and a few points out to the sides, none alike.
  const pts: Vec3[] = [
    [1.0, 0.04, 0.06], [-0.82, -0.05, -0.04],
    [0.18, 0.0, 0.62], [-0.3, 0.05, -0.55], [0.46, -0.02, -0.38], [-0.55, 0.0, 0.34],
  ];
  for (let i = 0; i < 5; i++) pts.push([(r() - 0.5) * 0.7, (r() < 0.5 ? -1 : 1) * (0.55 + 0.45 * r()), (r() - 0.5) * 0.5]);
  const pos = hull(pts);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Which corner of its face each vertex is, so the shader can draw the hairline along the facet's edges.
  const bary = new Float32Array(pos.length);
  for (let i = 0; i < pos.length / 3; i++) bary[i * 3 + (i % 3)] = 1;
  g.setAttribute('bary', new THREE.Float32BufferAttribute(bary, 3));
  g.computeVertexNormals();
  return g;
}

// Lit as the stream's are: every face a flat mirror of dark copper, so each takes its own tone as it turns, dark
// until it lines up with a light and then flashing; a hairline of hot light along each edge; a glint on the points.
export function shardMaterial(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
attribute vec3 bary;
varying vec3 vV;
varying vec3 vB;
varying vec3 vO;
varying float vG;
void main(){
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vV = mv.xyz;
  vB = bary;
  vO = position;
  vG = instanceColor.r;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `
varying vec3 vV;
varying vec3 vB;
varying vec3 vO;
varying float vG;
float spot(vec3 n, vec3 v, vec3 l, float p){ return pow(max(dot(n, normalize(l + v)), 0.0), p); }
void main(){
  vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
  vec3 v = normalize(-vV);
  if (dot(n, v) < 0.0) n = -n;
  // A dark room with a soft warm panel above, the key behind, and the stream's light low on the left.
  vec3 R = reflect(-v, n);
  float room = 0.03 + 0.22 * smoothstep(0.2, 0.9, R.y);
  float key = spot(n, v, normalize(vec3(0.4, 0.85, -0.3)), 70.0) * 2.2;
  float stream = spot(n, v, normalize(vec3(-0.9, 0.25, 0.35)), 40.0) * 1.6;
  float light = room + key + stream;
  vec3 col = ${lin(hex('copper'))} * 0.55 * light;
  vec3 w = fwidth(vB);
  vec3 e3 = smoothstep(vec3(0.0), w * 1.3, vB);
  float line = 1.0 - min(min(e3.x, e3.y), e3.z);
  float tip = pow(smoothstep(0.7, 1.0, length(vO)), 3.0);
  col += ${lin(hex('hot'))} * line * 0.75 * vG + ${lin(hex('pale'))} * tip * 0.5 * vG;
  gl_FragColor = vec4(col, 1.0);
}`,
  });
  m.name = 'cpuShard';
  return m;
}
