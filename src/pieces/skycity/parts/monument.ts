import * as THREE from 'three';
import type { PartFactory } from '../part';

export const build: PartFactory = () => ({ group: new THREE.Group() });
