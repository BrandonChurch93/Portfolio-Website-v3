import * as THREE from 'three';
import type { PartState } from '../../part';
import { isDrawn, lampOf } from '../rock/drawn';
import { WAKE } from './materials';

// The cursor's light and the marks it leaves behind it, as the city's shaders take them (WOKEN in ./materials.ts), in
// picture 10's look alone. Each part that has windows keeps its own, fed the same light, so they agree.
export interface Wake { uniform: THREE.IUniform<THREE.Vector3[]>; update(s: PartState): boolean }

export function wakes(query: URLSearchParams): Wake | undefined {
  if (!isDrawn(query)) return undefined;
  const uniform = { value: Array.from({ length: WAKE.marks }, () => new THREE.Vector3()) };
  const marks: { x: number; y: number; t: number; born: number; k: number }[] = [];
  return {
    uniform,
    update(s) {
      const lamp = lampOf(s, uniform.value[0]), head = marks[0];
      if ((s.still && !s.held) || (head && s.t < head.t)) marks.length = 0;
      else if (lamp.z > 0.02) {
        if (head && Math.hypot(lamp.x - head.x, lamp.y - head.y) < WAKE.step) { head.t = s.t; head.k = Math.max(lamp.z, head.k); }
        else if (!head || s.t - head.born >= WAKE.lasts / (WAKE.marks - 2)) marks.unshift({ x: lamp.x, y: lamp.y, t: s.t, born: s.t, k: lamp.z });
      }
      while (marks.length && (marks.length > WAKE.marks - 1 || s.t - marks[marks.length - 1].t > WAKE.lasts)) marks.pop();
      for (let i = 1; i < WAKE.marks; i++) { const k = marks[i - 1]; if (k) uniform.value[i].set(k.x, k.y, k.k * Math.max(0, 1 - (s.t - k.t) / WAKE.lasts)); else uniform.value[i].setZ(0); }
      return marks.length > 0;
    },
  };
}
