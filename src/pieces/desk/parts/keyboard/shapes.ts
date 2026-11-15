import * as THREE from 'three';

// Shapes the keyboard and the mouse are made of.

export interface Outline { p: [number, number][]; n: [number, number][] }

// A rounded rectangle in the xz plane, w along x and d along z, walked round with the same number of points whatever
// its size, so outlines of different sizes can be joined point to point. c points on each corner's arc, x and z
// points inside each straight edge.
export function outline(w: number, d: number, r: number, c: number, x: number, z: number): Outline {
  r = Math.max(0.05, Math.min(r, w / 2 - 0.01, d / 2 - 0.01));
  const p: [number, number][] = [], n: [number, number][] = [];
  const hx = w / 2 - r, hz = d / 2 - r;
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= c; i++) {
      const a = a0 + (i / c) * (Math.PI / 2), ca = Math.cos(a), sa = Math.sin(a);
      p.push([cx + r * ca, cz + r * sa]);
      n.push([ca, sa]);
    }
  };
  const edge = (ax: number, az: number, bx: number, bz: number, k: number, nx: number, nz: number) => {
    for (let i = 1; i <= k; i++) { const t = i / (k + 1); p.push([ax + (bx - ax) * t, az + (bz - az) * t]); n.push([nx, nz]); }
  };
  corner(hx, hz, 0);
  edge(hx, d / 2, -hx, d / 2, x, 0, 1);
  corner(-hx, hz, Math.PI / 2);
  edge(-w / 2, hz, -w / 2, -hz, z, -1, 0);
  corner(-hx, -hz, Math.PI);
  edge(-hx, -d / 2, hx, -d / 2, x, 0, -1);
  corner(hx, -hz, 1.5 * Math.PI);
  edge(w / 2, -hz, w / 2, hz, z, 1, 0);
  return { p, n };
}

// Rings of points joined into one closed surface, with smooth normals: a cap, a shell. The last ring may close on a
// single point.
export function rings(list: THREE.Vector3[][], close?: THREE.Vector3): THREE.BufferGeometry {
  const n = list[0].length, pos: number[] = [], idx: number[] = [];
  for (const ring of list) for (const v of ring) pos.push(v.x, v.y, v.z);
  for (let j = 0; j < list.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n), c = a + n, d = b + n;
    idx.push(a, c, b, b, c, d);
  }
  if (close) {
    const ci = pos.length / 3, base = (list.length - 1) * n;
    pos.push(close.x, close.y, close.z);
    for (let i = 0; i < n; i++) idx.push(base + i, ci, base + ((i + 1) % n));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Turns a surface whose triangles face inward to face out.
export function flip(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ix = g.getIndex();
  if (ix) for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); }
  const nm = g.getAttribute('normal');
  if (nm) for (let i = 0; i < nm.count; i++) nm.setXYZ(i, -nm.getX(i), -nm.getY(i), -nm.getZ(i));
  return g;
}

// Sets one value of the cell attribute on every vertex: what a shader is told about the part a vertex belongs to.
export function tag(g: THREE.BufferGeometry, cell: (x: number, y: number, z: number) => [number, number, number, number]): THREE.BufferGeometry {
  const p = g.getAttribute('position'), out = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) out.set(cell(p.getX(i), p.getY(i), p.getZ(i)), i * 4);
  g.setAttribute('cell', new THREE.Float32BufferAttribute(out, 4));
  return g;
}

// What a thing lays on the mat round it, drawn by one shader program for every part that uses it: a soft shadow
// under its footprint, darkest beneath it and gone a little way out, or the light it spills, read from a map. The two
// differ only in their numbers and how they are laid on.
const GROUND_VERT = 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const GROUND_FRAG = /* glsl */ `
uniform float uSpill; uniform vec2 uHalf; uniform float uR, uSoft, uK; uniform sampler2D uMap; uniform vec4 uMapAt; varying vec2 vP;
void main(){
  if (uSpill > 0.5) {
    vec2 uv = (vP - uMapAt.xy) * uMapAt.zw;
    float e = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.86, uv.x) * smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
    vec3 c = texture2D(uMap, uv).rgb;
    gl_FragColor = vec4(c * c * 4.0 * uK * e, 1.0);
    return;
  }
  vec2 q = abs(vP) - uHalf;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uR;
  float a = 1.0 - smoothstep(-uSoft * 0.35, uSoft, sd);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * uK);
}`;
// Light laid on whatever is under it, and nothing else: the canvas's alpha is left as it is, so on a clear ground it
// adds to the page.
const ADD = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor } as const;

function ground(w: number, d: number, uniforms: Record<string, { value: unknown }>, spill: boolean): THREE.Mesh {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...(spill ? ADD : {}),
    uniforms: { uSpill: { value: spill ? 1 : 0 }, uHalf: { value: new THREE.Vector2() }, uR: { value: 0 }, uSoft: { value: 1 }, uK: { value: 1 }, uMap: { value: null }, uMapAt: { value: new THREE.Vector4() }, ...uniforms },
    vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
  });
  m.name = 'ground';
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m);
  mesh.renderOrder = spill ? 3 : 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.noWire = true;
  mesh.userData.noAO = true;
  return mesh;
}

// A soft shadow where a thing sits: a rounded rectangle w by d with corners r, fading over soft.
export function contactShadow(w: number, d: number, r: number, soft: number, strength: number): THREE.Mesh {
  return ground(w + 2 * soft, d + 2 * soft, { uHalf: { value: new THREE.Vector2(w / 2 - r, d / 2 - r) }, uR: { value: r }, uSoft: { value: soft }, uK: { value: strength } }, false);
}

// Light spilt round a thing, from a map of it laid over w by d whose corner and inverse size are at.
export function spillLight(w: number, d: number, map: THREE.Texture, at: THREE.Vector4, strength: number): THREE.Mesh {
  return ground(w, d, { uMap: { value: map }, uMapAt: { value: at }, uK: { value: strength } }, true);
}
