import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { Stage } from '../../world/stage';

// The parts of the world that are the same picture in every frame but for the core's breath, drawn once and kept:
// their color and their depth, as large as the canvas, laid into each frame before anything else is drawn, so
// everything else still stands in front of them and behind them as it did. The view never moves and the moon never
// moves, so a part that takes no light from the stream or the cursor changes on the screen only with the core's
// level, and its color is a straight line in that level (`lit` in ./light.ts adds the core's light times the level,
// and the tone curve comes after, in a pass). So it is drawn twice, with the core out and at 1, and laid as the two
// mixed by the level now: the exact picture for any level. The land takes nothing from the core and comes out the
// same in both. Working the land's dunes out again for every frame of the trees' shimmer cost more than the rest of the
// world together, and the rock's stone half as much again by the core (LOG.md, Nov 16, "The hero's frame rate").
export interface Kept {
  // Whether the pictures are as large as the canvas is now.
  fresh(): boolean;
  // Draws the scene as it stands into the pictures, with light(0) and then light(1) called to set the core's level.
  // Whoever calls it has left visible only what is to be kept, and sets the level back after.
  take(light: (level: number) => void): void;
  // With a light, the pictures are laid with that light added from then on.
  show(on: boolean, level: number, light?: KeptLight): void;
  dispose(): void;
}

// A light that moves, which the kept pictures take on top of what they hold, worked out again in every frame as
// they are laid: a part whose light is its uniforms costs nothing to keep. `pars` is shader source that declares
// vec3 keptLit( vec3 own, vec2 at ): what a place takes that holds the color `own`, with `at` how far across the
// picture and down it the place is, both as shares of the picture's width. `uniforms` is what that reads. The part
// draws the same light itself whenever it is drawn and not laid, so `out` puts it out while the pictures are taken
// (true) and back after (false): the pictures hold none of it.
export interface KeptLight { pars: string; uniforms: Record<string, THREE.IUniform>; out(on: boolean): void }

export function keep(stage: Stage): Kept {
  // The picture at the core's level 0, with the depth, and the one at 1, whose depth is the same and not kept.
  let rt: THREE.WebGLRenderTarget | null = null, lit: THREE.WebGLRenderTarget | null = null;
  const lays = (light?: KeptLight): string => `uniform sampler2D tColor; uniform sampler2D tLit; uniform sampler2D tDepth; uniform float uLevel;${light ? ` uniform vec2 uKept;\n${light.pars}\n` : ' '}void main() { ivec2 at = ivec2(gl_FragCoord.xy); float d = texelFetch(tDepth, at, 0).r; if (d >= 1.0) discard; vec4 dark = texelFetch(tColor, at, 0); gl_FragColor = dark + (texelFetch(tLit, at, 0) - dark) * uLevel;${light ? ' gl_FragColor.rgb += keptLit(gl_FragColor.rgb, vec2(gl_FragCoord.x, uKept.y - gl_FragCoord.y) / uKept.x);' : ''} gl_FragDepth = d; }`;
  const material = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tLit: { value: null }, tDepth: { value: null }, uLevel: { value: 1 }, uKept: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: lays(),
    depthFunc: THREE.AlwaysDepth,
    toneMapped: false,
  });
  let added: KeptLight | undefined;
  const laid = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  laid.frustumCulled = false;
  laid.renderOrder = -1e6;
  laid.visible = false;
  stage.scene.add(laid);
  const copy = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tColor; void main() { gl_FragColor = texelFetch(tColor, ivec2(gl_FragCoord.xy), 0); }',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }));
  const size = () => { const read = stage.composer.readBuffer; return [read.width, read.height] as const; };
  const free = () => {
    rt?.depthTexture?.dispose();
    rt?.dispose();
    lit?.dispose();
    rt = lit = null;
  };
  return {
    fresh() { const [w, h] = size(); return !!rt && rt.width === w && rt.height === h; },
    take(light) {
      const read = stage.composer.readBuffer, [w, h] = size();
      if (!rt || rt.width !== w || rt.height !== h) {
        free();
        const like = { type: read.texture.type, format: read.texture.format as THREE.PixelFormat, colorSpace: read.texture.colorSpace as THREE.ColorSpace, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
        rt = new THREE.WebGLRenderTarget(w, h, { ...like, depthTexture: new THREE.DepthTexture(w, h) });
        lit = new THREE.WebGLRenderTarget(w, h, { ...like, depthBuffer: false });
        material.uniforms.tColor.value = rt.texture;
        material.uniforms.tLit.value = lit.texture;
        material.uniforms.tDepth.value = rt.depthTexture;
        material.uniforms.uKept.value.set(w, h);
      }
      const r = stage.renderer, prev = r.getRenderTarget(), auto = r.autoClear, was = laid.visible;
      laid.visible = false;
      r.autoClear = true;
      // The lit picture is drawn first into the one with the depth, and copied out of it.
      light(1);
      r.setRenderTarget(rt);
      r.render(stage.scene, stage.camera);
      (copy.material as THREE.ShaderMaterial).uniforms.tColor.value = rt.texture;
      r.setRenderTarget(lit);
      copy.render(r);
      light(0);
      r.setRenderTarget(rt);
      r.render(stage.scene, stage.camera);
      r.setRenderTarget(prev);
      r.autoClear = auto;
      laid.visible = was;
    },
    show(on: boolean, level: number, light?: KeptLight) {
      if (light && light !== added) {
        added = light;
        Object.assign(material.uniforms, light.uniforms);
        material.fragmentShader = lays(light);
        material.needsUpdate = true;
      }
      laid.visible = on && !!rt;
      material.uniforms.uLevel.value = level;
    },
    dispose() {
      stage.scene.remove(laid);
      laid.geometry.dispose();
      material.dispose();
      copy.material.dispose();
      copy.dispose();
      free();
    },
  };
}
