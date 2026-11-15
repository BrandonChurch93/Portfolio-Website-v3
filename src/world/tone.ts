import * as THREE from 'three';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { Stage } from './stage';

// The stage's tone curve, Neutral, takes the same small amount off red, green and blue in the darks. On a dark warm
// grey that leaves almost no blue and half the green, so every dark thing came out one sepia orange whatever it was
// made of: steel, timber, rubber and cloth all the same brown. This is the same curve without that step. A piece
// asks for it once its stage is made.
// Two things are added at its end, which are the palette's own rules. What is too bright to show goes to pale gold
// and not to white. And nothing is ever greener or bluer than it is red, or brighter than pale: a guarantee, so a
// glint on polished metal cannot burn to white whatever the lights do.
const PALE = 'vec3( 1.0, 0.767, 0.548 )';
const CURVE = `vec3 CustomToneMapping( vec3 color ) {
	const float StartCompression = 0.8;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak >= StartCompression ) {
		float d = 1. - StartCompression;
		float newPeak = 1. - d * d / ( peak + d - StartCompression );
		color *= newPeak / peak;
		float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
		color = mix( color, newPeak * ${PALE}, g );
	}
	float hot = smoothstep( 0.55, 1.0, color.r );
	color.g = min( color.g, color.r * mix( 1.0, 0.8, hot ) );
	color.b = min( color.b, min( color.g, color.r * mix( 1.0, 0.6, hot ) ) );
	return color;
}`;
const PLAIN = 'vec3 CustomToneMapping( vec3 color ) { return color; }';

export function trueDarks(renderer: THREE.WebGLRenderer): void {
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (chunk.includes(PLAIN)) THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(PLAIN, CURVE);
  renderer.toneMapping = THREE.CustomToneMapping;
}

// A white balance for a scene lit by the palette's pale, which is a warm light: under it a perfectly neutral grey
// measures as a warm one, and a whole desk of neutral things read as one tone. As a camera does in a warm room, the
// darks and the mid tones are balanced for that light, most of the way, so a neutral material reads as neutral and
// copper, timber and the lights keep their warmth beside it. Bright things are left alone: a light stays its color.
// It is one pass before the tone curve. The stage rebuilds its passes when its tier changes, so a piece calls this
// again after it sets a tier.
const BALANCE = {
  name: 'balance',
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
void main() {
	vec4 c = texture2D( tDiffuse, vUv );
	float peak = max( c.r, max( c.g, c.b ) );
	float k = 1.0 - smoothstep( 0.3, 0.85, peak );
	vec3 o = c.rgb * mix( vec3( 1.0 ), vec3( 0.96, 1.21, 1.59 ), k );
	o.g = min( o.g, o.r );
	o.b = min( o.b, o.g );
	gl_FragColor = vec4( o, c.a );
}`,
};

export function balance(stage: Stage): void {
  const passes = stage.composer.passes;
  const old = passes.find((p) => p instanceof ShaderPass && (p as ShaderPass).material.name === BALANCE.name);
  if (old) stage.composer.removePass(old);
  const pass = new ShaderPass(BALANCE);
  pass.material.name = BALANCE.name;
  const at = passes.findIndex((p) => p instanceof OutputPass);
  stage.composer.insertPass(pass, at < 0 ? passes.length : at);
}
