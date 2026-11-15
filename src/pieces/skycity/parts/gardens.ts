import * as THREE from 'three';
import type { PartFactory } from '../part';

// A stand in until the gardens, the farms and the wild ground are made: nothing yet.
export const build: PartFactory = () => ({ group: new THREE.Group(), alone: { at: [330, 20, 330], r: 220 } });
