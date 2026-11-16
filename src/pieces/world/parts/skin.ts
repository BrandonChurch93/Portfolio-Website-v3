import * as THREE from 'three';
import type { PartFactory } from '../part';

// A place holder for the planet's own outer surface: nothing, so its plain dark stand in is drawn (./rest.ts). Its builder replaces this
// file.
export const build: PartFactory = () => ({ group: new THREE.Group() });
