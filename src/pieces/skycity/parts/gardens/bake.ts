import * as THREE from 'three';
import { slice } from '../../../../world/build';
import { LARGE, ROSTER, type Role, model } from './trees';

// Every tree of the jungle drawn once, from the page's own view, into two pictures side by side in a grid: the first
// holds at each pixel whether it is leaf or bark, how bright, its hue and whether anything is there at all; the
// second which way it faces there and how open it is to the sky. The world draws each tree as its square of these,
// lit as it stands. A pixel where nothing is drawn is clear in both, so what the pictures hold, divided by how much
// is there, is the tree's own at every size they are shrunk to: nothing of the clear ground bleeds into an edge.

// The pictures' side in pixels, and a square's: a great tree is drawn in a large one, every other in a small one. A
// giant fills about 230 pixels on a common screen and a canopy tree up to 160, so each is drawn larger than that.
export const ATLAS = { wide: 2048, high: 2304, large: 384, small: 192 } as const;
// Where the next square is, in pixels from the lower left: the large ones in rows from the foot, then the small ones
// in rows over them.
function squares() {
  const per = (k: number) => Math.floor(ATLAS.wide / k);
  let large = 0, small = 0, top = 0;
  return (big: boolean): [number, number] => {
    if (big) { const i = large++, at: [number, number] = [(i % per(ATLAS.large)) * ATLAS.large, Math.floor(i / per(ATLAS.large)) * ATLAS.large]; top = at[1] + ATLAS.large; return at; }
    const i = small++;
    return [(i % per(ATLAS.small)) * ATLAS.small, top + Math.floor(i / per(ATLAS.small)) * ATLAS.small];
  };
}

// The trees are drawn from this far above level, in degrees: between the page's 4.5 at the world's sides, where they
// stand in outline, and the more the world's front shows them from above.
const EL = 9;

export interface Cell {
  role: Role; v: number;
  // The height the tree was built to, and the side of its square in the same units.
  tall: number; side: number;
  // Its square's lower left corner in the pictures and its side, as shares of the pictures' width, and where its foot
  // is in its square, as shares of the square.
  u: number; w: number; size: number; ox: number; oy: number;
}

const VERT = /* glsl */ `
attribute vec4 a;
attribute vec3 b;
varying vec4 vA;
varying vec3 vB;
varying vec3 vN;
void main() {
  vA = a; vB = b;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// kind 1 a tuft of leaves round a middle, 2 a frond with its leaflets in two rows, 3 a broad blade, torn at its
// edges, 4 a lantern's flame. Each tuft, frond and blade is bowed, so it is lit as a little dome and not as a flat card.
const FRAG = /* glsl */ `
uniform float uPass;
varying vec4 vA;
varying vec3 vB;
varying vec3 vN;
void main() {
  float kind = floor(vA.x + 0.5), val = vA.y, hue = vA.z, open = vA.w, leaf = 0.0;
  vec3 n = normalize(vN);
  vec2 q = vB.xy * 2.0 - 1.0;
  float s = vB.z;
  if (kind == 1.0) {
    float ang = atan(q.y, q.x) + s * 6.2832, rr = length(q), petals = 4.0 + floor(s * 3.0);
    float lobe = pow(abs(cos(ang * petals * 0.5)), 0.7);
    if (rr > 0.28 + 0.72 * lobe) discard;
    n = normalize(n + 0.15 * vec3(q, 0.0));
    val *= 0.92 + 0.12 * (1.0 - rr);
    leaf = 1.0;
  } else if (kind == 2.0 || kind == 3.0) {
    float u = vB.x, w = abs(q.y);
    if (kind == 2.0) {
      float env = 0.98 * pow(max(sin(3.14159 * min(u * 1.06, 1.0)), 0.0), 0.45);
      bool rib = w < 0.09, leaflet = fract(u * 15.0 + w * 2.4 + s) < 0.58 && w < env;
      if (!rib && !leaflet) discard;
    } else {
      float env = pow(max(sin(3.14159 * u), 0.0), 0.6);
      if (w > env) discard;
      if (w > 0.25 && fract(u * 6.5 + s * 7.0 + w * 0.4) < 0.09) discard;
      val *= 0.85 + 0.25 * w;
    }
    // Folded along its rib: each half turned away from the other, and darker toward the rib and the stem.
    vec2 g = vec2(dFdx(vB.y), dFdy(vB.y));
    vec2 across = dot(g, g) > 1e-12 ? normalize(g) : vec2(1.0, 0.0);
    n = normalize(n + vec3(across * q.y * 0.7, 0.0));
    val *= 0.7 + 0.3 * w;
    leaf = 1.0;
  } else if (kind == 4.0) {
    val = 1.0;
  }
  gl_FragColor = uPass < 0.5 ? vec4(leaf, clamp(val, 0.0, 1.0), clamp(hue, 0.0, 1.0), 1.0) : vec4(n * 0.5 + 0.5, clamp(open, 0.0, 1.0));
}`;

export interface Atlas { albedo: THREE.Texture; normal: THREE.Texture; cells: Cell[]; dispose(): void }

export async function bake(renderer: THREE.WebGLRenderer): Promise<Atlas> {
  const W = ATLAS.wide, H = ATLAS.high, next = squares();
  const made = () => {
    const t = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, type: THREE.UnsignedByteType });
    t.texture.colorSpace = THREE.NoColorSpace;
    t.scissorTest = true;
    return t;
  };
  const targets = [made(), made()];
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uPass: { value: 0 } }, side: THREE.DoubleSide });
  const scene = new THREE.Scene(), mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  const e = (EL * Math.PI) / 180, up = new THREE.Vector3(0, Math.cos(e), -Math.sin(e)), back = new THREE.Vector3(0, Math.sin(e), Math.cos(e));
  const was = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), auto: renderer.autoClear };
  const cells: Cell[] = [];
  const p = new THREE.Vector3();
  try {
    for (const { role, v } of ROSTER) {
      const m = model(role, v), pos = m.geo.getAttribute('position');
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let k = 0; k < pos.count; k++) {
        p.fromBufferAttribute(pos, k);
        const y = p.dot(up);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      const side = Math.max(x1 - x0, y1 - y0) * 1.06 + 1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const aim = up.clone().multiplyScalar(cy).setX(cx);
      cam.left = -side / 2; cam.right = side / 2; cam.top = side / 2; cam.bottom = -side / 2;
      cam.position.copy(aim).addScaledVector(back, 1000);
      cam.up.set(0, 1, 0);
      cam.lookAt(aim);
      cam.updateProjectionMatrix();
      await slice();
      const big = LARGE.includes(role), [px, py] = next(big), cell = big ? ATLAS.large : ATLAS.small;
      mesh.geometry = m.geo;
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 0);
      targets.forEach((t, pass) => {
        t.viewport.set(px, py, cell, cell);
        t.scissor.set(px, py, cell, cell);
        renderer.setRenderTarget(t);
        renderer.clear();
        mat.uniforms.uPass.value = pass;
        renderer.render(scene, cam);
      });
      m.geo.dispose();
      cells.push({ role, v, tall: m.tall, side, u: px / W, w: py / H, size: cell / W, ox: 0.5 - cx / side, oy: 0.5 - cy / side });
      await slice();
    }
  } finally {
    renderer.setRenderTarget(was.target);
    renderer.setClearColor(was.color, was.alpha);
    renderer.autoClear = was.auto;
    mat.dispose();
  }
  return { albedo: targets[0].texture, normal: targets[1].texture, cells, dispose: () => targets.forEach((t) => t.dispose()) };
}
