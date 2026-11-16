import * as THREE from 'three';
import { MOONWARD, PYRAMID, ground, within } from '../../layout';
import { FORM } from './form';

// The shade the pyramid lays on the ground under and round it, drawn over whatever is there (the land, its court)
// as a multiply: the angle where the foot course meets the ground, shut in, and its shadow from the moon, which
// falls toward the visitor and to the left. The stage's shadow map lays that shadow as well, but at the map's size it
// is a thin line behind the trees; here it is worked out exactly from the pyramid's own planes, soft by how far it
// falls, as the moon's disc makes it. It is a sheet over the ground made at load, in the world's units.

export const SHADE = {
  // How far round the foot course the sheet reaches, how far along the shadow, as a share of its length, and how
  // far apart its points are.
  reach: 14, along: 0.55, cell: 2.5,
  // How high over the plan's ground it lies.
  lift: 0.5,
  // The contact shade: how dark at the foot and how far it runs, near and far.
  contact: [0.55, 2.4, 0.18, 9],
  // The moon's shadow: how dark, and how soft its edge is near the foot and for each unit it falls.
  shadow: { dark: 0.42, soft: 0.5, per: 0.014 },
} as const;

export function shade(at: THREE.Vector3, basis: THREE.Matrix4): { mesh: THREE.Mesh; dispose(): void } {
  const half = PYRAMID.base / 2, tall = PYRAMID.tall, out = half + FORM.foot.proud;
  const inv = basis.clone().transpose();
  const moon = new THREE.Vector3(...MOONWARD).normalize().applyMatrix4(inv);
  const fall = new THREE.Vector2(-moon.x, -moon.z).normalize().multiplyScalar((tall * Math.hypot(moon.x, moon.z)) / Math.max(moon.y, 0.05));
  const ax = new THREE.Vector3().setFromMatrixColumn(basis, 0), az = new THREE.Vector3().setFromMatrixColumn(basis, 2);

  // The sheet covers the foot and the shadow's first stretch, in the pyramid's own across and along.
  const r = out + SHADE.reach, sx = fall.x * SHADE.along, sz = fall.y * SHADE.along;
  const x0 = Math.min(-r, -r + sx), x1 = Math.max(r, r + sx), z0 = Math.min(-r, -r + sz), z1 = Math.max(r, r + sz);
  const nx = Math.ceil((x1 - x0) / SHADE.cell), nz = Math.ceil((z1 - z0) / SHADE.cell);
  const pos: number[] = [], idx: number[] = [], keep: boolean[] = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const lx = x0 + i * SHADE.cell, lz = z0 + j * SHADE.cell;
    p.copy(at).addScaledVector(ax, lx).addScaledVector(az, lz);
    pos.push(p.x, ground(p.x, p.z) + SHADE.lift, p.z);
    keep.push(within(p.x, p.z) > -2);
  }
  const inside = (i: number, j: number): boolean => Math.abs(x0 + i * SHADE.cell) < out - 3 && Math.abs(z0 + j * SHADE.cell) < out - 3;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
    if (!keep[a] || !keep[b] || !keep[d] || !keep[e]) continue;
    if (inside(i, j) && inside(i + 1, j + 1)) continue;
    idx.push(a, d, b, b, d, e);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setIndex(idx);

  const toLocal = new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z).premultiply(inv);
  const f = (v: number): string => v.toFixed(5);
  const material = new THREE.ShaderMaterial({
    uniforms: { uLocal: { value: toLocal } },
    vertexShader: `
uniform mat4 uLocal;
varying vec3 vL;
void main() {
	vL = ( uLocal * vec4( position, 1.0 ) ).xyz;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,
    fragmentShader: `
varying vec3 vL;
void main() {
	vec2 o = max( abs( vL.xz ) - ${f(out)}, 0.0 );
	float d = length( o );
	float k = ${f(SHADE.contact[0])} * exp( - d / ${f(SHADE.contact[1])} ) + ${f(SHADE.contact[2])} * exp( - d / ${f(SHADE.contact[3])} );
	// The ray to the moon, clipped by the pyramid's four faces and its foot: where it passes through, the place is in
	// its shadow, and how long it runs inside says how far the place is from the shadow's edge.
	vec3 m = vec3( ${f(moon.x)}, ${f(moon.y)}, ${f(moon.z)} );
	float t0 = 0.0, t1 = 1e4;
	vec4 pl[5];
	pl[0] = vec4( ${f(tall)}, ${f(half)}, 0.0, ${f(half * tall)} );
	pl[1] = vec4( - ${f(tall)}, ${f(half)}, 0.0, ${f(half * tall)} );
	pl[2] = vec4( 0.0, ${f(half)}, ${f(tall)}, ${f(half * tall)} );
	pl[3] = vec4( 0.0, ${f(half)}, - ${f(tall)}, ${f(half * tall)} );
	pl[4] = vec4( 0.0, - 1.0, 0.0, 0.0 );
	for ( int i = 0; i < 5; i++ ) {
		float den = dot( pl[ i ].xyz, m ), num = pl[ i ].w - dot( pl[ i ].xyz, vL );
		if ( abs( den ) < 1e-6 ) { if ( num < 0.0 ) t1 = - 1.0; }
		else if ( den > 0.0 ) t1 = min( t1, num / den );
		else t0 = max( t0, num / den );
	}
	float chord = max( t1 - t0, 0.0 );
	float s = smoothstep( 0.0, ${f(SHADE.shadow.soft)} + ${f(SHADE.shadow.per)} * t0, chord );
	k = 1.0 - ( 1.0 - k ) * ( 1.0 - ${f(SHADE.shadow.dark)} * s );
	gl_FragColor = vec4( vec3( 1.0 - clamp( k, 0.0, 0.9 ) ), 1.0 );
}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, dispose() { geometry.dispose(); material.dispose(); } };
}
