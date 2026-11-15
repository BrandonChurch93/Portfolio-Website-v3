import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { DESK, WORD } from '../layout';
import type { PartFactory } from '../part';

// The section's title, lying flat on the floor under the two drawers, in the desk's own perspective, as a word on a
// rug would lie. No rug is drawn. It is the lettering the title has in the page: Sora, semi bold, capitals, a little
// letter spacing. It is paint on the floor and not a picture laid over the desk: it takes the cursor's light and the
// shadows the legs and the top throw, and comes on with the desk's lights.

// The canvas the word is drawn on: how tall its capitals are in pixels, and the room left round them.
const INK = { cap: 300, pad: 40, face: '600 420px "Sora Variable", "Sora", system-ui, sans-serif' };
// Sora's capitals stand this share of its size.
const CAP = 0.7;
// How much of the light that falls on it the paint gives back, and how much it shows with no light on it at all, so
// that it is read with the cursor's light far away.
const PAINT = { takes: 0.15, own: 0.12 };
// How far off the floor it lies, in millimetres, so the two are never drawn into one another.
const LIFT = 0.6;

export const build: PartFactory = async () => {
  await document.fonts.load(INK.face).catch(() => null);
  const size = INK.cap / CAP, gap = WORD.space * size;
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = INK.face.replace('420px', `${size}px`);
  const letters = [...WORD.text], widths = letters.map((l) => probe.measureText(l).width);
  const run = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(run + INK.pad * 2);
  canvas.height = Math.ceil(INK.cap + INK.pad * 2);
  const g = canvas.getContext('2d')!;
  // It is read as a mask: white where the paint is, on black.
  g.fillStyle = '#000';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.font = probe.font;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff';
  let x = INK.pad;
  letters.forEach((l, i) => { g.fillText(l, x, INK.pad + INK.cap); x += widths[i] + gap; });

  const map = new THREE.CanvasTexture(canvas);
  map.anisotropy = 16;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;

  const mm = WORD.cap / INK.cap, w = canvas.width * mm, d = canvas.height * mm;
  const tone = new THREE.Color(hex('text'));
  const paint = new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(PAINT.takes), emissive: tone, emissiveIntensity: 0, roughness: 0.92, metalness: 0, alphaMap: map, transparent: true, depthWrite: false, opacity: 0 });
  paint.name = 'desk-word';
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), paint);
  mesh.position.set(WORD.x, -DESK.H + LIFT, WORD.z);
  mesh.receiveShadow = true;
  mesh.userData.noAO = true;
  const group = new THREE.Group();
  group.add(mesh);

  let shown = -1;
  return {
    group,
    alone: { at: [WORD.x, -DESK.H, WORD.z], r: w / 2 },
    update(s) {
      const k = s.lights.word;
      if (k === shown) return false;
      shown = k;
      paint.opacity = k;
      paint.emissiveIntensity = PAINT.own * k;
      return false;
    },
    dispose() { map.dispose(); paint.dispose(); mesh.geometry.dispose(); },
  };
};
