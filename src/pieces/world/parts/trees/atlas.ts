import * as THREE from 'three';
import { ATLAS, FILES, level } from './design';

// The atlas of leaves, read with the chain of levels the make script wrote into the same file, so a crown keeps as
// much leaf drawn small as drawn large. Decoded as it is, with no premultiplying: its channels are numbers.
export async function leaves(): Promise<THREE.Texture> {
  const res = await fetch(`/world/${FILES.leaves}`);
  if (!res.ok) throw new Error(`The world's file ${FILES.leaves} is missing (${res.status}). Make it with: node scripts/world/parts/trees/make.mjs`);
  const blob = await res.blob(), how: ImageBitmapOptions = { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' };
  const whole = await createImageBitmap(blob, how);
  const chain = await Promise.all(Array.from({ length: ATLAS.levels }, (_, k) => { const at = level(k); return createImageBitmap(whole, at.x, at.y, at.w, at.h, how); }));
  whole.close();
  const t = new THREE.Texture(chain[0] as unknown as HTMLImageElement);
  t.mipmaps = chain as unknown as THREE.Texture['mipmaps'];
  t.generateMipmaps = false;
  t.premultiplyAlpha = false;
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export function release(t: THREE.Texture): void {
  for (const m of t.mipmaps ?? []) (m as unknown as ImageBitmap).close?.();
  t.dispose();
}
