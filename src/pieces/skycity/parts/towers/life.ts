import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin } from '../../../../world/surface';

// The small life of the city, as points of light worked out from the clock alone in one shader: beacons that
// breathe on the tall tops, traffic along the boulevards and the avenues, and craft that drift between the towers.
// Each is a soft round spot a few pixels across with a core a little over a pixel, so one moving between pixels never
// flickers. A spot is a small square turned to the screen, so its size is not bound by the largest point the graphics
// card will draw. Nothing here repeats in any time a visitor would see: every speed and period is its own.

export const MODE = { beacon: 0, ring: 1, avenue: 2, craft: 3 } as const;

export interface Light {
  mode: number;
  // A beacon: where it is. Traffic on a ring: its radius, its height, where it starts (radians), its speed (units a
  // second, signed). On an avenue: its bearing (radians), its height, where it starts (0 to 1 of the run), its speed
  // (runs a second, signed), the run's inner and outer radius. A craft: the middle of its loop, its radii across
  // and in depth, its height, where it starts and its speed (radians a second).
  a: [number, number, number, number];
  b: [number, number, number, number];
  // How large in CSS pixels, its tone (0 ember to 1 pale), how bright, and its own phase.
  look: [number, number, number, number];
}

const VHEAD = /* glsl */ `
uniform float uTime;
uniform float uPx;
uniform vec2 uView;
attribute vec2 corner;
attribute vec4 la;
attribute vec4 lb;
attribute vec4 ll;
attribute float lm;
varying vec3 vColor;
varying vec2 vQ;
varying float vSize;
vec3 tone(float t){
  return t < 0.5 ? mix(${lin(hex('flame'))}, ${lin(hex('hot'))}, t / 0.5) : mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, (t - 0.5) / 0.5);
}
`;

const VBODY = /* glsl */ `
  vec3 p = vec3(0.0);
  float k = ll.z;
  if (lm < 0.5) {
    p = la.xyz;
    // A slow breath, sharpened, so it rests dim and swells.
    float b = 0.5 + 0.5 * sin(uTime * la.w + ll.w * 6.2831);
    k *= 0.18 + 0.82 * pow(b, 3.0);
  } else if (lm < 1.5) {
    float a = la.z + uTime * la.w / la.x;
    p = vec3(sin(a) * la.x, la.y, cos(a) * la.x);
  } else if (lm < 2.5) {
    float s = fract(la.z + uTime * la.w), r = mix(lb.x, lb.y, s);
    p = vec3(sin(la.x) * r, la.y, cos(la.x) * r);
    k *= smoothstep(0.0, 0.06, s) * smoothstep(1.0, 0.94, s);
  } else {
    float a = lb.z + uTime * lb.w;
    p = vec3(la.x + cos(a) * la.z, la.w + 3.0 * sin(a * 2.3 + ll.w * 6.0), la.y + sin(a) * lb.x);
    // A craft's light blinks now and then.
    k *= 0.75 + 0.5 * step(0.94, fract(uTime * (0.4 + 0.2 * ll.w) + ll.w));
  }
  vColor = tone(ll.y) * k;
  vec4 c = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vSize = ll.x * uPx;
  float hs = 0.5 * (vSize * 3.0 + 2.0);
  vQ = corner * hs;
  c.xy += corner * hs * 2.0 / uView * c.w;
  gl_Position = c;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
`;

const FHEAD = /* glsl */ `
varying vec3 vColor;
varying vec2 vQ;
varying float vSize;
`;

const FBODY = /* glsl */ `
  float r2 = dot(vQ, vQ) / max(vSize * vSize * 0.25, 0.25);
  float a = exp(-r2 * 1.6) + 0.12 * exp(-r2 * 0.25);
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
`;

export function lights(list: Light[]): { points: THREE.Mesh; time: { value: number } } {
  const n = list.length, g = new THREE.BufferGeometry();
  const la = new Float32Array(n * 16), lb = new Float32Array(n * 16), ll = new Float32Array(n * 16), lm = new Float32Array(n * 4), pos = new Float32Array(n * 12), corner = new Float32Array(n * 8), index: number[] = [];
  const corners = [-1, -1, 1, -1, 1, 1, -1, 1];
  list.forEach((l, i) => {
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      la.set(l.a, v * 4); lb.set(l.b, v * 4); ll.set(l.look, v * 4); lm[v] = l.mode;
      corner.set(corners.slice(k * 2, k * 2 + 2), v * 2);
    }
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('la', new THREE.BufferAttribute(la, 4));
  g.setAttribute('lb', new THREE.BufferAttribute(lb, 4));
  g.setAttribute('ll', new THREE.BufferAttribute(ll, 4));
  g.setAttribute('lm', new THREE.BufferAttribute(lm, 1));
  g.setIndex(index);
  // Everything moves inside the city's reach: one sphere bounds it all.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 150, 0), 900);
  const time = { value: 0 }, px = { value: 1 }, view = { value: new THREE.Vector2(1, 1) };
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.name = 'towers-life';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: time, uPx: px, uView: view });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VHEAD}`).replace('#include <project_vertex>', VBODY);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${FHEAD}`).replace('#include <opaque_fragment>', FBODY);
  };
  m.customProgramCacheKey = () => 'skycity-towers-life';
  const points = new THREE.Mesh(g, m);
  points.frustumCulled = false;
  points.castShadow = false;
  points.userData.noAO = true;
  const size = new THREE.Vector2();
  points.onBeforeRender = (r) => {
    px.value = r.getPixelRatio();
    const t = r.getRenderTarget();
    if (t) view.value.set(t.width, t.height); else view.value.copy(r.getDrawingBufferSize(size));
  };
  return { points, time };
}
