import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { registry } from '../../../hooks/registry';
import { slice } from '../../../world/build';
import { load } from '../../world/files';
import { LIGHT } from '../../world/layout';
import { DEBRIS, ROCKET } from '../layout';
import type { PartFactory } from '../part';
import { MOTION } from './debris/look';
import { lay } from './debris/field';
import * as S from './debris/shaders';

// What broke away from the planet, gathered round the launch pad: the hero's own rock, in the hero's own models
// (public/world/debris.bin), hanging in a loose, lopsided ring round the stone and the tower (./debris/field.ts lays it
// out from DEBRIS in ../layout.ts). Every piece is laid into one mesh, each vertex knowing its piece, and the table of
// pieces goes to the graphics card once as a texture: the vertex shader moves each from the clock and the launch
// alone, so a held clock, fill and launch are always the same picture, and nothing is written after it is made.
// Asleep it is dark shapes with a thin rim of the cursor's light. The lit stone lights it from below, nearest
// brightest, and the engine's fire hard from the middle.

const color = (name: Parameters<typeof hex>[0]) => new THREE.Color(hex(name));
const OWN = color(LIGHT.stone.of[0]).lerp(color(LIGHT.stone.of[1]), LIGHT.stone.ease).multiplyScalar(LIGHT.stone.power);

const LOOK = {
  // The stone's own red brown, the paler fresh stone of a broken edge, and the tan its lit faces go toward.
  own: OWN,
  chip: OWN.clone().lerp(color('text-2'), 0.42).multiplyScalar(1.18),
  tan: OWN.clone().lerp(color('text-2'), 0.7),
  // A piece's tone: the least and how much more by piece, and its stains' darkest and lightest.
  tone: [0.8, 0.32, 0.6, 1.2] as const,
  // The breaks: the larger's cell as a share of the piece's size, and its tilt; the smaller's cell as a share of the
  // larger's, and its tilt.
  facet: [0.3, 0.3, 0.36, 0.16] as const,
  // The grain: its cell as a share of the piece's size, how much it moves the tone, and how much it tilts the face;
  // and the share of the breaks a middle or great piece takes.
  grain: [0.024, 0.3, 0.15, 0.35] as const,
  // The speckle: its grain as a share of the piece's size, how much darker the dark grains and paler the pale.
  speck: [0.016, 0.38, 0.22] as const,
  // The pits: the share of cells that hold one, how dark one is, and the cell as a share of the piece's size.
  pits: [0.3, 0.45, 0.045] as const,
  // How dark the stone is where it is most shut in, and the openness from which it is not dark at all.
  crease: [0.45, 0.08, 0.5] as const,
  // How much a lit broken face glints, and how tight the glint is.
  sheen: [0.1, 22] as const,
  // The lit stone's light: its color and strength, and the share of it that comes back off everything round as a
  // soft light from below; then how far it reaches to half from the nearest lit place, how much of a broad light from
  // the whole stone there is and over how far it falls to half, and how far it wraps round.
  glow: { color: color('hot').lerp(color('pale'), 0.12), power: 2.9, bounce: 0.2 },
  glowAt: [150, 0.6, 420, 0.04] as const,
  // The engine's fire: its color, its strength at full thrust, how far over the engine's mouth it stands, and how far
  // it reaches before it falls away fast: it is gone from the field once the rocket has climbed clear.
  fire: { color: color('hot').lerp(color('pale'), 0.25), power: 34, over: -10, half: 230 },
  // The cursor's light: its color and strength, how much of it the body takes and the rim, and how tight the rim is.
  lamp: { color: color('pale'), power: 1, body: 0.05, rim: 1.4, tight: 4 },
  // Further back is darker: between these places toward the visitor, down to this share.
  deep: [-480, -120, 0.5] as const,
  // What the night gives.
  air: color('text-3').lerp(color('bronze'), 0.3).multiplyScalar(0.09),
};

const ROWS = 5;

