import * as THREE from 'three';
import { HEART } from '../layout';
import type { PartFactory } from '../part';
import { KNOT } from './core/knot';
import { makeLight } from './core/light';
import { makeShards } from './core/shards';

// The planet's core: the stream's own light wound into a knot round a kernel too bright to look into, with the
// stream's own shards circling it in shells, arcs leaping between its strands and sparks thrown off it. Its
// underside gathers into strands that run together into the source, where the page's stream takes over. It is all
// worked out from the clock on the graphics card: each frame sets the time and how bright it burns, and nothing else.

// The time it is held at when nothing may move.
const REST = 7.3;

export const build: PartFactory = ({ tier }) => {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const light = makeLight(), shards = makeShards(light.uniforms);
  const group = new THREE.Group();
  group.position.set(...HEART);
  group.add(shards.solid, light.mesh, shards.clear);
  const lamp = (shards.materials[0].uniforms.uLamp.value as THREE.Vector3);
  return {
    group,
    alone: { at: [...HEART], r: KNOT.reach + 60 },
    update(s) {
      light.uniforms.uT.value = reduced || tier === 'static' ? REST : s.t;
      light.uniforms.uCore.value = s.core;
      lamp.set(s.cursor.x - HEART[0], s.cursor.y - HEART[1], s.cursor.z - HEART[2]);
      return !s.still;
    },
    dispose() {
      light.mesh.geometry.dispose();
      light.material.dispose();
      shards.solid.geometry.dispose();
      shards.clear.geometry.dispose();
      for (const m of shards.materials) m.dispose();
    },
  };
};
