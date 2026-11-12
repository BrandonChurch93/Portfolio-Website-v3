import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex, type PaletteName } from '../config/palette';
import { lamp } from '../lamp/lamp';
import { seeded } from '../stream-ideas/route';
import { clock } from '../world/clock';

// Two looks for the stream's shards, one to a panel, so Brandon can choose between them in motion.
// A is chunky and cut, with detail on its surface. B is sharp and jagged, with its detail only in the light.

const COUNT = 64;
const HALF = { w: 1, h: 1.6 };
const FLOOR = -1.28;
const FALL = 5.2;
const BACK_AFTER = 3.2;

const lin = (name: PaletteName) => new THREE.Color(hex(name));

const VERT = `
attribute vec3 aEdge;
varying vec3 vWorld, vLocal, vEdge;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz; vLocal = position; vEdge = aEdge;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HEAT = `
uniform vec3 uEmber, uFlame, uHot, uPale, uBronze, uCopper, uCopperLight;
vec3 heat(float x){
  vec3 c = x < 0.3 ? mix(uEmber, uFlame, x / 0.3) : x < 0.62 ? mix(uFlame, uHot, (x - 0.3) / 0.32) : mix(uHot, uPale, clamp((x - 0.62) / 0.3, 0.0, 1.0));
  return c * (0.35 + 2.4 * x * x) * min(1.0, x / 0.22);
}
vec3 metal(float b){
  b = clamp(b, 0.0, 1.0);
  return b < 0.4 ? mix(uBronze * 0.08, uCopper * 0.8, b / 0.4) : b < 0.75 ? mix(uCopper * 0.8, uCopperLight, (b - 0.4) / 0.35) : mix(uCopperLight, uPale, (b - 0.75) / 0.25);
}
vec3 show(vec3 col){
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  return pow(max(col, 0.0), vec3(1.0 / 2.2));
}`;

const FRAG = `
precision highp float;
uniform float uClear, uCut, uSeed;
uniform vec2 uLamp;
varying vec3 vWorld, vLocal, vEdge;
${HEAT}
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719)) + uSeed) * 43758.5453); }
void main(){
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (N.z < 0.0) N = -N;
  vec3 V = vec3(0.0, 0.0, 1.0);
  // The core is a line of light down the middle. A face is lit by how squarely it looks at that line.
  vec3 toCore = vec3(-vWorld.x, 0.0, -vWorld.z);
  float d2 = dot(toCore, toCore);
  vec3 L = toCore * inversesqrt(d2 + 1e-6);
  float power = 1.0 / (1.0 + d2 / 0.09);
  float lit = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 34.0);
  vec3 toLamp = vec3(uLamp - vWorld.xy, 0.55 - vWorld.z);
  float near = 1.0 / (1.0 + dot(toLamp.xy, toLamp.xy) / 0.16);
  float flash = pow(max(dot(N, normalize(normalize(toLamp) + V)), 0.0), 30.0) * 2.4 * near;
  float e = min(vEdge.x, min(vEdge.y, vEdge.z)), px = fwidth(e);
  // Cut: a wide soft bevel along each edge and a fine grain on the face. Jagged: a hair line and nothing else.
  float bevel = 1.0 - smoothstep(0.0, 0.09 + px, e);
  float hair = 1.0 - smoothstep(px * 0.6, px * 1.9, e);
  float edge = mix(hair, bevel * 0.55 + hair * 0.35, uCut);
  float grain = (hash(floor(vLocal * 46.0)) - 0.5) * 0.26 + (hash(floor(vLocal * 15.0)) - 0.5) * 0.2;
  float inner = pow(max(sin(dot(vLocal, vec3(31.0, 17.0, 23.0)) + uSeed) * sin(dot(vLocal, vec3(-13.0, 29.0, 11.0))), 0.0), 3.0);
  float solid = 0.05 + 0.2 * power + 1.35 * lit * power + 0.9 * spec * power + flash;
  solid = solid * (1.0 + uCut * grain) + edge * (0.1 + 0.55 * power + 0.5 * flash);
  float clear = 0.03 + 0.16 * power + 0.45 * spec * power + flash * 0.8;
  clear = clear * (0.55 + 0.5 * lit) + uCut * inner * 0.3 * power + edge * (0.12 + 0.75 * power + 0.5 * flash);
  gl_FragColor = uClear > 0.5 ? vec4(show(heat(clamp(clear, 0.0, 1.0))), 1.0) : vec4(pow(metal(solid), vec3(1.0 / 2.2)), 1.0);
}`;

const CORE_FRAG = `
precision highp float;
varying vec3 vWorld, vLocal, vEdge;
${HEAT}
void main(){
  float x = abs(vWorld.x);
  float light = exp(-(x * x) / 0.0004) + 0.3 * exp(-x / 0.04) + 0.08 * exp(-x / 0.2);
  gl_FragColor = vec4(show(heat(clamp(light, 0.0, 1.0))), 1.0);
}`;

const hull = (pts: THREE.Vector3[]) => new ConvexGeometry(pts).toNonIndexed();
const ball = (r: () => number) => new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();

// Cut: the tightest skin round a handful of points kept near a ball.
function cut(r: () => number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0, n = 6 + Math.floor(r() * 3); i < n; i++) pts.push(ball(r).multiplyScalar(0.7 + 0.3 * r()));
  return hull(pts).scale(1, 0.75 + 0.25 * r(), 0.6 + 0.3 * r());
}

// Jagged: a small core with three or four points pulled far out of it, so each ends in a needle. Larger pieces are
// two of these fused at an angle, which puts a notch in the outline. Small ones keep more body so they still flash.
function jagged(r: () => number, big: number): THREE.BufferGeometry {
  const splinter = () => {
    const pts: THREE.Vector3[] = [], body = 0.44 - 0.2 * big;
    for (let i = 0; i < 4; i++) pts.push(ball(r).multiplyScalar(body * (0.7 + 0.3 * r())));
    for (let i = 0, n = 3 + Math.floor(r() * 2); i < n; i++) pts.push(ball(r).multiplyScalar(0.85 + 0.75 * r()));
    return hull(pts).scale(1, 0.5 + 0.3 * r(), 0.38 + 0.24 * r());
  };
  let g = splinter();
  if (r() < 0.25 + 0.55 * big) {
    const other = splinter().scale(0.75, 0.75, 0.75).rotateZ(0.7 + 1.6 * r()).rotateX(r() * 2).translate((r() - 0.5) * 0.5, (r() - 0.5) * 0.5, 0);
    g = mergeGeometries([g, other]) ?? g;
  }
  // Whatever its shape, no piece reaches further than a cut one of the same size.
  g.computeBoundingSphere();
  const reach = g.boundingSphere?.radius ?? 1;
  return g.scale(1 / reach, 1 / reach, 1 / reach);
}

function lump(r: () => number, sharp: boolean, big: number): THREE.BufferGeometry {
  const g = sharp ? jagged(r, big) : cut(r);
  const count = g.getAttribute('position').count, edge = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) edge[i * 3 + (i % 3)] = 1;
  g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 3));
  return g;
}

interface Facet {
  mesh: THREE.Mesh;
  y: number; pace: number; r: number; ph: number; orbit: number;
  spin: THREE.Vector3; turn: THREE.Vector3;
  pos: THREE.Vector3; vel: THREE.Vector3;
}

export function mountFacets(canvas: HTMLCanvasElement, panels: HTMLElement[]): () => void {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); } catch { return () => undefined; }
  renderer.setClearColor(new THREE.Color(hex('bg')), 1);
  renderer.autoClear = false;
  const camera = new THREE.OrthographicCamera(-HALF.w, HALF.w, HALF.h, -HALF.h, 0.1, 20);
  camera.position.z = 8;

  const shared = {
    uEmber: { value: lin('ember') }, uFlame: { value: lin('flame') }, uHot: { value: lin('hot') }, uPale: { value: lin('pale') },
    uBronze: { value: lin('bronze') }, uCopper: { value: lin('copper') }, uCopperLight: { value: lin('copper-light') },
  };

  const sets = [false, true].map((sharp) => {
    const scene = new THREE.Scene();
    const lampAt = { value: new THREE.Vector2(9, 9) };
    const core = new THREE.Mesh(new THREE.PlaneGeometry(HALF.w * 2, HALF.h * 2), new THREE.ShaderMaterial({
      vertexShader: VERT.replace('attribute vec3 aEdge;', 'const vec3 aEdge = vec3(0.0);'), fragmentShader: CORE_FRAG, uniforms: shared,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    core.renderOrder = 1;
    scene.add(core);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(HALF.w * 1.5, 0.012, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('bronze-deep')) }));
    floor.position.y = FLOOR - 0.006;
    scene.add(floor);
    const r = seeded(31);
    const facets: Facet[] = [];
    for (let i = 0; i < COUNT; i++) {
      const clear = r() < 0.42, big = r() ** 2.4;
      const mesh = new THREE.Mesh(lump(r, sharp, big), new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: { ...shared, uClear: { value: clear ? 1 : 0 }, uCut: { value: sharp ? 0 : 1 }, uSeed: { value: r() * 50 }, uLamp: lampAt },
        blending: clear ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !clear, transparent: clear,
      }));
      mesh.scale.setScalar((0.035 + 0.1 * big) * (sharp ? 1.1 : 1));
      mesh.renderOrder = clear ? 2 : 0;
      scene.add(mesh);
      facets.push({
        mesh, y: r(), pace: 0.7 + 0.6 * r(), r: 0.07 + 0.3 * r() ** 1.7, ph: r() * 6.283, orbit: (r() < 0.5 ? -1 : 1) * (0.35 + 0.9 * r()),
        spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2.4), turn: new THREE.Vector3(r() * 6, r() * 6, r() * 6),
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      });
    }
    return { scene, facets, lampAt, thrown: -1e9, kick: seeded(77) };
  });

  // A press on a panel strikes it: every facet is thrown, falls, bounces on the ledge, and is drawn back in.
  const press = (e: PointerEvent) => {
    panels.forEach((panel, i) => {
      const b = panel.getBoundingClientRect(), s = sets[i];
      if (!s || e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) return;
      s.thrown = clock.now();
      for (const f of s.facets) {
        f.pos.copy(f.mesh.position);
        f.vel.set((s.kick() - 0.5) * 2.6, 0.6 + 2.6 * s.kick(), (s.kick() - 0.5) * 0.6);
      }
    });
  };
  const host = canvas.parentElement ?? canvas;
  host.addEventListener('pointerdown', press);

  let held: { x: number; y: number } | null = null;
  const point = (e: PointerEvent) => { held = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; };
  host.addEventListener('pointerdown', point);
  host.addEventListener('pointermove', point);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const home = new THREE.Vector3();

  const off = clock.onFrame((t, dt) => {
    const box = canvas.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || box.width < 2) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(box.width, box.height, false);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    const now = still ? 3 : t;
    const L = lamp.get(), light = held ?? { x: L.px, y: L.py };
    sets.forEach((s, i) => {
      const panel = panels[i];
      if (!panel) return;
      const b = panel.getBoundingClientRect(), x = b.left - box.left, y = box.bottom - b.bottom;
      s.lampAt.value.set(((light.x - b.left) / b.width * 2 - 1) * HALF.w, -((light.y - b.top) / b.height * 2 - 1) * HALF.h);
      const since = clock.now() - s.thrown, loose = since < BACK_AFTER, back = Math.min(1, Math.max(0, (since - BACK_AFTER) / 0.9));
      for (const f of s.facets) {
        const yy = HALF.h * 1.15 - (((f.y + now * 0.035 * f.pace) % 1) * HALF.h * 2.3), a = f.ph + now * f.orbit;
        home.set(Math.sin(a) * f.r, yy, Math.cos(a) * f.r);
        if (loose && dt > 0) {
          f.vel.y -= FALL * dt;
          f.pos.addScaledVector(f.vel, dt);
          if (f.pos.y < FLOOR + f.mesh.scale.x * 0.5 && f.vel.y < 0 && Math.abs(f.pos.x) < HALF.w * 0.75) {
            f.pos.y = FLOOR + f.mesh.scale.x * 0.5;
            f.vel.y *= -0.46; f.vel.x *= 0.72;
          }
          f.mesh.position.copy(f.pos);
          f.mesh.rotation.x += f.spin.x * dt * 3; f.mesh.rotation.y += f.spin.y * dt * 3; f.mesh.rotation.z += f.spin.z * dt * 3;
        } else if (back < 1 && since < BACK_AFTER + 0.9) {
          f.mesh.position.lerpVectors(f.pos, home, back * back * (3 - 2 * back));
        } else {
          f.mesh.position.copy(home);
          f.mesh.rotation.set(f.turn.x + now * f.spin.x, f.turn.y + now * f.spin.y, f.turn.z + now * f.spin.z);
        }
      }
      renderer.setViewport(x, y, b.width, b.height);
      renderer.setScissor(x, y, b.width, b.height);
      renderer.render(s.scene, camera);
    });
  });

  return () => {
    off();
    host.removeEventListener('pointerdown', press);
    host.removeEventListener('pointerdown', point);
    host.removeEventListener('pointermove', point);
    renderer.dispose();
  };
}
