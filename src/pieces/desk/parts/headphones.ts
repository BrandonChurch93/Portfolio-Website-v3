import * as THREE from 'three';
import type { PartFactory } from '../part';

// A place holder until the headphones on their stand are made from reference/kits/desk.md.
export const build: PartFactory = () => ({ group: new THREE.Group() });
