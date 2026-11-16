import * as THREE from 'three';
import type { Stage } from '../../world/stage';

// A part of the world that is the same picture in every frame, drawn once and kept: its color and its depth, as
// large as the canvas, laid into each frame before anything else is drawn, so everything else still stands in
// front of it and behind it as it did. The view never moves and the moon never moves, so a part that takes no
// light from the core, the stream or the cursor never changes on the screen. The land is one, and working its
// dunes out again for every frame of the trees' shimmer cost more than the rest of the world together
// (LOG.md, Nov 16, "The hero's frame rate").
export interface Kept {
  // Whether the picture is as large as the canvas is now.
  fresh(): boolean;
  // Draws the scene as it stands into the picture. Whoever calls it has left visible only what is to be kept.
  take(): void;
  show(on: boolean): void;
  dispose(): void;
}

export function keep(stage: Stage): Kept {
  let rt: THREE.WebGLRenderTarget | null = null;
  const material = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main() { float d = texture2D(tDepth, vUv).r; if (d >= 1.0) discard; gl_FragColor = texture2D(tColor, vUv); gl_FragDepth = d; }',
    depthFunc: THREE.AlwaysDepth,
    toneMapped: false,
  });
  const laid = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  laid.frustumCulled = false;
  laid.renderOrder = -1e6;
  laid.visible = false;
  stage.scene.add(laid);
  const size = () => { const read = stage.composer.readBuffer; return [read.width, read.height] as const; };
  return {
    fresh() { const [w, h] = size(); return !!rt && rt.width === w && rt.height === h; },
    take() {
      const read = stage.composer.readBuffer, [w, h] = size();
      if (!rt || rt.width !== w || rt.height !== h) {
        rt?.depthTexture?.dispose();
        rt?.dispose();
        rt = new THREE.WebGLRenderTarget(w, h, { type: read.texture.type, format: read.texture.format as THREE.PixelFormat, colorSpace: read.texture.colorSpace as THREE.ColorSpace, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(w, h) });
        material.uniforms.tColor.value = rt.texture;
        material.uniforms.tDepth.value = rt.depthTexture;
      }
      const r = stage.renderer, prev = r.getRenderTarget(), auto = r.autoClear, was = laid.visible;
      laid.visible = false;
      r.setRenderTarget(rt);
      r.autoClear = true;
      r.render(stage.scene, stage.camera);
      r.setRenderTarget(prev);
      r.autoClear = auto;
      laid.visible = was;
    },
    show(on: boolean) { laid.visible = on && !!rt; },
    dispose() {
      stage.scene.remove(laid);
      laid.geometry.dispose();
      material.dispose();
      rt?.depthTexture?.dispose();
      rt?.dispose();
      rt = null;
    },
  };
}
