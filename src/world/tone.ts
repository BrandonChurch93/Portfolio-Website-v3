import * as THREE from 'three';

// The stage's tone curve, Neutral, takes the same small amount off red, green and blue in the darks. On a dark warm
// grey that leaves almost no blue and half the green, so every dark thing came out one sepia orange whatever it was
// made of: steel, timber, rubber and cloth all the same brown. This is the same curve without that step. The
// highlights are rolled off exactly as before. A piece asks for it once its stage is made.
const CURVE = `vec3 CustomToneMapping( vec3 color ) {
	const float StartCompression = 0.8;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}`;
const PLAIN = 'vec3 CustomToneMapping( vec3 color ) { return color; }';

export function trueDarks(renderer: THREE.WebGLRenderer): void {
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (chunk.includes(PLAIN)) THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(PLAIN, CURVE);
  renderer.toneMapping = THREE.CustomToneMapping;
}
