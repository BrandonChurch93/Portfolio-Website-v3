import * as THREE from 'three';
import { STONE_BAKE } from '../../../../stream/stone';
import { pause } from '../../../../world/build';
import { BAKE } from './form';

// The carving, baked with the pad's renderer into the same two pictures the Work stones are lit from (STONE_BAKE in
// src/stream/stone.ts, which the stream's renderer bakes in carve()). Baked a tile at a time, handing the page back
// between tiles.

// The plain boss: the face's place turned as a plain raised boss, a land with two lines cut round it and a low
// collar where it meets the ring round it. Swapped in for the face by name, so the rest of the carving is the
// Work stones' own.
const BOSS = `
float boss(vec2 f, out float open){
  open = 0.0;
  float d = length(f);
  float h = mix(GROUND, HIGH + 0.03, smoothstep(0.985, 0.955, d));
  h += 0.012 * sqrt(sat(1.0 - sq(d / 0.9)));
  h -= 0.016 * (cut(abs(d - 0.78) - 0.012) + cut(abs(d - 0.5) - 0.009));
  h = max(h, cut(abs(d - 0.9) - 0.035) * (HIGH + 0.012 + 0.016 * sqrt(sat(1.0 - sq((d - 0.9) / 0.035)))));
  return h;
}
`;
const FACE_CALL = 'float hf = face(r / 0.456, open)';
// The carving's upright walls are as wide as a share of its radius, set for the Work stones, which are drawn a sixth
// the size this one is. Drawn here at that width they came out soft and puffed, so here they are cut as fine against
// the pixels as the Work stones' are.
const WALL = /WALL = [0-9.]+/;

function source(plain: boolean): string {
  const fine = STONE_BAKE.replace(WALL, `WALL = ${BAKE.wall}`);
  if (!plain || !fine.includes(FACE_CALL)) return fine;
  return fine.replace('float relief(vec2 r', `${BOSS}\nfloat relief(vec2 r`).replace(FACE_CALL, 'float hf = boss(r / 0.456, open)');
}

export interface Carving { t0: THREE.Texture; t1: THREE.Texture; dispose(): void }

export async function bake(renderer: THREE.WebGLRenderer, plain: boolean): Promise<Carving> {
  const size = BAKE.size;
  const target = new THREE.WebGLRenderTarget(size, size, { count: 2, depthBuffer: false, type: THREE.UnsignedByteType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const aniso = renderer.capabilities.getMaxAnisotropy();
  for (const t of target.textures) { t.anisotropy = Math.min(16, aniso); t.colorSpace = THREE.NoColorSpace; }
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: 'in vec3 position; in vec2 uv; out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `precision highp float;\n${source(plain)}`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  scene.add(quad);

  await renderer.compileAsync(scene, camera);
  const n = BAKE.tiles, step = size / n;
  target.scissorTest = true;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const last = i === n - 1 && j === n - 1;
      if (last) for (const t of target.textures) t.generateMipmaps = true;
      target.scissor.set(i * step, j * step, step, step);
      target.viewport.set(0, 0, size, size);
      const was = { target: renderer.getRenderTarget(), auto: renderer.autoClear };
      renderer.autoClear = false;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(was.target);
      renderer.autoClear = was.auto;
      if (!last) await pause();
    }
  }
  target.scissorTest = false;
  quad.geometry.dispose();
  material.dispose();
  return { t0: target.textures[0], t1: target.textures[1], dispose: () => target.dispose() };
}
