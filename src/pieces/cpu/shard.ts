import * as THREE from 'three';
import { seeded, type Vec3 } from '../../world/build';
import { hex } from '../../config/palette';
import { lin } from '../../world/surface';

// The shard a part flies as: a small jagged facet with needle points, lit hot as the stream's are. One shape,
// stretched and turned differently for each part.

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
  const ball = (): Vec3 => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
  const pts: Vec3[] = [];
  for (let i = 0; i < 4; i++) { const p = ball(), k = 0.36 * (0.7 + 0.3 * r()); pts.push([p[0] * k, p[1] * k * 0.9, p[2] * k]); }
  const reach = [1.0, 0.85, 0.7, 0.55];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + r() * 0.9, k = reach[i]; pts.push([Math.cos(a) * k, (r() - 0.5) * 0.5, Math.sin(a) * k]); }
  const g = new THREE.BufferGeometry();
  const pos = hull(pts);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Which corner of its face each vertex is, so the shader can light the facet's edges.
  const bary = new Float32Array(pos.length);
  for (let i = 0; i < pos.length / 3; i++) bary[i * 3 + (i % 3)] = 1;
  g.setAttribute('bary', new THREE.Float32BufferAttribute(bary, 3));
  g.computeVertexNormals();
  return g;
}

export function shardMaterial(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
attribute vec3 bary;
varying vec3 vV;
varying vec3 vB;
varying float vG;
void main(){
  vB = bary;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vV = mv.xyz;
  vG = instanceColor.r;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `
varying vec3 vV;
varying vec3 vB;
varying float vG;
void main(){
  vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
  vec3 v = normalize(-vV);
  if (dot(n, v) < 0.0) n = -n;
  vec3 L = normalize(vec3(-0.35, 0.75, 0.55));
  float face = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 10.0);
  vec3 w = fwidth(vB);
  vec3 e3 = smoothstep(vec3(0.0), w * 1.6, vB);
  float edge = 1.0 - min(min(e3.x, e3.y), e3.z);
  float i = vG * (0.1 + 0.45 * face * face + 0.9 * spec + 0.75 * edge);
  vec3 c = mix(${lin(hex('flame'))}, ${lin(hex('hot'))}, smoothstep(0.35, 0.8, i));
  c = mix(c, ${lin(hex('pale'))}, smoothstep(0.9, 1.4, i));
  gl_FragColor = vec4(c * i * 2.6, 1.0);
}`,
  });
  m.name = 'cpuShard';
  return m;
}
