import * as THREE from 'three';
import type { PartFactory } from '../part';

// A stand in until the temple quarter and the way to the spire are made: nothing yet.
export const build: PartFactory = () => ({ group: new THREE.Group(), alone: { at: [-430, 40, 110], r: 220 } });
