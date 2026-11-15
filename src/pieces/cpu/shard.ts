import * as THREE from 'three';
import { HEAD, SOLID_FRAG } from '../../stream/shaders';
import { STREAM } from '../../stream/config';
import { buildShards, FACET_KINDS, VERTEX_FLOATS } from '../../stream/shards';
import { COPPER, COPPER_LIGHT } from '../../metal/finishes';
import { hex } from '../../config/palette';

// The shards a part flies home as are the stream's own: the same meshes, from the same seed, and the same fragment
// shader, so a shard leaving the strike is one of the shards flying past it on the page. The stream draws in CSS
// pixels of the page, y down and z toward the eye; this canvas hands the shader its own pixels the same way.

export const SHARD_KINDS = FACET_KINDS;

// The fragment shader as the stream has it, with what it draws handed on in this canvas's light: the stage's
// exposure is taken back out, since the stream's own canvas has none.
const FRAG = SOLID_FRAG.replace(HEAD, 'precision highp float;\n').replace('frag = vec4(col, 1.0);', 'frag = vec4(col / uExposure, 1.0);').replace('out vec4 frag;', 'out vec4 frag;\nuniform float uExposure;');

const VERT = /* glsl */ `precision highp float;
uniform mat4 modelViewMatrix, projectionMatrix;
uniform vec2 uHost;
uniform float uPx, uDepth;
uniform vec2 uCoreAt, uCoreRun;
in vec3 aPos, aNormal, aEdge, aBevel0, aBevel1, aBevel2;
in float aTag;
in mat4 instanceMatrix;
in vec3 instanceColor;
out vec3 vP, vN, vEdge, vObj;
out float vTag;
flat out vec4 vCore, vMore;
flat out float vSize;
flat out vec3 vB0, vB1, vB2;
vec3 page(vec3 n){ return vec3(n.x, -n.y, n.z); }
void main(){
  mat4 mv = modelViewMatrix * instanceMatrix;
  vec4 v = mv * vec4(aPos, 1.0);
  gl_Position = projectionMatrix * v;
  vec2 ndc = gl_Position.xy / max(gl_Position.w, 1e-6);
  vP = vec3((ndc.x * 0.5 + 0.5) * uHost.x, (0.5 - ndc.y * 0.5) * uHost.y, (v.z + uDepth) * uPx);
  mat3 m = mat3(mv);
  mat3 nm = transpose(inverse(m));
  vN = page(normalize(nm * aNormal + 1e-6));
  vB0 = page(normalize(nm * aBevel0 + 1e-6)); vB1 = page(normalize(nm * aBevel1 + 1e-6)); vB2 = page(normalize(nm * aBevel2 + 1e-6));
  float size = (length(m[0]) + length(m[1]) + length(m[2])) / 3.0 * uPx;
  vSize = size;
  vEdge = aEdge * size;
  vObj = aPos;
  vTag = aTag;
  vec2 rel = vP.xy - uCoreAt;
  vCore = vec4(uCoreAt + uCoreRun * dot(rel, uCoreRun), uCoreRun);
  vMore = vec4(0.5, instanceColor.r, 0.0, instanceColor.g);
}`;

export interface ShardUniforms {
  uHost: { value: THREE.Vector2 };
  uPx: { value: number };
  uDepth: { value: number };
  uCoreAt: { value: THREE.Vector2 };
  uCoreRun: { value: THREE.Vector2 };
  uUnit: { value: number };
  uDpr: { value: number };
  uLamp: { value: THREE.Vector3 };
  uLampI: { value: number };
  uExposure: { value: number };
}

const lin3 = (c: [number, number, number]) => new THREE.Vector3(...c);
const linHex = (h: number) => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };

export function shardUniforms(): ShardUniforms {
  return {
    uHost: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 }, uDepth: { value: 0 }, uCoreAt: { value: new THREE.Vector2() }, uCoreRun: { value: new THREE.Vector2(0, 1) },
    uUnit: { value: 1 }, uDpr: { value: 1 }, uLamp: { value: new THREE.Vector3() }, uLampI: { value: 0 }, uExposure: { value: 1 },
  };
}

// One instanced mesh for each of the stream's kinds of facet.
export function shardMeshes(u: ShardUniforms, most: number): THREE.InstancedMesh[] {
  const { data, kinds } = buildShards(STREAM.seed);
  const buf = new THREE.InterleavedBuffer(data, VERTEX_FLOATS);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...u, uF0: { value: lin3(COPPER_LIGHT) }, uCopper: { value: lin3(COPPER) }, uPale: { value: linHex(hex('pale')) } },
  });
  material.name = 'cpuShard';
  return kinds.slice(0, FACET_KINDS).map((k) => {
    const g = new THREE.BufferGeometry();
    const at = (name: string, size: number, offset: number) => g.setAttribute(name, new THREE.InterleavedBufferAttribute(buf, size, offset));
    at('aPos', 3, 0); at('aNormal', 3, 3); at('aEdge', 3, 6); at('aTag', 1, 9); at('aBevel0', 3, 10); at('aBevel1', 3, 13); at('aBevel2', 3, 16);
    g.setAttribute('position', g.getAttribute('aPos'));
    g.setDrawRange(k.first, k.count);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const mesh = new THREE.InstancedMesh(g, material, most);
    mesh.setColorAt(0, new THREE.Color(0, 0, 0));
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.noWire = true;
    mesh.userData.noAO = true;
    return mesh;
  });
}
