import * as THREE from 'three';
import type { PartFactory } from '../part';

// A stand in until the port and the craft in the air are made: nothing yet.
export const build: PartFactory = () => ({ group: new THREE.Group(), alone: { at: [440, 40, -40], r: 220 } });