export const build: PartFactory = async () => {
  // ?paddebris=0 leaves the field out, to measure the pad without it.
  if (new URLSearchParams(location.search).get('paddebris') === '0') return { group: new THREE.Group() };
  const file = await load('debris.bin');
  const pieces = lay();

  // The table, as a texture: a column for each piece and a row for each thing about it.
  const n = pieces.length, data = new Float32Array(n * ROWS * 4), put = (row: number, i: number, v: number[]) => data.set(v, (row * n + i) * 4);
  pieces.forEach((p, i) => {
    put(0, i, [...p.at, p.across]);
    put(1, i, p.turn);
    put(2, i, [...p.axis, p.rate]);
    put(3, i, [p.cluster, p.phase, p.shove, p.kick]);
    put(4, i, [p.kind, p.seed, 0, 0]);
  });
  const table = new THREE.DataTexture(data, n, ROWS, THREE.RGBAFormat, THREE.FloatType);
  table.magFilter = table.minFilter = THREE.NearestFilter;
  table.needsUpdate = true;

  // Every piece laid into one mesh from its model, centred and sized, each vertex knowing its piece.
  // A model the hero's file no longer has is stood in for by its first: a change to that file never takes the pad
  // down.
  const first = file.meshes.values().next().value!;
  const used = pieces.map((p) => file.meshes.get(p.model) ?? first);
  let verts = 0, tris = 0;
  for (const m of used) {
    verts += m.geometry.attributes.position.count;
    tris += (m.geometry.index?.count ?? 0) / 3;
  }
  const pos = new Float32Array(verts * 3), nor = new Int16Array(verts * 4), light = new Uint8Array(verts * 4), id = new Float32Array(verts), idx = new Uint32Array(tris * 3);
  let v = 0, t = 0;
  for (let i = 0; i < n; i++) {
    const m = used[i], g = m.geometry, k = g.attributes.position.count, q = g.attributes.position.array as ArrayLike<number>;
    const box = g.boundingBox!, exact = !(g.attributes.position as THREE.BufferAttribute).normalized;
    const span = (exact ? 1 : m.size) * Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z), mid = box.getCenter(new THREE.Vector3());
    const scale = pieces[i].across / Math.max(span, 1e-6), unit = (exact ? 1 : m.size / 65535) * scale, off = (exact ? 1 : m.size) * scale;
    const nn = (g.attributes.normal as THREE.InterleavedBufferAttribute).data.array as Int16Array, ll = (g.attributes.aLight as THREE.BufferAttribute).array as Uint8Array;
    // A slab is the model pressed along its own axes, and its normals turned to match.
    const sh = pieces[i].shape;
    for (let j = 0; j < k; j++) {
      for (let a = 0; a < 3; a++) pos[(v + j) * 3 + a] = (q[j * 3 + a] * unit - mid.getComponent(a) * off) * sh[a];
      id[v + j] = i;
      const nx = nn[j * 4] / sh[0], ny = nn[j * 4 + 1] / sh[1], nz = nn[j * 4 + 2] / sh[2], l = Math.hypot(nx, ny, nz) || 1;
      nor[(v + j) * 4] = Math.round((nx / l) * 32767);
      nor[(v + j) * 4 + 1] = Math.round((ny / l) * 32767);
      nor[(v + j) * 4 + 2] = Math.round((nz / l) * 32767);
    }
    light.set(ll.subarray(0, k * 4), v * 4);
    const ix = g.index!.array;
    for (let j = 0; j < ix.length; j++) idx[t + j] = ix[j] + v;
    v += k;
    t += ix.length;
    if (i % 20 === 19) await slice();
  }
  for (const m of file.meshes.values()) m.geometry.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(nor, 4), 3, 0, true));
  geometry.setAttribute('aLight', new THREE.BufferAttribute(light, 4, true));
  geometry.setAttribute('aPiece', new THREE.BufferAttribute(id, 1));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  // Where the pieces can be, since they are moved in the shader, and the geometry's own numbers are let go of below.
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(DEBRIS.bounds.l, 0, -600), new THREE.Vector3(DEBRIS.bounds.r, DEBRIS.bounds.top + 140, 300));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  // Once its numbers are with the graphics card the page lets its own copy go.
  const letGo = function (this: { array: unknown }) { this.array = null; };
  for (const a of Object.values(geometry.attributes)) {
    if ((a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) (a as THREE.InterleavedBufferAttribute).data.onUpload(letGo);
    else (a as THREE.BufferAttribute).onUpload(letGo);
  }
  geometry.index!.onUpload(letGo);

  const L = LOOK;
  const uniforms = {
    uPieces: { value: table }, uTime: { value: MOTION.still }, uLaunch: { value: 0 },
    uFill: { value: 0 }, uGlow: { value: L.glow.color.clone().multiplyScalar(L.glow.power) }, uGlowAt: { value: new THREE.Vector4(...L.glowAt) }, uBounce: { value: L.glow.bounce },
    uFire: { value: new THREE.Vector3() }, uEngine: { value: new THREE.Vector3() }, uFireHalf: { value: L.fire.half },
    uLampAt: { value: new THREE.Vector3() }, uLamp: { value: L.lamp.color.clone().multiplyScalar(L.lamp.power) }, uLampK: { value: new THREE.Vector3(L.lamp.body, L.lamp.rim, L.lamp.tight) },
    uAir: { value: L.air }, uOwn: { value: L.own }, uChip: { value: L.chip }, uTan: { value: L.tan },
    uTone: { value: new THREE.Vector4(...L.tone) }, uFacet: { value: new THREE.Vector4(...L.facet) }, uGrain: { value: new THREE.Vector4(...L.grain) },
    uCrease: { value: new THREE.Vector3(...L.crease) }, uPits: { value: new THREE.Vector3(...L.pits) }, uDeep: { value: new THREE.Vector3(...L.deep) }, uSpeck: { value: new THREE.Vector3(...L.speck) }, uSheen: { value: new THREE.Vector2(...L.sheen) },
    uShow: { value: Number(new URLSearchParams(location.search).get('paddebrisshow') ?? 0) || 0 },
  };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  material.name = 'pad-debris';
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${S.VERT_PARS}`)
      .replace('#include <beginnormal_vertex>', S.VERT_MOTION)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${S.VERT_PLACE}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${S.FRAG_PARS}`)
      .replace('#include <lights_fragment_begin>', S.FRAG_LIGHT)
      .replace('#include <lights_fragment_maps>', '')
      .replace('#include <lights_fragment_end>', '');
  };
  material.customProgramCacheKey = () => 'pad-debris';

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.noAO = true;
  mesh.userData.noWire = true;
  const group = new THREE.Group();
  group.add(mesh);

  registry.tool('padDebris', () => ({ pieces: n, triangles: tris, vertices: verts, models: [...new Set(pieces.map((p) => p.model))].length }));

  const fire = L.fire.color.clone().multiplyScalar(L.fire.power);
  return {
    group,
    alone: { at: [-100, 320, -220], r: 470 },
    update(s) {
      uniforms.uTime.value = s.still ? MOTION.still : s.t;
      uniforms.uLaunch.value = Math.max(0, s.launch);
      uniforms.uFill.value = s.fill;
      (uniforms.uFire.value as THREE.Vector3).set(fire.r, fire.g, fire.b).multiplyScalar(s.burn);
      uniforms.uEngine.value.set(0, ROCKET.mouth + L.fire.over + s.climb, 0);
      uniforms.uLampAt.value.copy(s.cursor);
      return true;
    },
    dispose() { geometry.dispose(); material.dispose(); table.dispose(); },
  };
};
